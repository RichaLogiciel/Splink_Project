"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all existing tables
    const tables = (await queryInterface.showAllTables()).map((t) =>
      t.toLowerCase()
    );

    // Create product_code_mappings table if it doesn't exist
    if (!tables.includes("product_code_mappings")) {
      await queryInterface.createTable("product_code_mappings", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        productId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: "product_id",
          references: { model: "products", key: "id" }
        },
        distributorId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: "distributor_id",
          references: { model: "distributors", key: "id" }
        },
        warehouseId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          field: "warehouse_id",
          references: { model: "warehouses", key: "id" }
        },
        code: {
          type: Sequelize.STRING,
          allowNull: false,
          field: "code"
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
    await queryInterface.dropTable("product_code_mappings");
  }
};
