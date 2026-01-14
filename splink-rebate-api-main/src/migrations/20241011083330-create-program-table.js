"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("programs", {
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
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      externalProgramId: {
        type: DataTypes.STRING,
        allowNull: true,
        field: "external_program_id"
      },
      participantType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "participant_type"
      },
      programHeader: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "program_header"
      },
      programLine: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "program_line"
      },
      programType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "program_type"
      },
      paymentTerm: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "payment_term"
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

    await queryInterface.addIndex("programs", ["manufacturer_id"], {
      name: "idx_programs_manufacturer_id"
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      "programs",
      "idx_programs_manufacturer_id"
    );
    await queryInterface.dropTable("programs");
  }
};
