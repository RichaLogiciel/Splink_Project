"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("distributors", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true
      },
      organizationName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "organization_name"
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
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
    await queryInterface.dropTable("distributors");
  }
};
