const { DoctorModel } = require("../models/doctor.model");
const logger = require("../utils/logger");
const doctorRouter = require("express").Router();

// get all
doctorRouter.get("/allDoctor", async (req, res) => {
  try {
    let doctor = await DoctorModel.find();
    logger.success(`Retrieved all ${doctor.length} doctors`);
    res.status(201).send({ total: doctor.length, doctor });
  } catch (error) {
    logger.error(`Error in getting dr info: ${error.message}`);
    res.status(500).send({ msg: "Error in getting dr info.." });
  }
});

// Add a Doctor
// Optionally pass `slots` as an object: { "2026-05-20": ["09:00","10:00"], ... }
doctorRouter.post("/addDoctor", async (req, res) => {
  let {
    doctorName,
    email,
    qualifications,
    experience,
    phoneNo,
    city,
    departmentId,
    status,
    image,
    isAvailable,
    rating,
    slots, // optional — { "YYYY-MM-DD": ["HH:MM", ...] }
  } = req.body;
  try {
    let doctor = new DoctorModel({
      doctorName,
      email,
      qualifications,
      experience,
      phoneNo,
      city,
      departmentId,
      status,
      image,
      isAvailable,
      rating: rating || 0,
      slots: slots || {}, // empty map by default; seed via PATCH /addSlots
    });
    await doctor.save();
    logger.success(`Doctor created successfully: Dr. ${doctorName} (Email: ${email})`);
    res.status(201).send({ msg: "Doctor has been created", doctor });
  } catch (error) {
    logger.error(`Error creating doctor ${doctorName} (Email: ${email}): ${error.message}`);
    res.status(500).send({ msg: "Error creating doctor — check for duplicate email/phone" });
  }
});

// PATCH add/update slots for a doctor
// Body: { date: "2026-05-20", slots: ["09:00","09:30","10:00"] }
doctorRouter.patch("/addSlots/:doctorId", async (req, res) => {
  const { date, slots } = req.body;
  if (!date || !Array.isArray(slots)) {
    logger.warn(`AddSlots missing date or slots array for doctor ${req.params.doctorId}`);
    return res.status(400).send({ msg: "date (string) and slots (array) are required" });
  }
  try {
    const doctor = await DoctorModel.findById(req.params.doctorId);
    if (!doctor) {
      logger.warn(`AddSlots: Doctor ${req.params.doctorId} not found`);
      return res.status(404).send({ msg: "Doctor not found" });
    }
    doctor.slots.set(date, slots);
    await doctor.save();
    logger.success(`Slots successfully set for Dr. ${doctor.doctorName} on date ${date}: [${slots.join(", ")}]`);
    res.send({ msg: `Slots set for ${date}`, doctor });
  } catch (error) {
    logger.error(`Error updating slots for doctor ${req.params.doctorId} on date ${date}: ${error.message}`);
    res.status(500).send({ msg: "Error updating slots", error: error.message });
  }
});

//SEARCH BY NAME
doctorRouter.get("/search", async (req, res) => {
  let query = req.query;
  try {
    const result = await DoctorModel.find({
      doctorName: { $regex: query.q, $options: "i" },
    });
    logger.success(`Doctor search query "${query.q}" returned ${result.length} matches`);
    res.send(result);
  } catch (err) {
    logger.error(`Error searching doctor for query "${query.q}": ${err.message}`);
    res.send({ "err in getting doctor details": err });
  }
});

// DOCTORS BY DEPARTMENT ID
doctorRouter.get("/allDoctor/:id", async (req, res) => {
  let id = req.params.id;
  try {
    let doctor = await DoctorModel.find({ departmentId: id });
    if (doctor.length === 0) {
      logger.info(`Department ${id} has no doctors`);
      return res.status(201).send({ msg: "This Department have no doctors", total: 0, doctor: [] });
    }
    logger.success(`Retrieved ${doctor.length} doctors for department ID: ${id}`);
    res.status(201).send({ total: doctor.length, doctor });
  } catch (error) {
    logger.error(`Error in getting Dr. info for department ID ${id}: ${error.message}`);
    res.status(500).send({ msg: "Error in getting Dr. info.." });
  }
});

// DELETE A DOCTOR..
doctorRouter.delete("/removeDoctor/:id", async (req, res) => {
  let id = req.params.id;
  try {
    let doctor = await DoctorModel.findByIdAndDelete({ _id: id });
    if (!doctor) {
      logger.warn(`Delete Doctor failed: Doctor ${id} not found`);
      return res.status(404).send({ msg: "Doctor not found" });
    }
    logger.success(`Doctor ${id} (Dr. ${doctor.doctorName}) successfully deleted`);
    res.status(201).send({ msg: "Doctor deleted" });
  } catch (error) {
    logger.error(`Error deleting doctor ${id}: ${error.message}`);
    res.status(500).send({ msg: "Error in deleting the doctor" });
  }
});

