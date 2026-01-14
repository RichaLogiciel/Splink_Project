const { sequelize } = require("./database");
const config = require("./config");
const queries = require("./queries");
const reportService = require("./reportService");
const csvGenerator = require("./csvGenerator");
const textGenerator = require("./textGenerator");
const emailService = require("./emailService");
const s3Service = require("./s3Service");
const secretsService = require("./secretsService");

/**
 * Lambda handler for warehouse report generation
 * Supports HLA (CSV), J-Polep (fixed-width text), and Allenbrother (ANSI TXT with thorn delimiter) reports
 *
 * EventBridge event format:
 * {
 *   "reportType": "HLA" | "JPOLEP" | "ALLENBROTHER",
 *   "distributorCode": "NCD",
 *   "date": "2025-01-20" // Optional, defaults to today
 * }
 */
exports.handler = async (event) => {
  console.log("Received event:", JSON.stringify(event, null, 2));

  try {
    // Load secrets from Secrets Manager (will be cached for subsequent invocations)
    // This ensures secrets are available for database, email, and S3 services
    await secretsService.getSecrets();
    console.log("Secrets loaded from Secrets Manager (or using cached values)");
    // Parse event parameters
    const reportType = event.reportType || event.report_type;
    const distributorCode = event.distributorCode || event.distributor_code;
    const dateParam = event.date;

    // Validate required parameters
    if (!reportType) {
      throw new Error("reportType is required (HLA, JPOLEP, or ALLENBROTHER)");
    }

    if (!distributorCode) {
      throw new Error("distributorCode is required");
    }

    const validReportTypes = ["HLA", "JPOLEP", "ALLENBROTHER"];
    if (!validReportTypes.includes(reportType.toUpperCase())) {
      throw new Error(
        `Invalid reportType: ${reportType}. Must be one of: ${validReportTypes.join(", ")}`
      );
    }

    // Get warehouse ID from config
    const warehouseId = config.getWarehouseId(
      distributorCode,
      reportType.toUpperCase()
    );

    if (!warehouseId || warehouseId <= 0) {
      throw new Error(
        `Warehouse ID not found for distributor: ${distributorCode}, reportType: ${reportType}`
      );
    }

    console.log(
      `Processing ${reportType} report for distributor ${distributorCode}, warehouse ${warehouseId}`
    );

    // Parse date parameter (optional, defaults to today)
    let targetDate = new Date();
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (isNaN(parsedDate.getTime())) {
        throw new Error(
          `Invalid date format: ${dateParam}. Please use YYYY-MM-DD format.`
        );
      }
      targetDate = parsedDate;
    }

    // Ensure database connection
    await sequelize.authenticate();

    // Fetch warehouse details
    const warehouse = await queries.getWarehouse(sequelize, warehouseId);
    if (!warehouse) {
      throw new Error(`Warehouse not found: ${warehouseId}`);
    }

    const warehouseName = warehouse.name || `Warehouse ${warehouseId}`;

    // Fetch email recipients from database (needed for HLA and ALLENBROTHER reports)
    let emailRecipients = [];
    if (
      reportType.toUpperCase() === "HLA" ||
      reportType.toUpperCase() === "ALLENBROTHER"
    ) {
      emailRecipients = await queries.getEmailRecipients(
        sequelize,
        warehouseId
      );

      if (!emailRecipients || emailRecipients.length === 0) {
        throw new Error(
          `Email recipients not configured for warehouse ${warehouseId}. Please add email recipients to the warehouse_report_email_recipients table.`
        );
      }

      console.log(
        `Found ${emailRecipients.length} email recipient(s) for warehouse ${warehouseId}`
      );
    }

    // Generate report data
    let reportData;
    if (reportType.toUpperCase() === "HLA") {
      reportData = await reportService.generateWarehouseOrderReport(
        sequelize,
        warehouseId,
        targetDate
      );
    } else if (reportType.toUpperCase() === "JPOLEP") {
      reportData = await reportService.generateJPolepReport(
        sequelize,
        warehouseId,
        targetDate
      );
    } else if (reportType.toUpperCase() === "ALLENBROTHER") {
      reportData = await reportService.generateAllenbrotherReport(
        sequelize,
        warehouseId,
        targetDate
      );
    }

    console.log(`Generated ${reportData.length} report rows`);

    // Format date for filename
    const month = String(targetDate.getMonth() + 1).padStart(2, "0");
    const day = String(targetDate.getDate()).padStart(2, "0");
    const year = targetDate.getFullYear();

    let fileBuffer;
    let filename;
    let contentType;

    if (reportType.toUpperCase() === "HLA") {
      // Generate CSV
      const dateString = `${year}-${month}-${day}`;
      filename = `HLA_Order_Report_${dateString}.csv`;
      const headers = [
        "Internal Store ID",
        "Internal Product ID",
        "Quantity",
        "Order Date"
      ];
      fileBuffer = await csvGenerator.generateCSV(reportData, headers);
      contentType = "text/csv";
    } else if (reportType.toUpperCase() === "JPOLEP") {
      // Generate fixed-width text for J-Polep
      const dateString = `${year}${month}${day}`;
      filename = `jpolep_${dateString}.txt`;
      fileBuffer = await textGenerator.generateFixedWidthText(reportData);
      contentType = "text/plain";
    } else if (reportType.toUpperCase() === "ALLENBROTHER") {
      // Generate ANSI TXT with thorn delimiter for Allenbrother
      const dateString = `${year}${month}${day}`;
      filename = `allenbrother_${dateString}.txt`;
      fileBuffer = await textGenerator.generateAllenbrotherText(reportData);
      contentType = "text/plain";
    }

    const hasData = reportData.length > 0;
    let s3Key = null;
    let s3Url = null;

    switch (reportType.toUpperCase()) {
      case "HLA": {
        // Send email with attachment for HLA reports
        await emailService.sendWarehouseReportEmail(
          fileBuffer,
          filename,
          targetDate,
          hasData,
          warehouseId,
          warehouseName,
          emailRecipients,
          reportType.toUpperCase(),
          contentType
        );
        break;
      }
      case "ALLENBROTHER": {
        // Send email with attachment for Allenbrother reports
        await emailService.sendWarehouseReportEmail(
          fileBuffer,
          filename,
          targetDate,
          hasData,
          warehouseId,
          warehouseName,
          emailRecipients,
          reportType.toUpperCase(),
          contentType
        );
        break;
      }
      default: {
        // Save J-Polep report to S3
        const bucketName = await secretsService.getSecret(
          "S3_BUCKET_NAME",
          "sftp-splink-bucket"
        );
        s3Key = await s3Service.uploadJPolepReport(
          fileBuffer,
          filename,
          targetDate,
          bucketName
        );
        s3Url = `s3://${bucketName}/${s3Key}`;
        console.log(`J-Polep report saved to S3: ${s3Url}`);
        break;
      }
    }

    const result = {
      success: true,
      message:
        reportType.toUpperCase() === "HLA" ||
        reportType.toUpperCase() === "ALLENBROTHER"
          ? "Report generated and emailed successfully"
          : "Report generated and saved to S3 successfully",
      reportType: reportType.toUpperCase(),
      distributorCode,
      warehouseId,
      warehouseName,
      date: `${year}-${month}-${day}`,
      hasData,
      recordCount: reportData.length,
      ...(reportType.toUpperCase() === "HLA" ||
      reportType.toUpperCase() === "ALLENBROTHER"
        ? { emailRecipientsCount: emailRecipients.length }
        : { s3Key, s3Url })
    };

    console.log("Report generation completed successfully:", result);

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    console.error("Error generating report:", error);

    const errorResponse = {
      success: false,
      error: error.message,
      reportType: event.reportType || event.report_type,
      distributorCode: event.distributorCode || event.distributor_code
    };

    return {
      statusCode: 500,
      body: JSON.stringify(errorResponse)
    };
  } finally {
    // Note: Don't close sequelize connection in Lambda
    // Let it be reused across invocations for better performance
  }
};
