const { DoctorModel } = require("../models/doctor.model");
const doctorRouter = require("express").Router();

// get all
doctorRouter.get("/allDoctor", async (req, res) => {
  try {
    let doctor = await DoctorModel.find();
    res.status(201).send({ total: doctor.length, doctor });
  } catch (error) {
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
    res.status(201).send({ msg: "Doctor has been created", doctor });
  } catch (error) {
    console.error("Add doctor error:", error);
    res.status(500).send({ msg: "Error creating doctor — check for duplicate email/phone" });
  }
});

// PATCH add/update slots for a doctor
// Body: { date: "2026-05-20", slots: ["09:00","09:30","10:00"] }
doctorRouter.patch("/addSlots/:doctorId", async (req, res) => {
  const { date, slots } = req.body;
  if (!date || !Array.isArray(slots)) {
    return res.status(400).send({ msg: "date (string) and slots (array) are required" });
  }
  try {
    const doctor = await DoctorModel.findById(req.params.doctorId);
    if (!doctor) return res.status(404).send({ msg: "Doctor not found" });
    doctor.slots.set(date, slots);
    await doctor.save();
    res.send({ msg: `Slots set for ${date}`, doctor });
  } catch (error) {
    res.status(500).send({ msg: "Error updating slots", error: error.message });
  }
});

//SEARCH BY NAME
doctorRouter.get("/search", async (req, res) => {
  let query = req.query;
  //console.log(query);
  try {
    const result = await DoctorModel.find({
      doctorName: { $regex: query.q, $options: "i" },
    });
    res.send(result);
  } catch (err) {
    res.send({ "err in getting doctor details": err });
  }
});

// DOCTORS BY DEPARTMENT ID
doctorRouter.get("/allDoctor/:id", async (req, res) => {
  let id = req.params.id;
  // console.log(id);
  let isDoctorPresent = await DoctorModel.find({ departmentId: id });
  console.log(isDoctorPresent);
  if (isDoctorPresent.length === 0) {
    return res.status(201).send({ msg: "This Department have no doctors" });
  }
  try {
    let doctor = await DoctorModel.find({ departmentId: id });
    res.status(201).send({ total: doctor.length, doctor });
  } catch (error) {
    res.status(500).send({ msg: "Error in getting Dr. info.." });
  }
});

// DELETE A DOCTOR..
doctorRouter.delete("/removeDoctor/:id", async (req, res) => {
  let id = req.params.id;
  let isDoctorPresent = await DoctorModel.findById({ _id: id });
  if (!isDoctorPresent) {
    return res.status(500).send({ msg: "Doctor not found" });
  }
  try {
    let doctor = await DoctorModel.findByIdAndDelete({ _id: id })
      .then(() => {
        res.status(201).send({ msg: "Doctor deleted" });
      })
      .catch(() => {
        res.status(500).send({ msg: "Error in deleting the doctor" });
        console.log("Error deleting the doctor");
      });
  } catch (error) {
    res.status(500).send({ msg: "Error in deleting the doctor" });
  }
});

// DOCTOR PENDING FOR APPROVAL
doctorRouter.get("/docPending", async (req, res) => {
  try {
    var docPending = await DoctorModel.find({ status: false });
    if (!docPending || docPending.length === 0) {
      return res.send({ msg: "No Doc Pending for Approval" });
    }
    res.status(201).send({ msg: "Doc Pending", docPending });
  } catch (error) {
    console.log(error);
  }
});

// UPDATE THE DOCTOR STATUS..
doctorRouter.patch("/updateDoctorStatus/:id", async (req, res) => {
  let id = req.params.id;
  let isDoctorPresent = await DoctorModel.findById({ _id: id });
  if (!isDoctorPresent || isDoctorPresent.length === 0) {
    return res.status(404).send({ msg: "Doctor not found, check Id" });
  }
  try {
    if (req.body.status === true) {
      let payload = {
        ...isDoctorPresent._doc,
      };
      payload.status = true;
      console.log(payload);
    } else if (req.body.status === false) {
      await DoctorModel.findByIdAndDelete({ _id: id });
      return res.status(201).send({ msg: "Doctor Application Rejected" });
    }
    await DoctorModel.findByIdAndUpdate(id, { status: true });
    res.status(201).send({ msg: "Doctor Application Approved" });
  } catch (error) {
    res
      .status(500)
      .send({ msg: "Server error while updating the doctor Status" });
  }
});

// Update the availability status of a doctor by ID
doctorRouter.patch("/isAvailable/:doctorId", async (req, res) => {
  try {
    const doctorId = req.params.doctorId;

    // Check if the doctor with the given ID exists
    const doctor = await DoctorModel.findById({ _id: doctorId });
    if (!doctor) {
      return res
        .status(404)
        .json({ msg: "Doctor not found, please check the ID" });
    }

    // Update the availability status of the doctor
    const payload = { isAvailable: req.body.isAvailable };
    const updatedDoctor = await DoctorModel.findByIdAndUpdate(doctorId, {
      isAvailable: payload.isAvailable,
    });
    res.json({
      msg: "Doctor's status has been updated",
      doctor: updatedDoctor,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ msg: "Server error while updating the doctor status" });
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
    if (!doctor) return res.status(404).send({ msg: "Doctor not found" });
    res.send({ msg: "Profile updated successfully", doctor });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).send({ msg: "Error updating doctor profile", error: error.message });
  }
});

module.exports = {
  doctorRouter,
};
