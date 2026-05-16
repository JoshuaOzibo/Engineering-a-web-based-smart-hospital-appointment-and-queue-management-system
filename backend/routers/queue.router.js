const express = require("express");
const queueRouter = express.Router();
const { QueueModel } = require("../models/queue.model");
const { DepartmentModel } = require("../models/department.model");
const { authenticate } = require("../middlewares/authenticator.mw");
require("dotenv").config();

// ── In-memory SSE client registry ────────────────────────────────────────────
// Map<deptId: string, Set<res>>
const sseClients = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatState(queue) {
  if (!queue) {
    return { currentServing: 0, lastIssued: 0, waitingCount: 0, tokens: [] };
  }
  const waitingCount = queue.tokens.filter((t) => t.status === "waiting").length;
  return {
    departmentId: queue.departmentId,
    deptName: queue.deptName,
    currentServing: queue.currentServing,
    lastIssued: queue.lastIssued,
    waitingCount,
    tokens: queue.tokens,
  };
}

// Broadcast latest queue state to every SSE client watching this department
async function broadcast(deptId) {
  const queue = await QueueModel.findOne({
    departmentId: Number(deptId),
    date: today(),
  });
  const payload = formatState(queue);
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  const clients = sseClients.get(String(deptId));
  if (clients) {
    clients.forEach((res) => {
      try { res.write(data); } catch { /* client disconnected */ }
    });
  }
}

// ── SSE stream ────────────────────────────────────────────────────────────────
// GET /queue/live/:deptId
queueRouter.get("/live/:deptId", async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const { deptId } = req.params;
  if (!sseClients.has(deptId)) sseClients.set(deptId, new Set());
  sseClients.get(deptId).add(res);

  // Push current state immediately on connect
  const queue = await QueueModel.findOne({ departmentId: Number(deptId), date: today() });
  res.write(`data: ${JSON.stringify(formatState(queue))}\n\n`);

  // Heartbeat every 25s to prevent proxy/browser timeouts
  const heartbeat = setInterval(() => {
    try { res.write(": heartbeat\n\n"); } catch { clearInterval(heartbeat); }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients.get(deptId)?.delete(res);
  });
});

// ── One-shot status (polling fallback) ────────────────────────────────────────
// GET /queue/status/:deptId
queueRouter.get("/status/:deptId", async (req, res) => {
  try {
    const queue = await QueueModel.findOne({
      departmentId: Number(req.params.deptId),
      date: today(),
    });
    res.json(formatState(queue));
  } catch (e) {
    res.status(500).json({ msg: "Error fetching queue status" });
  }
});

// ── Patient: join queue ───────────────────────────────────────────────────────
// POST /queue/join/:deptId  (auth required)
queueRouter.post("/join/:deptId", authenticate, async (req, res) => {
  const { deptId } = req.params;
  const { userID } = req.body;

  try {
    let queue = await QueueModel.findOne({
      departmentId: Number(deptId),
      date: today(),
    });

    if (!queue) {
      // Create today's queue — look up dept name from DB
      const dept = await DepartmentModel.findOne({ departmentId: Number(deptId) });
      queue = await QueueModel.create({
        departmentId: Number(deptId),
        deptName: dept?.deptName ?? `Department ${deptId}`,
        date: today(),
        currentServing: 0,
        lastIssued: 0,
        tokens: [],
      });
    }

    // Prevent duplicate joins
    const already = queue.tokens.find(
      (t) => t.patientId === String(userID) && t.status !== "done"
    );
    if (already) {
      return res.status(409).json({
        msg: "You are already in this queue",
        tokenNumber: already.tokenNumber,
      });
    }

    const tokenNumber = queue.lastIssued + 1;
    const waitingBefore = queue.tokens.filter((t) => t.status === "waiting").length;

    await QueueModel.findByIdAndUpdate(queue._id, {
      lastIssued: tokenNumber,
      $push: {
        tokens: {
          tokenNumber,
          patientId: String(userID),
          patientName: req.body.patientName ?? "Patient",
          status: "waiting",
        },
      },
    });

    await broadcast(deptId);
    res.status(201).json({
      msg: "Joined queue",
      tokenNumber,
      position: waitingBefore + 1,
    });
  } catch (e) {
    console.error("Join queue error:", e);
    res.status(500).json({ msg: "Error joining queue" });
  }
});

