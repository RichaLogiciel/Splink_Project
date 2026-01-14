"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "Adding rebate_opportunity column to program_compliances table..."
    );

    try {
      // Add rebate_opportunity column with default value
      await queryInterface.addColumn(
        "program_compliances",
        "rebate_opportunity",
        {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          defaultValue: 0.0,
          comment: "Maximum potential rebate if all tiers were qualified"
        }
      );

      console.log("Column added successfully. Updating existing records...");

      // Update existing records to have default value
      await queryInterface.sequelize.query(`
        UPDATE program_compliances
        SET rebate_opportunity = 0.00
        WHERE rebate_opportunity IS NULL
      `);

      console.log("Existing records updated. Making column NOT NULL...");

      // Make column NOT NULL after setting defaults
      await queryInterface.changeColumn(
        "program_compliances",
        "rebate_opportunity",
        {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          defaultValue: 0.0,
          comment: "Maximum potential rebate if all tiers were qualified"
        }
      );

      console.log("Migration completed successfully!");
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log("Rolling back rebate_opportunity column addition...");

    try {
      // Remove the rebate_opportunity column
      await queryInterface.removeColumn(
        "program_compliances",
        "rebate_opportunity"
      );

      console.log("Column removed successfully!");
    } catch (error) {
      console.error("Rollback failed:", error);
      throw error;
    }
  }
};
