"use strict";

/**
 * Migration: Add CHECK constraint for program_type column in store_listing_aggregates
 *
 * Purpose: Ensure program_type can only be one of: 'HISTORICAL', 'CURRENT', or 'UPCOMING'
 *
 * This migration:
 * 1. Drops the existing CHECK constraint (if it exists)
 * 2. Adds a new CHECK constraint that includes all three valid values
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "store_listing_aggregates";
    const constraintName = "store_listing_aggregates_program_type_check";

    console.log(
      `Adding CHECK constraint for program_type column in ${tableName}...`
    );

    try {
      // First, find and drop any existing CHECK constraints on program_type column
      // PostgreSQL auto-generates constraint names, so we need to find them dynamically
      const [constraints] = await queryInterface.sequelize.query(`
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu
          ON tc.constraint_name = ccu.constraint_name
          AND tc.table_schema = ccu.table_schema
        WHERE tc.table_name = '${tableName}'
          AND tc.constraint_type = 'CHECK'
          AND ccu.column_name = 'program_type';
      `);

      if (constraints.length > 0) {
        for (const constraint of constraints) {
          console.log(
            `Dropping existing constraint: ${constraint.constraint_name}`
          );
          await queryInterface.sequelize.query(`
            ALTER TABLE ${tableName}
            DROP CONSTRAINT IF EXISTS "${constraint.constraint_name}";
          `);
        }
      }

      // Add the new CHECK constraint with all three valid values
      await queryInterface.sequelize.query(`
        ALTER TABLE ${tableName}
        ADD CONSTRAINT ${constraintName}
        CHECK (program_type IN ('HISTORICAL', 'CURRENT', 'UPCOMING'));
      `);

      console.log(
        `✓ CHECK constraint ${constraintName} added successfully to ${tableName}`
      );
    } catch (error) {
      console.error(`Error adding constraint: ${error.message}`);
      throw error;
    }
  },

  async down(queryInterface) {
    const tableName = "store_listing_aggregates";
    const constraintName = "store_listing_aggregates_program_type_check";

    console.log(
      `Reverting CHECK constraint for program_type column in ${tableName}...`
    );

    try {
      // Drop the constraint we added
      await queryInterface.sequelize.query(`
        ALTER TABLE ${tableName}
        DROP CONSTRAINT IF EXISTS ${constraintName};
      `);

      // Restore the original constraint (only 'CURRENT' and 'HISTORICAL')
      await queryInterface.sequelize.query(`
        ALTER TABLE ${tableName}
        ADD CONSTRAINT ${constraintName}
        CHECK (program_type IN ('CURRENT', 'HISTORICAL'));
      `);

      console.log(
        `✓ CHECK constraint reverted to original values (CURRENT, HISTORICAL)`
      );
    } catch (error) {
      console.error(`Error reverting constraint: ${error.message}`);
      throw error;
    }
  }
};
