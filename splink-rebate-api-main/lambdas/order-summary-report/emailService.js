const nodemailer = require("nodemailer");
const secretsService = require("./secretsService");

// Default from email/name (used as fallback)
const DEFAULT_FROM_EMAIL = "no-reply@splinktechnologies.com";
const DEFAULT_FROM_NAME = "Splink";

// Transporter instance (lazy initialization)
let transporter = null;

/**
 * Get or create nodemailer transporter
 * Uses secrets from Secrets Manager (cached) or falls back to environment variables
 * @returns {Promise<Object>} Nodemailer transporter
 */
async function getTransporter() {
  if (transporter) {
    return transporter;
  }

  // Fetch secrets (will use cached if already fetched)
  const mailHost = await secretsService.getSecret("MAIL_HOST");
  const mailPort = parseInt(
    (await secretsService.getSecret("MAIL_PORT")) || "587"
  );
  const mailUsername = await secretsService.getSecret("MAIL_USERNAME");
  const mailPassword = await secretsService.getSecret("MAIL_PASSWORD");

  if (!mailHost || !mailUsername || !mailPassword) {
    throw new Error(
      "Email credentials are missing. Please configure MAIL_HOST, MAIL_USERNAME, and MAIL_PASSWORD in Secrets Manager or environment variables."
    );
  }

  transporter = nodemailer.createTransport({
    host: mailHost,
    port: mailPort,
    secure: false,
    auth: {
      user: mailUsername,
      pass: mailPassword
    }
  });

  return transporter;
}

/**
 * Send warehouse report email with attachment
 * @param {Buffer} fileBuffer - File buffer (CSV or text)
 * @param {string} filename - Filename for attachment
 * @param {boolean} hasData - Whether report has data
 * @param {number} warehouseId - Warehouse ID
 * @param {string} warehouseName - Warehouse name
 * @param {string[]} emailRecipients - Array of email addresses
 * @param {string} reportType - Report type (e.g., "HLA", "JPOLEP")
 * @param {string} contentType - Content type for attachment (default: "text/csv")
 * @param {string|null} dateString - Optional date string (YYYY-MM-DD) for date-only display
 * @param {boolean} isInitialRun - Whether this is the initial run (shows note about today/yesterday)
 * @returns {Promise<void>}
 */
async function sendWarehouseReportEmail(
  fileBuffer,
  filename,
  hasData,
  warehouseId,
  warehouseName,
  emailRecipients,
  reportType = "",
  contentType = "text/csv",
  dateString = null,
  isInitialRun = false
) {
  try {
    // Ensure transporter is initialized with secrets
    const mailTransporter = await getTransporter();

    // Get from email/name from secrets
    const mailFromEmail = await secretsService.getSecret(
      "MAIL_FROM_EMAIL",
      DEFAULT_FROM_EMAIL
    );
    const mailFromName = await secretsService.getSecret(
      "MAIL_FROM_NAME",
      DEFAULT_FROM_NAME
    );

    // Format date for email
    let dateDisplayStr;

    if (dateString) {
      // Format dateString as MM/DD/YYYY
      const [year, month, day] = dateString.split("-");
      dateDisplayStr = `${month}/${day}/${year}`;
    } else {
      // Use current date (MM/DD/YYYY)
      const today = new Date();
      const month = String(today.getMonth() + 1).padStart(2, "0");
      const day = String(today.getDate()).padStart(2, "0");
      const year = today.getFullYear();
      dateDisplayStr = `${month}/${day}/${year}`;
    }

    // Validate email recipients are configured
    if (!emailRecipients || emailRecipients.length === 0) {
      throw new Error("Email recipients not configured for warehouse report");
    }

    // Email subject and body formatting
    const warehouseDisplayName = warehouseName || `Warehouse ${warehouseId}`;
    const reportTypePrefix = reportType ? `${reportType} ` : "";

    let body;
    if (hasData) {
      body = `This report contains orders for warehouse "${warehouseDisplayName}" (ID: ${warehouseId})`;
      if (dateString) {
        body += ` for ${dateDisplayStr}.`;
      } else {
        body += ` for ${dateDisplayStr}.`;
      }
      if (isInitialRun) {
        body += ` Note: This is the initial report run. Orders from today and yesterday are included to capture maximum orders.`;
      }
    } else {
      body = `No data exists for warehouse "${warehouseDisplayName}" (ID: ${warehouseId})`;
      if (dateString) {
        body += ` for ${dateDisplayStr}.`;
      } else {
        body += ` for ${dateDisplayStr}.`;
      }
    }

    const subject = `${reportTypePrefix}Order Report - ${warehouseDisplayName} - ${dateDisplayStr}`;

    const mailOptions = {
      from: {
        name: mailFromName,
        address: mailFromEmail
      },
      to: emailRecipients.join(", "),
      subject,
      text: body,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${reportTypePrefix}Order Report</title>
          </head>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <p>${body}</p>
            <p>Please find the attached file with the order details.</p>
          </body>
        </html>
      `,
      attachments: [
        {
          filename,
          content: fileBuffer,
          contentType: contentType
        }
      ]
    };

    await mailTransporter.sendMail(mailOptions);
    console.log(
      `Email sent successfully to ${emailRecipients.length} recipient(s)`
    );
  } catch (error) {
    console.error("Failed to send warehouse report email:", error);
    throw new Error(`Failed to send warehouse report email: ${error.message}`);
  }
}

module.exports = {
  sendWarehouseReportEmail,
  getTransporter
};
