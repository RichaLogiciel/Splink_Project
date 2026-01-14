"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable(
      "etl_csv_programs_staging"
    );

    if (tableInfo["distributor_id"]) {
      await queryInterface.removeColumn(
        "etl_csv_programs_staging",
        "distributor_id"
      );
    }

    if (tableInfo["start_date"]) {
      await queryInterface.removeColumn(
        "etl_csv_programs_staging",
        "start_date"
      );
    }

    if (tableInfo["end_date"]) {
      await queryInterface.removeColumn("etl_csv_programs_staging", "end_date");
    }

    if (tableInfo["start_date_2"]) {
      await queryInterface.removeColumn(
        "etl_csv_programs_staging",
        "start_date_2"
      );
    }

    if (tableInfo["end_date_2"]) {
      await queryInterface.removeColumn(
        "etl_csv_programs_staging",
        "end_date_2"
      );
    }

    if (tableInfo["required_essential_skus"]) {
      await queryInterface.removeColumn(
        "etl_csv_programs_staging",
        "required_essential_skus"
      );
    }

    if (tableInfo["required_flex_skus"]) {
      await queryInterface.removeColumn(
        "etl_csv_programs_staging",
        "required_flex_skus"
      );
    }

    await queryInterface.renameColumn(
      "etl_csv_programs_staging",
      "min_purchase",
      "min_qty"
    );
    await queryInterface.renameColumn(
      "etl_csv_programs_staging",
      "max_purchase",
      "max_qty"
    );

    await queryInterface.addColumn(
      "etl_csv_programs_staging",
      "program_header_id",
      {
        type: Sequelize.STRING,
        defaultValue: null,
        allowNull: true
      }
    );
    await queryInterface.addColumn(
      "etl_csv_programs_staging",
      "rebatable_products",
      {
        type: Sequelize.STRING,
        defaultValue: null,
        allowNull: true
      }
    );
    await queryInterface.addColumn("etl_csv_programs_staging", "min_spend", {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: null,
      allowNull: true
    });
    await queryInterface.addColumn("etl_csv_programs_staging", "max_rebate", {
      type: Sequelize.DECIMAL(10, 2),
      defaultValue: null,
      allowNull: true
    });
    await queryInterface.addColumn("etl_csv_programs_staging", "dependecy", {
      type: Sequelize.STRING,
      defaultValue: null,
      allowNull: true
    });
    await queryInterface.addColumn(
      "etl_csv_programs_staging",
      "program_duration",
      {
        type: Sequelize.STRING,
        defaultValue: null,
        allowNull: true
      }
    );
    await queryInterface.addColumn("programs", "program_header_id", {
      type: Sequelize.STRING,
      defaultValue: null,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.renameColumn(
      "etl_csv_programs_staging",
      "min_qty",
      "min_purchase"
    );
    await queryInterface.renameColumn(
      "etl_csv_programs_staging",
      "max_qty",
      "max_purchase"
    );

    await queryInterface.removeColumn("etl_csv_programs_staging", "min_spend");
    await queryInterface.removeColumn("etl_csv_programs_staging", "max_rebate");
    await queryInterface.removeColumn("etl_csv_programs_staging", "dependecy");
    await queryInterface.removeColumn(
      "etl_csv_programs_staging",
      "program_header_id"
    );
    await queryInterface.removeColumn(
      "etl_csv_programs_staging",
      "rebatable_products"
    );
    await queryInterface.removeColumn(
      "etl_csv_programs_staging",
      "program_duration"
    );
    await queryInterface.removeColumn("programs", "program_header_id");
  }
};
