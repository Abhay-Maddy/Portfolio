const cors = require("cors");
require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");

const app = express();

// Enable full CORS for all origins and headers
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

  // 1. Always save message locally first
  saveMessageLocally(msgEntry);

  const emailUser = process.env.EMAIL;
  const rawPass = process.env.PASSWORD || "";
  const cleanPassword = rawPass.replace(/\s+/g, "");

  if (!emailUser || !cleanPassword) {
    return res.json({ success: true, message: "Message saved! (Email credentials pending)" });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      connectionTimeout: 4000,
      greetingTimeout: 4000,
      socketTimeout: 4000,
      auth: {
        user: emailUser,
        pass: cleanPassword
      }
    });

    // Send email with 6-second timeout race to prevent hanging on cloud servers
    const sendPromise = transporter.sendMail({
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

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Email send timeout")), 6000)
    );

    await Promise.race([sendPromise, timeoutPromise]);

    console.log("✉️ Email delivered successfully to inbox!");
    return res.json({ success: true, message: "Message sent! I'll reply soon." });

  } catch (err) {
    console.error("MAIL DELIVERY LOG:", err.message);
    return res.json({ 
      success: true, 
      message: "Message received! I'll reply soon.",
      savedLocally: true
    });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
