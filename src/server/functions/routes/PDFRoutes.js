const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const fs = require("fs");
const os = require("os");
const path = require("path");
const cors = require("cors");
const {PDFDocument} = require("pdf-lib");
const {initializeApp} = require("firebase/app");
const {getStorage, ref, uploadBytes, getDownloadURL} = require("firebase/storage");
const {execSync} = require("child_process");

const firebaseConfig = {
  apiKey: "AIzaSyA3_FbRtACZLJ473TidW2yL8D1UG5OmORg",
  authDomain: "niranayaknews.firebaseapp.com",
  projectId: "niranayaknews",
  storageBucket: "niranayaknews.firebasestorage.app",
  messagingSenderId: "677412316419",
  appId: "1:677412316419:web:1659aacaf152704db6b536",
  measurementId: "G-94JVHPN90S",
};

// Initialize Firebase only once
let firebaseApp;
let storage;
try {
  firebaseApp = initializeApp(firebaseConfig);
  storage = getStorage(firebaseApp);
} catch (error) {
  console.error("Firebase initialization error:", error);
}

/**
 * Check if Ghostscript is installed
 * @return {boolean} - True if installed, false otherwise
 */
function isGhostscriptInstalled() {
  try {
    execSync("gs --version", {stdio: "ignore"});
    console.log("Ghostscript is installed and working");
    return true;
  } catch (error) {
    console.warn("Ghostscript not found. Will fall back to pdf-lib compression.");
    return false;
  }
}

/**
 * Compress PDF using Ghostscript (much better compression)
 * @param {Buffer|string} inputPdf - The PDF buffer or file path to compress
 * @param {string} outputPath - Path where to save the compressed PDF
 * @param {string} compressionLevel - 'low', 'medium', or 'high'
 * @return {Promise<Buffer>} - Compressed PDF buffer
 */
async function compressPdfWithGhostscript(inputPdf, outputPath, compressionLevel = "medium") {
  return new Promise((resolve, reject) => {
    try {
      // If inputPdf is a Buffer, we need to save it to a temporary file first
      let inputPath = inputPdf;
      let tempInputPath = null;

      if (Buffer.isBuffer(inputPdf)) {
        tempInputPath = path.join(os.tmpdir(), `input_${Date.now()}.pdf`);
        fs.writeFileSync(tempInputPath, inputPdf);
        inputPath = tempInputPath;
      }

      // Set quality settings based on compression level
      let qualitySettings = [];
      switch (compressionLevel) {
      case "low":
        qualitySettings = ["-dPDFSETTINGS=/printer", "-dColorImageResolution=300", "-dGrayImageResolution=300"];
        break;
      case "high":
        qualitySettings = ["-dPDFSETTINGS=/screen", "-dColorImageResolution=72", "-dGrayImageResolution=72"];
        break;
      case "medium":
      default:
        qualitySettings = ["-dPDFSETTINGS=/ebook", "-dColorImageResolution=150", "-dGrayImageResolution=150"];
        break;
      }

      const gsCommand = [
        "gs",
        "-sDEVICE=pdfwrite",
        "-dCompatibilityLevel=1.4",
        "-dNOPAUSE",
        "-dQUIET",
        "-dBATCH",
        "-dDownsampleColorImages=true",
        "-dDownsampleGrayImages=true",
        "-dCompressFonts=true",
        ...qualitySettings,
        `-sOutputFile=${outputPath}`,
        inputPath,
      ].join(" ");

      // Execute Ghostscript command
      execSync(gsCommand);

      // Clean up temp input file if one was created
      if (tempInputPath) {
        fs.unlinkSync(tempInputPath);
      }

      // Read the compressed file
      const compressedPdfBuffer = fs.readFileSync(outputPath);

      // Return the compressed PDF buffer
      resolve(compressedPdfBuffer);
    } catch (error) {
      console.error("Error compressing PDF with Ghostscript:", error);
      reject(error);
    }
  });
}

/**
 * Compress PDF using pdf-lib (fallback method if Ghostscript is not available)
 * @param {Buffer} pdfBuffer - The PDF buffer to compress
 * @param {string} compressionLevel - 'low', 'medium', or 'high'
 * @return {Promise<Buffer>} - Compressed PDF buffer
 */