// ── Patient: my current token ─────────────────────────────────────────────────
// GET /queue/myToken  (auth required)
queueRouter.get("/myToken", authenticate, async (req, res) => {
  const { userID } = req.body;
  try {
    const queues = await QueueModel.find({ date: today() });
    for (const q of queues) {
      const token = q.tokens.find(
        (t) => t.patientId === String(userID) && t.status !== "done"
      );
      if (token) {
        const waiting = q.tokens.filter((t) => t.status === "waiting");
        const position =
          waiting.findIndex((t) => t.patientId === String(userID)) + 1;
        return res.json({
          tokenNumber: token.tokenNumber,
          position: token.status === "serving" ? 0 : position,
          deptId: q.departmentId,
          deptName: q.deptName,
          status: token.status,
          currentServing: q.currentServing,
        });
      }
    }
    res.json(null); // not in any queue today
  } catch (e) {
    res.status(500).json({ msg: "Error fetching token" });
  }
});

// ── Doctor / Admin: call next patient ────────────────────────────────────────
// PATCH /queue/next/:deptId
queueRouter.patch("/next/:deptId", async (req, res) => {
  const { deptId } = req.params;
  try {
    const queue = await QueueModel.findOne({
      departmentId: Number(deptId),
      date: today(),
    });
    if (!queue) return res.status(404).json({ msg: "No queue found for today" });

    const next = queue.tokens.find((t) => t.status === "waiting");
    if (!next) {
      return res.json({ msg: "No more patients in queue", currentServing: queue.currentServing });
    }

    await QueueModel.findByIdAndUpdate(
      queue._id,
      {
        currentServing: next.tokenNumber,
        $set: {
          "tokens.$[done].status": "done",
          "tokens.$[next].status": "serving",
        },
      },
      {
        arrayFilters: [
          { "done.status": "serving" },
          { "next.tokenNumber": next.tokenNumber },
        ],
      }
    );

    await broadcast(deptId); // ← real-time push to all connected clients
    res.json({
      msg: "Called next patient",
      currentServing: next.tokenNumber,
      patientName: next.patientName,
    });
  } catch (e) {
    console.error("Call next error:", e);
    res.status(500).json({ msg: "Error advancing queue" });
  }
});

// ── Patient: leave queue ──────────────────────────────────────────────────────
// DELETE /queue/leave/:deptId  (auth required)
queueRouter.delete("/leave/:deptId", authenticate, async (req, res) => {
  const { userID } = req.body;
  const { deptId } = req.params;
  try {
    const queue = await QueueModel.findOne({
      departmentId: Number(deptId),
      date: today(),
    });
    if (!queue) return res.status(404).json({ msg: "Queue not found" });

    const token = queue.tokens.find(
      (t) => t.patientId === String(userID) && t.status === "waiting"
    );
    if (!token) return res.status(404).json({ msg: "You are not in this queue" });

    await QueueModel.findByIdAndUpdate(queue._id, {
      $set: { "tokens.$[t].status": "done" },
    }, {
      arrayFilters: [{ "t.patientId": String(userID), "t.status": "waiting" }],
    });

    await broadcast(deptId);
    res.json({ msg: "Left queue successfully" });
  } catch (e) {
    res.status(500).json({ msg: "Error leaving queue" });
  }
});

// ── Admin: reset today's queue ────────────────────────────────────────────────
// POST /queue/reset/:deptId
queueRouter.post("/reset/:deptId", async (req, res) => {
  try {
    await QueueModel.findOneAndDelete({
      departmentId: Number(req.params.deptId),
      date: today(),
    });
    await broadcast(req.params.deptId);
    res.json({ msg: "Queue reset for today" });
  } catch (e) {
    res.status(500).json({ msg: "Error resetting queue" });
  }
});

module.exports = { queueRouter };
