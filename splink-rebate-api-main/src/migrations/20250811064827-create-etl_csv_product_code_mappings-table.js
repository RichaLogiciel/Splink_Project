"use strict";

const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all existing tables
    const tables = (await queryInterface.showAllTables()).map((t) =>
      t.toLowerCase()
    );

    // Create etl_csv_product_code_mappings table if it doesn't exist
    if (!tables.includes("etl_csv_product_code_mappings")) {
      await queryInterface.createTable("etl_csv_product_code_mappings", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        import_file_id: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        distributor_name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        warehouse_name: {
          type: Sequelize.STRING,
          allowNull: false
        },
        product_skus_id: {
          type: DataTypes.BIGINT,
          allowNull: false
        },
        category_tags_json: {
          type: Sequelize.JSONB,
          allowNull: false
        },
        distributor_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        warehouse_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        product_id: {
          type: DataTypes.INTEGER,
          allowNull: true
        },
        code: {
          type: Sequelize.STRING,
          allowNull: true
        },
        processed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        processed_at: {
          type: Sequelize.DATE,
          allowNull: true
        },
        enrichment_status: {
          type: Sequelize.STRING,
          allowNull: false,
          defaultValue: "PENDING"
        },
        is_enrichment_error: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
          field: "created_at"
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.NOW,
          onUpdate: Sequelize.NOW,
          field: "updated_at"
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "deleted_at"
        }
      });
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("etl_csv_product_code_mappings");
  }
};
