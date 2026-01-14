"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Always check and drop the materialized view if it exists
    // This runs every time yarn run migrate is executed, regardless of migration status
    try {
      const checkMVQuery = `
        SELECT EXISTS (
          SELECT 1 
          FROM pg_matviews 
          WHERE matviewname = 'store_program_compliances_mv'
        ) as mv_exists;
      `;

      const result = await queryInterface.sequelize.query(checkMVQuery, {
        type: queryInterface.sequelize.QueryTypes.SELECT
      });

      if (result && result[0] && result[0].mv_exists) {
        console.log(
          "🔄 Materialized view store_program_compliances_mv exists, dropping it..."
        );
        await queryInterface.sequelize.query(`
          DROP MATERIALIZED VIEW store_program_compliances_mv CASCADE;
        `);
        console.log(
          "✅ Successfully dropped store_program_compliances_mv materialized view"
        );
      } else {
        console.log(
          "ℹ️  Materialized view store_program_compliances_mv does not exist, nothing to drop"
        );
      }
    } catch (error) {
      console.log(
        "⚠️  Error checking/dropping materialized view:",
        error.message
      );
      // Continue execution even if there's an error
    }
  },

  async down(queryInterface) {
    // This migration only drops the MV, so rollback does nothing
    // The MV was removed to eliminate dependency, no need to recreate it
  }
};
