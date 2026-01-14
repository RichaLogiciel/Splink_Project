/**
 * AWS Secrets Manager service for fetching and caching secrets
 * Supports fallback to environment variables for local testing
 */

const {
  SecretsManagerClient,
  GetSecretValueCommand
} = require("@aws-sdk/client-secrets-manager");

// Default secret ARN
const DEFAULT_SECRET_ARN =
  "arn:aws:secretsmanager:us-west-2:920373008286:secret:main-stage-cron-lambda-vuGSMG";

// Cache for secrets (reused across Lambda invocations)
let cachedSecrets = null;
let secretsPromise = null;

// Secrets Manager client (reused across Lambda invocations)
let secretsClient = null;

/**
 * Get Secrets Manager client (reused across Lambda invocations)
 * @returns {SecretsManagerClient} Secrets Manager client instance
 */
function getSecretsClient() {
  if (!secretsClient) {
    secretsClient = new SecretsManagerClient({
      region: process.env.AWS_REGION || "us-west-2"
    });
  }
  return secretsClient;
}

/**
 * Fetch secrets from AWS Secrets Manager
 * @param {string} secretArn - Secret ARN
 * @returns {Promise<Object>} Parsed JSON secrets object
 */
async function fetchSecretsFromManager(secretArn) {
  const client = getSecretsClient();

  try {
    const command = new GetSecretValueCommand({
      SecretId: secretArn
    });

    const response = await client.send(command);

    if (!response.SecretString) {
      throw new Error("Secret value is empty or not a string");
    }

    // Parse JSON secret
    const secrets = JSON.parse(response.SecretString);
    console.log("Successfully fetched secrets from Secrets Manager");
    return secrets;
  } catch (error) {
    console.error(
      "Error fetching secrets from Secrets Manager:",
      error.message
    );
    throw error;
  }
}

/**
 * Get all secrets (cached per Lambda container)
 * @returns {Promise<Object>} Secrets object
 */
async function getSecrets() {
  // Return cached secrets if available
  if (cachedSecrets) {
    return cachedSecrets;
  }

  // If a fetch is already in progress, wait for it
  if (secretsPromise) {
    return secretsPromise;
  }

  // Start fetching secrets
  secretsPromise = (async () => {
    try {
      const secretArn =
        process.env.SECRETS_MANAGER_SECRET_ARN || DEFAULT_SECRET_ARN;
      cachedSecrets = await fetchSecretsFromManager(secretArn);
      return cachedSecrets;
    } catch (error) {
      // If Secrets Manager fails, fall back to environment variables
      console.warn(
        "Failed to fetch secrets from Secrets Manager, falling back to environment variables:",
        error.message
      );
      // Return empty object to trigger fallback to process.env
      return {};
    }
  })();

  return secretsPromise;
}

/**
 * Get a specific secret value
 * Falls back to environment variable if secret not found or Secrets Manager fails
 * @param {string} key - Secret key
 * @param {string} [defaultValue] - Default value if not found
 * @returns {Promise<string|undefined>} Secret value or environment variable value
 */
async function getSecret(key, defaultValue = undefined) {
  try {
    const secrets = await getSecrets();

    // If secrets object is empty (Secrets Manager failed), use env vars
    if (Object.keys(secrets).length === 0) {
      return process.env[key] || defaultValue;
    }

    // Return secret value, fallback to env var, then default
    return secrets[key] || process.env[key] || defaultValue;
  } catch (error) {
    console.warn(
      `Error getting secret ${key}, falling back to environment variable:`,
      error.message
    );
    return process.env[key] || defaultValue;
  }
}

/**
 * Get a secret value synchronously (for module initialization)
 * Only works if secrets are already cached, otherwise returns undefined
 * @param {string} key - Secret key
 * @param {string} [defaultValue] - Default value if not found
 * @returns {string|undefined} Secret value or environment variable value
 */
function getSecretSync(key, defaultValue = undefined) {
  if (cachedSecrets && cachedSecrets[key]) {
    return cachedSecrets[key];
  }
  return process.env[key] || defaultValue;
}

/**
 * Clear cached secrets (useful for testing)
 */
function clearCache() {
  cachedSecrets = null;
  secretsPromise = null;
}

module.exports = {
  getSecrets,
  getSecret,
  getSecretSync,
  clearCache,
  DEFAULT_SECRET_ARN
};
