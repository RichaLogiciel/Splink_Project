"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Get all existing tables
    const tables = (await queryInterface.showAllTables()).map((t) =>
      t.toLowerCase()
    );

    // Create shipper_products table if it doesn't exist
    if (!tables.includes("shipper_products")) {
      await queryInterface.createTable("shipper_products", {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          field: "id"
        },
        shipperProductId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "shipper_product_id",
          references: {
            model: "products",
            key: "id"
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        componentProductId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "component_product_id",
          references: {
            model: "products",
            key: "id"
          },
          onUpdate: "CASCADE",
          onDelete: "CASCADE"
        },
        quantityPerShipper: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 1,
          field: "quantity_per_shipper"
        },
        componentUpcType: {
          type: DataTypes.STRING(50),
          allowNull: true,
          field: "component_upc_type"
        },
        displayOrder: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: "display_order"
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "created_at"
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "updated_at"
        },
        deletedAt: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "deleted_at"
        }
      });

      // Create index on shipper_product_id WHERE deleted_at IS NULL
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_shipper_products_shipper 
        ON shipper_products(shipper_product_id) 
        WHERE deleted_at IS NULL;
      `);

      // Create index on component_product_id WHERE deleted_at IS NULL
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_shipper_products_component 
        ON shipper_products(component_product_id) 
        WHERE deleted_at IS NULL;
      `);

      // Create composite index on (shipper_product_id, component_product_id) WHERE deleted_at IS NULL
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_shipper_products_shipper_component 
        ON shipper_products(shipper_product_id, component_product_id) 
        WHERE deleted_at IS NULL;
      `);

      // Create index on deleted_at for soft delete queries
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_shipper_products_deleted_at 
        ON shipper_products(deleted_at);
      `);

      // Create index on display_order for ordering queries
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_shipper_products_display_order 
        ON shipper_products(display_order) 
        WHERE deleted_at IS NULL;
      `);
    }
  },

  async down(queryInterface) {
    // Remove all indices
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_shipper_products_display_order;
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_shipper_products_deleted_at;
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_shipper_products_shipper_component;
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_shipper_products_component;
    `);
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_shipper_products_shipper;
    `);

    // Drop table
    await queryInterface.dropTable("shipper_products");
  }
};
