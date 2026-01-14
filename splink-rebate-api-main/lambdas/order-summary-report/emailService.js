const nodemailer = require("nodemailer");
const secretsService = require("./secretsService");

// Get email configuration from secrets (with fallback to env vars)
// Note: In Lambda handler, secrets should be loaded first to cache them
const getEmailConfig = () => {
  return {
    host: secretsService.getSecretSync("MAIL_HOST"),
    port: parseInt(secretsService.getSecretSync("MAIL_PORT") || "587"),
    username: secretsService.getSecretSync("MAIL_USERNAME"),
    password: secretsService.getSecretSync("MAIL_PASSWORD"),
    fromEmail: secretsService.getSecretSync(
      "MAIL_FROM_EMAIL",
      "no-reply@splinktechnologies.com"
    ),
    fromName: secretsService.getSecretSync("MAIL_FROM_NAME", "Splink")
  };
};

// Initialize email config (sync for module load, will use env vars if secrets not cached)
const emailConfig = getEmailConfig();

const fromEmail = emailConfig.fromEmail;
const fromName = emailConfig.fromName;

// Create transporter (reuse across Lambda invocations)
// Will be reinitialized with secrets in handler if needed
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

// Initialize transporter with sync config for backward compatibility
transporter = nodemailer.createTransport({
  host: emailConfig.host || "",
  port: emailConfig.port,
  secure: false,
  auth: {
    user: emailConfig.username,
    pass: emailConfig.password
  }
});

/**
 * Send warehouse report email with attachment
 * @param {Buffer} fileBuffer - File buffer (CSV or text)
 * @param {string} filename - Filename for attachment
 * @param {Date} targetDate - Target date for the report
 * @param {boolean} hasData - Whether report has data
 * @param {number} warehouseId - Warehouse ID
 * @param {string} warehouseName - Warehouse name
 * @param {string[]} emailRecipients - Array of email addresses
 * @param {string} reportType - Report type (e.g., "HLA", "JPOLEP")
 * @param {string} contentType - Content type for attachment (default: "text/csv")
 * @returns {Promise<void>}
 */
async function sendWarehouseReportEmail(
  fileBuffer,
  filename,
  targetDate,
  hasData,
  warehouseId,
  warehouseName,
  emailRecipients,
  reportType = "",
  contentType = "text/csv"
) {
  try {
    // Ensure transporter is initialized with secrets
    const mailTransporter = await getTransporter();

    // Get from email/name from secrets
    const mailFromEmail = await secretsService.getSecret(
      "MAIL_FROM_EMAIL",
      fromEmail
    );
    const mailFromName = await secretsService.getSecret(
      "MAIL_FROM_NAME",
      fromName
    );
    // Format date as MM/DD/YYYY for email
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const year = targetDate.getFullYear();
    const formattedDate = `${month}/${day}/${year}`;

    // Validate email recipients are configured
    if (!emailRecipients || emailRecipients.length === 0) {
      throw new Error("Email recipients not configured for warehouse report");
    }

    // Email subject - include warehouse name and optional report type
    const warehouseDisplayName = warehouseName || `Warehouse ${warehouseId}`;
    const reportTypePrefix = reportType ? `${reportType} ` : "";
    const subject = `${reportTypePrefix}Order Report - ${warehouseDisplayName} - ${formattedDate}`;

    // Email body
    let body = `This report contains orders for warehouse "${warehouseDisplayName}" (ID: ${warehouseId}) for ${formattedDate}.`;
    if (!hasData) {
      body = `No data exists for warehouse "${warehouseDisplayName}" (ID: ${warehouseId}) for ${formattedDate}.`;
    }

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
