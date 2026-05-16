const { UserModel } = require("../models/user.model");
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

// ── Send OTP email ────────────────────────────────────────────────────────────
userRouter.post("/emailVerify", async (req, res) => {
  otp = otpGenerator.generate(4, {
    upperCaseAlphabets: false,
    specialChars: false,
  });

  let { email } = req.body;

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Here is your OTP for Mediqueue Login",
    text: `Your OTP is: ${otp}. It expires shortly — do not share it.`,
  };

  transporter
    .sendMail(mailOptions)
    .then(() => {
      // NOTE: OTP is NOT returned in the response — user must read their email
      res.send({ msg: "OTP has been sent to your email", email });
    })
    .catch((e) => {
      console.error("Mail error:", e);
      res.status(500).send({ msg: "Failed to send OTP email" });
    });
});

// ── Sign Up ───────────────────────────────────────────────────────────────────
userRouter.post("/signup", async (req, res) => {
  let { first_name, last_name, email, mobile, password } = req.body;

  const isPresent = await UserModel.findOne({ email });
  if (isPresent) {
    return res.status(409).send({ msg: "User already registered" });
  }

  try {
    bcrypt.hash(password, 5, async (err, hash) => {
      if (err) {
        return res.status(500).send({ msg: "Error hashing password" });
      }
      const user = new UserModel({
        first_name,
        last_name,
        email,
        mobile,
        password: hash,
      });
      await user.save();
      res.status(201).send({ msg: "Signup Successful" });
    });
  } catch (error) {
    res.status(500).send({ msg: "Error during signup" });
  }
});

// ── Sign In ───────────────────────────────────────────────────────────────────
userRouter.post("/signin", async (req, res) => {
  let { payload, password } = req.body;

  try {
    // Try email first, then mobile
    let user =
      (await UserModel.findOne({ email: payload })) ||
      (await UserModel.findOne({ mobile: payload }));

    if (!user) {
      return res.status(404).send({ msg: "User not Found" });
    }

    const result = await bcrypt.compare(password, user.password);
    if (!result) {
      return res.status(401).send({ msg: "Wrong Password" });
    }

    // ✅ Use process.env.key — same secret the authenticate middleware uses
    const token = jwt.sign(
      { userID: user._id, email: user.email },
      process.env.key
    );

    res.send({
      message: "Login Successful",
      token,
      name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      mobile: user.mobile,
    });
  } catch (e) {
    console.error("Signin error:", e);
    res.status(500).send({ msg: "Error in Login" });
  }
});

module.exports = { userRouter };
