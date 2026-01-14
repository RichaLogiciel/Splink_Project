"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("products", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      manufacturerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "manufacturer_id"
      },
      categoryId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "category_id"
      },
      skusId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: false,
        field: "skus_id"
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      size: {
        type: DataTypes.STRING(20),
        allowNull: true
      },
      brand: {
        type: DataTypes.STRING,
        allowNull: true
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        field: "price"
      },
      unitSkusId: {
        type: DataTypes.STRING(30),
        allowNull: true,
        field: "unit_skus_id"
      },
      boxSkusId: {
        type: DataTypes.STRING(30),
        allowNull: true,
        field: "box_skus_id"
      },
      caseSkusId: {
        type: DataTypes.STRING(30),
        allowNull: true,
        field: "case_skus_id"
      },
      unitPrice: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: "unit_price"
      },
      boxPrice: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: "box_price"
      },
      casePrice: {
        type: DataTypes.FLOAT,
        allowNull: true,
        field: "case_price"
      },
      isCoreProduct: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: "is_core_product"
      },
      isEssential: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: "is_essential"
      },
      isFlex: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: "is_flex"
      },
      isInnovation: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        field: "is_innovation"
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
        field: "updated_at"
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "deleted_at"
      }
    });

    await queryInterface.addIndex("products", ["manufacturer_id"]);
    await queryInterface.addIndex("products", ["category_id"]);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable("products");
  }
};
