"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Check if the column already exists
    const table = await queryInterface.describeTable("program_details");
    if (!table.target_qualifying_entities) {
      await queryInterface.addColumn(
        "program_details",
        "target_qualifying_entities",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null
        }
      );
      await queryInterface.addIndex(
        "program_details",
        ["target_qualifying_entities"],
        {
          name: "idx_program_details_target_qualifying_entities"
        }
      );
    }
  },

  down: async (queryInterface) => {
    // Remove the index and the column
    await queryInterface.removeIndex(
      "program_details",
      "idx_program_details_target_qualifying_entities"
    );
    await queryInterface.removeColumn(
      "program_details",
      "target_qualifying_entities"
    );
  }
};
