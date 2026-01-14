"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      const [results] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' 
        AND column_name = '${columnName}';
      `);
      return results.length > 0;
    };

    // Helper function to check if index exists
    const indexExists = async (tableName, indexName) => {
      const [results] = await queryInterface.sequelize.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = '${tableName}' 
        AND indexname = '${indexName}';
      `);
      return results.length > 0;
    };

    // Step 1: Add the splink_product_id column only if it doesn't exist
    const columnAlreadyExists = await columnExists(
      "line_items",
      "splink_product_id"
    );

    if (!columnAlreadyExists) {
      console.log("Adding splink_product_id column...");
      await queryInterface.addColumn("line_items", "splink_product_id", {
        type: DataTypes.BIGINT,
        allowNull: true,
        references: {
          model: "products",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        field: "splink_product_id"
      });
      console.log("Column splink_product_id added successfully");
    } else {
      console.log("Column splink_product_id already exists, skipping...");
    }

    // Step 2: Create index on splink_product_id if it doesn't exist
    if (
      !(await indexExists("line_items", "idx_line_items_splink_product_id"))
    ) {
      console.log("Creating index idx_line_items_splink_product_id...");
      await queryInterface.addIndex("line_items", ["splink_product_id"], {
        name: "idx_line_items_splink_product_id"
      });
      console.log(
        "Index idx_line_items_splink_product_id created successfully"
      );
    } else {
      console.log(
        "Index idx_line_items_splink_product_id already exists, skipping..."
      );
    }

    // Step 3: Create composite index for product + date if it doesn't exist
    if (
      !(await indexExists(
        "line_items",
        "idx_line_items_splink_product_id_transaction_date"
      ))
    ) {
      console.log(
        "Creating index idx_line_items_splink_product_id_transaction_date..."
      );
      await queryInterface.addIndex(
        "line_items",
        ["splink_product_id", "transaction_date"],
        {
          name: "idx_line_items_splink_product_id_transaction_date"
        }
      );
      console.log(
        "Index idx_line_items_splink_product_id_transaction_date created successfully"
      );
    } else {
      console.log(
        "Index idx_line_items_splink_product_id_transaction_date already exists, skipping..."
      );
    }

    // Step 4: Create composite index for product + buyer if it doesn't exist
    if (
      !(await indexExists(
        "line_items",
        "idx_line_items_splink_product_id_buyer"
      ))
    ) {
      console.log("Creating index idx_line_items_splink_product_id_buyer...");
      await queryInterface.addIndex(
        "line_items",
        ["splink_product_id", "buyer_id", "buyer_type"],
        {
          name: "idx_line_items_splink_product_id_buyer"
        }
      );
      console.log(
        "Index idx_line_items_splink_product_id_buyer created successfully"
      );
    } else {
      console.log(
        "Index idx_line_items_splink_product_id_buyer already exists, skipping..."
      );
    }

    // Step 5: Create composite index for product + seller if it doesn't exist
    if (
      !(await indexExists(
        "line_items",
        "idx_line_items_splink_product_id_seller"
      ))
    ) {
      console.log("Creating index idx_line_items_splink_product_id_seller...");
      await queryInterface.addIndex(
        "line_items",
        ["splink_product_id", "seller_id", "seller_type"],
        {
          name: "idx_line_items_splink_product_id_seller"
        }
      );
      console.log(
        "Index idx_line_items_splink_product_id_seller created successfully"
      );
    } else {
      console.log(
        "Index idx_line_items_splink_product_id_seller already exists, skipping..."
      );
    }

    console.log("Migration completed successfully");
  },

  async down(queryInterface) {
    // Helper function to check if index exists
    const indexExists = async (tableName, indexName) => {
      const [results] = await queryInterface.sequelize.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename = '${tableName}' 
        AND indexname = '${indexName}';
      `);
      return results.length > 0;
    };

    // Helper function to check if column exists
    const columnExists = async (tableName, columnName) => {
      const [results] = await queryInterface.sequelize.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = '${tableName}' 
        AND column_name = '${columnName}';
      `);
      return results.length > 0;
    };

    // Drop indexes first (in reverse order)
    if (
      await indexExists("line_items", "idx_line_items_splink_product_id_seller")
    ) {
      console.log("Dropping index idx_line_items_splink_product_id_seller...");
      await queryInterface.removeIndex(
        "line_items",
        "idx_line_items_splink_product_id_seller"
      );
    }

    if (
      await indexExists("line_items", "idx_line_items_splink_product_id_buyer")
    ) {
      console.log("Dropping index idx_line_items_splink_product_id_buyer...");
      await queryInterface.removeIndex(
        "line_items",
        "idx_line_items_splink_product_id_buyer"
      );
    }

    if (
      await indexExists(
        "line_items",
        "idx_line_items_splink_product_id_transaction_date"
      )
    ) {
      console.log(
        "Dropping index idx_line_items_splink_product_id_transaction_date..."
      );
      await queryInterface.removeIndex(
        "line_items",
        "idx_line_items_splink_product_id_transaction_date"
      );
    }

    if (await indexExists("line_items", "idx_line_items_splink_product_id")) {
      console.log("Dropping index idx_line_items_splink_product_id...");
      await queryInterface.removeIndex(
        "line_items",
        "idx_line_items_splink_product_id"
      );
    }

    // Drop the column if it exists
    if (await columnExists("line_items", "splink_product_id")) {
      console.log("Dropping column splink_product_id...");
      await queryInterface.removeColumn("line_items", "splink_product_id");
    }

    console.log("Rollback completed successfully");
  }
};
