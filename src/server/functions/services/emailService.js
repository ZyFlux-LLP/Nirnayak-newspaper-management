const nodemailer = require("nodemailer");
const fetch = require("node-fetch");

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: "dainiknirnayak1@gmail.com",
    pass: "gbry wdqj prdc pvax",
  },
});

const sendEmailWithAttachment = async (to, subject, message, attachment) => {
  try {
    const mailOptions = {
      from: "\"Dainik Nirnayak\" <noreply@nirnayaknews.com>",
      to,
      subject,
      text: message,
    };
    if (attachment && attachment.url) {
      try {
        const response = await fetch(attachment.url);

        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`);
        }
        const buffer = await response.buffer();
        const filename = attachment.filename || "newspaper-page.jpg";
        mailOptions.attachments = [
          {
            filename: filename,
            content: buffer,
          },
        ];
        console.log(`Attachment added: ${filename}`);
      } catch (attachmentError) {
        console.error("Error processing attachment:", attachmentError);
        console.log("Will send email without attachment");
      }
    }
    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent:", info.response);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
};

const sendHTMLEmail = async (to, subject, textContent, htmlContent, attachments = []) => {
  try {
    const mailOptions = {
      from: "\"Dainik Nirnayak\" <noreply@nirnayaknews.com>",
      to,
      subject,
      text: textContent,
      html: htmlContent,
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);
    console.log("HTML Email sent:", info.response);
    return true;
  } catch (error) {
    console.error("Error sending HTML email:", error);
    return false;
  }
};

module.exports = {
  sendEmailWithAttachment,
  sendHTMLEmail,
};
