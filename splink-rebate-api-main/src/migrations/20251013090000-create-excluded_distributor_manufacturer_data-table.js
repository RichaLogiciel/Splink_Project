"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable("excluded_distributor_manufacturer_data", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      distributorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "distributor_id"
      },
      manufacturerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "manufacturer_id"
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "created_at"
      },
      updatedAt: {
        allowNull: false,
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
        field: "updated_at"
      },
      deletedAt: {
        allowNull: true,
        type: DataTypes.DATE,
        field: "deleted_at"
      }
    });

    await queryInterface.addIndex(
      "excluded_distributor_manufacturer_data",
      ["distributor_id"],
      {
        name: "excluded_distributor_manufacturer_data_distributor_id_idx"
      }
    );
    await queryInterface.addIndex(
      "excluded_distributor_manufacturer_data",
      ["manufacturer_id"],
      {
        name: "excluded_distributor_manufacturer_data_manufacturer_id_idx"
      }
    );
    await queryInterface.addIndex(
      "excluded_distributor_manufacturer_data",
      ["distributor_id", "manufacturer_id"],
      {
        name: "excluded_distributor_manufacturer_data_distributor_manufacturer_idx"
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      "excluded_distributor_manufacturer_data",
      "excluded_distributor_manufacturer_data_distributor_manufacturer_idx"
    );
    await queryInterface.removeIndex(
      "excluded_distributor_manufacturer_data",
      "excluded_distributor_manufacturer_data_manufacturer_id_idx"
    );
    await queryInterface.removeIndex(
      "excluded_distributor_manufacturer_data",
      "excluded_distributor_manufacturer_data_distributor_id_idx"
    );

    await queryInterface.dropTable("excluded_distributor_manufacturer_data");
  }
};