// DOCTOR PENDING FOR APPROVAL
doctorRouter.get("/docPending", async (req, res) => {
  try {
    var docPending = await DoctorModel.find({ status: false });
    logger.success(`Retrieved ${docPending.length} pending doctor applications`);
    if (!docPending || docPending.length === 0) {
      return res.send({ msg: "No Doc Pending for Approval", docPending: [] });
    }
    res.status(201).send({ msg: "Doc Pending", docPending });
  } catch (error) {
    logger.error(`Error fetching pending doctors: ${error.message}`);
    res.status(500).send({ msg: "Error retrieving pending doctors" });
  }
});

// UPDATE THE DOCTOR STATUS..
doctorRouter.patch("/updateDoctorStatus/:id", async (req, res) => {
  let id = req.params.id;
  try {
    let doctor = await DoctorModel.findById(id);
    if (!doctor) {
      logger.warn(`Update status failed: Doctor ${id} not found`);
      return res.status(404).send({ msg: "Doctor not found, check Id" });
    }
    if (req.body.status === true) {
      doctor.status = true;
      await doctor.save();
      logger.success(`Doctor application approved: Dr. ${doctor.doctorName} (${id})`);
      res.status(201).send({ msg: "Doctor Application Approved" });
    } else if (req.body.status === false) {
      await DoctorModel.findByIdAndDelete(id);
      logger.success(`Doctor application rejected and deleted: Dr. ${doctor.doctorName} (${id})`);
      return res.status(201).send({ msg: "Doctor Application Rejected" });
    } else {
      res.status(400).send({ msg: "status field must be true or false" });
    }
  } catch (error) {
    logger.error(`Error updating doctor status for ${id}: ${error.message}`);
    res.status(500).send({ msg: "Server error while updating the doctor Status" });
  }
});

// Update the availability status of a doctor by ID
doctorRouter.patch("/isAvailable/:doctorId", async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    const { isAvailable } = req.body;

    const doctor = await DoctorModel.findById(doctorId);
    if (!doctor) {
      logger.warn(`Toggle availability failed: Doctor ${doctorId} not found`);
      return res.status(404).json({ msg: "Doctor not found, please check the ID" });
    }

    doctor.isAvailable = isAvailable;
    await doctor.save();
    logger.success(`Doctor availability set to ${isAvailable} for Dr. ${doctor.doctorName} (${doctorId})`);
    res.json({
      msg: "Doctor's status has been updated",
      doctor,
    });
  } catch (error) {
    logger.error(`Error toggling doctor availability for ${req.params.doctorId}: ${error.message}`);
    res.status(500).json({ msg: "Server error while updating the doctor status" });
  }
});

// UPDATE DOCTOR PROFILE (self-service — called by the logged-in doctor)
// Accepts: doctorName, qualifications, experience, phoneNo, city, departmentId, isAvailable
doctorRouter.patch("/updateProfile/:doctorId", async (req, res) => {
  const { doctorId } = req.params;
  const allowedFields = ["doctorName", "qualifications", "experience", "phoneNo", "city", "departmentId", "isAvailable"];
  const updatePayload = {};
  for (const field of allowedFields) {
    if (req.body[field] !== undefined) {
      updatePayload[field] = req.body[field];
    }
  }

  if (Object.keys(updatePayload).length === 0) {
    return res.status(400).send({ msg: "No valid fields provided to update." });
  }

  try {
    const doctor = await DoctorModel.findByIdAndUpdate(doctorId, updatePayload, { new: true });
    if (!doctor) {
      logger.warn(`Profile update failed: Doctor ${doctorId} not found`);
      return res.status(404).send({ msg: "Doctor not found" });
    }
    logger.success(`Doctor profile updated for Dr. ${doctor.doctorName} (${doctorId})`, { updatePayload });
    res.send({ msg: "Profile updated successfully", doctor });
  } catch (error) {
    logger.error(`Error updating profile for doctor ${doctorId}: ${error.message}`);
    res.status(500).send({ msg: "Error updating doctor profile", error: error.message });
  }
});

// PATCH submit doctor rating
doctorRouter.patch("/rate/:doctorId", async (req, res) => {
  const { doctorId } = req.params;
  const { rating } = req.body;
  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).send({ msg: "Rating must be a number between 1 and 5" });
  }
  try {
    const doctor = await DoctorModel.findById(doctorId);
    if (!doctor) {
      logger.warn(`Submit rating failed: Doctor ${doctorId} not found`);
      return res.status(404).send({ msg: "Doctor not found" });
    }

    const oldRating = doctor.rating || 0;
    const newRating = oldRating === 0 ? rating : parseFloat(((oldRating * 4 + rating) / 5).toFixed(1));

    doctor.rating = newRating;
    await doctor.save();
    logger.success(`Doctor Dr. ${doctor.doctorName} rated ${rating} stars. New average: ${newRating}`);
    res.send({ msg: "Doctor rated successfully", rating: doctor.rating });
  } catch (error) {
    logger.error(`Error rating doctor ${doctorId}: ${error.message}`);
    res.status(500).send({ msg: "Error rating doctor", error: error.message });
  }
});

module.exports = {
  doctorRouter,
};
