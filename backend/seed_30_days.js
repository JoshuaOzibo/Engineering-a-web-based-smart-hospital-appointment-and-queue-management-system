const mongoose = require("mongoose");
require("dotenv").config();
const { DoctorModel } = require("./models/doctor.model");

const DEFAULT_SLOTS = [
  "09:00", "09:30", "10:00", "10:30",
  "11:00", "11:30", "12:00", "14:00",
  "14:30", "15:00", "15:30", "16:00",
  "16:30", "17:00"
];

function getNext30Days() {
  const dates = [];
  for (let i = 0; i < 30; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    dates.push(`${year}-${month}-${day}`);
  }
  return dates;
}

async function seed30DaysSlots() {
  try {
    const mongoURL = process.env.mongoURL || process.env.MONGO_URL;
    if (!mongoURL) {
      console.error("No mongoURL found in environment");
      process.exit(1);
    }

    await mongoose.connect(mongoURL);
    console.log("Connected to MongoDB");

    const doctors = await DoctorModel.find();
    console.log(`Found ${doctors.length} doctor(s) in database`);

    const days30 = getNext30Days();

    for (const doc of doctors) {
      doc.isAvailable = true;
      doc.status = true; // Ensure active approval

      if (!doc.slots) {
        doc.slots = new Map();
      }

      // Populate 30 days from today
      for (const dateStr of days30) {
        const existing = doc.slots.get ? doc.slots.get(dateStr) : doc.slots[dateStr];
        if (!existing || !Array.isArray(existing) || existing.length === 0) {
          doc.slots.set(dateStr, [...DEFAULT_SLOTS]);
        }
      }

      await doc.save();
      console.log(`Updated Dr. ${doc.doctorName} (${doc._id}) with 30 days of available slots starting ${days30[0]} to ${days30[days30.length - 1]}`);
    }

    console.log("Successfully updated all doctors with 30 days of availability!");
  } catch (err) {
    console.error("Error updating doctor slots:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  }
}

seed30DaysSlots();
