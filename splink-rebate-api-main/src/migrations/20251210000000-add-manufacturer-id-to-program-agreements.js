"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "program_agreements";

    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        return !!tableDescription[columnName];
      } catch {
        return false;
      }
    };

    const isTableExist = await tableExists(tableName);

    if (!isTableExist) {
      console.log(`Table ${tableName} does not exist. Skipping migration.`);
      return;
    }

    // Add manufacturer_id column if it doesn't exist
    // Step 1: Add as nullable first (required for existing tables with data)
    if (!(await columnExists(tableName, "manufacturer_id"))) {
      await queryInterface.addColumn(tableName, "manufacturer_id", {
        type: DataTypes.INTEGER,
        allowNull: true, // Start as nullable to allow population
        references: {
          model: "manufacturers",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "Manufacturer ID associated with the program agreement"
      });
      console.log(
        "Added manufacturer_id column to program_agreements table (nullable)"
      );
    } else {
      console.log("manufacturer_id column already exists");
    }

    // Step 2: Populate manufacturer_id from programs table for all existing records
    console.log("Populating manufacturer_id from programs table...");
    const [updateResult] = await queryInterface.sequelize.query(`
      UPDATE program_agreements pa
      SET manufacturer_id = p.manufacturer_id
      FROM programs p
      WHERE pa.program_id = p.id
        AND pa.manufacturer_id IS NULL
    `);
    console.log("Successfully populated manufacturer_id for existing records");

    // Step 3: Verify all records have manufacturer_id before making it NOT NULL
    // Check all records (including soft-deleted) since NOT NULL constraint applies to all rows
    const [nullCheck] = await queryInterface.sequelize.query(`
      SELECT COUNT(*) as null_count
      FROM program_agreements
      WHERE manufacturer_id IS NULL
    `);

    if (nullCheck[0]?.null_count > 0) {
      throw new Error(
        `Cannot make manufacturer_id NOT NULL: ${nullCheck[0].null_count} records still have NULL manufacturer_id. ` +
          `This may indicate orphaned program_agreements with invalid program_id references.`
      );
    }

    // Step 4: Alter column to be NOT NULL
    console.log("Setting manufacturer_id to NOT NULL...");
    await queryInterface.sequelize.query(`
      ALTER TABLE program_agreements
      ALTER COLUMN manufacturer_id SET NOT NULL
    `);
    console.log("Successfully set manufacturer_id to NOT NULL");

    // Add index for manufacturer_id to optimize queries
    const indexName = "idx_program_agreements_manufacturer_id";
    try {
      const indexes = await queryInterface.showIndex(tableName);
      const indexExists = indexes.some((idx) => idx.name === indexName);

      if (!indexExists) {
        await queryInterface.addIndex(tableName, ["manufacturer_id"], {
          name: indexName
        });
        console.log(`Added index: ${indexName}`);
      } else {
        console.log(`Index ${indexName} already exists`);
      }
    } catch (error) {
      console.log(`Error adding index (may already exist): ${error.message}`);
    }

    console.log("Migration completed successfully!");
  },

  async down(queryInterface) {
    const tableName = "program_agreements";

    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        return !!tableDescription[columnName];
      } catch {
        return false;
      }
    };

    const isTableExist = await tableExists(tableName);

    if (!isTableExist) {
      console.log(`Table ${tableName} does not exist. Skipping rollback.`);
      return;
    }

    // Remove index if it exists
    const indexName = "idx_program_agreements_manufacturer_id";
    try {
      const indexes = await queryInterface.showIndex(tableName);
      const indexExists = indexes.some((idx) => idx.name === indexName);

      if (indexExists) {
        await queryInterface.removeIndex(tableName, indexName);
        console.log(`Removed index: ${indexName}`);
      }
    } catch (error) {
      console.log(`Error removing index: ${error.message}`);
    }

    // Remove manufacturer_id column if it exists
    if (await columnExists(tableName, "manufacturer_id")) {
      await queryInterface.removeColumn(tableName, "manufacturer_id");
      console.log(
        "Removed manufacturer_id column from program_agreements table"
      );
    }
  }
};
