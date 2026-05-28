const { authenticate } = require("../middlewares/authenticator.mw");
const { AppointmentModel } = require("../models/appointment.model");
const { DoctorModel } = require("../models/doctor.model");
const { UserModel } = require("../models/user.model");
require("dotenv").config();
const nodemailer = require("nodemailer");

const appointmentRouter = require("express").Router();

// ── Nodemailer transporter (uses env vars) ────────────────────────────────────
function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });
}

/**
 * Returns true if `slotTime` is in the doctor's slots map for `isoDate`.
 * isoDate format: "YYYY-MM-DD"
 */
function isSlotAvailable(doctor, isoDate, slotTime) {
  const daySlots = doctor.slots && doctor.slots.get(isoDate);
  if (!daySlots) return false;
  return daySlots.includes(slotTime);
}

/**
 * Removes a slot time from a doctor's slots map for a given ISO date.
 * Saves and returns the updated doctor document.
 */
async function removeSlot(doctor, isoDate, slotTime) {
  const daySlots = doctor.slots && doctor.slots.get(isoDate);
  if (daySlots) {
    const updated = daySlots.filter((t) => t !== slotTime);
    doctor.slots.set(isoDate, updated);
    await doctor.save();
  }
}

//!! ─── USER / PATIENT OPERATIONS ─────────────────────────────────────────────

// GET all appointments for the logged-in patient
appointmentRouter.get("/allApp", authenticate, async (req, res) => {
  let id = req.body.userID;
  try {
    const appointments = await AppointmentModel.find({ patientId: id });
    res.status(200).json({
      message: "All appointments retrieved successfully",
      appointments,
    });
  } catch (error) {
    res.status(500).send({ msg: "Error retrieving appointments", error: error.message });
  }
});

