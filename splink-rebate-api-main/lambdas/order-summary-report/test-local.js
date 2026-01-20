/**
 * Local testing script for Lambda function
 *
 * Usage:
 * 1. Set up environment variables (copy .env.example to .env and fill in values)
 * 2. Install dependencies: npm install
 * 3. Run: node test-local.js
 *
 * Or test specific event:
 * node test-local.js hla
 * node test-local.js jpolep
 * node test-local.js allenbrother
 * node test-local.js hla 2025-01-20
 *
 * Note: The Lambda uses rolling window date ranges:
 * - 11 AM EST run (16:00 UTC): Previous day 4:00 PM EST → Today 11:00 AM EST
 * - 4 PM EST run (21:00 UTC): Today 11:00 AM EST → Today 4:00 PM EST
 * When testing locally, the date range is calculated based on the current execution time.
 */

require("dotenv").config({ path: require("path").join(__dirname, ".env") });

const handler = require("./index").handler;

// Test events
const testEvents = {
  hla: {
    reportType: "HLA",
    distributorCode: "NCD",
    date: process.argv[3] || undefined // Optional date from command line
  },
  jpolep: {
    reportType: "JPOLEP",
    distributorCode: "NCD",
    date: process.argv[3] || undefined
  },
  hlaWithDate: {
    reportType: "HLA",
    distributorCode: "NCD",
    date: "2025-01-20"
  },
  jpolepWithDate: {
    reportType: "JPOLEP",
    distributorCode: "NCD",
    date: "2025-01-20"
  },
  allenbrother: {
    reportType: "ALLENBROTHER",
    distributorCode: "NCD",
    date: process.argv[3] || undefined
  },
  allenbrotherWithDate: {
    reportType: "ALLENBROTHER",
    distributorCode: "NCD",
    date: "2025-01-20"
  }
};

// Get test event from command line argument or use default
const testType = process.argv[2] || "hla";
const testEvent = testEvents[testType] || testEvents.hla;

console.log("=".repeat(60));
console.log("Testing Lambda Function Locally");
console.log("=".repeat(60));
console.log("\nTest Event:", JSON.stringify(testEvent, null, 2));
console.log("\nConfiguration:");
console.log(
  "  SECRETS_MANAGER_SECRET_ARN:",
  process.env.SECRETS_MANAGER_SECRET_ARN ? "✓ Set" : "✗ Using default"
);
console.log(
  "\nEnvironment Variables (fallback if Secrets Manager not available):"
);
console.log("  DB_HOST:", process.env.DB_HOST ? "✓ Set" : "✗ Missing");
console.log("  DB_NAME:", process.env.DB_NAME ? "✓ Set" : "✗ Missing");
console.log("  DB_USER:", process.env.DB_USER ? "✓ Set" : "✗ Missing");
if (
  testType === "hla" ||
  testType === "hlaWithDate" ||
  testType === "allenbrother" ||
  testType === "allenbrotherWithDate"
) {
  console.log("  MAIL_HOST:", process.env.MAIL_HOST ? "✓ Set" : "✗ Missing");
  console.log(
    "  MAIL_USERNAME:",
    process.env.MAIL_USERNAME ? "✓ Set" : "✗ Missing"
  );
} else {
  console.log(
    "  S3_BUCKET_NAME:",
    process.env.S3_BUCKET_NAME ? "✓ Set" : "✗ Missing"
  );
  console.log(
    "  S3_AWS_REGION:",
    process.env.S3_AWS_REGION ? "✓ Set" : "✗ Missing"
  );
}
console.log("\n" + "=".repeat(60));
console.log("Starting test...\n");

// Run the handler
handler(testEvent)
  .then((result) => {
    console.log("\n" + "=".repeat(60));
    console.log("✅ Test Completed Successfully!");
    console.log("=".repeat(60));
    console.log("\nResponse:", JSON.stringify(result, null, 2));

    if (result.statusCode === 200) {
      const body = JSON.parse(result.body);
      console.log("\n📊 Report Summary:");
      console.log(`   Report Type: ${body.reportType}`);
      console.log(`   Distributor: ${body.distributorCode}`);
      console.log(`   Warehouse ID: ${body.warehouseId}`);
      console.log(`   Warehouse Name: ${body.warehouseName}`);
      console.log(`   Date: ${body.date}`);
      console.log(`   Window Type: ${body.windowType || "N/A"}`);
      if (body.startDate && body.endDate) {
        console.log(`   Date Range: ${body.startDate} to ${body.endDate}`);
      }
      console.log(`   Records: ${body.recordCount}`);
      console.log(`   Has Data: ${body.hasData}`);
      if (body.emailRecipientsCount !== undefined) {
        console.log(`   Email Recipients: ${body.emailRecipientsCount}`);
      }
      if (body.s3Key) {
        console.log(`   S3 Key: ${body.s3Key}`);
        console.log(`   S3 URL: ${body.s3Url}`);
      }
    }

    process.exit(0);
  })
  .catch((error) => {
    console.error("\n" + "=".repeat(60));
    console.error("❌ Test Failed!");
    console.error("=".repeat(60));
    console.error("\nError:", error.message);
    console.error("\nStack:", error.stack);
    process.exit(1);
  });
