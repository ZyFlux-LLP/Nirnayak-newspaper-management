const express = require("express");
const multer = require("multer");
const { PDFDocument } = require("pdf-lib");
const fs = require("fs");
const path = require("path");

const app = express();
const upload = multer({ dest: "uploads/" });

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

app.listen(3000, () => {
    console.log("Server running on port 3000");
});
