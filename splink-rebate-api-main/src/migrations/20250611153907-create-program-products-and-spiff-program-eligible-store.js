"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all existing tables
    const tables = (await queryInterface.showAllTables()).map((t) =>
      t.toLowerCase()
    );

    // Create program_products table if it doesn't exist
    if (!tables.includes("program_products")) {
      await queryInterface.createTable("program_products", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        program_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "programs", key: "id" }
        },
        program_detail_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "program_details", key: "id" }
        },
        product_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "products", key: "id" }
        },
        qty: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: null
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
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

    // Create spiff_program_eligible_store table if it doesn't exist
    if (!tables.includes("spiff_program_eligible_store")) {
      await queryInterface.createTable("spiff_program_eligible_store", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        program_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "programs", key: "id" }
        },
        store_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "stores", key: "id" }
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
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

  down: async (queryInterface, Sequelize) => {
    // const tables = (await queryInterface.showAllTables()).map((t) =>
    //   t.toLowerCase()
    // );
    // if (tables.includes("spiff_program_eligible_store")) {
    // }
    // if (tables.includes("program_products")) {
    // }
    await queryInterface.dropTable("spiff_program_eligible_store");
    await queryInterface.dropTable("program_products");
  }
};
