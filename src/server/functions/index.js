// Firebase Functions entry point
const {onRequest} = require("firebase-functions/v2/https");
const express = require("express");
const cors = require("cors");
const path = require("path");
const os = require("os");

// Import routes
const emailRoutes = require("./routes/emailRoutes");
const pdfRoutes = require("./routes/PDFRoutes");

const app = express();

// Define allowed origins
const allowedOrigins = [
  "https://nirnayaknews.com",
  "https://www.nirnayaknews.com",
  "http://localhost:3000",
];

// Global CORS configuration
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "OPTIONS", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "X-Requested-With", "Accept"],
  credentials: true,
  maxAge: 86400,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Handle preflight requests
app.options("*", (req, res) => {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Origin, X-Requested-With, Accept");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Max-Age", "86400");
  res.status(204).end();
});

// Body parsers
app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({extended: true, limit: "50mb"}));

// Serve static files
app.use("/temp-pdfs", express.static(os.tmpdir()));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API routes
app.use("/api", emailRoutes);
app.use("/api", pdfRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("Newspaper API Server is running");
});

// Debug CORS endpoint
app.get("/cors-test", (req, res) => {
  res.json({
    message: "CORS is working",
    origin: req.headers.origin || "No origin header found",
    headers: req.headers,
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Global error handler:", err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || "An unexpected error occurred",
      status: err.status || 500,
      stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
    },
  });
});

// Export the Express app as a Firebase Function with increased memory and timeout
exports.api = onRequest({
  memory: "1GiB",
  timeoutSeconds: 540,
  minInstances: 0,
  maxInstances: 10,
}, app);
