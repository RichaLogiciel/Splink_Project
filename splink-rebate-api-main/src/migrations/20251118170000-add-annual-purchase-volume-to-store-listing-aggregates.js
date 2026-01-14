"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "store_listing_aggregates";
    const tempTableName = "store_listing_aggregates_temp";
    const columnName = "annual_purchase_volume";

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

    // If table doesn't exist, log and return (should be created by previous migration)
    if (!isTableExist) {
      console.log(
        `Table ${tableName} does not exist. This migration should run after the table creation migration. Skipping...`
      );
      return;
    }

    // Check if column already exists
    const isColumnExist = await columnExists(tableName, columnName);

    if (isColumnExist) {
      console.log(
        `Column ${columnName} already exists in ${tableName}, skipping addition`
      );
      return;
    }

    // Recreate table with annual_purchase_volume in the correct position (after purchase_volume)
    console.log(
      `Adding column ${columnName} to ${tableName} after purchase_volume by recreating table...`
    );

    // Step 1: Create temporary table with the new column in correct position
    await queryInterface.sequelize.query(`
      CREATE TABLE ${tempTableName} (
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

    // Step 2: Copy data from old table to new table (excluding annual_purchase_volume, which will default to 0)
    await queryInterface.sequelize.query(`
      INSERT INTO ${tempTableName} (
        id, distributor_id, store_id, manufacturer_id, program_id, program_type,
        chain_id, sales_rep_id, program_detail_ids, program_compliance_achieved,
        program_enrolled, purchase_volume, earnings, earning_opp, compliance_percentage,
        created_at, updated_at
      )
      SELECT 
        id, distributor_id, store_id, manufacturer_id, program_id, program_type,
        chain_id, sales_rep_id, program_detail_ids, program_compliance_achieved,
        program_enrolled, purchase_volume, earnings, earning_opp, compliance_percentage,
        created_at, updated_at
      FROM ${tableName};
    `);

    // Step 3: Reset sequence to prevent duplicate key violations on future inserts
    await queryInterface.sequelize.query(`
      SELECT setval(
        pg_get_serial_sequence('${tempTableName}', 'id'),
        COALESCE((SELECT MAX(id) FROM ${tempTableName}), 1),
        true
      );
    `);

    // Step 4: Drop old table
    await queryInterface.sequelize.query(
      `DROP TABLE IF EXISTS ${tableName} CASCADE;`
    );

    // Step 5: Rename temp table to original name
    await queryInterface.sequelize.query(`
      ALTER TABLE ${tempTableName} RENAME TO ${tableName};
    `);

    // Step 6: Recreate all indexes
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_store_id 
      ON ${tableName}(store_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_manufacturer_id 
      ON ${tableName}(manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_id 
      ON ${tableName}(program_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_type 
      ON ${tableName}(program_type);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_distributor_id 
      ON ${tableName}(distributor_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_chain_id 
      ON ${tableName}(chain_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_sales_rep_id 
      ON ${tableName}(sales_rep_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_detail_ids 
      ON ${tableName} USING GIN(program_detail_ids);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_store_manufacturer 
      ON ${tableName}(store_id, manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_distributor_manufacturer 
      ON ${tableName}(distributor_id, manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_enrolled 
      ON ${tableName}(program_enrolled) 
      WHERE program_enrolled = true;
    `);

    console.log(
      `Column ${columnName} added successfully to ${tableName} after purchase_volume`
    );
  },

  async down(queryInterface) {
    const tableName = "store_listing_aggregates";
    const columnName = "annual_purchase_volume";

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
      console.log(`Table ${tableName} does not exist, nothing to remove`);
      return;
    }

    const isColumnExist = await columnExists(tableName, columnName);

    if (!isColumnExist) {
      console.log(
        `Column ${columnName} does not exist in ${tableName}, nothing to remove`
      );
      return;
    }

    console.log(`Removing column ${columnName} from ${tableName}...`);

    await queryInterface.sequelize.query(`
      ALTER TABLE ${tableName}
      DROP COLUMN IF EXISTS ${columnName};
    `);

    console.log(`Column ${columnName} removed successfully from ${tableName}`);
  }
};
