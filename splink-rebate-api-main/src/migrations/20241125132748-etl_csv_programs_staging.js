"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable("etl_csv_programs_staging", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      import_file_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      distributorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "distributor_id"
      },
      manufacturer_id: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      agreement_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      agreement_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      processed: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      processed_at: {
        type: DataTypes.DATE(6),
        allowNull: true,
        timezone: true
      },
      is_enrichment_error: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      is_core_product: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      is_essential: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      is_flex: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        defaultValue: false
      },
      overview: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE(6),
        allowNull: false,
        defaultValue: DataTypes.NOW,
        timezone: true
      },
      updated_at: {
        type: DataTypes.DATE(6),
        allowNull: false,
        defaultValue: DataTypes.NOW,
        timezone: true
      },
      deleted_at: {
        type: DataTypes.DATE(6),
        allowNull: true,
        timezone: true
      },
      tier: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      min_purchase: {
        type: DataTypes.DECIMAL,
        allowNull: true
      },
      max_purchase: {
        type: DataTypes.DECIMAL,
        allowNull: true
      },
      rebate_amount: {
        type: DataTypes.DECIMAL,
        allowNull: true
      },
      rebate_percentage: {
        type: DataTypes.DECIMAL,
        allowNull: true
      },
      required_core_skus: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      required_essential_skus: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      required_flex_skus: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      start_date_2: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      end_date_2: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      manufacturer: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      program_type: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      program_line: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      rebate_type: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      participant_type: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      payment_term: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      agreement: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      program_header: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      program_criteria: {
        type: DataTypes.STRING(30),
        allowNull: true
      },
      rebate_calculation: {
        type: DataTypes.STRING(30),
        allowNull: true
      },
      agreement_external_id: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      enrichment_status: {
        type: DataTypes.STRING(50),
        allowNull: true,
        defaultValue: "PENDING"
      }
    });

    await queryInterface.addIndex("etl_csv_programs_staging", [
      "import_file_id"
    ]);
    await queryInterface.addIndex("etl_csv_programs_staging", [
      "manufacturer_id"
    ]);
    await queryInterface.addIndex("etl_csv_programs_staging", [
      "agreement_external_id"
    ]);
    await queryInterface.addIndex("etl_csv_programs_staging", ["processed"]);
    await queryInterface.addIndex("etl_csv_programs_staging", [
      "enrichment_status"
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("etl_csv_programs_staging");
  }
};
