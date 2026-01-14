"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("etl_import_file_registry", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      filename: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      source: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      file_size: {
        type: Sequelize.BIGINT,
        allowNull: true // Nullable as per your structure
      },
      total_rows: {
        type: Sequelize.BIGINT,
        allowNull: true // Nullable as per your structure
      },
      distributor_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      status: {
        type: Sequelize.STRING(50),
        defaultValue: "PENDING",
        allowNull: false
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        onUpdate: Sequelize.literal("CURRENT_TIMESTAMP")
      },
      uploaded_by: {
        type: Sequelize.INTEGER,
        allowNull: false
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("etl_import_file_registry");
  }
};
