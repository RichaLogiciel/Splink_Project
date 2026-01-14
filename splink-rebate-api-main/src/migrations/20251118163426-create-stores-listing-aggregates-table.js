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

    // If table exists, check if distributor_id column exists
    if (isExist) {
      const tableDescription = await queryInterface.describeTable(tableName);

      // Check if distributor_id column exists
      if (!tableDescription.distributor_id) {
        // Table exists but distributor_id column doesn't - drop and recreate table
        console.log(
          `Table ${tableName} exists but distributor_id column is missing. Dropping and recreating table...`
        );

        // Drop the existing table
        await queryInterface.sequelize.query(
          `DROP TABLE IF EXISTS ${tableName} CASCADE;`
        );

        console.log(`Table ${tableName} dropped successfully`);
      } else {
        console.log(
          `Table ${tableName} already exists with distributor_id column, skipping creation`
        );
        return;
      }
    }

    // Create the table with all columns including distributor_id using raw SQL for PostgreSQL-specific features
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id SERIAL PRIMARY KEY,
        distributor_id INTEGER NOT NULL,
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
        annual_purchase_volume NUMERIC(15, 2) DEFAULT 0,
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
      ON ${tableName}(store_id);
    `);

    await queryInterface.sequelize.query(`
      -- Index on manufacturer_id
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_manufacturer_id 
      ON ${tableName}(manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      -- Index on program_id
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_id 
      ON ${tableName}(program_id);
    `);

    await queryInterface.sequelize.query(`
      -- Index on program_type
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_type 
      ON ${tableName}(program_type);
    `);

    await queryInterface.sequelize.query(`
      -- Index on distributor_id
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_distributor_id 
      ON ${tableName}(distributor_id);
    `);

    await queryInterface.sequelize.query(`
      -- Index on chain_id
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_chain_id 
      ON ${tableName}(chain_id);
    `);

    await queryInterface.sequelize.query(`
      -- Index on sales_rep_id
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_sales_rep_id 
      ON ${tableName}(sales_rep_id);
    `);

    await queryInterface.sequelize.query(`
      -- GIN index on program_detail_ids array for array operations
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_detail_ids 
      ON ${tableName} USING GIN(program_detail_ids);
    `);

    await queryInterface.sequelize.query(`
      -- Composite index on store_id and manufacturer_id
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_store_manufacturer 
      ON ${tableName}(store_id, manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      -- Composite index on distributor_id and manufacturer_id
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_distributor_manufacturer 
      ON ${tableName}(distributor_id, manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      -- Partial index on program_enrolled (only for true values)
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_enrolled 
      ON ${tableName}(program_enrolled) 
      WHERE program_enrolled = true;
    `);

    console.log(
      `Table ${tableName} created successfully with distributor_id column and comprehensive indexing`
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
      await queryInterface.sequelize.query(
        `DROP TABLE IF EXISTS ${tableName} CASCADE;`
      );
      console.log(`Table ${tableName} dropped successfully`);
    } else {
      console.log(`Table ${tableName} does not exist, nothing to drop`);
    }
  }
};
