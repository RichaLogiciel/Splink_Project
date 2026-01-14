"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  // Disable transactions for this migration because CREATE INDEX CONCURRENTLY
  // cannot run inside a transaction block in PostgreSQL
  transaction: false,

  async up(queryInterface) {
    const table = "product_code_mappings";
    const column = "last_transaction_date";

    // Check if the column already exists before adding
    const tableInfo = await queryInterface.describeTable(table);

    if (!tableInfo[column]) {
      // Add the column
      await queryInterface.addColumn(table, column, {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        field: "last_transaction_date"
      });
    }

    // Create index CONCURRENTLY to avoid locking the table
    // This is critical for large tables to prevent container timeouts
    try {
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_product_code_mappings_last_transaction_date
        ON ${table} (${column});
      `);
    } catch (error) {
      // If index already exists or creation fails, log but don't fail migration
      // This makes the migration idempotent
      console.warn(
        "Index creation warning (may already exist):",
        error.message
      );
    }
  },

  async down(queryInterface) {
    const table = "product_code_mappings";
    const column = "last_transaction_date";

    // Check if the column exists before removing
    const tableInfo = await queryInterface.describeTable(table);

    if (tableInfo[column]) {
      // Drop index CONCURRENTLY if it exists
      try {
        await queryInterface.sequelize.query(`
          DROP INDEX CONCURRENTLY IF EXISTS idx_product_code_mappings_last_transaction_date;
        `);
      } catch (error) {
        // If index doesn't exist or drop fails, log but continue
        console.warn("Index drop warning (may not exist):", error.message);
      }

      // Remove the column
      await queryInterface.removeColumn(table, column);
    }
  }
};

