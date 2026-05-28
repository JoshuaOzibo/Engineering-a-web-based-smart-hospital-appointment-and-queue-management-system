const { AdminModel } = require("../models/admin.model");
const { AppointmentModel } = require("../models/appointment.model");
const { DepartmentModel } = require("../models/department.model");
const { DoctorModel } = require("../models/doctor.model");
const { PatientModel } = require("../models/patient.model");
const { UserModel } = require("../models/user.model");
const logger = require("../utils/logger");
const dashboardRouter = require("express").Router();


dashboardRouter.post("/signin", async (req, res) => {
  let { email, password } = req.body;
  logger.info(`[ADMIN LOGIN] Attempt — email: ${email}`);
  try {
    // Auto-seed default admin if none exists
    const adminCount = await AdminModel.countDocuments();
    if (adminCount === 0) {
      const defaultAdmin = new AdminModel({
        name: "Super Admin",
        email: "admin@hospital.com",
        password: "admin123",
      });
      await defaultAdmin.save();
      logger.success("[ADMIN LOGIN] 🛡️ Seeded default admin: admin@hospital.com / admin123");
    }

    let admin = await AdminModel.findOne({ email: email });
    if (admin) {
      if (password === admin.password) {
        logger.success(`[ADMIN LOGIN] ✅ Success — admin: ${email}`);
        res.send({
          message: "Login Successful",
        });
      } else {
        logger.warn(`[ADMIN LOGIN] ❌ Wrong password — admin: ${email}`);
        res.send({
          message: "Wrong Admin Password",
        });
      }
    } else {
      logger.warn(`[ADMIN LOGIN] ❌ Admin not found — email: ${email}`);
      res.send({
        message: "Wrong Admin Email",
      });
    }
  } catch (e) {
    logger.error(`[ADMIN LOGIN] ❌ Error: ${e.message}`);
    res.status(500).send({ msg: "Error in Login " + e.message });
  }
});

dashboardRouter.post('/signup',async(req,res)=>{
  let { name, email, password } = req.body;
  try {
    let admin = new AdminModel({name, email, password})
    await admin.save();
    logger.success(`[ADMIN SIGNUP] Admin created successfully: ${email}`);
    res.send('Admin Signup')
  } catch (error) {
    logger.error(`[ADMIN SIGNUP] Error creating admin: ${error.message}`);
    res.status(500).send({ msg: "Error signing up admin", error: error.message });
  }
})

//!! ALL DETAILS ------------------------------->
dashboardRouter.get("/all", async (req, res) => {
  try {
    let users = await UserModel.find();
    let docs = await DoctorModel.find();
    let dept = await DepartmentModel.find();
    let appointments = await AppointmentModel.find();

    let docPending = docs.filter((e) => {
      return e.status === false;
    });
    let docApproved = docs.filter((e) => {
      return e.status === true;
    });
    let appPending = appointments.filter((e) => {
      return e.status === false;
    });
    let appApproved = appointments.filter((e) => {
      return e.status === true;
    });
    logger.success(`[ADMIN DASHBOARD] Retrieved aggregate data. Doctors: ${docs.length} (${docPending.length} pending), Appointments: ${appointments.length} (${appPending.length} pending), Users: ${users.length}`);
    res.send({
      msg: "Dashboard Done",
      docPending: docPending,
      docApproved: docApproved,
      department: dept,
      usersRegistered: users,
      appPending: appPending,
      appApproved: appApproved,
      totalAppointments: appointments.length,
      totalPendingAppointments: appPending.length,
    });
  } catch (error) {
    logger.error(`[ADMIN DASHBOARD] Error: ${error.message}`);
    res.status(500).send({ msg: "Error loading dashboard metrics", error: error.message });
  }
});

module.exports = { dashboardRouter };
