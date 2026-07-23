const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const logger = require("./utils/logger");

// Global HTTP request/response logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  const safeBody = { ...req.body };
  if (safeBody.password) safeBody.password = "********";
  
  logger.info(`Incoming request: ${req.method} ${req.originalUrl}`, {
    body: Object.keys(safeBody).length > 0 ? safeBody : undefined,
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400) {
      logger.error(`Request completed: ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
    } else {
      logger.success(`Request completed: ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

const { userRouter } = require("./routers/user.router");
const { connection } = require("./config/db");
const { doctorRouter } = require("./routers/doctor.router");
const { departmentRouter } = require("./routers/department.router");
const { appointmentRouter } = require("./routers/appointment.router");
const { queueRouter } = require("./routers/queue.router");
const { dashboardRouter } = require("./routers/adminDash.router");

app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "Hospital Appointment Backend API is running" });
});

app.use("/user", userRouter);
app.use("/department", departmentRouter);
app.use("/doctor", doctorRouter);
app.use("/appointment", appointmentRouter);
app.use("/queue", queueRouter);
app.use("/admin", dashboardRouter);

const PORT = process.env.PORT || process.env.port || 10000;

app.listen(PORT, async () => {
  try {
    await connection;
    console.log("Connected to DB");
    console.log(`Listening at port ${PORT}`);
  } catch (error) {
    console.log("Error in DB", error);
  }
});
