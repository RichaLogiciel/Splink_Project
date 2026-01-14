/**
 * AWS S3 service for uploading report files
 * Handles uploading J-Polep report files to S3 bucket
 */

const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");
const secretsService = require("./secretsService");

let s3Client = null;

/**
 * Initialize S3 client (reused across Lambda invocations)
 * Uses secrets from Secrets Manager (cached) or falls back to environment variables
 * @returns {Promise<S3Client>} S3 client instance
 */
async function getS3Client() {
  if (s3Client) {
    return s3Client;
  }

  // Fetch secrets (will use cached if already fetched)
  const s3Region = await secretsService.getSecret("S3_AWS_REGION", "us-west-2");

  s3Client = new S3Client({
    region: s3Region
  });

  return s3Client;
}

/**
 * Get S3 client synchronously (for backward compatibility)
 * Uses cached secrets or falls back to environment variables
 * @returns {S3Client} S3 client instance
 */
function getS3ClientSync() {
  if (s3Client) {
    return s3Client;
  }

  const s3Region = secretsService.getSecretSync("S3_AWS_REGION", "us-west-2");

  s3Client = new S3Client({
    region: s3Region
  });

  return s3Client;
}

/**
 * Upload a file buffer to S3
 * @param {Buffer} fileBuffer - File buffer to upload
 * @param {string} filename - Filename for the uploaded file
 * @param {string} bucketName - S3 bucket name
 * @param {string} [folder] - Optional folder path in bucket (e.g., "reports/j-polep/")
 * @returns {Promise<string>} Promise resolving to the S3 object key (path)
 */
async function uploadFile(fileBuffer, filename, bucketName, folder = "") {
  if (!bucketName) {
    throw new Error(
      "S3 bucket name is required. Set S3_BUCKET_NAME in Secrets Manager or environment variable."
    );
  }

  const client = await getS3Client();

  // Construct S3 key (path)
  const s3Key = folder ? `${folder}${filename}` : filename;

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: s3Key,
    Body: fileBuffer,
    ContentType: "text/plain",
    ServerSideEncryption: "AES256" // Optional: enable server-side encryption
  });

  try {
    await client.send(command);
    console.log(`File uploaded successfully to s3://${bucketName}/${s3Key}`);
    return s3Key;
  } catch (error) {
    console.error("Error uploading file to S3:", error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
}

/**
 * Upload J-Polep report file to S3
 * Path format: ncd/transactions/jpolep/orders/YYYY-MM-DD/jpolep_YYYYMMDD_HHMMSS.txt
 * @param {Buffer} fileBuffer - Report file buffer
 * @param {string} filename - Base filename (e.g., "jpolep_20250120.txt")
 * @param {Date} targetDate - Target date for the report
 * @param {string} [bucketName] - S3 bucket name (from env if not provided)
 * @returns {Promise<string>} Promise resolving to the S3 object key
 */
async function uploadJPolepReport(
  fileBuffer,
  filename,
  targetDate,
  bucketName = null
) {
  // Fetch bucket name from secrets (will use cached if already fetched)
  const secretBucketName = await secretsService.getSecret(
    "S3_BUCKET_NAME",
    "sftp-splink-bucket"
  );
  const bucket = bucketName || secretBucketName;

  // Format date as YYYY-MM-DD for folder path
  const year = targetDate.getFullYear();
  const month = String(targetDate.getMonth() + 1).padStart(2, "0");
  const day = String(targetDate.getDate()).padStart(2, "0");
  const dateFolder = `${year}-${month}-${day}`;

  // Get current time for timestamp (HHMMSS)
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const seconds = String(now.getSeconds()).padStart(2, "0");
  const timestamp = `${hours}${minutes}${seconds}`;

  // Extract base filename without extension
  const baseFilename = filename.replace(/\.txt$/, "");
  // Add timestamp to filename: jpolep_20250120_143025.txt
  const timestampedFilename = `${baseFilename}_${timestamp}.txt`;

  // Construct full S3 path: ncd/transactions/jpolep/orders/YYYY-MM-DD/filename_timestamp.txt
  const folder = `ncd/transactions/jpolep/orders/${dateFolder}/`;
  const s3Key = `${folder}${timestampedFilename}`;

  return uploadFile(fileBuffer, timestampedFilename, bucket, folder);
}

module.exports = {
  uploadFile,
  uploadJPolepReport,
  getS3Client,
  getS3ClientSync
};