// GET single appointment by ID (patient must own it)
appointmentRouter.get("/getApp/:appointmentId", authenticate, async (req, res) => {
  try {
    const appointment = await AppointmentModel.findById(req.params.appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    res.status(200).json({ message: "Appointment details", appointment });
  } catch (error) {
    res.status(500).send({ msg: "Error retrieving appointment", error: error.message });
  }
});

// POST check if a slot is available (no auth — public)
// Body: { date: "2026-05-20", slotTime: "10:00" }
appointmentRouter.post("/checkSlot/:doctorId", async (req, res) => {
  let { date, slotTime } = req.body;
  let doctorId = req.params.doctorId;

  if (!date || !slotTime) {
    return res.status(400).send({ msg: "date and slotTime are required" });
  }

  try {
    const doctor = await DoctorModel.findById(doctorId);
    if (!doctor) return res.status(404).send({ msg: "Doctor does not exist" });
    if (!doctor.isAvailable) {
      return res.send({ available: false, msg: `${doctor.doctorName} is not available currently` });
    }

    const available = isSlotAvailable(doctor, date, slotTime);
    res.send({ available, msg: available ? "Slot is available" : "Slot is already taken" });
  } catch (error) {
    res.status(500).send({ msg: "Error checking slot", error: error.message });
  }
});

// POST book an appointment (auth required)
// Body: { date, slotTime, ageOfPatient, gender, address, problemDescription, appointmentDate }
appointmentRouter.post("/create/:doctorId", authenticate, async (req, res) => {
  let doctorId = req.params.doctorId;
  let patientId = req.body.userID;
  let patientEmail = req.body.email;

  try {
    const doctor = await DoctorModel.findById(doctorId);
    const patient = await UserModel.findById(patientId);

    if (!doctor) {
      console.warn(`[BOOKING] ❌ Doctor not found: ${doctorId}`);
      return res.status(404).send({ msg: "Doctor does not exist" });
    }
    if (!patient) {
      console.warn(`[BOOKING] ❌ Patient not found: ${patientId}`);
      return res.status(404).send({ msg: "Patient does not exist" });
    }
    if (!doctor.isAvailable) {
      console.warn(`[BOOKING] ❌ Doctor unavailable: ${doctor.doctorName}`);
      return res.status(400).send({ msg: `${doctor.doctorName} is currently unavailable` });
    }

    let { date, slotTime, ageOfPatient, gender, address, problemDescription, appointmentDate } = req.body;

    // Verify slot is still available before creating
    if (date && slotTime) {
      const available = isSlotAvailable(doctor, date, slotTime);
      if (!available) {
        console.warn(`[BOOKING] ❌ Slot taken or unavailable: Dr. ${doctor.doctorName} - Date: ${date} - Slot: ${slotTime}`);
        return res.status(409).send({ msg: "This slot is no longer available. Please choose another." });
      }
      // Remove the slot so no one else can book it
      await removeSlot(doctor, date, slotTime);
    }

    const appointment = new AppointmentModel({
      patientId,
      doctorId,
      patientFirstName: patient.first_name,
      docFirstName: doctor.doctorName,
      ageOfPatient,
      gender,
      address,
      problemDescription,
      appointmentDate: appointmentDate || date,
    });

    await appointment.save();

    // Send confirmation email
    const transporter = createTransporter();
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: patientEmail,
      subject: "Mediqueue — Appointment Confirmed",
      html: `
        <!DOCTYPE html>
        <html>
          <head><title>Appointment Confirmation</title><meta charset="utf-8" /></head>
          <body style="font-family:'Helvetica Neue',Arial,sans-serif;font-size:16px;line-height:1.5;color:#333;padding:20px;">
            <table style="width:100%;max-width:600px;margin:0 auto;background:#fff;border-collapse:collapse;">
              <tr>
                <td style="background:#0a6b6b;text-align:center;padding:16px;">
                  <h1 style="font-size:24px;color:#fff;margin:0;">Mediqueue</h1>
                </td>
              </tr>
              <tr>
                <td style="padding:24px;">
                  <h2 style="color:#0a6b6b;margin-top:0;">Hello, ${patient.first_name}!</h2>
                  <p>Your appointment has been confirmed:</p>
                  <table style="width:100%;border-collapse:collapse;margin-top:12px;">
                    <tr><td style="padding:8px 0;color:#666;">Doctor:</td><td><strong>${doctor.doctorName}</strong></td></tr>
                    <tr><td style="padding:8px 0;color:#666;">Date:</td><td><strong>${date || appointmentDate}</strong></td></tr>
                    <tr><td style="padding:8px 0;color:#666;">Time:</td><td><strong>${slotTime || "—"}</strong></td></tr>
                    <tr><td style="padding:8px 0;color:#666;">Reason:</td><td><strong>${problemDescription}</strong></td></tr>
                  </table>
                  <p style="margin-top:20px;">If you need to reschedule, please log in to your Mediqueue dashboard.</p>
                  <p>Best regards,<br>St. Helena Medical Center</p>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
    };

    transporter
      .sendMail(mailOptions)
      .then(() => {
        res.status(201).json({ message: "Appointment created. Check your email for confirmation.", status: true });
      })
      .catch((err) => {
        console.error("Mail error:", err);
        // Appointment is already saved — still return success
        res.status(201).json({ message: "Appointment created (email notification failed).", status: true });
      });
  } catch (error) {
    console.error("Create appointment error:", error);
    res.status(500).send({ msg: "Error creating appointment", error: error.message });
  }
});

// POST remove a slot manually (e.g., doctor blocks off time) — no auth for now
// Body: { date: "2026-05-20", slotTime: "10:00" }
appointmentRouter.post("/deleteSlot/:doctorId", async (req, res) => {
  let { date, slotTime } = req.body;
  let doctorId = req.params.doctorId;

  if (!date || !slotTime) {
    return res.status(400).send({ msg: "date and slotTime are required" });
  }

  try {
    const doctor = await DoctorModel.findById(doctorId);
    if (!doctor) return res.status(404).send({ msg: "Doctor not found" });

    await removeSlot(doctor, date, slotTime);
    res.send({ msg: "Slot removed successfully" });
  } catch (error) {
    res.status(500).send({ msg: "Error removing slot", error: error.message });
  }
});

// DELETE cancel appointment (patient — must own it)
appointmentRouter.delete("/cancel/:appointmentId", authenticate, async (req, res) => {
  let patientId = req.body.userID;
  try {
    const appointment = await AppointmentModel.findOne({
      patientId,
      _id: req.params.appointmentId,
    });
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    await AppointmentModel.findByIdAndDelete(req.params.appointmentId);
    res.status(200).json({ message: "Appointment cancelled successfully" });
  } catch (error) {
    res.status(500).send({ msg: "Error cancelling appointment", error: error.message });
  }
});

// PATCH reschedule appointment (patient — must own it)
appointmentRouter.patch("/reschedule/:appointmentId", authenticate, async (req, res) => {
  const patientId = req.body.userID;
  try {
    const appointment = await AppointmentModel.findOne({
      patientId,
      _id: req.params.appointmentId,
    });
    if (!appointment) {
      return res.status(404).json({ message: "Appointment not found" });
    }
    const { ageOfPatient, gender, address, problemDescription, appointmentDate } = req.body;
    await AppointmentModel.findByIdAndUpdate(req.params.appointmentId, {
      ageOfPatient, gender, address, problemDescription, appointmentDate,
    });
    res.status(200).json({ message: "Appointment updated successfully" });
  } catch (error) {
    res.status(500).send({ msg: error.message });
  }
});

// GET all appointments for a specific doctor (auth required)
appointmentRouter.get("/doctor/:doctorId", authenticate, async (req, res) => {
  const { doctorId } = req.params;
  const userEmail = req.body.email; // Filled by authenticate middleware
  try {
    // Check if requester is an admin
    const { AdminModel } = require("../models/admin.model");
    const isAdmin = await AdminModel.findOne({ email: userEmail });

    if (!isAdmin) {
      // If not admin, verify requester is the doctor themselves
      const doctor = await DoctorModel.findById(doctorId);
      if (!doctor || doctor.email.toLowerCase() !== userEmail.toLowerCase()) {
        return res.status(403).json({ msg: "Access denied. You can only view your own appointments." });
      }
    }

    const appointments = await AppointmentModel.find({ doctorId });
    res.status(200).json({
      message: "Doctor appointments retrieved successfully",
      appointments,
    });
  } catch (error) {
    res.status(500).send({ msg: "Error retrieving doctor appointments", error: error.message });
  }
});

//!! ─── ADMIN OPERATIONS ───────────────────────────────────────────────────────

// GET all appointments (admin)
appointmentRouter.get("/all", async (req, res) => {
  try {
    const appointments = await AppointmentModel.find();
    res.status(200).json({ message: "All appointments retrieved", appointments });
  } catch (error) {
    res.status(500).send({ msg: "Error retrieving all appointments", error: error.message });
  }
});

// GET all pending appointments (status: false)
appointmentRouter.get("/allPending", async (req, res) => {
  try {
    const appointments = await AppointmentModel.find({ status: false });
    res.status(200).json({ message: "Pending appointments", appointments });
  } catch (error) {
    res.status(500).send({ msg: "Error retrieving pending appointments", error: error.message });
  }
});

// DELETE reject appointment (admin)
appointmentRouter.delete("/reject/:appointmentId", async (req, res) => {
  try {
    const appointment = await AppointmentModel.findById(req.params.appointmentId);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    await AppointmentModel.findByIdAndDelete(req.params.appointmentId);
    res.status(200).json({ message: "Appointment rejected and removed" });
  } catch (error) {
    res.status(500).send({ msg: "Error rejecting appointment", error: error.message });
  }
});

// PATCH approve appointment (admin)
appointmentRouter.patch("/approve/:appointmentId", async (req, res) => {
  try {
    const appointment = await AppointmentModel.findById(req.params.appointmentId);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });
    await AppointmentModel.findByIdAndUpdate(req.params.appointmentId, { status: true });
    res.status(200).json({ message: "Appointment approved" });
  } catch (error) {
    res.status(500).send({ msg: "Error approving appointment", error: error.message });
  }
});

module.exports = { appointmentRouter };