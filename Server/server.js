// server/server.js
require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:3000" },
});

// In-memory job tracker
const jobs = new Map(); // jobId → { status, progress, total, error }

// Make io & jobs available to routes
app.set("io", io);
app.set("jobs", jobs);

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to local MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/upload", require("./routes/upload"));
app.use("/api/search", require("./routes/search"));
app.use("/api/reocr", require("./routes/reocr"));
app.use("/api/auth", require("./routes/auth"));

// Job status endpoint
app.get("/api/job/:id/status", (req, res) => {
  const jobs = req.app.get("jobs");
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

// Basic test route
app.get("/", (req, res) => {
  res.json({ message: "Document Search API is running!" });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
