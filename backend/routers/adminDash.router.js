const { AdminModel } = require("../models/admin.model");
const { AppointmentModel } = require("../models/appointment.model");
const { DepartmentModel } = require("../models/department.model");
const { DoctorModel } = require("../models/doctor.model");
const { PatientModel } = require("../models/patient.model");
const { UserModel } = require("../models/user.model");
const dashboardRouter = require("express").Router();


dashboardRouter.post("/signin", async (req, res) => {
  let { email, password } = req.body;
  console.log(`\n[ADMIN LOGIN] Attempt — email: ${email}`);
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
      console.log("[ADMIN LOGIN] 🛡️ Seeded default admin: admin@hospital.com / admin123");
    }

    let admin = await AdminModel.findOne({ email: email });
    if (admin) {
      if (password === admin.password) {
        console.log(`[ADMIN LOGIN] ✅ Success — admin: ${email}`);
        res.send({
          message: "Login Successful",
        });
      } else {
        console.log(`[ADMIN LOGIN] ❌ Wrong password — admin: ${email}`);
        res.send({
          message: "Wrong Admin Password",
        });
      }
    } else {
      console.log(`[ADMIN LOGIN] ❌ Admin not found — email: ${email}`);
      res.send({
        message: "Wrong Admin Email",
      });
    }
  } catch (e) {
    console.error(`[ADMIN LOGIN] ❌ Error:`, e.message);
    res.send({ msg: "Error in Login" + e });
  }
});

dashboardRouter.post('/signup',async(req,res)=>{
  let { name, email, password } = req.body;
  try {
    let admin =new  AdminModel({name, email,password})
    await admin.save();
    res.send('Admin Signup')
  } catch (error) {
    
  }
})

//!! ALL DETAILS ------------------------------->
dashboardRouter.get("/all", async (req, res) => {
  try {
    let users = await UserModel.find();
    let docs = await DoctorModel.find();
    let dept = await DepartmentModel.find();
    let appointments = await AppointmentModel.find();
    // console.log(users, docs, appointment, dept)

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
    console.log({ msg: "Error" });
  }
});

module.exports = { dashboardRouter };
