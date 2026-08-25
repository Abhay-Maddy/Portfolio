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

function sendViaWeb3Forms(name, email, subject, message, key) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      access_key: key,
      name: name,
      email: email,
      subject: subject || `Portfolio Contact from ${name}`,
      message: message
    });

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
      res.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.success) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.message || "Web3Forms submission failed"));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

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

  const emailUser = (process.env.EMAIL || "").trim();
  const rawPass = (process.env.PASSWORD || "").trim();
  const cleanPassword = rawPass.replace(/['"\s]+/g, "");
  const web3Key = (process.env.WEB3FORMS_KEY || process.env.ACCESS_KEY || "").trim();

  const mailOptions = {
    from: emailUser || "portfolio@website.com",
    to: emailUser || "abhaymaddheshiya159@gmail.com",
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

  // 2. Try Nodemailer Gmail SMTP first
  if (emailUser && cleanPassword) {
    try {
      console.log("Trying Nodemailer SMTP delivery...");
      await trySendMail({ service: "gmail", auth: { user: emailUser, pass: cleanPassword } }, mailOptions, 3500);
      console.log("✉️ Delivered via Nodemailer Gmail!");
      return res.json({ success: true, message: "Message sent! Delivered to Gmail inbox." });
    } catch (err1) {
      console.warn("Nodemailer SMTP failed or port blocked by host:", err1.message);
    }
  }

  // 3. Fallback to HTTPS Web3Forms API over Port 443 (Works 100% on Render & Cloud Hosts)
  if (web3Key) {
    try {
      console.log("Trying Web3Forms HTTPS API delivery...");
      await sendViaWeb3Forms(name, email, subject, message, web3Key);
      console.log("✉️ Delivered via Web3Forms HTTPS API!");
      return res.json({ success: true, message: "Message sent! Delivered to Gmail inbox." });
    } catch (err2) {
      console.warn("Web3Forms API failed:", err2.message);
    }
  }

  // 4. Fallback response (message saved in messages.json and viewable at /api/messages)
  return res.json({
    success: true,
    message: "Message received & saved to portfolio database!",
    savedLocally: true
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
