"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "Adding composite indexes to optimize getAllProgramAndDetails query..."
    );

    // 1. Programs table - Composite index for main WHERE filtering
    // Optimizes queries filtering by manufacturer_id, participant_type, and timeline
    console.log("Creating index: idx_programs_mfg_participant_timeline...");
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_programs_mfg_participant_timeline
      ON programs(manufacturer_id, participant_type, start_date, end_date, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    // 2. Program_details table - Optimize JOIN with exclusion filtering
    // Optimizes the required JOIN with ProgramDetail and exclusion filtering
    console.log("Creating index: idx_program_details_program_id_deleted...");
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_program_details_program_id_deleted
      ON program_details(program_id, id, deleted_at)
      WHERE deleted_at IS NULL;
    `);

    // 3. Program_visibility table - Optimize visibility JOIN
    // Optimizes the optional JOIN with ProgramVisibility
    console.log("Creating index: idx_program_visibility_program_lookup...");
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_program_visibility_program_lookup
      ON program_visibility(program_id, deleted_at, entity_type, entity_id)
      WHERE deleted_at IS NULL;
    `);

    // 4. Verify program_participants index exists (should already exist from previous migration)
    // This index optimizes the conditional JOIN with ProgramParticipant for large store ID lists
    console.log("Verifying program_participants index exists...");
    const participantIndexExists = await queryInterface.sequelize.query(`
      SELECT 1 FROM pg_indexes 
      WHERE indexname = 'idx_program_participants_entity_program_active'
      AND tablename = 'program_participants';
    `);

    if (participantIndexExists[0].length === 0) {
      console.log(
        "Creating missing index: idx_program_participants_entity_program_active..."
      );
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_program_participants_entity_program_active
        ON program_participants(entity_type, entity_id, program_id, deleted_at)
        WHERE deleted_at IS NULL;
      `);
    } else {
      console.log("Program participants index already exists, skipping...");
    }

    console.log(
      "All getAllProgramAndDetails optimization indexes created successfully!"
    );
  },

  async down(queryInterface, Sequelize) {
    console.log("Dropping getAllProgramAndDetails optimization indexes...");

    // Drop in reverse order
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_program_visibility_program_lookup;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_program_details_program_id_deleted;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_programs_mfg_participant_timeline;
    `);

    // Note: Not dropping idx_program_participants_entity_program_active as it may be used by other queries

    console.log(
      "All getAllProgramAndDetails optimization indexes dropped successfully!"
    );
  }
};
