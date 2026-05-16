const mongoose = require("mongoose");

/**
 * `slots` is a dynamic Map keyed by ISO date string (e.g. "2026-05-20")
 * and whose values are arrays of available time strings (e.g. ["09:00", "10:30"]).
 * When a slot is booked, the time string is removed from that date's array.
 */
const doctorSchema = mongoose.Schema(
  {
    doctorName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    qualifications: { type: String, required: true },
    experience: { type: String, required: true },
    phoneNo: { type: String, required: true, unique: true },
    city: { type: String, required: true },
    departmentId: { type: Number, required: true },
    status: { type: Boolean, default: false },
    image: { type: String },
    isAvailable: { type: Boolean, default: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    // Dynamic date-keyed slot map: { "2026-05-20": ["09:00", "10:30", ...] }
    slots: { type: Map, of: [String], default: {} },
  },
  { versionKey: false }
);

const DoctorModel = mongoose.model("Doctors", doctorSchema);

module.exports = { DoctorModel };
