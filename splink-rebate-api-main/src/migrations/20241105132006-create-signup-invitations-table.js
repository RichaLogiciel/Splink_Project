"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("signup_invitations", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER
      },
      email: {
        type: DataTypes.STRING
      },
      token: {
        type: DataTypes.STRING
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "pending"
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "DISTRIBUTOR_SALES_REP"
      },
      expires_at: {
        type: DataTypes.DATE
      },
      invited_by: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      invited_user: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      completed_at: {
        type: DataTypes.DATE
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
    await queryInterface.dropTable("signup_invitations");
  }
};
