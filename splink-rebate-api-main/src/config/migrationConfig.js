/**
 * Migration Configuration for Old Programs to New Workflow
 *
 * This file contains configuration rules for migrating old programs to the new workflow.
 * Modify these settings to change migration behavior without touching the migration script.
 */

module.exports = {
  // Migration Scope
  MIGRATION_SCOPE: {
    // Only migrate programs created by manufacturers
    CREATOR_TYPE: "MANUFACTURER",

    // Exclude programs created by distributors (handled by form)
    EXCLUDE_CREATOR_TYPE: "DISTRIBUTOR"
  },

  // Program Visibility Migration Rules
  PROGRAM_VISIBILITY: {
    // Visibility scopes that require program_visibility entries
    SPECIFIC_SCOPES: [
      "SPECIFIC_STORES"
      // Note: SPECIFIC_DISTRIBUTORS and SPECIFIC_SALES_REPS are not used in current programs
    ],

    // Visibility scopes that have implicit visibility (no DB entries needed)
    IMPLICIT_SCOPES: [
      "ALL_DISTRIBUTORS",
      "ALL_STORES_UNDER_DISTRIBUTOR",
      "ALL_SALES_REPS"
    ],

    // Entity types for program visibility
    ENTITY_TYPES: {
      DISTRIBUTOR: "DISTRIBUTOR",
      STORE: "STORE",
      SALES_REP: "SALES_REP"
    }
  },

  // Program Approvals Migration Rules
  PROGRAM_APPROVALS: {
    // Default approval status for migrated programs
    DEFAULT_STATUS: "APPROVED",

    // Approver types
    APPROVER_TYPES: {
      DISTRIBUTOR: "DISTRIBUTOR",
      STORE: "STORE"
    },

    // Include disabled distributors in approvals
    INCLUDE_DISABLED_DISTRIBUTORS: true,

    // Include all distributors regardless of authorization
    INCLUDE_ALL_DISTRIBUTORS: true
  },

  // Spiff Program Eligible Store Migration Rules
  SPIFF_PROGRAM_ELIGIBLE_STORE: {
    // Only migrate for these participant types
    PARTICIPANT_TYPES: ["SALES_REP"],

    // Only migrate for these program types
    PROGRAM_TYPES: ["SPIFF", "NA"],

    // Include all stores for spiff programs
    INCLUDE_ALL_STORES: true
  },

  // Duplicate Prevention
  DUPLICATE_PREVENTION: {
    // Check for existing entries before inserting
    CHECK_EXISTING_ENTRIES: true,

    // Use transactions for data consistency
    USE_TRANSACTIONS: true,

    // Make migration idempotent (can run multiple times safely)
    IDEMPOTENT: true
  },

  // Logging Configuration
  LOGGING: {
    // Enable detailed logging during migration
    ENABLE_DETAILED_LOGS: true,

    // Log migration progress
    LOG_PROGRESS: true,

    // Log summary at the end
    LOG_SUMMARY: true
  },

  // Future Configuration Options
  FUTURE_OPTIONS: {
    // Filter by authorized manufacturer-distributor relationships
    FILTER_BY_AUTHORIZATION: false,

    // Different default approval statuses based on business rules
    BUSINESS_RULE_APPROVAL_STATUS: false,

    // Filter stores based on distributor relationships
    FILTER_STORES_BY_DISTRIBUTOR: false,

    // Filter sales reps based on distributor relationships
    FILTER_SALES_REPS_BY_DISTRIBUTOR: false
  }
};
