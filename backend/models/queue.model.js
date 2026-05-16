const mongoose = require("mongoose");

/**
 * One document per (departmentId, date) pair.
 * The queue auto-resets each day because all queries filter by today's ISO date.
 */
const queueSchema = mongoose.Schema(
  {
    departmentId:   { type: Number, required: true },
    deptName:       { type: String, required: true },
    date:           { type: String, required: true }, // "YYYY-MM-DD"
    currentServing: { type: Number, default: 0 },
    lastIssued:     { type: Number, default: 0 },
    tokens: [
      {
        tokenNumber: { type: Number },
        patientId:   { type: String },
        patientName: { type: String },
        issuedAt:    { type: Date, default: Date.now },
        status:      { type: String, enum: ["waiting", "serving", "done"], default: "waiting" },
      },
    ],
  },
  { versionKey: false }
);

// Prevent duplicate queues for the same dept on the same day
queueSchema.index({ departmentId: 1, date: 1 }, { unique: true });

const QueueModel = mongoose.model("Queue", queueSchema);
module.exports = { QueueModel };
