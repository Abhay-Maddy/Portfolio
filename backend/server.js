const cors = require("cors");
require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const app = express();

// Full CORS support for all origins & preflight
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  next();
});

app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(express.json());

// Serve static portfolio files
app.use(express.static(path.join(__dirname, "..")));

// File path for storing messages as backup
const MESSAGES_FILE = path.join(__dirname, "messages.json");

function saveMessageLocally(msgData) {
  try {
    let messages = [];
    if (fs.existsSync(MESSAGES_FILE)) {
      const data = fs.readFileSync(MESSAGES_FILE, "utf8");
      messages = JSON.parse(data || "[]");
    }
    messages.push(msgData);
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf8");
    console.log("💾 Message saved to messages.json");
  } catch (err) {
    console.error("Failed to save message:", err.message);
  }
}

app.get("/api-status", (req, res) => {
  res.json({
    success: true,
    message: "Portfolio Contact API is running 🚀"
  });
});

app.get("/api/messages", (req, res) => {
  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const data = fs.readFileSync(MESSAGES_FILE, "utf8");
      return res.json({ success: true, messages: JSON.parse(data || "[]") });
    }
    res.json({ success: true, messages: [] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

async function trySendMail(transporterOpts, mailOpts, timeoutMs = 3500) {
  const transporter = nodemailer.createTransport({
    ...transporterOpts,
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs
  });

  const sendPromise = transporter.sendMail(mailOpts);
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Timeout " + timeoutMs + "ms")), timeoutMs)
  );

  return Promise.race([sendPromise, timeoutPromise]);
}

app.post("/send", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "Name, email, and message are required." });
  }

  const msgEntry = {
    id: Date.now(),
    name,
    email,
    subject: subject || "N/A",
    message,
    timestamp: new Date().toISOString()
  };

  // 1. Always save message locally so no message is ever lost
  saveMessageLocally(msgEntry);

  const emailUser = (process.env.EMAIL || "").trim();
  const rawPass = (process.env.PASSWORD || "").trim();
  const cleanPassword = rawPass.replace(/['"\s]+/g, "");

  if (!emailUser || !cleanPassword) {
    console.warn("⚠️ EMAIL or PASSWORD env vars missing on server.");
    return res.json({ success: true, message: "Message received & saved!" });
  }

  const mailOptions = {
    from: emailUser,
    to: emailUser,
    replyTo: email,
    subject: subject || `Portfolio Message from ${name}`,
    text: `
Name: ${name}
Email: ${email}
Subject: ${subject || "N/A"}

Message:
${message}
    `
  };

  let lastError = null;

  // Attempt 1: Gmail Service (SSL 465)
  try {
    console.log("Attempt 1: Gmail Service 465...");
    await trySendMail({ service: "gmail", auth: { user: emailUser, pass: cleanPassword } }, mailOptions, 3500);
    console.log("✉️ Delivered via Gmail Service!");
    return res.json({ success: true, message: "Message sent! I'll reply soon." });
  } catch (err1) {
    lastError = err1;
    console.warn("Attempt 1 failed:", err1.message);
  }

  // Attempt 2: SMTP 587 STARTTLS
  try {
    console.log("Attempt 2: SMTP 587 STARTTLS...");
    await trySendMail({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: emailUser, pass: cleanPassword }
    }, mailOptions, 3500);
    console.log("✉️ Delivered via SMTP 587!");
    return res.json({ success: true, message: "Message sent! I'll reply soon." });
  } catch (err2) {
    lastError = err2;
    console.warn("Attempt 2 failed:", err2.message);
  }

  // Attempt 3: SMTP 465 Explicit
  try {
    console.log("Attempt 3: SMTP 465 Direct...");
    await trySendMail({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: emailUser, pass: cleanPassword }
    }, mailOptions, 3500);
    console.log("✉️ Delivered via SMTP 465!");
    return res.json({ success: true, message: "Message sent! I'll reply soon." });
  } catch (err3) {
    lastError = err3;
    console.warn("Attempt 3 failed:", err3.message);
  }

  // Fallback if all cloud SMTP ports are blocked by host
  return res.json({
    success: true,
    message: "Message received! I'll reply soon.",
    savedLocally: true,
    note: lastError ? lastError.message : "SMTP unavailable"
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
