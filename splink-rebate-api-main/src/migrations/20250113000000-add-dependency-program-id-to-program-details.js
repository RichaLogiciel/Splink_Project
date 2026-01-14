"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Check if column exists before adding
      const tableDescription = await queryInterface.describeTable("programs");

      if (!tableDescription.dependency_program_id) {
        console.log("Adding dependency_program_id column to programs table...");

        await queryInterface.addColumn("programs", "dependency_program_id", {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null,
          comment: "Reference to another program that this program depends on"
        });

        console.log("✓ Column dependency_program_id added successfully");
      } else {
        console.log(
          "✓ Column dependency_program_id already exists, skipping..."
        );
      }

      // Check if index exists using raw SQL query (more reliable than showIndex)
      const [indexes] = await queryInterface.sequelize.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'programs' 
        AND indexname = 'idx_programs_dependency_program_id';
      `);

      const indexExists = indexes.length > 0;

      if (!indexExists) {
        console.log("Creating index on dependency_program_id...");

        await queryInterface.addIndex("programs", ["dependency_program_id"], {
          name: "idx_programs_dependency_program_id"
        });

        console.log(
          "✓ Index idx_programs_dependency_program_id created successfully"
        );
      } else {
        console.log(
          "✓ Index idx_programs_dependency_program_id already exists, skipping..."
        );
      }

      console.log("✓ Migration completed successfully");
    } catch (error) {
      console.error("✗ Migration failed:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Check if index exists using raw SQL query (more reliable than showIndex)
      const [indexes] = await queryInterface.sequelize.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = 'programs' 
        AND indexname = 'idx_programs_dependency_program_id';
      `);

      const indexExists = indexes.length > 0;

      if (indexExists) {
        console.log("Removing index idx_programs_dependency_program_id...");

        await queryInterface.removeIndex(
          "programs",
          "idx_programs_dependency_program_id"
        );

        console.log("✓ Index removed successfully");
      } else {
        console.log("✓ Index does not exist, skipping...");
      }

      // Check if column exists before removing
      const tableDescription = await queryInterface.describeTable("programs");

      if (tableDescription.dependency_program_id) {
        console.log(
          "Removing dependency_program_id column from programs table..."
        );

        await queryInterface.removeColumn("programs", "dependency_program_id");

        console.log("✓ Column removed successfully");
      } else {
        console.log("✓ Column does not exist, skipping...");
      }

      console.log("✓ Rollback completed successfully");
    } catch (error) {
      console.error("✗ Rollback failed:", error);
      throw error;
    }
  }
};
