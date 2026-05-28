const { UserModel } = require("../models/user.model");
const { authenticate } = require("../middlewares/authenticator.mw");
const userRouter = require("express").Router();
require("dotenv").config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const cors = require("cors");
const nodemailer = require("nodemailer");
const otpGenerator = require("otp-generator");

userRouter.use(cors());

// Module-level OTP store (stateless per-request — good enough for single instance)
var otp;

userRouter.get("/", async (req, res) => {
  res.send({ msg: "Home Page" });
});

// ── Send OTP email (email sending disabled — signup works without SMTP) ────────
userRouter.post("/emailVerify", async (req, res) => {
  let { email } = req.body;
  // Email delivery is currently disabled. Signup proceeds without OTP verification.
  res.send({ msg: "Verification step skipped. Proceed to create your account.", email });
});

// ── Sign Up ───────────────────────────────────────────────────────────────────
userRouter.post("/signup", async (req, res) => {
  let { first_name, last_name, email, mobile, password } = req.body;

  console.log(`\n[SIGNUP] Attempt — email: ${email}, mobile: ${mobile}`);

  const isPresent = await UserModel.findOne({ email });
  if (isPresent) {
    console.log(`[SIGNUP] ❌ Already registered — email: ${email}`);
    return res.status(409).send({ msg: "User already registered" });
  }

  try {
    const hash = await bcrypt.hash(password, 5);
    const user = new UserModel({
      first_name,
      last_name,
      email,
      mobile,
      password: hash,
    });
    await user.save();
    console.log(`[SIGNUP] ✅ Success — ${first_name} ${last_name} <${email}> (id: ${user._id})`);
    res.status(201).send({ msg: "Signup Successful" });
  } catch (error) {
    console.error(`[SIGNUP] ❌ Error for ${email}:`, error.message);
    if (error.code === 11000) {
      return res.status(409).send({ msg: "Mobile number is already registered under another account" });
    }
    res.status(500).send({ msg: "Error during signup" });
  }
});

// ── Sign In ───────────────────────────────────────────────────────────────────
userRouter.post("/signin", async (req, res) => {
  let { payload, password } = req.body;

  console.log(`\n[LOGIN] Attempt — identifier: ${payload}`);

  try {
    // Try email first, then mobile
    let user =
      (await UserModel.findOne({ email: payload })) ||
      (await UserModel.findOne({ mobile: payload }));

    if (!user) {
      console.log(`[LOGIN] ❌ User not found — identifier: ${payload}`);
      return res.status(404).send({ msg: "User not Found" });
    }

    const result = await bcrypt.compare(password, user.password);
    if (!result) {
      console.log(`[LOGIN] ❌ Wrong password — user: ${user.email}`);
      return res.status(401).send({ msg: "Wrong Password" });
    }

    // ✅ Use process.env.key — same secret the authenticate middleware uses
    const token = jwt.sign(
      { userID: user._id, email: user.email },
      process.env.key
    );

    console.log(`[LOGIN] ✅ Success — ${user.first_name} ${user.last_name} <${user.email}> (id: ${user._id})`);

    res.send({
      message: "Login Successful",
      token,
      name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      mobile: user.mobile,
    });
  } catch (e) {
    console.error(`[LOGIN] ❌ Error for ${payload}:`, e.message);
    res.status(500).send({ msg: "Error in Login" });
  }
});

// Update standard user/patient details
userRouter.patch("/update", authenticate, async (req, res) => {
  const { first_name, last_name, mobile, email } = req.body;
  const { userID } = req.body; // Injected by authenticate middleware
  try {
    const updatedUser = await UserModel.findByIdAndUpdate(
      userID,
      { first_name, last_name, mobile, email },
      { new: true }
    );
    if (!updatedUser) {
      return res.status(404).send({ msg: "User not found" });
    }
    res.status(200).send({
      msg: "User profile updated successfully",
      user: {
        name: updatedUser.first_name,
        last_name: updatedUser.last_name,
        email: updatedUser.email,
        mobile: updatedUser.mobile
      }
    });
  } catch (error) {
    console.error("[USER UPDATE] error:", error);
    res.status(500).send({ msg: "Error updating profile — check for duplicate email/phone" });
  }
});

module.exports = { userRouter };
