"use strict";
exports.config = {
  app_name: [process.env.NEW_RELIC_APP_NAME],
  license_key: process.env.NEW_RELIC_LICENSE_KEY,
  distributed_tracing: {
    enabled: true
  },
  logging: {
    level: "info"
  },
  allow_all_headers: true,
  attributes: {
    exclude: [
      "request.headers.cookie",
      "request.headers.authorization",
      "request.headers.proxyAuthorization",
      "request.headers.setCookie*",
      "request.headers.x*",
      "response.headers.cookie",
      "response.headers.authorization",
      "response.headers.proxyAuthorization",
      "response.headers.setCookie*",
      "response.headers.x*"
    ]
  },
  // Database instrumentation configuration
  database_name_reporting: {
    enabled: true
  },
  slow_sql: {
    enabled: true,
    max_samples_stored: 10
  },
  // Capture raw SQL queries
  capture_params: true,
  // Database query recording
  datastore_tracer: {
    instance_reporting: {
      enabled: true
    },
    database_name_reporting: {
      enabled: true
    }
  },
  // Transaction tracer configuration for raw SQL
  transaction_tracer: {
    record_sql: "raw", // Options: "off", "obfuscated", "raw"
    explain_threshold: 0.01, // Explain plans for queries taking longer than 500ms
    top_n: 20 // Number of slow queries to track
  },
  // Additional database monitoring
  application_logging: {
    enabled: true,
    forwarding: {
      enabled: true
    },
    metrics: {
      enabled: true
    }
  }
};
