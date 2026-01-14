"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "Adding growth and baseline columns to program_details table..."
    );

    try {
      const tableInfo = await queryInterface.describeTable("program_details");

      // Add growth_needed column if it doesn't exist
      if (!tableInfo.growth_needed) {
        await queryInterface.addColumn("program_details", "growth_needed", {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          comment: "Required growth percentage or amount for the program tier"
        });
        console.log("growth_needed column added successfully");
      } else {
        console.log("growth_needed column already exists");
      }

      // Add baseline_period_start column if it doesn't exist
      if (!tableInfo.baseline_period_start) {
        await queryInterface.addColumn(
          "program_details",
          "baseline_period_start",
          {
            type: Sequelize.DATE,
            allowNull: true,
            comment: "Start date of the baseline period for growth calculation"
          }
        );
        console.log("baseline_period_start column added successfully");
      } else {
        console.log("baseline_period_start column already exists");
      }

      // Add baseline_period_end column if it doesn't exist
      if (!tableInfo.baseline_period_end) {
        await queryInterface.addColumn(
          "program_details",
          "baseline_period_end",
          {
            type: Sequelize.DATE,
            allowNull: true,
            comment: "End date of the baseline period for growth calculation"
          }
        );
        console.log("baseline_period_end column added successfully");
      } else {
        console.log("baseline_period_end column already exists");
      }

      console.log("Migration completed successfully!");
    } catch (error) {
      console.error("Migration failed:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log("Rolling back growth and baseline columns addition...");

    try {
      const tableInfo = await queryInterface.describeTable("program_details");

      // Remove baseline_period_end column if it exists
      if (tableInfo.baseline_period_end) {
        await queryInterface.removeColumn(
          "program_details",
          "baseline_period_end"
        );
        console.log("baseline_period_end column removed successfully");
      }

      // Remove baseline_period_start column if it exists
      if (tableInfo.baseline_period_start) {
        await queryInterface.removeColumn(
          "program_details",
          "baseline_period_start"
        );
        console.log("baseline_period_start column removed successfully");
      }

      // Remove growth_needed column if it exists
      if (tableInfo.growth_needed) {
        await queryInterface.removeColumn("program_details", "growth_needed");
        console.log("growth_needed column removed successfully");
      }

      console.log("All columns removed successfully!");
    } catch (error) {
      console.error("Rollback failed:", error);
      throw error;
    }
  }
};
