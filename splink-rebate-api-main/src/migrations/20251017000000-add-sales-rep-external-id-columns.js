"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Function to check if a column exists in a table
    const columnExists = async (tableName, columnName) => {
      try {
        // Get the table description which includes column information
        const tableDescription = await queryInterface.describeTable(tableName);
        return !!tableDescription[columnName];
      } catch (error) {
        console.error(
          `Error checking if column ${columnName} exists in ${tableName}:`,
          error
        );
        return false;
      }
    };

    // Function to check if an index exists
    const indexExists = async (tableName, indexName) => {
      try {
        const indexes = await queryInterface.showIndex(tableName);
        return indexes.some((index) => index.name === indexName);
      } catch (error) {
        console.error(
          `Error checking if index ${indexName} exists on ${tableName}:`,
          error
        );
        return false;
      }
    };

    // Step 1: Add sales_rep_external_id column to distributors table if it doesn't exist
    const salesRepExternalIdExistsInDistributors = await columnExists(
      "distributors",
      "sales_rep_external_id"
    );
    if (!salesRepExternalIdExistsInDistributors) {
      console.log("Adding sales_rep_external_id column to distributors table");
      await queryInterface.addColumn("distributors", "sales_rep_external_id", {
        type: Sequelize.STRING(255),
        allowNull: true
      });
      console.log(
        "✅ Successfully added sales_rep_external_id column to distributors table"
      );
    } else {
      console.log(
        "sales_rep_external_id column already exists in distributors table"
      );
    }

    // Step 2: Add sales_rep_external_id column to etl_csv_stores_staging table if it doesn't exist
    const salesRepExternalIdExistsInStaging = await columnExists(
      "etl_csv_stores_staging",
      "sales_rep_external_id"
    );
    if (!salesRepExternalIdExistsInStaging) {
      console.log(
        "Adding sales_rep_external_id column to etl_csv_stores_staging table"
      );
      await queryInterface.addColumn(
        "etl_csv_stores_staging",
        "sales_rep_external_id",
        {
          type: Sequelize.STRING(255),
          allowNull: true
        }
      );
      console.log(
        "✅ Successfully added sales_rep_external_id column to etl_csv_stores_staging table"
      );
    } else {
      console.log(
        "sales_rep_external_id column already exists in etl_csv_stores_staging table"
      );
    }

    // Step 3: Create partial index on distributors.sales_rep_external_id if it doesn't exist
    const distributorsIndexExists = await indexExists(
      "distributors",
      "idx_distributors_sales_rep_external_id"
    );
    if (!distributorsIndexExists) {
      console.log(
        "Creating index idx_distributors_sales_rep_external_id on distributors table"
      );
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_distributors_sales_rep_external_id 
        ON distributors(sales_rep_external_id) 
        WHERE sales_rep_external_id IS NOT NULL;
      `);
      console.log(
        "✅ Successfully created index idx_distributors_sales_rep_external_id"
      );
    } else {
      console.log(
        "Index idx_distributors_sales_rep_external_id already exists on distributors table"
      );
    }

    // Step 4: Create partial index on etl_csv_stores_staging.sales_rep_external_id if it doesn't exist
    const stagingIndexExists = await indexExists(
      "etl_csv_stores_staging",
      "idx_stores_staging_sales_rep_external_id"
    );
    if (!stagingIndexExists) {
      console.log(
        "Creating index idx_stores_staging_sales_rep_external_id on etl_csv_stores_staging table"
      );
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_stores_staging_sales_rep_external_id 
        ON etl_csv_stores_staging(sales_rep_external_id) 
        WHERE sales_rep_external_id IS NOT NULL;
      `);
      console.log(
        "✅ Successfully created index idx_stores_staging_sales_rep_external_id"
      );
    } else {
      console.log(
        "Index idx_stores_staging_sales_rep_external_id already exists on etl_csv_stores_staging table"
      );
    }
  },

  async down(queryInterface, Sequelize) {
    // Function to check if a column exists in a table
    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        return !!tableDescription[columnName];
      } catch (error) {
        console.error(
          `Error checking if column ${columnName} exists in ${tableName}:`,
          error
        );
        return false;
      }
    };

    // Function to check if an index exists
    const indexExists = async (tableName, indexName) => {
      try {
        const indexes = await queryInterface.showIndex(tableName);
        return indexes.some((index) => index.name === indexName);
      } catch (error) {
        console.error(
          `Error checking if index ${indexName} exists on ${tableName}:`,
          error
        );
        return false;
      }
    };

    // Remove index from etl_csv_stores_staging table if it exists
    const stagingIndexExists = await indexExists(
      "etl_csv_stores_staging",
      "idx_stores_staging_sales_rep_external_id"
    );
    if (stagingIndexExists) {
      console.log(
        "Removing index idx_stores_staging_sales_rep_external_id from etl_csv_stores_staging table"
      );
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_stores_staging_sales_rep_external_id;
      `);
    }

    // Remove index from distributors table if it exists
    const distributorsIndexExists = await indexExists(
      "distributors",
      "idx_distributors_sales_rep_external_id"
    );
    if (distributorsIndexExists) {
      console.log(
        "Removing index idx_distributors_sales_rep_external_id from distributors table"
      );
      await queryInterface.sequelize.query(`
        DROP INDEX IF EXISTS idx_distributors_sales_rep_external_id;
      `);
    }

    // Remove sales_rep_external_id column from etl_csv_stores_staging table if it exists
    const salesRepExternalIdExistsInStaging = await columnExists(
      "etl_csv_stores_staging",
      "sales_rep_external_id"
    );
    if (salesRepExternalIdExistsInStaging) {
      console.log(
        "Removing sales_rep_external_id column from etl_csv_stores_staging table"
      );
      await queryInterface.removeColumn(
        "etl_csv_stores_staging",
        "sales_rep_external_id"
      );
    }

    // Remove sales_rep_external_id column from distributors table if it exists
    const salesRepExternalIdExistsInDistributors = await columnExists(
      "distributors",
      "sales_rep_external_id"
    );
    if (salesRepExternalIdExistsInDistributors) {
      console.log(
        "Removing sales_rep_external_id column from distributors table"
      );
      await queryInterface.removeColumn(
        "distributors",
        "sales_rep_external_id"
      );
    }
  }
};
