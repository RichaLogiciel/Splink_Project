"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */

module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("cart_items", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      entity_type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      creator_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      creator_type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      product_id: {
        type: DataTypes.BIGINT,
        allowNull: false
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      quantity_type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("cart_items");
  }
};
