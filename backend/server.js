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

async function deliverEmail(name, email, subject, message) {
  const emailUser = (process.env.EMAIL || "").trim();
  const rawPass = (process.env.PASSWORD || "").trim();
  const cleanPassword = rawPass.replace(/['"\s]+/g, "");
  const web3Key = (process.env.WEB3FORMS_KEY || process.env.ACCESS_KEY || "").trim();

  let errors = [];

  // 1. Try Nodemailer Gmail SMTP
  if (emailUser && cleanPassword) {
    try {
      console.log("⚡ Attempting Nodemailer Gmail SMTP...");
      const transporter = nodemailer.createTransport({
        service: "gmail",
        connectionTimeout: 4000,
        greetingTimeout: 4000,
        socketTimeout: 4000,
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
      console.log("🚀 Email delivered via Gmail SMTP!");
      return { success: true };
    } catch (err) {
      console.error("⚠️ Gmail SMTP failed:", err.message);
      errors.push("SMTP: " + err.message);
    }
  } else {
    errors.push("SMTP: Missing EMAIL or PASSWORD credentials");
  }

  // 2. Try Web3Forms HTTPS API (Port 443 - Works 100% on Render & Cloud hosts)
  if (web3Key) {
    try {
      console.log("⚡ Attempting Web3Forms HTTPS API over Port 443...");
      const payload = JSON.stringify({
        access_key: web3Key,
        name: name,
        email: email,
        subject: subject || `Portfolio Message from ${name}`,
        message: message
      });

      const body = await new Promise((resolve, reject) => {
        const req = https.request("https://api.web3forms.com/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Accept": "application/json",
            "Content-Length": Buffer.byteLength(payload)
          }
        }, (res) => {
          let b = "";
          res.on("data", c => b += c);
          res.on("end", () => resolve(b));
        });
        req.on("error", reject);
        req.write(payload);
        req.end();
      });

      const parsed = JSON.parse(body || "{}");
      if (parsed.success) {
        console.log("🚀 Email delivered via Web3Forms HTTPS API!");
        return { success: true };
      } else {
        errors.push("Web3Forms API: " + (parsed.message || "API rejected payload"));
      }
    } catch (err) {
      console.error("⚠️ Web3Forms API failed:", err.message);
      errors.push("Web3Forms API: " + err.message);
    }
  } else {
    errors.push("Web3Forms: WEB3FORMS_KEY environment variable not set on server");
  }

  return { success: false, error: errors.join(" | ") };
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

  // 1. Save message locally first so data is never lost
  saveMessageLocally(msgEntry);

  // 2. Deliver email synchronously and verify actual inbox delivery status
  const delivery = await deliverEmail(name, email, subject, message);

  if (delivery.success) {
    return res.json({
      success: true,
      message: "Message sent successfully! Check your Gmail inbox."
    });
  } else {
    console.error("❌ EMAIL DELIVERY FAILED:", delivery.error);
    return res.status(500).json({
      success: false,
      message: "Email delivery failed: " + delivery.error
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
