const fs = require("fs");
const path = require("path");

const logFilePath = path.join(__dirname, "../activity.log");

function log(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` | Meta: ${JSON.stringify(meta)}` : "";
  const logLine = `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
  
  // Log to console
  if (level === "error") {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}${metaStr}`);
  } else if (level === "success") {
    console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}${metaStr}`);
  } else if (level === "warn") {
    console.log(`\x1b[33m[WARN]\x1b[0m ${message}${metaStr}`);
  } else {
    console.log(`\x1b[34m[INFO]\x1b[0m ${message}${metaStr}`);
  }
  
  // Append to file asynchronously
  fs.appendFile(logFilePath, logLine, (err) => {
    if (err) console.error("Failed to write to activity.log:", err);
  });
}

module.exports = {
  info: (msg, meta) => log("info", msg, meta),
  success: (msg, meta) => log("success", msg, meta),
  warn: (msg, meta) => log("warn", msg, meta),
  error: (msg, meta) => log("error", msg, meta),
};
