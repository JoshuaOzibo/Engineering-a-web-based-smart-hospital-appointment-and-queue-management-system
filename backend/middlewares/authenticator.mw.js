const express=require('express')
const app=express();
const jwt = require("jsonwebtoken");
const redis = require('redis')
require("dotenv").config();

// app.use(express.text());
// const client = redis.createClient({
//   password: process.env.redisPassword,
//   socket: {
//       host: process.env.redisHost,
//       port: process.env.redisPort
//   }
// });
// client.on("error", (err) => console.log(err, "ERROR in REDIS"));
// client.connect();


const authenticate = async (req, res, next) => {
  const token = req.headers?.authorization;
  if (!token) {
    return res.status(401).send({ msg: "Enter Token First" });
  } else {
    try {
      const decoded = jwt.verify(token, process.env.key);
      if (decoded) {
        const userID = decoded.userID;
        const email = decoded.email;
        
        // Prevent stale tokens of deleted users from accessing endpoints
        const { UserModel } = require("../models/user.model");
        const userExists = await UserModel.findById(userID);
        if (!userExists) {
          return res.status(401).send({ msg: "Session expired or user deleted. Please log in again." });
        }

        req.body.userID = userID;
        req.body.email = email;

        next();
      } else {
        res.status(401).send({ msg: "Wrong Token" });
      }
    } catch (e) {
      res.status(401).send({ msg: "Token Expired" });
    }
  }
};

module.exports = {
  authenticate
};
