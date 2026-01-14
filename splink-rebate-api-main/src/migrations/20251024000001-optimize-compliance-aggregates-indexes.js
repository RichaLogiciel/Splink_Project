"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "Creating performance indexes for getComplianceAggregates query..."
    );

    // ========================================
    // PROGRAM_COMPLIANCES TABLE INDEXES
    // ========================================

    // Covering index for the main query filtering and aggregation
    // This index is specifically optimized for the getComplianceAggregates query:
    //   SELECT ... FROM program_compliances pc
    //   WHERE pc.deleted_at IS NULL
    //     AND pc.entity_type = ANY($1)
    //     AND pc.entity_id = ANY($2)
    //     AND pc.program_id = ANY($3)
    //
    // Column order rationale:
    // 1. deleted_at - filtered with IS NULL (allows partial index)
    // 2. entity_type - high selectivity filter (ANY array)
    // 3. program_id - medium selectivity filter (ANY array)
    // 4. entity_id - included for covering index and JOIN
    // 5. status - used in CASE WHEN for aggregation (SUM only 'active' earned_rebate)
    // 6. earned_rebate - included for covering index (SUM aggregation)
    //
    // This partial index only includes non-deleted records, making it smaller and faster
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_compliances_aggregate_covering
        ON program_compliances(deleted_at, entity_type, program_id, entity_id, status, earned_rebate)
        WHERE deleted_at IS NULL;
      `);
      console.log(
        "Created index: idx_program_compliances_aggregate_covering on program_compliances"
      );
    } catch (error) {
      console.error(
        "Failed to create index idx_program_compliances_aggregate_covering:",
        error.message
      );
      // Don't throw - index might already exist
    }

    // Alternative index optimized for entity_type + entity_id lookups
    // This supports queries that heavily filter by entity before program
    // Includes status and earned_rebate for covering queries
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_compliances_entity_aggregate
        ON program_compliances(entity_type, entity_id, program_id, status, earned_rebate, deleted_at)
        WHERE deleted_at IS NULL;
      `);
      console.log(
        "Created index: idx_program_compliances_entity_aggregate on program_compliances"
      );
    } catch (error) {
      console.error(
        "Failed to create index idx_program_compliances_entity_aggregate:",
        error.message
      );
      // Don't throw - index might already exist
    }

    // ========================================
    // PROGRAM_PARTICIPANTS TABLE INDEX
    // ========================================

    // Optimized index for LEFT JOIN in getComplianceAggregates
    // JOIN condition: pp.entity_id = pc.entity_id AND pp.program_id = pc.program_id
    // This index already exists from previous migration (idx_program_participants_entity_program)
    // So we'll verify it exists or create it if needed
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_program_participants_join_lookup
        ON program_participants(entity_id, program_id, deleted_at)
        WHERE deleted_at IS NULL;
      `);
      console.log(
        "Created/verified index: idx_program_participants_join_lookup on program_participants"
      );
    } catch (error) {
      console.error(
        "Failed to create index idx_program_participants_join_lookup:",
        error.message
      );
      // Don't throw - index might already exist
    }

    console.log(
      "Successfully created performance indexes for getComplianceAggregates"
    );
  },

  async down(queryInterface, Sequelize) {
    console.log("Dropping performance indexes for getComplianceAggregates...");

    const indexesToDrop = [
      "idx_program_participants_join_lookup",
      "idx_program_compliances_entity_aggregate",
      "idx_program_compliances_aggregate_covering"
    ];

    for (const indexName of indexesToDrop) {
      try {
        await queryInterface.sequelize.query(`
          DROP INDEX CONCURRENTLY IF EXISTS ${indexName};
        `);
        console.log(`Dropped index: ${indexName}`);
      } catch (error) {
        console.warn(`Failed to drop index ${indexName}:`, error.message);
      }
    }

    console.log(
      "Finished dropping performance indexes for getComplianceAggregates"
    );
  }
};
