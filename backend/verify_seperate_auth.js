const path = require("path");
const backendDir = "c:/Users/user/Desktop/cj_work/Hospital-appointment-booking-system/backend";
const mongoose = require(path.join(backendDir, "node_modules/mongoose"));
require(path.join(backendDir, "node_modules/dotenv")).config({ path: path.join(backendDir, ".env") });

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const BASE_URL = "http://localhost:5000";

async function run() {
  console.log("Connecting to database for clean-up...");
  await mongoose.connect(process.env.mongoURL);
  
  // Clean up any existing test records
  const db = mongoose.connection.db;
  await db.collection("users").deleteMany({ email: { $in: ["patient_test_auth@hospital.com", "doctor_test_auth@hospital.com"] } });
  await db.collection("doctors").deleteMany({ email: "doctor_test_auth@hospital.com" });
  console.log("Cleaned up any previous test user/doctor records.\n");
  await mongoose.disconnect();

  // ----------------------------------------------------
  // TEST 1: Patient Sign Up & Sign In
  // ----------------------------------------------------
  console.log("[TEST 1] Patient Sign Up...");
  const signupPatRes = await fetch(`${BASE_URL}/user/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: "Patient",
      last_name: "Auth",
      email: "patient_test_auth@hospital.com",
      mobile: "+2348100000001",
      password: "password123"
    })
  });
  console.log("Patient Signup status:", signupPatRes.status);
  
  console.log("[TEST 1] Patient Sign In...");
  const signinPatRes = await fetch(`${BASE_URL}/user/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: "patient_test_auth@hospital.com",
      password: "password123"
    })
  });
  console.log("Patient Signin status:", signinPatRes.status);
  const patData = await signinPatRes.json();
  console.log("Patient Signin response user name:", patData.name, patData.last_name);
  if (!patData.token) {
    throw new Error("Patient Sign In failed to return a token");
  }
  console.log("SUCCESS: Patient Sign Up & Sign In passed!\n");

  // ----------------------------------------------------
  // TEST 2: Doctor Sign Up (Account + Profile)
  // ----------------------------------------------------
  console.log("[TEST-2-1] Doctor Account Sign Up...");
  const signupDocRes = await fetch(`${BASE_URL}/user/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: "Doctor",
      last_name: "Auth",
      email: "doctor_test_auth@hospital.com",
      mobile: "+2348100000002",
      password: "password123"
    })
  });
  console.log("Doctor Signup status:", signupDocRes.status);

  console.log("[TEST-2-2] Doctor Sign In to get token for profile creation...");
  const signinDocTokenRes = await fetch(`${BASE_URL}/user/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: "doctor_test_auth@hospital.com",
      password: "password123"
    })
  });
  const docTokenData = await signinDocTokenRes.json();
  const docToken = docTokenData.token;
  if (!docToken) {
    throw new Error("Doctor token retrieval failed");
  }

  console.log("[TEST-2-3] Doctor Profile Creation (Defaulting departmentId to 1)...");
  const createProfileRes = await fetch(`${BASE_URL}/doctor/addDoctor`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": docToken
    },
    body: JSON.stringify({
      doctorName: "Dr. Doctor Auth",
      email: "doctor_test_auth@hospital.com",
      qualifications: "Cardiology",
      experience: "10",
      phoneNo: "+2348100000002",
      city: "Lagos",
      departmentId: 1, // Default Cardiology
      isAvailable: true,
      status: true
    })
  });
  console.log("Doctor Profile creation status:", createProfileRes.status);
  const createdProfile = await createProfileRes.json();
  console.log("Doctor Profile response status msg:", createdProfile.msg);
  if (createProfileRes.status !== 201) {
    throw new Error("Doctor profile creation failed");
  }
  console.log("SUCCESS: Doctor Account and Profile successfully created in one flow!\n");

  // ----------------------------------------------------
  // TEST 3: Separate Doctor login flow verification
  // ----------------------------------------------------
  console.log("[TEST 3] Verifying Doctor portal signin requirements...");
  const signinDocRes = await fetch(`${BASE_URL}/user/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: "doctor_test_auth@hospital.com",
      password: "password123"
    })
  });
  console.log("Doctor signin status:", signinDocRes.status);
  const docSigninData = await signinDocRes.json();

  // Find doctor profile matching signin email
  const allDoctorsRes = await fetch(`${BASE_URL}/doctor/allDoctor`);
  const allDocData = await allDoctorsRes.json();
  const matchedDoctor = (allDocData.doctor || []).find(
    d => d.email.toLowerCase() === docSigninData.email.toLowerCase()
  );

  console.log("Matched Doctor Profile:", matchedDoctor ? matchedDoctor.doctorName : "NOT FOUND");
  if (!matchedDoctor) {
    throw new Error("Doctor profile verification failed after sign in");
  }
  console.log("SUCCESS: Separate Doctor login checks pass!\n");

  // Clean up database test records
  console.log("Reconnecting database for clean-up...");
  await mongoose.connect(process.env.mongoURL);
  const dbClean = mongoose.connection.db;
  await dbClean.collection("users").deleteMany({ email: { $in: ["patient_test_auth@hospital.com", "doctor_test_auth@hospital.com"] } });
  await dbClean.collection("doctors").deleteMany({ email: "doctor_test_auth@hospital.com" });
  console.log("Cleaned up database test records.");

  console.log("\n==========================================");
  console.log("🎉 SEPARATE AUTH INTEGRATION TESTS PASSED 🎉");
  console.log("==========================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed:", err);
  mongoose.disconnect().then(() => process.exit(1));
});
