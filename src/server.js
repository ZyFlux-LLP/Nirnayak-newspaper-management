const express = require("express");
const multer = require("multer");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");
const cors = require("cors");

const app = express();
const upload = multer({ dest: "uploads/" });

app.use(cors());
app.use(express.json());

app.post("/merge", upload.array("pdfs", 8), async (req, res) => {
    try {
        if (!req.files || req.files.length !== 8) {
            return res.status(400).send("Please upload exactly 8 PDF files.");
        }

        const mergedPdf = await PDFDocument.create();

        for (const file of req.files) {
            const pdfBytes = fs.readFileSync(file.path);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        const outputPath = path.join(__dirname, "merged.pdf");
        fs.writeFileSync(outputPath, mergedPdfBytes);

        req.files.forEach((file) => fs.unlinkSync(file.path));

        res.download(outputPath, "merged.pdf", () => {
            fs.unlinkSync(outputPath);
        });
    } catch (error) {
        res.status(500).send("Error merging PDFs: " + error.message);
    }
});

app.post("/merge-urls", async (req, res) => {
    try {
        const { urls } = req.body;
        if (!urls || urls.length !== 8) {
            return res.status(400).send("Please provide exactly 8 PDF URLs.");
        }

        const mergedPdf = await PDFDocument.create();

        for (const url of urls) {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`Failed to fetch ${url}`);
            const arrayBuffer = await response.arrayBuffer();
            const pdfBytes = new Uint8Array(arrayBuffer);
            const pdfDoc = await PDFDocument.load(pdfBytes);
            const copiedPages = await mergedPdf.copyPages(pdfDoc, pdfDoc.getPageIndices());
            copiedPages.forEach((page) => mergedPdf.addPage(page));
        }

        const mergedPdfBytes = await mergedPdf.save();
        const outputPath = path.join(__dirname, `merged_${Date.now()}.pdf`);
        fs.writeFileSync(outputPath, mergedPdfBytes);

        res.download(outputPath, "final_newspaper.pdf", () => {
            fs.unlinkSync(outputPath);
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Error merging PDFs from URLs: " + error.message);
    }
});

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
