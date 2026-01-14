"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable("excluded_distributor_programs", {
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
      distributorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "distributor_id"
      },
      programId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "program_id"
      },
      programDetailId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "program_detail_id"
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at"
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "deleted_at"
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("excluded_distributor_programs");
  }
};
