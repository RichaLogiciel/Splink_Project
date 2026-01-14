"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("store_sales_reps", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      salesRepId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "sales_rep_id"
      },
      storeId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "store_id"
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
    await queryInterface.addIndex("store_sales_reps", ["store_id"], {
      name: "idx_store_sales_reps_store_id"
    });

    await queryInterface.addIndex("store_sales_reps", ["sales_rep_id"], {
      name: "idx_store_sales_reps_sales_rep_id"
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      "store_sales_reps",
      "idx_store_sales_reps_store_id"
    );
    await queryInterface.removeIndex(
      "store_sales_reps",
      "idx_store_sales_sales_rep_id"
    );
    await queryInterface.dropTable("store_sales_reps");
  }
};