async function compressPdfWithPdfLib(pdfBuffer, compressionLevel = "medium") {
  try {
    console.log(`Compressing PDF with pdf-lib (${compressionLevel} compression level)`);

    // Load the PDF
    const pdfDoc = await PDFDocument.load(pdfBuffer);

    // Set compression parameters based on compression level
    const compressionParams = {
      useObjectStreams: true,
      addCompression: true,
    };

    // Additional parameters based on compression level
    if (compressionLevel === "high") {
      compressionParams.objectCompressionLevel = 9; // Maximum compression
    } else if (compressionLevel === "medium") {
      compressionParams.objectCompressionLevel = 6; // Balanced compression
    } else {
      // Low compression
      compressionParams.objectCompressionLevel = 3;
    }

    // Save with compression
    const compressedPdfBytes = await pdfDoc.save(compressionParams);

    // Log compression results
    const compressionRatio = (pdfBuffer.length / compressedPdfBytes.length).toFixed(2);
    const originalSizeKB = (pdfBuffer.length / 1024).toFixed(2);
    const compressedSizeKB = (compressedPdfBytes.length / 1024).toFixed(2);

    console.log(`PDF compressed with pdf-lib: ${originalSizeKB}KB → ${compressedSizeKB}KB (${compressionRatio}x reduction)`);

    return Buffer.from(compressedPdfBytes);
  } catch (error) {
    console.error("PDF compression with pdf-lib failed:", error);
    // Return original buffer if compression fails
    return pdfBuffer;
  }
}

/**
 * Main compression function that tries Ghostscript first, then falls back to pdf-lib
 * @param {Buffer} pdfBuffer - The PDF buffer to compress
 * @param {string} compressionLevel - 'low', 'medium', or 'high'
 * @return {Promise<Buffer>} - Compressed PDF buffer
 */
async function compressPdf(pdfBuffer, compressionLevel = "medium") {
  const tempDir = path.join(os.tmpdir(), `compress_${Date.now()}`);
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, {recursive: true});
  }

  const outputPath = path.join(tempDir, "compressed.pdf");

  try {
    let compressedBuffer;
    // Try Ghostscript compression if available (better compression)
    if (isGhostscriptInstalled()) {
      console.log("Using Ghostscript for compression (better results)");
      compressedBuffer = await compressPdfWithGhostscript(pdfBuffer, outputPath, compressionLevel);
    } else {
      // Fall back to pdf-lib compression
      console.log("Ghostscript not available, using pdf-lib for compression (limited results)");
      compressedBuffer = await compressPdfWithPdfLib(pdfBuffer, compressionLevel);
    }

    // Log compression results
    const originalSizeKB = (pdfBuffer.length / 1024).toFixed(2);
    const compressedSizeKB = (compressedBuffer.length / 1024).toFixed(2);
    const percentReduction = ((1 - (compressedBuffer.length / pdfBuffer.length)) * 100).toFixed(1);

    console.log(`PDF compression complete: ${originalSizeKB}KB → ${compressedSizeKB}KB (${percentReduction}% reduction)`);

    return compressedBuffer;
  } catch (error) {
    console.error("PDF compression failed:", error);
    // Return original buffer if all compression methods fail
    return pdfBuffer;
  } finally {
    // Clean up temp directory
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir, {recursive: true});
      }
    } catch (cleanupError) {
      console.error("Error during compression cleanup:", cleanupError);
    }
  }
}

// Updated CORS configuration for the router
const corsOptions = {
  origin: function(origin, callback) {
    const allowedOrigins = ["http://localhost:3000", "https://nirnayaknews.in", "https://www.nirnayaknews.in"];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(null, false);
    }
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "Origin", "X-Requested-With", "Accept"],
  credentials: true,
  maxAge: 86400, // 24 hours
};

// Apply CORS middleware to the router
router.use(cors(corsOptions));

// Pre-flight OPTIONS handling
router.options("/generate-pdf", cors(corsOptions));

/**
 * @route POST /api/generate-pdf
 * @desc Merge multiple PDFs, compress, and upload to Firebase Storage
 */
