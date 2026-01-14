"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable("etl_csv_program_rebates_staging", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      importFileId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "import_file_id"
      },
      tradingPartner: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "trading_partner"
      },
      tradingPartnerReference: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "trading_partner_reference"
      },
      member: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "member"
      },
      manufacturerId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "manufacturer_id"
      },
      storeId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "store_id"
      },
      distributorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "distributor_id"
      },
      tradingProgramReference: {
        type: DataTypes.STRING(255),
        allowNull: true,
        field: "trading_program_reference"
      },
      tradingProgramDescription: {
        type: DataTypes.TEXT,
        allowNull: true,
        field: "trading_program_description"
      },
      tradingProgramId: {
        type: DataTypes.STRING(50),
        allowNull: true,
        field: "trading_program_id"
      },
      isInterimProgram: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
        field: "is_interim_program"
      },
      startDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: "start_date"
      },
      endDate: {
        type: DataTypes.DATEONLY,
        allowNull: true,
        field: "end_date"
      },
      totalTransactedValue: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: "total_transacted_value"
      },
      totalTransactedUnits: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "total_transacted_units"
      },
      earnings: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true,
        field: "earnings"
      },
      currency: {
        type: DataTypes.STRING(3),
        allowNull: true,
        field: "currency"
      },
      processed: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "processed"
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        field: "created_at"
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW,
        field: "updated_at"
      }
    });

    // Add indexes
    await queryInterface.addIndex(
      "etl_csv_program_rebates_staging",
      ["import_file_id"],
      {
        name: "idx_rebates_staging_import_file_id"
      }
    );
    await queryInterface.addIndex(
      "etl_csv_program_rebates_staging",
      ["trading_program_id"],
      {
        name: "idx_rebates_staging_trading_program_id"
      }
    );
    await queryInterface.addIndex(
      "etl_csv_program_rebates_staging",
      ["processed"],
      {
        name: "idx_rebates_staging_processed"
      }
    );
    await queryInterface.addIndex(
      "etl_csv_program_rebates_staging",
      ["manufacturer_id"],
      {
        name: "idx_rebates_staging_manufacturer_id"
      }
    );
    await queryInterface.addIndex(
      "etl_csv_program_rebates_staging",
      ["store_id"],
      {
        name: "idx_rebates_staging_store_id"
      }
    );
    await queryInterface.addIndex(
      "etl_csv_program_rebates_staging",
      ["distributor_id"],
      {
        name: "idx_rebates_staging_distributor_id"
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("etl_csv_program_rebates_staging");
  }
};
