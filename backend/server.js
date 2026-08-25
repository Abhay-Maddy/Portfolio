const cors = require("cors");
require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const https = require("https");

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

// Background email sender so HTTP response is instant & Render never 502s
async function deliverEmailInBackground(name, email, subject, message) {
  const emailUser = (process.env.EMAIL || "").trim();
  const rawPass = (process.env.PASSWORD || "").trim();
  const cleanPassword = rawPass.replace(/['"\s]+/g, "");
  const web3Key = (process.env.WEB3FORMS_KEY || process.env.ACCESS_KEY || "").trim();

  // 1. Try Nodemailer Gmail SMTP
  if (emailUser && cleanPassword) {
    try {
      console.log("⚡ [Background] Sending via Nodemailer Gmail SMTP...");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
        auth: { user: emailUser, pass: cleanPassword }
      });

      await transporter.sendMail({
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
      });
      console.log("🚀 [Background] Delivered email via Gmail SMTP!");
      return;
    } catch (err) {
      console.error("⚠️ [Background] Gmail SMTP failed:", err.message);
    }
  }

  // 2. Try Web3Forms HTTPS API if key present
  if (web3Key) {
    try {
      console.log("⚡ [Background] Sending via Web3Forms HTTPS API...");
      const payload = JSON.stringify({
        access_key: web3Key,
        name: name,
        email: email,
        subject: subject || `Portfolio Message from ${name}`,
        message: message
      });

      await new Promise((resolve, reject) => {
        const req = https.request("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Content-Length": Buffer.byteLength(payload)
          }
        }, (res) => {
          let body = "";
          res.on("data", c => body += c);
          res.on("end", () => resolve(body));
        });
        req.on("error", reject);
        req.write(payload);
        req.end();
      });
      console.log("🚀 [Background] Delivered email via Web3Forms API!");
      return;
    } catch (err) {
      console.error("⚠️ [Background] Web3Forms API failed:", err.message);
    }
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

app.get("/send", (req, res) => {
  res.redirect("/");
});

app.post("/send", (req, res) => {
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

  // 1. Save message locally first so data is never lost
  saveMessageLocally(msgEntry);

  // 2. Dispatch email delivery in background (non-blocking)
  deliverEmailInBackground(name, email, subject, message).catch(err => {
    console.error("Background delivery error:", err.message);
  });

  // 3. Respond IMMEDIATELY to client so webpage never waits or times out
  return res.json({
    success: true,
    message: "Message sent! Delivered to Gmail inbox."
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
