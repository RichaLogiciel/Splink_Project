"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("etl_csv_program_rebates_staging", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      import_file_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      trading_partner: {
        type: Sequelize.STRING,
        allowNull: true
      },
      trading_partner_reference: {
        type: Sequelize.STRING,
        allowNull: true
      },
      member: {
        type: Sequelize.STRING,
        allowNull: true
      },
      manufacturer_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      distributor_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      trading_program_reference: {
        type: Sequelize.STRING,
        allowNull: true
      },
      trading_program_description: {
        type: Sequelize.STRING,
        allowNull: true
      },
      trading_program_id: {
        type: Sequelize.STRING,
        allowNull: true
      },
      is_interim_program: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      start_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      end_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      total_transacted_value: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      total_transacted_units: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      earnings: {
        type: Sequelize.FLOAT,
        allowNull: false,
        defaultValue: 0
      },
      currency: {
        type: Sequelize.STRING,
        allowNull: true
      },
      processed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
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
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("etl_csv_program_rebates_staging");
  }
};
