"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "store_listing_aggregates";

    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isExist = await tableExists(tableName);

    // If table exists, add id column without dropping data
    if (isExist) {
      // Check if id column already exists
      const tableDescription = await queryInterface.describeTable(tableName);
      if (!tableDescription.id) {
        // Drop existing primary key constraint if it exists (composite primary key)
        try {
          await queryInterface.sequelize.query(`
            ALTER TABLE ${tableName} 
            DROP CONSTRAINT IF EXISTS store_listing_aggregates_pkey;
          `);
        } catch (error) {
          console.log("No existing primary key constraint to drop");
        }

        // Add id column as SERIAL PRIMARY KEY
        await queryInterface.sequelize.query(`
          ALTER TABLE ${tableName} 
          ADD COLUMN id SERIAL PRIMARY KEY;
        `);

        // Add back unique constraint on composite key if it doesn't exist
        try {
          await queryInterface.sequelize.query(`
            ALTER TABLE ${tableName} 
            ADD CONSTRAINT store_listing_aggregates_store_manufacturer_program_type_unique 
            UNIQUE (store_id, manufacturer_id, program_id, program_type);
          `);
        } catch (error) {
          console.log("Unique constraint may already exist");
        }

        console.log(`Added id column to ${tableName}`);
      } else {
        console.log(`id column already exists in ${tableName}`);
      }
      return;
    }

    // Create the table with all columns including id column using raw SQL for PostgreSQL-specific features
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS store_listing_aggregates (
        id SERIAL PRIMARY KEY,
        store_id INTEGER NOT NULL,
        manufacturer_id INTEGER NOT NULL,
        program_id INTEGER NOT NULL,
        program_type VARCHAR(20) NOT NULL CHECK (program_type IN ('CURRENT', 'HISTORICAL')),
        chain_id INTEGER,
        sales_rep_id INTEGER,
        program_detail_ids INTEGER[] DEFAULT ARRAY[]::INTEGER[],
        program_compliance_achieved TEXT,
        program_enrolled BOOLEAN DEFAULT false,
        purchase_volume NUMERIC(15, 2) DEFAULT 0,
        earnings NUMERIC(15, 2) DEFAULT 0,
        earning_opp NUMERIC(15, 2) DEFAULT 0,
        compliance_percentage NUMERIC(5, 2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (store_id, manufacturer_id, program_id, program_type)
      );
    `);

    // Create indexes for better query performance
    await queryInterface.sequelize.query(`
      -- Index on store_id
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_store_id 
      ON store_listing_aggregates(store_id);
    `);

    await queryInterface.sequelize.query(`
      -- Index on manufacturer_id
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_manufacturer_id 
      ON store_listing_aggregates(manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      -- Index on program_id
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_id 
      ON store_listing_aggregates(program_id);
    `);

    await queryInterface.sequelize.query(`
      -- Index on program_type
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_type 
      ON store_listing_aggregates(program_type);
    `);

    await queryInterface.sequelize.query(`
      -- Index on chain_id
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_chain_id 
      ON store_listing_aggregates(chain_id);
    `);

    await queryInterface.sequelize.query(`
      -- Index on sales_rep_id
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_sales_rep_id 
      ON store_listing_aggregates(sales_rep_id);
    `);

    await queryInterface.sequelize.query(`
      -- GIN index on program_detail_ids array for array operations
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_detail_ids 
      ON store_listing_aggregates USING GIN(program_detail_ids);
    `);

    await queryInterface.sequelize.query(`
      -- Composite index on store_id and manufacturer_id
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_store_manufacturer 
      ON store_listing_aggregates(store_id, manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      -- Partial index on program_enrolled (only for true values)
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_enrolled 
      ON store_listing_aggregates(program_enrolled) 
      WHERE program_enrolled = true;
    `);

    console.log(
      `Table ${tableName} created successfully with id column and comprehensive indexing`
    );
  },

  async down(queryInterface) {
    const tableName = "store_listing_aggregates";

    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isExist = await tableExists(tableName);

    if (isExist) {
      // Check if id column exists and remove it
      const tableDescription = await queryInterface.describeTable(tableName);
      if (tableDescription.id) {
        // Drop primary key constraint on id
        try {
          await queryInterface.sequelize.query(`
            ALTER TABLE ${tableName} 
            DROP CONSTRAINT IF EXISTS store_listing_aggregates_pkey;
          `);
        } catch (error) {
          console.log("Error dropping primary key constraint");
        }

        // Remove id column
        await queryInterface.sequelize.query(`
          ALTER TABLE ${tableName} 
          DROP COLUMN IF EXISTS id;
        `);

        // Restore composite primary key if it doesn't exist
        try {
          await queryInterface.sequelize.query(`
            ALTER TABLE ${tableName} 
            ADD CONSTRAINT store_listing_aggregates_pkey 
            PRIMARY KEY (store_id, manufacturer_id, program_id, program_type);
          `);
        } catch (error) {
          console.log(
            "Composite primary key may already exist or constraint name differs"
          );
        }

        console.log(`Removed id column from ${tableName}`);
      } else {
        console.log(
          `id column does not exist in ${tableName}, nothing to remove`
        );
      }
    } else {
      console.log(`Table ${tableName} does not exist, nothing to drop`);
    }
  }
};
