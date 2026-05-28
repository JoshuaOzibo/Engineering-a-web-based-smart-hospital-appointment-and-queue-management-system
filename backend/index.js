const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(express.json());
app.use(cors());

const { userRouter }       = require("./routers/user.router");
const { connection }       = require("./config/db");
const { doctorRouter }     = require("./routers/doctor.router");
const { departmentRouter } = require("./routers/department.router");
const { appointmentRouter }= require("./routers/appointment.router");
const { queueRouter }      = require("./routers/queue.router");

app.use("/user",        userRouter);
app.use("/department",  departmentRouter);
app.use("/doctor",      doctorRouter);
app.use("/appointment", appointmentRouter);
app.use("/queue",       queueRouter);

app.listen(process.env.port, async () => {
  try {
    await connection;
    console.log("Connected to DB");
    console.log(`Listening at ${process.env.port}`);
  } catch (error) {
    console.log("Error in DB", error);
  }
});
