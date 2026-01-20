"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        return !!tableDescription[columnName];
      } catch {
        return false;
      }
    };

    // Add assignment_type column to store_sales_reps table
    const storeSalesRepsColumnExists = await columnExists(
      "store_sales_reps",
      "assignment_type"
    );

    if (!storeSalesRepsColumnExists) {
      console.log("Adding assignment_type column to store_sales_reps table...");
      
      // Drop ENUM type if it exists (cleanup from failed migration)
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS enum_store_sales_reps_assignment_type CASCADE;
      `);

      // Create ENUM type
      await queryInterface.sequelize.query(`
        CREATE TYPE enum_store_sales_reps_assignment_type AS ENUM ('PRIMARY', 'SECONDARY');
      `);

      // Add column with PRIMARY as default value
      // This automatically sets all existing records to PRIMARY (backward compatibility)
      // New records will also default to PRIMARY unless explicitly set
      await queryInterface.sequelize.query(`
        ALTER TABLE store_sales_reps 
        ADD COLUMN assignment_type enum_store_sales_reps_assignment_type DEFAULT 'PRIMARY';
      `);

      // Add index for assignment_type with sales_rep_id for performance
      await queryInterface.addIndex("store_sales_reps", ["assignment_type"], {
        name: "idx_store_sales_reps_assignment_type"
      });

      // Add composite index for common query pattern: sales_rep_id + assignment_type
      await queryInterface.addIndex(
        "store_sales_reps",
        ["sales_rep_id", "assignment_type", "deleted_at"],
        {
          name: "idx_store_sales_reps_rep_assignment_type"
        }
      );

      // Add composite index for store lookup with assignment type
      await queryInterface.addIndex(
        "store_sales_reps",
        ["store_id", "assignment_type", "deleted_at"],
        {
          name: "idx_store_sales_reps_store_assignment_type"
        }
      );

      // Add unique partial index to ensure only ONE PRIMARY assignment per store
      // This prevents multiple PRIMARY assignments for the same store
      // The index only applies to non-deleted records with assignment_type = 'PRIMARY'
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_store_sales_reps_one_primary_per_store
        ON store_sales_reps (store_id)
        WHERE assignment_type = 'PRIMARY' AND deleted_at IS NULL;
      `);

      console.log("✓ Added assignment_type column and indexes to store_sales_reps");
      console.log("✓ Added unique constraint to ensure only one PRIMARY assignment per store");
    } else {
      console.log("Column assignment_type already exists in store_sales_reps, skipping...");
    }

    // Add assignment_type column to manager_sales_rep_mapping table
    // First check if the table exists (it may be created by a later migration)
    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const managerMappingTableExists = await tableExists("manager_sales_rep_mapping");
    
    if (!managerMappingTableExists) {
      console.log("Table manager_sales_rep_mapping does not exist yet, skipping column addition...");
      console.log("Note: This column will be added when the table is created by a later migration.");
    } else {
      const managerMappingColumnExists = await columnExists(
        "manager_sales_rep_mapping",
        "assignment_type"
      );

      if (!managerMappingColumnExists) {
        console.log("Adding assignment_type column to manager_sales_rep_mapping table...");
      
      // Drop ENUM type if it exists (cleanup from failed migration)
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS enum_manager_sales_rep_mapping_assignment_type CASCADE;
      `);

      // Create ENUM type
      await queryInterface.sequelize.query(`
        CREATE TYPE enum_manager_sales_rep_mapping_assignment_type AS ENUM ('PRIMARY', 'SECONDARY');
      `);

      // Add column with PRIMARY as default value
      // This automatically sets all existing records to PRIMARY (backward compatibility)
      // New records will also default to PRIMARY unless explicitly set
      await queryInterface.sequelize.query(`
        ALTER TABLE manager_sales_rep_mapping 
        ADD COLUMN assignment_type enum_manager_sales_rep_mapping_assignment_type DEFAULT 'PRIMARY';
      `);

      // Add index for assignment_type with sales_manager_id for performance
      await queryInterface.addIndex(
        "manager_sales_rep_mapping",
        ["assignment_type"],
        {
          name: "idx_manager_sales_rep_mapping_assignment_type"
        }
      );

      // Add composite index for common query pattern: sales_manager_id + assignment_type
      await queryInterface.addIndex(
        "manager_sales_rep_mapping",
        ["sales_manager_id", "assignment_type", "deleted_at"],
        {
          name: "idx_manager_sales_rep_mapping_manager_assignment_type"
        }
      );

      // Add composite index for sales_rep_id lookup with assignment type
      await queryInterface.addIndex(
        "manager_sales_rep_mapping",
        ["sales_rep_id", "assignment_type", "deleted_at"],
        {
          name: "idx_manager_sales_rep_mapping_rep_assignment_type"
        }
      );

        console.log("✓ Added assignment_type column and indexes to manager_sales_rep_mapping");
      } else {
        console.log("Column assignment_type already exists in manager_sales_rep_mapping, skipping...");
      }
    }
  },

  async down(queryInterface) {
    // Remove indexes first
    const indexExists = async (tableName, indexName) => {
      try {
        const indexes = await queryInterface.showIndex(tableName);
        return indexes.some((idx) => idx.name === indexName);
      } catch {
        return false;
      }
    };

    // Remove unique constraint for PRIMARY assignments
    try {
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_store_sales_reps_one_primary_per_store;
      `);
    } catch (error) {
      console.log("Note: Unique index may not exist or may be handled differently");
    }

    // Remove indexes from store_sales_reps
    if (await indexExists("store_sales_reps", "idx_store_sales_reps_store_assignment_type")) {
      await queryInterface.removeIndex(
        "store_sales_reps",
        "idx_store_sales_reps_store_assignment_type"
      );
    }

    if (await indexExists("store_sales_reps", "idx_store_sales_reps_rep_assignment_type")) {
      await queryInterface.removeIndex(
        "store_sales_reps",
        "idx_store_sales_reps_rep_assignment_type"
      );
    }

    if (await indexExists("store_sales_reps", "idx_store_sales_reps_assignment_type")) {
      await queryInterface.removeIndex(
        "store_sales_reps",
        "idx_store_sales_reps_assignment_type"
      );
    }

    // Remove indexes from manager_sales_rep_mapping (only if table exists)
    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    if (await tableExists("manager_sales_rep_mapping")) {
      if (
        await indexExists(
          "manager_sales_rep_mapping",
          "idx_manager_sales_rep_mapping_rep_assignment_type"
        )
      ) {
        await queryInterface.removeIndex(
          "manager_sales_rep_mapping",
          "idx_manager_sales_rep_mapping_rep_assignment_type"
        );
      }

      if (
        await indexExists(
          "manager_sales_rep_mapping",
          "idx_manager_sales_rep_mapping_manager_assignment_type"
        )
      ) {
        await queryInterface.removeIndex(
          "manager_sales_rep_mapping",
          "idx_manager_sales_rep_mapping_manager_assignment_type"
        );
      }

      if (
        await indexExists(
          "manager_sales_rep_mapping",
          "idx_manager_sales_rep_mapping_assignment_type"
        )
      ) {
        await queryInterface.removeIndex(
          "manager_sales_rep_mapping",
          "idx_manager_sales_rep_mapping_assignment_type"
        );
      }
    }


    // Remove columns
    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        return !!tableDescription[columnName];
      } catch {
        return false;
      }
    };

    if (await columnExists("store_sales_reps", "assignment_type")) {
      await queryInterface.removeColumn("store_sales_reps", "assignment_type");
    }

    // Only remove column if table exists (reuse tableExists from above)
    if (
      (await tableExists("manager_sales_rep_mapping")) &&
      (await columnExists("manager_sales_rep_mapping", "assignment_type"))
    ) {
      await queryInterface.removeColumn(
        "manager_sales_rep_mapping",
        "assignment_type"
      );
    }

    // Drop ENUM types if they exist (PostgreSQL specific)
    try {
      await queryInterface.sequelize.query(`
        DROP TYPE IF EXISTS enum_store_sales_reps_assignment_type;
        DROP TYPE IF EXISTS enum_manager_sales_rep_mapping_assignment_type;
      `);
    } catch (error) {
      console.log("Note: ENUM types may not exist or may be handled differently");
    }
  }
};

