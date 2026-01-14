"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if table exists and if data already exists
      const tableExists = async (tableName) => {
        try {
          await queryInterface.describeTable(tableName);
          return true;
        } catch {
          return false;
        }
      };

      const tableExist = await tableExists("program_agreements");
      if (!tableExist) {
        console.log(
          "program_agreements table does not exist. Skipping data backfill."
        );
        await transaction.commit();
        return;
      }

      // Check if data already exists
      const [existingData] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM program_agreements`,
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      if (existingData.count > 0) {
        console.log(
          `program_agreements table already has ${existingData.count} records. Skipping data backfill.`
        );
        await transaction.commit();
        return;
      }

      // Check if manufacturer_id column exists
      const columnExists = async (tableName, columnName) => {
        try {
          const tableDescription =
            await queryInterface.describeTable(tableName);
          return !!tableDescription[columnName];
        } catch {
          return false;
        }
      };

      const hasManufacturerIdColumn = await columnExists(
        "program_agreements",
        "manufacturer_id"
      );

      // Backfill data: Group programs by manufacturer, start_date, end_date
      // and assign agreement_id based on DENSE_RANK
      const insertColumns = hasManufacturerIdColumn
        ? `agreement_id, program_id, manufacturer_id, agreement_name, created_at, updated_at`
        : `agreement_id, program_id, agreement_name, created_at, updated_at`;

      const selectColumns = hasManufacturerIdColumn
        ? `agreement_id, program_id, manufacturer_id, agreement_name, NOW(), NOW()`
        : `agreement_id, program_id, agreement_name, NOW(), NOW()`;

      await queryInterface.sequelize.query(
        `
        WITH grouped AS (
          SELECT
            id AS program_id,
            manufacturer_id,
            start_date::date AS start_dt,
            end_date::date AS end_dt,
            DENSE_RANK() OVER (
              ORDER BY manufacturer_id, start_date::date, end_date::date
            ) AS agreement_id
          FROM programs
          WHERE participant_type = 'STORE'
        ),
        to_insert AS (
          SELECT
            g.agreement_id,
            g.program_id,
            ${hasManufacturerIdColumn ? "g.manufacturer_id," : ""}
            CONCAT(
              'Agreement for Manufacturer ',
              g.manufacturer_id,
              ' (',
              g.start_dt,
              ' to ',
              g.end_dt,
              ')'
            ) AS agreement_name
          FROM grouped g
          WHERE NOT EXISTS (
            SELECT 1
            FROM program_agreements pa
            WHERE pa.program_id = g.program_id
          )
        )
        INSERT INTO program_agreements (
          ${insertColumns}
        )
        SELECT
          ${selectColumns}
        FROM to_insert
      `,
        {
          type: Sequelize.QueryTypes.RAW,
          transaction
        }
      );

      // Get count of inserted records
      const [insertedData] = await queryInterface.sequelize.query(
        `SELECT COUNT(*) as count FROM program_agreements`,
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      console.log(
        `Successfully backfilled ${insertedData.count} records into program_agreements table.`
      );

      await transaction.commit();
    } catch (error) {
      console.error("Error backfilling program_agreements data:", error);
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove all backfilled records (those with agreement_id populated)
      // This is safe because we're only removing auto-generated records
      await queryInterface.sequelize.query(
        `DELETE FROM program_agreements WHERE agreement_id IS NOT NULL`,
        {
          type: Sequelize.QueryTypes.RAW,
          transaction
        }
      );

      await transaction.commit();
      console.log("Rolled back program_agreements data backfill.");
    } catch (error) {
      console.error("Error rolling back program_agreements data:", error);
      await transaction.rollback();
      throw error;
    }
  }
};
