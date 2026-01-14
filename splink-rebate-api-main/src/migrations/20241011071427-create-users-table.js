"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable("users", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: true
        },
        field: "email"
      },
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "password_hash"
      },
      firstName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "first_name"
      },
      lastName: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "last_name"
      },
      address: {
        type: DataTypes.STRING,
        allowNull: true
      },
      city: {
        type: DataTypes.STRING,
        allowNull: true
      },
      state: {
        type: DataTypes.STRING,
        allowNull: true
      },
      zip: {
        type: DataTypes.STRING,
        allowNull: true
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      refreshToken: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "refresh_token"
      },
      secondaryPhone: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "secondary_phone"
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_active"
      },
      status: {
        type: DataTypes.STRING,
        allowNull: true
      },
      lastLogin: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "last_login"
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
    await queryInterface.dropTable("users");
  }
};
