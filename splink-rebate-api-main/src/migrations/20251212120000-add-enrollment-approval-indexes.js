"use strict";

module.exports = {
  up: async (queryInterface) => {
    // Add indexes to program_approvals for approver-centric queries
    await queryInterface.addIndex(
      "program_approvals",
      ["approver_type", "approver_id", "status", "deleted_at"],
      {
        name: "idx_program_approvals_approver_status",
        where: {
          deleted_at: null
        }
      }
    );

    // Add index to program_approvals for program-approver combination queries
    await queryInterface.addIndex(
      "program_approvals",
      ["program_id", "approver_id", "status", "deleted_at"],
      {
        name: "idx_program_approvals_program_approver"
      }
    );

    // Add index to program_agreements for agreement_id lookups
    await queryInterface.addIndex("program_agreements", ["agreement_id"], {
      name: "idx_program_agreements_agreement_id",
      where: {
        deleted_at: null
      }
    });

    // Add composite index to program_agreements for manufacturer lookups with included columns
    // Note: INCLUDE clause is PostgreSQL-specific (9.5+)
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_program_agreements_manufacturer_lookup
      ON program_agreements(manufacturer_id, deleted_at)
      INCLUDE (agreement_id, program_id, agreement_name)
      WHERE deleted_at IS NULL;
    `);

    // Add index to program_participants for entity active lookups
    await queryInterface.addIndex(
      "program_participants",
      ["entity_type", "entity_id", "deleted_at", "program_id"],
      {
        name: "idx_program_participants_entity_active_lookup",
        where: {
          deleted_at: null
        }
      }
    );

    // Add index to enrollment_requests for status monitoring sorted by update time
    await queryInterface.addIndex(
      "enrollment_requests",
      ["status", "updated_at"],
      {
        name: "idx_enrollment_requests_status_updated",
        where: {
          deleted_at: null
        }
      }
    );
  },

  down: async (queryInterface) => {
    // Remove indexes in reverse order
    await queryInterface.removeIndex(
      "enrollment_requests",
      "idx_enrollment_requests_status_updated"
    );
    await queryInterface.removeIndex(
      "program_participants",
      "idx_program_participants_entity_active_lookup"
    );
    await queryInterface.sequelize.query(
      "DROP INDEX IF EXISTS idx_program_agreements_manufacturer_lookup;"
    );
    await queryInterface.removeIndex(
      "program_agreements",
      "idx_program_agreements_agreement_id"
    );
    await queryInterface.removeIndex(
      "program_approvals",
      "idx_program_approvals_program_approver"
    );
    await queryInterface.removeIndex(
      "program_approvals",
      "idx_program_approvals_approver_status"
    );
  }
};
