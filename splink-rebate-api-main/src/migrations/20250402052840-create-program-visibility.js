"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("program_visibility", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      program_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "programs",
          key: "id"
        }
      },
      program_detail_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "program_details",
          key: "id"
        }
      },
      distributor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "distributors",
          key: "id"
        }
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
        allowNull: false
      }
    });

    // await queryInterface.addIndex('program_visibility', ['program_id']);
    // await queryInterface.addIndex('program_visibility', ['distributor_id']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable("program_visibility");
  }
};
