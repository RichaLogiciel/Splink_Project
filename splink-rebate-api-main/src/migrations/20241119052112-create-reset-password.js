"use strict";
const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("reset_password", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      userId: {
        type: DataTypes.INTEGER,
        field: "user_id"
      },
      email: {
        type: DataTypes.STRING
      },
      token: {
        type: DataTypes.STRING
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "status",
        defaultValue: "pending"
      },
      expireAt: {
        type: DataTypes.DATE,
        field: "expire_at"
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at",
        defaultValue: DataTypes.NOW
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "deleted_at"
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "updated_at"
      }
    });
  },
  async down(queryInterface) {
    await queryInterface.dropTable("reset_password");
  }
};
