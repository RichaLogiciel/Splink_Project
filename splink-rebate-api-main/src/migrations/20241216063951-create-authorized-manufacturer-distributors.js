"use strict";
const { DataTypes } = require("sequelize");

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable("authorized_distributor_manufacturers", {
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
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
        field: "created_at"
      },
      updatedAt: {
        allowNull: false,
        defaultValue: DataTypes.NOW,
        type: DataTypes.DATE,
        field: "updated_at"
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "deleted_at"
      }
    });

    await queryInterface.addIndex(
      "authorized_distributor_manufacturers",
      ["manufacturer_id"],
      {
        name: "authorized_distributor_manufacturers_manufacturer_id_idx"
      }
    );
    await queryInterface.addIndex(
      "authorized_distributor_manufacturers",
      ["distributor_id"],
      {
        name: "authorized_distributor_manufacturers_distributor_id_idx"
      }
    );
    await queryInterface.addIndex(
      "authorized_distributor_manufacturers",
      ["manufacturer_id", "distributor_id"],
      {
        name: "authorized_distributor_manufacturers_manufacturer_distributor_idx"
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      "authorized_distributor_manufacturers",
      "authorized_distributor_manufacturers_manufacturer_id_idx"
    );
    await queryInterface.removeIndex(
      "authorized_distributor_manufacturers",
      "authorized_distributor_manufacturers_distributor_id_idx"
    );
    await queryInterface.removeIndex(
      "authorized_distributor_manufacturers",
      "authorized_distributor_manufacturers_manufacturer_distributor_idx"
    );

    await queryInterface.dropTable("authorized_distributor_manufacturers");
  }
};
