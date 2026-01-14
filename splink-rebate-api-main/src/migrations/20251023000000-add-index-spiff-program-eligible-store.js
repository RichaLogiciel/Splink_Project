"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Use raw SQL to ensure IF NOT EXISTS behavior and preserve partial index predicate
      await queryInterface.sequelize.query(
        `CREATE INDEX IF NOT EXISTS idx_spiff_program_eligible_store_program_store_not_deleted
ON spiff_program_eligible_store (program_id, store_id)
WHERE deleted_at IS NULL;`,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      // Use raw SQL for symmetric IF EXISTS drop
      await queryInterface.sequelize.query(
        `DROP INDEX IF EXISTS idx_spiff_program_eligible_store_program_store_not_deleted;`,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
