"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable("program_detail_periods", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      programDetailId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "program_detail_id"
      },
      startDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "start_date"
      },
      endDate: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "end_date"
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at"
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "updated_at",
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "deleted_at"
      }
    });
    await queryInterface.addIndex(
      "program_detail_periods",
      ["program_detail_id"],
      {
        name: "idx_program_detail_periods_program_detail_id"
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      "program_detail_periods",
      "idx_program_detail_periods_program_detail_id"
    );
    await queryInterface.dropTable("program_detail_periods");
  }
};
