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

    if (!isExist) {
      // Create the table with all columns using raw SQL for PostgreSQL-specific features
      await queryInterface.sequelize.query(`
        CREATE TABLE IF NOT EXISTS store_listing_aggregates (
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
          PRIMARY KEY (store_id, manufacturer_id, program_id, program_type)
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
        `Table ${tableName} created successfully with comprehensive indexing`
      );
    } else {
      console.log(`Table ${tableName} already exists, skipping creation`);
    }
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
      // Drop indexes first (in reverse order of creation)
      try {
        await queryInterface.sequelize.query(`
          DROP INDEX IF EXISTS idx_store_listing_aggregates_program_enrolled;
        `);
        await queryInterface.sequelize.query(`
          DROP INDEX IF EXISTS idx_store_listing_aggregates_store_manufacturer;
        `);
        await queryInterface.sequelize.query(`
          DROP INDEX IF EXISTS idx_store_listing_aggregates_program_detail_ids;
        `);
        await queryInterface.sequelize.query(`
          DROP INDEX IF EXISTS idx_store_listing_aggregates_sales_rep_id;
        `);
        await queryInterface.sequelize.query(`
          DROP INDEX IF EXISTS idx_store_listing_aggregates_chain_id;
        `);
        await queryInterface.sequelize.query(`
          DROP INDEX IF EXISTS idx_store_listing_aggregates_program_type;
        `);
        await queryInterface.sequelize.query(`
          DROP INDEX IF EXISTS idx_store_listing_aggregates_program_id;
        `);
        await queryInterface.sequelize.query(`
          DROP INDEX IF EXISTS idx_store_listing_aggregates_manufacturer_id;
        `);
        await queryInterface.sequelize.query(`
          DROP INDEX IF EXISTS idx_store_listing_aggregates_store_id;
        `);
      } catch (error) {
        console.log("Some indexes may not exist, continuing with table drop");
      }

      // Drop the table (this will automatically drop the primary key constraint)
      await queryInterface.dropTable(tableName);
      console.log(`Table ${tableName} dropped successfully`);
    } else {
      console.log(`Table ${tableName} does not exist, nothing to drop`);
    }
  }
};
