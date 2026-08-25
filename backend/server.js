const cors = require("cors");
require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const path = require("path");

const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST", "OPTIONS"], allowedHeaders: ["Content-Type"] }));
app.use(express.json());

// Serve static portfolio files
app.use(express.static(path.join(__dirname, "..")));

app.get("/api-status", (req, res) => {
  res.json({
    success: true,
    message: "Portfolio Contact API is running 🚀"
  });
});

app.post("/send", async (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: "Name, email, and message are required." });
  }

  try {
    const cleanPassword = (process.env.PASSWORD || "").replace(/\s+/g, "");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL,
        pass: cleanPassword
      }
    });

    await transporter.verify();

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: process.env.EMAIL,
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

    res.json({ success: true, message: "Message sent successfully!" });

  } catch (error) {
    console.error("MAIL ERROR:", error);
    const errorMessage = error.code === "EAUTH" 
      ? "Gmail SMTP Auth Failed: Check Google App Password in .env" 
      : (error.message || "Failed to send email.");
    res.status(500).json({ success: false, message: errorMessage });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