router.post("/generate-pdf", async (req, res) => {
  try {
    // Log request received with safe header extraction
    const origin = req.headers.origin || "No origin";
    console.log(`PDF generation request received from: ${origin}`);

    // Log request body for debugging
    console.log("Request body:", JSON.stringify(req.body, null, 2));

    const {pageUrls, date, edition, compressionLevel = "medium"} = req.body;

    if (!pageUrls || !Array.isArray(pageUrls) || pageUrls.length === 0) {
      return res.status(400).json({success: false, message: "Page URLs are required"});
    }

    if (!date || !edition) {
      return res.status(400).json({success: false, message: "Date and edition are required"});
    }

    // Validate compression level
    const validCompressionLevels = ["low", "medium", "high"];
    if (compressionLevel && !validCompressionLevels.includes(compressionLevel)) {
      return res.status(400).json({
        success: false,
        message: "Invalid compression level. Use 'low', 'medium', or 'high'",
      });
    }

    const tempDir = path.join(os.tmpdir(), `newspaper_${Date.now()}`);
    const tempFilePaths = [];

    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, {recursive: true});
    }

    console.log(`Processing ${pageUrls.length} PDFs for ${edition} edition on ${date}`);

    // Download each PDF
    for (let i = 0; i < pageUrls.length; i++) {
      if (!pageUrls[i]) {
        console.warn(`No URL provided for page ${i + 1}, skipping`);
        continue;
      }

      const tempPath = path.join(tempDir, `page_${i + 1}.pdf`);
      console.log(`Downloading PDF ${i + 1} from: ${pageUrls[i]}`);

      try {
        const response = await fetch(pageUrls[i]);
        if (!response.ok) {
          throw new Error(`Failed to download PDF for page ${i + 1}: ${response.statusText}`);
        }

        const pdfBuffer = await response.buffer();
        fs.writeFileSync(tempPath, pdfBuffer);
        tempFilePaths.push(tempPath);
        console.log(`Downloaded PDF ${i + 1} to ${tempPath}`);
      } catch (downloadError) {
        console.error(`Error downloading PDF ${i + 1}:`, downloadError);
        // Continue with other PDFs rather than failing completely
      }
    }

    if (tempFilePaths.length === 0) {
      throw new Error("Failed to download any PDFs");
    }

    // Create and merge PDFs
    const mergedPdf = await PDFDocument.create();

    for (const filePath of tempFilePaths) {
      try {
        const pdfBytes = fs.readFileSync(filePath);
        const pdfDoc = await PDFDocument.load(pdfBytes);
        const pages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
        pages.forEach((page) => mergedPdf.addPage(page));
        console.log(`Added pages from ${filePath} to merged PDF`);
      } catch (pdfError) {
        console.error(`Error processing PDF at ${filePath}:`, pdfError);
      }
    }

    // Save the merged PDF with basic settings
    const mergedPdfBytes = await mergedPdf.save();
    const mergedPdfPath = path.join(tempDir, `${edition}-${date}-merged.pdf`);
    fs.writeFileSync(mergedPdfPath, mergedPdfBytes);
    console.log(`Merged PDF created at: ${mergedPdfPath}`);

    // Compress the merged PDF using the enhanced compression function
    console.log(`Starting PDF compression with level: ${compressionLevel}`);
    const originalPdfBuffer = fs.readFileSync(mergedPdfPath);
    const compressedPdfBuffer = await compressPdf(originalPdfBuffer, compressionLevel);

    // Save compressed version
    const compressedPdfPath = path.join(tempDir, `${edition}-${date}-compressed.pdf`);
    fs.writeFileSync(compressedPdfPath, compressedPdfBuffer);
    console.log(`Compressed PDF created at: ${compressedPdfPath}`);

    // Upload the compressed PDF to Firebase Storage
    const pdfFileName = `${edition}-${date}.pdf`;

    // Ensure firebase storage is initialized
    if (!storage) {
      throw new Error("Firebase storage not initialized");
    }

    const storageRef = ref(storage, `newspaper_pdfs/${pdfFileName}`);

    await uploadBytes(storageRef, compressedPdfBuffer, {
      contentType: "application/pdf",
      customMetadata: {
        compressionLevel: compressionLevel,
        originalSize: originalPdfBuffer.length.toString(),
        compressedSize: compressedPdfBuffer.length.toString(),
        compressionRatio: (originalPdfBuffer.length / compressedPdfBuffer.length).toFixed(2),
      },
    });

    const downloadURL = await getDownloadURL(storageRef);
    console.log("Compressed PDF uploaded to Firebase Storage:", downloadURL);

    // Clean up temp files
    tempFilePaths.forEach((filePath) => {
      try {
        fs.unlinkSync(filePath);
      } catch (err) {
        console.error(`Error removing temp file ${filePath}:`, err);
      }
    });

    try {
      fs.unlinkSync(mergedPdfPath);
      fs.unlinkSync(compressedPdfPath);
      fs.rmdirSync(tempDir, {recursive: true});
      console.log("Temp directory cleaned up successfully");
    } catch (err) {
      console.error("Error cleaning up temp directory:", err);
    }

    // Return successful response with compression metrics
    const compressionRatio = (originalPdfBuffer.length / compressedPdfBuffer.length).toFixed(2);
    const originalSizeKB = (originalPdfBuffer.length / 1024).toFixed(2);
    const compressedSizeKB = (compressedPdfBuffer.length / 1024).toFixed(2);

    res.json({
      success: true,
      pdfUrl: downloadURL,
      pages: tempFilePaths.length,
      date,
      edition,
      compression: {
        level: compressionLevel,
        originalSize: `${originalSizeKB} KB`,
        compressedSize: `${compressedSizeKB} KB`,
        reduction: `${compressionRatio}x`,
        percentReduction: `${((1 - (compressedPdfBuffer.length / originalPdfBuffer.length)) * 100).toFixed(1)}%`,
      },
    });
  } catch (error) {
    console.error("Error processing PDFs:", error);

    try {
      // Clean up resources in case of error
      const tempDir = path.join(os.tmpdir(), `newspaper_${Date.now()}`);
      if (fs.existsSync(tempDir)) {
        fs.rmdirSync(tempDir, {recursive: true});
      }
    } catch (cleanupError) {
      console.error("Error during cleanup:", cleanupError);
    }

    // Send detailed error response
    res.status(500).json({
      success: false,
      message: "Failed to process PDFs",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

module.exports = router;
