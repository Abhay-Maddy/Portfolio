const cors = require("cors");
require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const app = express();

// Full CORS support for all origins & preflight requests
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
    console.log("💾 Message saved locally to messages.json");
  } catch (err) {
    console.error("Failed to save message locally:", err.message);
  }
}

app.get("/api-status", (req, res) => {
  res.json({
    success: true,
    message: "Portfolio Contact API is running 🚀"
  });
});

// Endpoint to view received messages
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

  // 1. Always save message locally so it is never lost
  saveMessageLocally(msgEntry);

  // 2. Attempt Nodemailer SMTP delivery
  let emailSent = false;
  let emailError = null;

  const emailUser = process.env.EMAIL;
  const rawPass = process.env.PASSWORD || "";
  const cleanPassword = rawPass.replace(/\s+/g, "");

  if (emailUser && cleanPassword) {
    try {
      const transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: emailUser,
          pass: cleanPassword
        }
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

      emailSent = true;
      console.log("✉️ Email sent successfully via Gmail SMTP!");
    } catch (err) {
      emailError = err;
      console.error("MAIL ERROR:", err.message);
    }
  } else {
    console.warn("⚠️ EMAIL or PASSWORD environment variables missing.");
  }

  if (emailSent) {
    return res.json({ success: true, message: "Message sent! I will reply soon." });
  } else {
    // Return success to the user since message is securely saved & stored
    return res.json({ 
      success: true, 
      message: "Message received & saved successfully! (Note: Gmail SMTP auth pending)",
      savedLocally: true,
      emailError: emailError ? emailError.message : "SMTP not configured"
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
