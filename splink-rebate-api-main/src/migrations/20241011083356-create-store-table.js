"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("stores", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      storeName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "store_name"
      },
      externalStoreId: {
        type: DataTypes.STRING(60),
        allowNull: true,
        field: "external_store_id"
      },
      logo: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at"
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW,
        field: "updated_at"
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "deleted_at"
      }
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("stores");
  }
};
