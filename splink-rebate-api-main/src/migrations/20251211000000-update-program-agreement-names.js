"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if table exists
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
          "program_agreements table does not exist. Skipping agreement name update."
        );
        await transaction.commit();
        return;
      }

      // Get count of records to be updated
      const [beforeCount] = await queryInterface.sequelize.query(
        `
        SELECT COUNT(*) as count 
        FROM program_agreements pa
        INNER JOIN programs p ON pa.program_id = p.id
        WHERE p.participant_type = 'STORE'
        `,
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      console.log(`Found ${beforeCount.count} program agreements to update`);

      // Update agreement names to format: <Manufacturer Name> Independent Retail Program
      await queryInterface.sequelize.query(
        `
        UPDATE program_agreements pa
        SET agreement_name = CONCAT(m.name, ' Independent Retail Program'),
            updated_at = NOW()
        FROM programs p
        INNER JOIN manufacturers m ON p.manufacturer_id = m.id
        WHERE pa.program_id = p.id
          AND p.participant_type = 'STORE'
        `,
        {
          type: Sequelize.QueryTypes.RAW,
          transaction
        }
      );

      // Verify updated records
      const [afterCount] = await queryInterface.sequelize.query(
        `
        SELECT COUNT(*) as count 
        FROM program_agreements pa
        INNER JOIN programs p ON pa.program_id = p.id
        WHERE p.participant_type = 'STORE'
          AND pa.agreement_name LIKE '% Independent Retail Program'
        `,
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      console.log(
        `Successfully updated ${afterCount.count} agreement names to format: <Manufacturer Name> Independent Retail Program`
      );

      await transaction.commit();
    } catch (error) {
      console.error("Error updating program agreement names:", error);
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Note: Cannot fully reverse this without storing original values
      // This rollback will attempt to restore the old format based on manufacturer_id and dates
      // but may not match the exact original format if it was manually edited

      await queryInterface.sequelize.query(
        `
        UPDATE program_agreements pa
        SET agreement_name = CONCAT(
          'Agreement for Manufacturer ',
          p.manufacturer_id,
          ' (',
          p.start_date::date,
          ' to ',
          p.end_date::date,
          ')'
        ),
        updated_at = NOW()
        FROM programs p
        WHERE pa.program_id = p.id
          AND p.participant_type = 'STORE'
          AND pa.agreement_name LIKE '% Independent Retail Program'
        `,
        {
          type: Sequelize.QueryTypes.RAW,
          transaction
        }
      );

      await transaction.commit();
      console.log("Rolled back program agreement names to original format.");
    } catch (error) {
      console.error("Error rolling back program agreement names:", error);
      await transaction.rollback();
      throw error;
    }
  }
};
