const express = require("express");
const router = express.Router();
const {sendEmailWithAttachment, sendHTMLEmail} = require("../services/emailService");

router.get("/test", (req, res) => {
  res.status(200).json({message: "Email API is working"});
});

router.post("/notify/page-approved", async (req, res) => {
  try {
    console.log("Received approval notification request:", req.body);
    const {pageData} = req.body;
    if (!pageData) {
      return res.status(400).json({success: false, message: "Page data is required"});
    }
    const to = "sakshamkhare.06@gmail.com";
    const subject = `Newspaper Page Approved - ${pageData.edition} Edition.`;
    let formattedDate;
    try {
      formattedDate = new Date(pageData.date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      formattedDate = pageData.date || "Unknown date";
    }
    const message = `
Newspaper Page Approved

The following newspaper page has been reviewed and approved:

Edition: ${pageData.edition || "Unknown edition"}
Page Number: ${pageData.pageNumber || "Unknown page"}
Date: ${formattedDate}
Approval Time: ${new Date().toLocaleString()}

This page is now ready for publication.
    `;
    const attachment = pageData.url ? {
      url: pageData.url,
      filename: pageData.name || `${pageData.edition}-Page${pageData.pageNumber}.jpg`,
    } : null;
    const emailSent = await sendEmailWithAttachment(to, subject, message, attachment);
    if (emailSent) {
      return res.status(200).json({success: true, message: "Email Sent"});
    } else {
      return res.status(500).json({success: false, message: "Failed to send email notification"});
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

router.post("/notify/review-submission", async (req, res) => {
  try {
    console.log("Received review submission notification request:", req.body);
    const {to, subject, message, attachment} = req.body;
    if (!to || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Required fields missing: to, subject, and message are required",
      });
    }
    const emailSent = await sendEmailWithAttachment(
      to,
      subject,
      message,
      attachment || null,
    );
    if (emailSent) {
      return res.status(200).json({
        success: true,
        message: "Review submission notification sent successfully",
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to send review submission notification",
      });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

router.post("/notify/pages-group-approved", async (req, res) => {
  try {
    console.log("Received group approval notification request:", req.body);
    const {groupName, edition, date, pagesData, timestamp} = req.body;

    if (!groupName || !edition || !date || !pagesData || pagesData.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Missing required data: groupName, edition, date, and pagesData are required",
      });
    }

    // Format the date for email
    let formattedDate;
    try {
      formattedDate = new Date(date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    } catch (error) {
      console.error("Date formatting error:", error);
      formattedDate = date || "Unknown date";
    }

    // Sort pages by page number
    const sortedPages = [...pagesData].sort((a, b) =>
      parseInt(a.pageNumber) - parseInt(b.pageNumber),
    );

    // Extract page numbers for the email subject
    const pageNumbers = sortedPages.map((page) => page.pageNumber).join(", ");

    // Create email HTML content
    const emailHtml = `
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f0f0f0; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
            .header h2 { margin: 0; color: #444; }
            .content { padding: 15px 0; }
            .page-list { margin: 20px 0; }
            .page-item { padding: 10px; background-color: #f9f9f9; margin-bottom: 10px; border-radius: 5px; }
            .footer { margin-top: 30px; font-size: 12px; color: #777; border-top: 1px solid #eee; padding-top: 15px; }
            .button { background-color: #007bff; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>Newspaper Pages Ready for Printing</h2>
            </div>
            <div class="content">
              <p>The following group of pages for the <strong>${edition} Edition</strong> dated <strong>${formattedDate}</strong> has been approved and is ready for printing:</p>
              
              <div class="group-info">
                <h3>${groupName}</h3>
                <p>All pages in this group have been reviewed and approved by the editorial team.</p>
              </div>
              
              <div class="page-list">
                <h4>Approved Pages:</h4>
                ${sortedPages.map((page) => `
                  <div class="page-item">
                    <p><strong>Page ${page.pageNumber}</strong></p>
                    <p>Filename: ${page.name}</p>
                  </div>
                `).join("")}
              </div>
              
              <p>Please find all the approved PDF files attached to this email.</p>
              <p>Please proceed with printing these pages according to the standard process.</p>
            </div>
            <div class="footer">
              <p>This is an automated message from the Newspaper Management System.</p>
              <p>Sent on: ${new Date(timestamp || Date.now()).toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Create email text version (fallback)
    const emailText = `
      Newspaper Pages Ready for Printing
      
      The following group of pages for the ${edition} Edition dated ${formattedDate} has been approved and is ready for printing:
      
      ${groupName}
      
      Approved Pages:
      ${sortedPages.map((page) => `
        Page ${page.pageNumber}
        Filename: ${page.name}
      `).join("\n")}
      
      Please find all the approved PDF files attached to this email.
      
      Please proceed with printing these pages according to the standard process.
      
      This is an automated message from the Newspaper Management System.
      Sent on: ${new Date(timestamp || Date.now()).toLocaleString()}
    `;

    // Define recipients
    const to = process.env.PRINTER_EMAIL || "uday.offset876@gmail.com, nirnayakbackup@yahoo.com";

    // Define subject
    const subject = `${edition} Edition: ${groupName} Ready for Printing (Pages ${pageNumbers})`;

    // Prepare attachments for PDFs
    const attachments = [];

    // Fetch each PDF as an attachment
    for (const page of sortedPages) {
      try {
        if (page.url) {
          console.log(`Fetching PDF for Page ${page.pageNumber} from URL: ${page.url}`);

          // Use node-fetch or axios properly to handle binary data
          const response = await fetch(page.url);

          if (response.ok) {
            // This is the critical line - properly handle binary data
            const buffer = await response.arrayBuffer().then((arrayBuffer) => Buffer.from(arrayBuffer));

            attachments.push({
              filename: page.name || `Page-${page.pageNumber}.pdf`,
              content: buffer,
              contentType: "application/pdf",
            });

            console.log(`Successfully added attachment for Page ${page.pageNumber}`);
          } else {
            console.error(`Failed to fetch PDF for Page ${page.pageNumber}: HTTP status ${response.status}`);
          }
        }
      } catch (err) {
        console.error(`Error fetching attachment for page ${page.pageNumber}:`, err);
      }
    }

    // Debug log to verify attachments are created
    console.log(`Prepared ${attachments.length} attachments for email`);

    // Send the email with all attachments
    const emailSent = await sendHTMLEmail(to, subject, emailText, emailHtml, attachments);

    if (emailSent) {
      return res.status(200).json({
        success: true,
        message: `Group notification sent for ${groupName}`,
        details: `Email sent to ${to} with ${sortedPages.length} pages attached`,
      });
    } else {
      return res.status(500).json({
        success: false,
        message: "Failed to send group notification",
      });
    }
  } catch (error) {
    console.error("API Error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
});

module.exports = router;
