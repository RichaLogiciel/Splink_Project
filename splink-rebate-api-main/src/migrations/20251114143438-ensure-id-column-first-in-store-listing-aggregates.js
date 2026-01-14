"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "store_listing_aggregates";
    const tempTableName = "store_listing_aggregates_temp";

    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isExist = await tableExists(tableName);

    // If table exists, check if id column exists and if it's in the correct position
    if (isExist) {
      const tableDescription = await queryInterface.describeTable(tableName);

      // Check if id column exists
      if (!tableDescription.id) {
        // Table exists but id column doesn't - recreate table with id as first column
        console.log(
          `Table ${tableName} exists but id column is missing. Recreating table with id as first column...`
        );

        // Create temporary table with id as first column
        await queryInterface.sequelize.query(`
          CREATE TABLE ${tempTableName} (
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

        // Copy all data from old table to new table (id will be auto-generated)
        await queryInterface.sequelize.query(`
          INSERT INTO ${tempTableName} (
            store_id, manufacturer_id, program_id, program_type, chain_id, sales_rep_id,
            program_detail_ids, program_compliance_achieved, program_enrolled,
            purchase_volume, earnings, earning_opp, compliance_percentage,
            created_at, updated_at
          )
          SELECT 
            store_id, manufacturer_id, program_id, program_type, chain_id, sales_rep_id,
            program_detail_ids, program_compliance_achieved, program_enrolled,
            purchase_volume, earnings, earning_opp, compliance_percentage,
            created_at, updated_at
          FROM ${tableName};
        `);

        // Reset sequence to ensure it's at the maximum id value
        await queryInterface.sequelize.query(`
          SELECT setval(
            pg_get_serial_sequence('${tempTableName}', 'id'),
            COALESCE((SELECT MAX(id) FROM ${tempTableName}), 1),
            true
          );
        `);

        // Drop old table
        await queryInterface.dropTable(tableName);

        // Rename temp table to original name
        await queryInterface.sequelize.query(`
          ALTER TABLE ${tempTableName} RENAME TO ${tableName};
        `);

        // Recreate all indexes
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
          CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_enrolled 
          ON ${tableName}(program_enrolled) 
          WHERE program_enrolled = true;
        `);

        console.log(
          `Table ${tableName} recreated with id column as first column`
        );
      } else {
        // Check if id is already the first column by querying information_schema
        const [columnOrder] = await queryInterface.sequelize.query(`
          SELECT column_name, ordinal_position
          FROM information_schema.columns
          WHERE table_name = '${tableName}'
          ORDER BY ordinal_position
          LIMIT 1;
        `);

        if (
          columnOrder &&
          columnOrder[0] &&
          columnOrder[0].column_name === "id"
        ) {
          console.log(
            `id column already exists and is the first column in ${tableName}`
          );
        } else {
          // id exists but is not first - recreate table to make it first
          console.log(
            `id column exists but is not first. Recreating table to make id first column...`
          );

          // Create temporary table with id as first column
          await queryInterface.sequelize.query(`
            CREATE TABLE ${tempTableName} (
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

          // Copy all data including id
          await queryInterface.sequelize.query(`
            INSERT INTO ${tempTableName} (
              id, store_id, manufacturer_id, program_id, program_type, chain_id, sales_rep_id,
              program_detail_ids, program_compliance_achieved, program_enrolled,
              purchase_volume, earnings, earning_opp, compliance_percentage,
              created_at, updated_at
            )
            SELECT 
              id, store_id, manufacturer_id, program_id, program_type, chain_id, sales_rep_id,
              program_detail_ids, program_compliance_achieved, program_enrolled,
              purchase_volume, earnings, earning_opp, compliance_percentage,
              created_at, updated_at
            FROM ${tableName};
          `);

          // Reset sequence to prevent duplicate key violations on future inserts
          await queryInterface.sequelize.query(`
            SELECT setval(
              pg_get_serial_sequence('${tempTableName}', 'id'),
              COALESCE((SELECT MAX(id) FROM ${tempTableName}), 1),
              true
            );
          `);

          // Drop old table
          await queryInterface.dropTable(tableName);

          // Rename temp table to original name
          await queryInterface.sequelize.query(`
            ALTER TABLE ${tempTableName} RENAME TO ${tableName};
          `);

          // Recreate all indexes
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
            CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_enrolled 
            ON ${tableName}(program_enrolled) 
            WHERE program_enrolled = true;
          `);

          console.log(
            `Table ${tableName} recreated with id column as first column`
          );
        }
      }
      return;
    }

    // Create the table with id as first column if it doesn't exist
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
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
      CREATE INDEX IF NOT EXISTS idx_store_listing_aggregates_program_enrolled 
      ON ${tableName}(program_enrolled) 
      WHERE program_enrolled = true;
    `);

    console.log(
      `Table ${tableName} created successfully with id column as first column and comprehensive indexing`
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
      // Check if id column exists
      const tableDescription = await queryInterface.describeTable(tableName);
      if (tableDescription.id) {
        // Drop primary key constraint on id
        try {
          await queryInterface.sequelize.query(`
            ALTER TABLE ${tableName} 
            DROP CONSTRAINT IF EXISTS ${tableName}_pkey;
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
            ADD CONSTRAINT ${tableName}_pkey 
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
