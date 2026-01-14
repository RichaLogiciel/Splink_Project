import nodemailer from "nodemailer";
const {
  MAIL_HOST,
  MAIL_PORT,
  MAIL_USERNAME,
  MAIL_PASSWORD,
  MAIL_FROM_EMAIL,
  MAIL_FROM_NAME
} = process.env;

const fromEmail = MAIL_FROM_EMAIL || "no-reply@splinktechnologies.com";
const fromName = MAIL_FROM_NAME || "Splink";

const stagingUrl = "https://stage.splinktechnologies.com"; // Add these values in Env
const productionUrl = "https://app.splinktechnologies.com/"; // Add these values in Env

const logoURL = `${productionUrl}/logos/splink.png`;

export const transporter = nodemailer.createTransport({
  host: MAIL_HOST || "",
  port: MAIL_PORT ? parseInt(MAIL_PORT) : 587,
  secure: false,
  auth: {
    user: MAIL_USERNAME,
    pass: MAIL_PASSWORD
  }
});

export async function sendInvitationEmail(
  email: string,
  token: string
): Promise<void> {
  const { FRONTEND_URL } = process.env;

  try {
    const mailOptions = {
      from: {
        name: fromName,
        address: fromEmail
      },
      to: email,
      subject: "Invitation to Join Our Platform",
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Welcome to Our Platform</title>
            <link
              href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"
              rel="stylesheet"
            />
            <style>
              * {
                box-sizing: border-box;
              }
            </style>
          </head>
          <body
            style="
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background-color: #f3f8f9;
              min-height: 600px;
              position: relative;
              padding: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
            "
          >
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                <table
                  cellpadding="0"
                  cellspacing="0"
                  width="100%"
                  style="
                    position: absolute;
                    transform: translate(-50%, -50%);
                    left: 50%;
                    top: 50%;
                    max-width: 600px;
                    width: 95%;
                    background-color: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    text-align: center;
                  "
                >
                  <tr>
                    <td style="padding: 40px; height: 350px">
                      <table cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="padding-bottom: 30px">
                            <img
                              style="display: inline-block; width: 120px"
                              src="${logoURL}"
                              alt="Splink Logo"
                            />
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 20px">
                            <h1
                              style="
                                color: #333333;
                                font-size: 24px;
                                margin: 0;
                                font-weight: 600;
                                text-align: center;
                              "
                            >
                              Join Us
                            </h1>
                          </td>
                        </tr>
                        <tr>
                          <td style="color: #000; padding-bottom: 20px; font-size: 14px">
                            <p style="margin: 0 0 10px">
                              We’re excited to invite you to Splink! Please click the button below to get started.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 20px; text-align: center;">
                            <a href="${FRONTEND_URL}/profile-signup?token=${token}" style="display: inline-block; background-color: #106210; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-size: 14px; font-weight: 500">Accept Invitation</a>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top: 20px; border-top: 1px solid #eeeeee">
                            <p
                              style="
                                color: #000;
                                font-size: 11px;
                                text-align: center;
                                margin: 0;
                              "
                            >
                              © ${new Date().getFullYear()} Splink. All rights reserved.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
              </tr>
            </table>
          </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    // Run diagnostic when email fails
    console.error("Email failed, running diagnostic...");
    await diagnoseEmailIssues();

    // Log the actual error
    console.error("Original email error:", error);

    throw new Error(
      "Failed to send email invitation. Please try again later or contact support if the issue persists."
    );
  }
}

export async function sendInvitationEmailFromDist(
  email: string,
  token: string,
  distLogo: string = "",
  distName: string = ""
): Promise<void> {
  const { FRONTEND_URL } = process.env;
  const plusIcon = `${stagingUrl}/icons/greyPlusIcon.png`;

  try {
    const mailOptions = {
      from: {
        name: fromName,
        address: fromEmail
      },
      to: email,
      subject: distName
        ? distName + " invites you to Splink"
        : "Invitation to Join Our Platform",
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${distName ? distName + " invites you to Splink" : "Invitation to Join Our Platform"}</title>
            <link
              href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"
              rel="stylesheet"
            />
            <style>
              * {
                box-sizing: border-box;
              }
            </style>
          </head>
          <body
            style="
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background-color: #f3f8f9;
              min-height: 600px;
              position: relative;
              padding: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
            "
          >
            <table width="100%" border="0" cellspacing="0" cellpadding="0">
              <tr>
                <td align="center">
                <table
                  cellpadding="0"
                  cellspacing="0"
                  width="100%"
                  style="
                    position: absolute;
                    transform: translate(-50%, -50%);
                    left: 50%;
                    top: 50%;
                    max-width: 600px;
                    width: 95%;
                    background-color: #ffffff;
                    border-radius: 8px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
                    text-align: center;
                  "
                >
                  <tr>
                    <td style="padding: 40px; height: 350px">
                      <table cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                        ${
                          distLogo
                            ? `<td style="text-align: center; padding-bottom: 20px;">
                            <span style="display: inline-block; vertical-align: middle; width: 35%; text-align: right;">
                              <img
                                style="display: inline-block; width: 120px; height: 35px;"
                                src="${logoURL}"
                                alt="Splink Logo"
                              />
                            </span>
                            <span style="display: inline-block; padding: 0 24px; height: 35px; color: #919EAB;">
                              <img
                                style="display: inline-block; width: 18px; height: 18px;"
                                src="${plusIcon}"
                                alt="Plus Icon"
                              />
                            </span>
                            <span style="display: inline-block; vertical-align: middle;">
                              <img
                                style="display: inline-block; height: 35px;"
                                src="${distLogo}"
                                alt="${distName || "Distributor"} Logo"
                              />
                            </span>
                          </td>`
                            : `<td style="padding-bottom: 30px;">
                            <img
                              style="display: inline-block; width: 120px;"
                              src="${logoURL}"
                              alt="Splink Logo"
                            />
                          </td>`
                        }
                        </tr>
                        <tr>
                          <td style="padding-bottom: 20px">
                            <h1
                              style="
                                color: #333333;
                                font-size: 24px;
                                margin: 0;
                                font-weight: 600;
                                text-align: center;
                              "
                            >
                              Join Us
                            </h1>
                          </td>
                        </tr>
                        <tr>
                          <td style="color: #000; padding-bottom: 20px; font-size: 14px">
                            <p style="margin: 0 0 10px">
                              ${distName ? distName + " is" : "We’re"} excited to invite you to Splink! Please click the button below to get started.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-bottom: 20px; text-align: center;">
                            <a href="${FRONTEND_URL}/profile-signup?token=${token}" style="display: inline-block; background-color: #106210; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 5px; font-size: 14px; font-weight: 500">Accept Invitation</a>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding-top: 20px; border-top: 1px solid #eeeeee">
                            <p
                              style="
                                color: #000;
                                font-size: 11px;
                                text-align: center;
                                margin: 0;
                              "
                            >
                              © ${new Date().getFullYear()} Splink. All rights reserved.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
              </tr>
            </table>
          </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    // Run diagnostic when email fails
    console.error("Email failed, running diagnostic...");
    await diagnoseEmailIssues();

    // Log the actual error
    console.error("Original email error:", error);

    throw new Error(
      "Failed to send email invitation. Please try again later or contact support if the issue persists."
    );
  }
}

export async function sendResetPasswordEmail(
  email: string,
  name: string,
  token: string
): Promise<void> {
  try {
    const { FRONTEND_URL } = process.env;

    const mailOptions = {
      from: {
        name: fromName,
        address: fromEmail
      },
      to: email,
      subject: "Reset Your Splink Password",
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Reset Your Password</title>
            <link
              href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"
              rel="stylesheet"
            />
          </head>
          <body
            style="
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              min-height: 544px;
              position: relative;
              padding: 50px;
              display: flex;
              justify-content: center;
              align-items: center;
              background-color: #959595;
            "
          >
            <table
              cellpadding="0"
              cellspacing="0"
              width="100%"
              style="
                position: absolute;
                transform: translate(-50%, -50%);
                left: 50%;
                top: 50%;
                max-width: 600px;
                width: 95%;
                margin: 0 auto;
                background-color: #ffffff;
                border-radius: 8px;
                box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
              "
            >
              <tr>
                <td style="padding: 30px">
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding-bottom: 30px">
                        <img
                          src="${logoURL}"
                          alt="Splink Logo"
                          style="display: inline-block; width: 100px"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 20px">
                        <h1
                          style="
                            color: #333333;
                            font-size: 20px;
                            margin: 0;
                            font-weight: 600;
                          "
                        >
                          Reset Your Password
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="color: #000; font-size: 14px">
                        <p style="margin: 0 0 15px">Hello ${name},</p>
                        <p style="margin: 0 0 15px">
                          We received a request to reset your password. Click the button
                          below to set a new password:
                        </p>
                        <p style="margin: 0 0 30px">
                          This link will expire in 15 minutes for security reasons. If you
                          didn’t request a password reset, please ignore this email, and
                          your password will remain unchanged.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 40px; text-align: center">
                        <a
                          href="${FRONTEND_URL}/auth/reset-password?token=${token}"
                          style="
                            display: inline-block;
                            background-color: #106210;
                            color: #ffffff;
                            text-decoration: none;
                            padding: 10px 20px;
                            border-radius: 5px;
                            font-weight: 600;
                          "
                          >Reset your password</a
                        >
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top: 20px; border-top: 1px solid #eeeeee">
                        <p
                          style="
                            color: #000;
                            font-size: 11px;
                            text-align: center;
                            margin: 0;
                          "
                        >
                          © ${new Date().getFullYear()} Splink. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    // Run diagnostic when email fails
    console.error("Email failed, running diagnostic...");
    await diagnoseEmailIssues();

    // Log the actual error
    console.error("Original email error:", error);

    throw new Error(
      "Failed to send Reset Password email. Please try again later or contact support if the issue persists."
    );
  }
}

export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<void> {
  try {
    const mailOptions = {
      from: {
        name: fromName,
        address: fromEmail
      },
      to: email,
      subject: "Welcome to Splink",
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Welcome to Splink</title>
            <link
              href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&display=swap"
              rel="stylesheet"
            />
          </head>
          <body
            style="
              font-family: 'Inter', Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 0;
              background-color: #f3f8f9;
              min-height: 350px;
              position: relative;
              padding: 80px 40px;
              display: flex;
              align-items: center;
              justify-content: center;
            "
          >
            <table
              cellpadding="0"
              cellspacing="0"
              width="100%"
              style="
                max-width: 600px;
                width: 95%;
                background-color: #ffffff;
                border-radius: 8px;
                margin: 0 auto;
                text-align: center
              "
            >
              <tr>
                <td style="padding: 30px;">
                  <table cellpadding="0" cellspacing="0" width="100%">
                    <tr>
                      <td style="padding-bottom: 30px">
                        <img
                          src="${logoURL}"
                          alt="Splink Logo"
                          style="display: inline-block; width: 100px"
                        />
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 20px">
                        <h1
                          style="
                            color: #333333;
                            font-size: 20px;
                            margin: 0;
                            font-weight: 600;
                          "
                        >
                          Welcome to Splink
                        </h1>
                      </td>
                    </tr>
                    <tr>
                      <td style="color: #000; padding-bottom: 20px; font-size: 14px">
                        <p style="margin: 0 0 15px">Hello ${name}</p>
                        <p style="margin: 0 0 20px">
                          We are excited to have you join the Platform. Reach out to help@splinktechnologies.com for any assistance.
                        </p>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding-top: 20px; border-top: 1px solid #eeeeee">
                        <p
                          style="
                            color: #000;
                            font-size: 11px;
                            text-align: center;
                            margin: 0;
                          "
                        >
                          © ${new Date().getFullYear()} Splink. All rights reserved.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    // Run diagnostic when email fails
    console.error("Email failed, running diagnostic...");
    await diagnoseEmailIssues();

    // Log the actual error
    console.error("Original email error:", error);

    throw new Error(
      "Failed to send Welcome email. Please try again later or contact support if the issue persists."
    );
  }
}

export async function diagnoseEmailIssues(): Promise<void> {
  console.log("=== EMAIL DIAGNOSTIC REPORT ===");

  // Check environment variables
  console.log("\n1. Environment Variables:");
  console.log("MAIL_HOST:", MAIL_HOST || "NOT SET");
  console.log("MAIL_PORT:", MAIL_PORT || "NOT SET");
  console.log("MAIL_USERNAME:", MAIL_USERNAME ? "SET" : "NOT SET");
  console.log("MAIL_PASSWORD:", MAIL_PASSWORD ? "SET" : "NOT SET");
  console.log("MAIL_FROM_EMAIL:", MAIL_FROM_EMAIL || "NOT SET");
  console.log("MAIL_FROM_NAME:", MAIL_FROM_NAME || "NOT SET");

  // Test DNS resolution
  console.log("\n2. DNS Resolution:");
  try {
    const dns = require("dns");
    const { promisify } = require("util");
    const resolveMx = promisify(dns.resolveMx);
    const resolveTxt = promisify(dns.resolveTxt);

    const domain = MAIL_FROM_EMAIL?.split("@")[1] || "splinktechnologies.com";
    console.log("Testing domain:", domain);

    const mxRecords = await resolveMx(domain);
    console.log("✅ MX Records found:", mxRecords.length);

    const txtRecords = await resolveTxt(domain);
    console.log("✅ TXT Records found:", txtRecords.length);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error("❌ DNS resolution failed:", error.message);
    } else {
      console.error("❌ DNS resolution failed:", error);
    }
  }

  // Test SMTP connection
  console.log("\n3. SMTP Connection Test:");
  try {
    await transporter.verify();
    console.log("✅ SMTP connection successful");
  } catch (error: any) {
    console.error("❌ SMTP connection failed:", {
      error: error.message,
      code: error.code,
      command: error.command
    });
  }

  // Test network connectivity
  console.log("\n4. Network Connectivity:");
  try {
    const net = require("net");
    const host = MAIL_HOST || "smtp.gmail.com";
    const port = MAIL_PORT ? parseInt(MAIL_PORT) : 587;

    await new Promise((resolve, reject) => {
      const socket = new net.Socket();
      socket.setTimeout(10000);

      socket.on("connect", () => {
        console.log(`✅ Network connection to ${host}:${port} successful`);
        socket.destroy();
        resolve(true);
      });

      socket.on("timeout", () => {
        console.log(`❌ Network connection to ${host}:${port} timed out`);
        socket.destroy();
        reject(new Error("Connection timeout"));
      });

      socket.on("error", (error: any) => {
        console.log(
          `❌ Network connection to ${host}:${port} failed:`,
          error.message
        );
        socket.destroy();
        reject(error);
      });

      socket.connect(port, host);
    });
  } catch (error) {
    // 'error' is of type 'unknown', so we need to safely access its properties
    if (error instanceof Error) {
      console.error("Network test failed:", error.message);
    } else {
      console.error("Network test failed:", error);
    }
  }

  console.log("\n=== END DIAGNOSTIC REPORT ===");
}

/**
 * Send Warehouse Order Report email with CSV attachment (Generalized function)
 * @param csvBuffer CSV file buffer to attach
 * @param filename Name of the CSV file
 * @param targetDate Date for which the report is generated
 * @param hasData Whether the report contains data or is empty
 * @param warehouseId Warehouse ID for the report
 * @param warehouseName Warehouse name for the report (optional)
 * @param emailRecipients Array of email addresses to send the report to
 * @param reportType Optional report type name (e.g., "HLA", "NCD") for subject line
 */
export async function sendWarehouseReportEmail(
  csvBuffer: Buffer,
  filename: string,
  targetDate: Date,
  hasData: boolean,
  warehouseId: number,
  warehouseName: string,
  emailRecipients: string[],
  reportType?: string
): Promise<void> {
  try {
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
        name: fromName,
        address: fromEmail
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
            <p>Please find the attached CSV file with the order details.</p>
          </body>
        </html>
      `,
      attachments: [
        {
          filename,
          content: csvBuffer,
          contentType: "text/csv"
        }
      ]
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send warehouse report email:", error);
    throw new Error(
      "Failed to send warehouse report email. Please try again later or contact support if the issue persists."
    );
  }
}

/**
 * Send HLA Order Report email with CSV attachment (Legacy wrapper for backward compatibility)
 * @deprecated Use sendWarehouseReportEmail instead
 */
export async function sendHLAReportEmail(
  csvBuffer: Buffer,
  filename: string,
  targetDate: Date,
  hasData: boolean,
  warehouseId: number,
  warehouseName?: string
): Promise<void> {
  const WarehouseReportEmailService = (
    await import("../services/WarehouseReportEmailService")
  ).default;

  // Fetch email recipients from database
  const emailRecipients =
    await WarehouseReportEmailService.getWarehouseEmailRecipients(warehouseId);

  if (!emailRecipients || emailRecipients.length === 0) {
    throw new Error(
      "Email recipients not configured for this warehouse. Please add email recipients to the warehouse_report_email_recipients table."
    );
  }

  return sendWarehouseReportEmail(
    csvBuffer,
    filename,
    targetDate,
    hasData,
    warehouseId,
    warehouseName || `Warehouse ${warehouseId}`,
    emailRecipients,
    "HLA"
  );
}
