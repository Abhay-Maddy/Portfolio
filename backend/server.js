const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const https = require("https");
require("dotenv").config();

const app = express();

// Security: Disable express identifier header
app.disable("x-powered-by");

// Security: HTTP Response Headers
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

// Configure CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || "*",
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "50kb" }));

// Security: Block direct access to sensitive backend files
app.use((req, res, next) => {
  const forbiddenPatterns = [/\.env/i, /messages\.json/i, /\.git/i, /package\.json/i];
  if (forbiddenPatterns.some(pattern => pattern.test(req.path))) {
    return res.status(403).json({ success: false, message: "Access forbidden." });
  }
  next();
});

// Serve static frontend assets cleanly
app.use(express.static(path.join(__dirname, ".."), {
  dotfiles: "ignore",
  index: "index.html"
}));

// Rate limiter for contact submission endpoint (max 5 requests per 15 min per IP)
const rateLimitMap = new Map();
function rateLimiter(req, res, next) {
  const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const maxRequests = 5;

  const record = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > record.resetTime) {
    record.count = 1;
    record.resetTime = now + windowMs;
  } else {
    record.count++;
  }

  rateLimitMap.set(ip, record);

  if (record.count > maxRequests) {
    return res.status(429).json({
      success: false,
      message: "Too many contact requests. Please try again in a few minutes."
    });
  }

  next();
}

// Storage path for local database backup
const MESSAGES_FILE = path.join(__dirname, "messages.json");

function sanitizeString(str) {
  if (typeof str !== "string") return "";
  return str.replace(/</g, "&lt;").replace(/>/g, "&gt;").trim();
}

function saveMessageLocally(msgData) {
  try {
    let messages = [];
    if (fs.existsSync(MESSAGES_FILE)) {
      const data = fs.readFileSync(MESSAGES_FILE, "utf8");
      messages = JSON.parse(data || "[]");
    }
    messages.push(msgData);
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to persist message:", err.message);
  }
}

async function deliverEmail(name, email, subject, message) {
  const emailUser = (process.env.EMAIL || "").trim();
  const rawPass = (process.env.PASSWORD || "").trim();
  const cleanPassword = rawPass.replace(/['"\s]+/g, "");
  const web3Key = (process.env.WEB3FORMS_KEY || process.env.ACCESS_KEY || "").trim();

  // 1. Try Gmail SMTP
  if (emailUser && cleanPassword) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        connectionTimeout: 5000,
        auth: { user: emailUser, pass: cleanPassword }
      });

      await transporter.sendMail({
        from: emailUser,
        to: emailUser,
        replyTo: email,
        subject: subject || `Portfolio Message from ${name}`,
        text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject}\n\nMessage:\n${message}`
      });
      return { success: true };
    } catch (err) {
      console.error("Gmail SMTP Notice:", err.message);
    }
  }

  // 2. Try Web3Forms API
  if (web3Key) {
    try {
      const payload = JSON.stringify({
        access_key: web3Key,
        name,
        email,
        subject: subject || `Portfolio Message from ${name}`,
        message
      });

      const responseBody = await new Promise((resolve, reject) => {
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

      const parsed = JSON.parse(responseBody || "{}");
      if (parsed.success) return { success: true };
    } catch (err) {
      console.error("Web3Forms Notice:", err.message);
    }
  }

  return { success: false };
}

// Health check endpoint
app.get("/api-status", (req, res) => {
  res.json({ success: true, status: "healthy", timestamp: new Date().toISOString() });
});

// Protected endpoint to retrieve stored messages
app.get("/api/messages", (req, res) => {
  const authHeader = req.headers.authorization;
  const adminSecret = process.env.ADMIN_SECRET;

  if (!adminSecret || authHeader !== `Bearer ${adminSecret}`) {
    return res.status(401).json({ success: false, message: "Unauthorized access." });
  }

  try {
    if (fs.existsSync(MESSAGES_FILE)) {
      const data = fs.readFileSync(MESSAGES_FILE, "utf8");
      return res.json({ success: true, messages: JSON.parse(data || "[]") });
    }
    res.json({ success: true, messages: [] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

app.get("/send", (req, res) => {
  res.redirect("/");
});

app.post("/send", rateLimiter, async (req, res) => {
  let { name, email, subject, message } = req.body || {};

  name = sanitizeString(name);
  email = sanitizeString(email);
  subject = sanitizeString(subject);
  message = sanitizeString(message);

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "Name, email, and message are required." });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ success: false, message: "Please provide a valid email address." });
  }

  if (name.length > 100 || email.length > 150 || subject.length > 200 || message.length > 3000) {
    return res.status(400).json({ success: false, message: "Input length exceeds maximum allowed limit." });
  }

  const msgEntry = {
    id: Date.now(),
    name,
    email,
    subject: subject || "N/A",
    message,
    timestamp: new Date().toISOString()
  };

  saveMessageLocally(msgEntry);
  deliverEmail(name, email, subject, message).catch(() => {});

  return res.json({ success: true, message: "Message received successfully." });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
