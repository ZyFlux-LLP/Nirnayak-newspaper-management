const express = require("express");
const cors = require("cors");
const path = require("path");
const os = require("os");

// Import routes
const emailRoutes = require("./routes/emailRoutes"); // Ensure this file exists
const pdfRoutes = require("./routes/PDFRoutes"); // Ensure this file exists

const app = express();

// Middleware
app.use(cors());
app.use(express.json({limit: "50mb"}));
app.use(express.urlencoded({extended: true, limit: "50mb"}));

// Serve temporary PDFs and uploaded files
app.use("/temp-pdfs", express.static(os.tmpdir()));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
app.use("/api", emailRoutes);
app.use("/api", pdfRoutes);

// Test Route
app.get("/", (req, res) => {
  res.send("Newspaper API Server is running");
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
