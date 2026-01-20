const { getSequelize } = require("./database");
const config = require("./config");
const queries = require("./queries");
const reportService = require("./reportService");
const csvGenerator = require("./csvGenerator");
const textGenerator = require("./textGenerator");
const emailService = require("./emailService");
const s3Service = require("./s3Service");
const secretsService = require("./secretsService");
const timeUtils = require("./timeUtils");

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

    // Initialize database connection with secrets
    const sequelize = await getSequelize();
    console.log("Database connection initialized with secrets");

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

    // Test database connection
    await sequelize.authenticate();

    // Fetch warehouse details
    const warehouse = await queries.getWarehouse(sequelize, warehouseId);
    if (!warehouse) {
      throw new Error(`Warehouse not found: ${warehouseId}`);
    }

    const warehouseName = warehouse.name || `Warehouse ${warehouseId}`;

    // Determine date range and tracking logic
    let dateString = null;
    let startDate = null;
    let endDate = null;
    let lastSentOrderId = null;
    let isInitialRun = false;
    const reportTypeUpper = reportType.toUpperCase();

    if (dateParam) {
      // Date param provided: get all orders for that exact date (ignore tracking)
      const parsedDate = new Date(dateParam);
      if (isNaN(parsedDate.getTime())) {
        throw new Error(
          `Invalid date format: ${dateParam}. Please use YYYY-MM-DD format.`
        );
      }
      // Extract date string (YYYY-MM-DD)
      dateString = parsedDate.toISOString().split("T")[0];
      console.log(
        `[DEBUG] Date param provided: ${dateString}. Getting all orders for this date (ignoring tracking)`
      );
    } else {
      // No date param: use order tracking
      lastSentOrderId = await queries.getLastSentOrderId(
        sequelize,
        warehouseId,
        reportTypeUpper
      );

      if (lastSentOrderId === null) {
        // Initial run: get orders for today and yesterday (UTC)
        isInitialRun = true;
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const yesterday = new Date(today);
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);

        startDate = yesterday;
        endDate = new Date(today);
        endDate.setUTCHours(23, 59, 59, 999);

        console.log(
          `[DEBUG] Initial run detected. Getting orders for UTC dates: ${startDate.toISOString()} to ${endDate.toISOString()}`
        );
      } else {
        // Normal run: get orders where id > lastSentOrderId (no date filter)
        console.log(
          `[DEBUG] Normal run. Getting orders with id > ${lastSentOrderId} (no date filter)`
        );
      }
    }

    // Fetch email recipients from database (needed for HLA, ALLENBROTHER, and JPOLEP reports)
    // JPOLEP sends to both email and S3
    let emailRecipients = [];
    if (
      reportType.toUpperCase() === "HLA" ||
      reportType.toUpperCase() === "ALLENBROTHER" ||
      reportType.toUpperCase() === "JPOLEP"
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

    // Get order items first (needed for both report generation and tracking)
    const orderItems = await queries.getOrderItems(
      sequelize,
      warehouseId,
      startDate,
      endDate,
      dateString,
      lastSentOrderId
    );

    // Generate report data
    let reportData;

    if (reportTypeUpper === "HLA") {
      reportData = await reportService.generateWarehouseOrderReport(
        sequelize,
        warehouseId,
        startDate,
        endDate,
        dateString,
        lastSentOrderId
      );
    } else if (reportTypeUpper === "JPOLEP") {
      reportData = await reportService.generateJPolepReport(
        sequelize,
        warehouseId,
        startDate,
        endDate,
        dateString,
        lastSentOrderId
      );
    } else if (reportTypeUpper === "ALLENBROTHER") {
      reportData = await reportService.generateAllenbrotherReport(
        sequelize,
        warehouseId,
        startDate,
        endDate,
        dateString,
        lastSentOrderId
      );
    }

    console.log(`Generated ${reportData.length} report rows`);

    // Skip file generation and sending if there are no orders
    if (reportData.length === 0) {
      console.log(
        `No orders found for warehouse ${warehouseId}, report type ${reportTypeUpper}. Skipping file generation and sending.`
      );

      return {
        success: true,
        message: "No orders found. Report generation skipped.",
        reportType: reportTypeUpper,
        distributorCode,
        warehouseId,
        warehouseName,
        date: dateString || new Date().toISOString().split("T")[0],
        hasData: false,
        recordCount: 0,
        isInitialRun,
        lastSentOrderId: lastSentOrderId
      };
    }

    // Format dates for filename
    const formatDateCompact = (dateStr) => {
      // Convert YYYY-MM-DD to YYYYMMDD
      return dateStr.replace(/-/g, "");
    };

    let fileBuffer;
    let filename;
    let contentType;

    if (reportTypeUpper === "HLA") {
      // Generate CSV
      if (dateString) {
        filename = `HLA_Order_Report_${dateString}.csv`;
      } else {
        // Use current date for filename
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        filename = `HLA_Order_Report_${todayStr}.csv`;
      }
      const headers = [
        "Internal Store ID",
        "Internal Product ID",
        "Quantity",
        "Order Date"
      ];
      // Generate CSV without headers for HLA reports
      fileBuffer = await csvGenerator.generateCSV(reportData, headers, false);
      contentType = "text/csv";
    } else if (reportTypeUpper === "JPOLEP") {
      // Generate fixed-width text for J-Polep
      if (dateString) {
        const compactDate = formatDateCompact(dateString);
        filename = `jpolep_${compactDate}.txt`;
      } else {
        // Use current date for filename
        const today = new Date();
        const todayStr = formatDateCompact(today.toISOString().split("T")[0]);
        filename = `jpolep_${todayStr}.txt`;
      }
      fileBuffer = await textGenerator.generateFixedWidthText(reportData);
      contentType = "text/plain";
    } else if (reportTypeUpper === "ALLENBROTHER") {
      // Generate ANSI DAT with thorn delimiter for Allenbrother
      // Filename format: AYYMMDD1 (11 AM run) or AYYMMDD2 (4 PM run)
      const runSuffix = timeUtils.getReportRunSuffix();
      let dateStr;
      if (dateString) {
        // Parse YYYY-MM-DD to YYMMDD
        const [year, month, day] = dateString.split("-");
        dateStr = `${year.slice(-2)}${month}${day}`;
      } else {
        // Use current date for filename
        const today = new Date();
        const year = String(today.getUTCFullYear() % 100).padStart(2, "0");
        const month = String(today.getUTCMonth() + 1).padStart(2, "0");
        const day = String(today.getUTCDate()).padStart(2, "0");
        dateStr = `${year}${month}${day}`;
      }
      filename = `A${dateStr}${runSuffix}.DAT`;
      fileBuffer = await textGenerator.generateAllenbrotherText(reportData);
      contentType = "text/plain";
    }

    const hasData = reportData.length > 0;
    let s3Key = null;
    let s3Url = null;

    switch (reportTypeUpper) {
      case "HLA": {
        // Send email with attachment for HLA reports
        await emailService.sendWarehouseReportEmail(
          fileBuffer,
          filename,
          hasData,
          warehouseId,
          warehouseName,
          emailRecipients,
          reportTypeUpper,
          contentType,
          dateString,
          isInitialRun
        );
        break;
      }
      case "JPOLEP": {
        // Send email with attachment for J-Polep reports
        await emailService.sendWarehouseReportEmail(
          fileBuffer,
          filename,
          hasData,
          warehouseId,
          warehouseName,
          emailRecipients,
          reportTypeUpper,
          contentType,
          dateString,
          isInitialRun
        );
        // Also send to S3 (FTP send)
        const bucketName = await secretsService.getSecret(
          "S3_BUCKET_NAME",
          "sftp-splink-bucket"
        );
        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];
        s3Key = await s3Service.uploadJPolepReport(
          fileBuffer,
          filename,
          todayStr,
          bucketName
        );
        s3Url = `s3://${bucketName}/${s3Key}`;
        console.log(`J-Polep report saved to S3: ${s3Url}`);
        break;
      }
      case "ALLENBROTHER": {
        // Send email with attachment for Allenbrother reports
        await emailService.sendWarehouseReportEmail(
          fileBuffer,
          filename,
          hasData,
          warehouseId,
          warehouseName,
          emailRecipients,
          reportTypeUpper,
          contentType,
          dateString,
          isInitialRun
        );
        break;
      }
      default: {
        // No default case needed - all report types are handled above
        break;
      }
    }

    // Update tracking table after successful email send (only if not using date param)
    if (!dateParam && orderItems.length > 0) {
      // Get max order ID from the batch
      const maxOrderId = Math.max(...orderItems.map((item) => item.order_id));
      console.log(
        `Updating last_sent_order_id to ${maxOrderId} for warehouse ${warehouseId}, report type ${reportTypeUpper}`
      );
      await queries.updateLastSentOrderId(
        sequelize,
        warehouseId,
        reportTypeUpper,
        maxOrderId
      );
    } else if (!dateParam && orderItems.length === 0) {
      // Even with no orders, update tracking to prevent re-checking (as per user's answer)
      // But we need a valid order ID - if there are no orders, we can't update
      // Actually, if there are no orders, we should not update the tracking table
      // because there's no order ID to track. The next run will check again.
      console.log(
        `No orders found. Skipping tracking update (will retry on next run)`
      );
    }

    const result = {
      success: true,
      message:
        reportTypeUpper === "HLA" ||
        reportTypeUpper === "ALLENBROTHER" ||
        reportTypeUpper === "JPOLEP"
          ? reportTypeUpper === "JPOLEP"
            ? "Report generated, emailed, and saved to S3 successfully"
            : "Report generated and emailed successfully"
          : "Report generated and saved to S3 successfully",
      reportType: reportTypeUpper,
      distributorCode,
      warehouseId,
      warehouseName,
      date: dateString || new Date().toISOString().split("T")[0],
      hasData,
      recordCount: reportData.length,
      isInitialRun,
      lastSentOrderId: lastSentOrderId,
      // JPOLEP sends to both email and S3, so include both emailRecipientsCount and s3Key/s3Url
      ...(reportTypeUpper === "HLA" ||
      reportTypeUpper === "ALLENBROTHER" ||
      reportTypeUpper === "JPOLEP"
        ? reportTypeUpper === "JPOLEP"
          ? { emailRecipientsCount: emailRecipients.length, s3Key, s3Url }
          : { emailRecipientsCount: emailRecipients.length }
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
