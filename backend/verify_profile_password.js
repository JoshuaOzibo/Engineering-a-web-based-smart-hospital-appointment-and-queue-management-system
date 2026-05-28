const path = require("path");
const backendDir = "c:/Users/user/Desktop/cj_work/Hospital-appointment-booking-system/backend";
const mongoose = require(path.join(backendDir, "node_modules/mongoose"));
require(path.join(backendDir, "node_modules/dotenv")).config({ path: path.join(backendDir, ".env") });

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const BASE_URL = "http://localhost:5000";

async function run() {
  console.log("Connecting to database for clean-up...");
  await mongoose.connect(process.env.mongoURL);
  
  const db = mongoose.connection.db;
  await db.collection("users").deleteMany({ email: "profile_test_auth@hospital.com" });
  console.log("Cleaned up any previous test user records.\n");
  await mongoose.disconnect();

  // 1. Sign Up Test Account
  console.log("[STEP 1] Signing up new user...");
  const signupRes = await fetch(`${BASE_URL}/user/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      first_name: "Original",
      last_name: "User",
      email: "profile_test_auth@hospital.com",
      mobile: "+2348999999999",
      password: "initialPassword"
    })
  });
  console.log("Signup status:", signupRes.status);

  // 2. Sign In to get current token
  console.log("[STEP 2] Signing in with initial password...");
  const signinRes = await fetch(`${BASE_URL}/user/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: "profile_test_auth@hospital.com",
      password: "initialPassword"
    })
  });
  const signinData = await signinRes.json();
  const token = signinData.token;
  if (!token) {
    throw new Error("Signin failed - did not get token");
  }
  console.log("Initial signin success!");

  // 3. Update profile with new details and a new password
  console.log("[STEP 3] Updating profile details and password...");
  const updateRes = await fetch(`${BASE_URL}/user/update`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "Authorization": token
    },
    body: JSON.stringify({
      first_name: "Updated",
      last_name: "Name",
      email: "profile_test_auth@hospital.com",
      mobile: "+2348999999991",
      password: "newPassword123"
    })
  });
  console.log("Update status:", updateRes.status);
  const updateData = await updateRes.json();
  console.log("Update response:", updateData);
  if (updateRes.status !== 200) {
    throw new Error("Update request failed");
  }

  // 4. Try signin with old password (should fail)
  console.log("[STEP 4] Testing signin with OLD password (should fail)...");
  const signinOldRes = await fetch(`${BASE_URL}/user/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: "profile_test_auth@hospital.com",
      password: "initialPassword"
    })
  });
  console.log("Old password login status:", signinOldRes.status);
  if (signinOldRes.status === 200) {
    throw new Error("FAIL: Old password was still accepted!");
  }
  console.log("Old password successfully rejected!");

  // 5. Try signin with new password (should succeed)
  console.log("[STEP 5] Testing signin with NEW password (should succeed)...");
  const signinNewRes = await fetch(`${BASE_URL}/user/signin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      payload: "profile_test_auth@hospital.com",
      password: "newPassword123"
    })
  });
  console.log("New password login status:", signinNewRes.status);
  const newSigninData = await signinNewRes.json();
  if (signinNewRes.status !== 200 || !newSigninData.token) {
    throw new Error("FAIL: Login with new password failed!");
  }
  console.log("New password login succeeded! User name returned:", newSigninData.name, newSigninData.last_name);

  // Clean up
  console.log("Reconnecting database for clean-up...");
  await mongoose.connect(process.env.mongoURL);
  const dbClean = mongoose.connection.db;
  await dbClean.collection("users").deleteMany({ email: "profile_test_auth@hospital.com" });
  console.log("Cleaned up database test records.");

  console.log("\n==============================================");
  console.log("🎉 PATIENT PROFILE PASSWORD UPDATE TESTS PASSED 🎉");
  console.log("==============================================\n");

  await mongoose.disconnect();
  process.exit(0);
}

run().catch(err => {
  console.error("Test failed:", err);
  mongoose.disconnect().then(() => process.exit(1));
});
