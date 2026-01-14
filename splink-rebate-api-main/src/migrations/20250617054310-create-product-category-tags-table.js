"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get all existing tables
    const tables = (await queryInterface.showAllTables()).map((t) =>
      t.toLowerCase()
    );

    // Create product_category_tags table if it doesn't exist
    if (!tables.includes("product_category_tags")) {
      await queryInterface.createTable("product_category_tags", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        tagKey: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true,
          field: "tag_key"
        },
        tagName: {
          type: Sequelize.STRING,
          allowNull: false,
          field: "tag_name"
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true,
          field: "is_active"
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
    await queryInterface.dropTable("product_category_tags");
  }
};
