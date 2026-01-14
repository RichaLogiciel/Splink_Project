"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("etl_csv_products_staging", {
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
      manufacturer: {
        type: Sequelize.STRING,
        allowNull: true
      },
      manufacturer_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      brand_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      name: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      size: {
        type: Sequelize.STRING,
        allowNull: true
      },
      manufacturerCategory: {
        type: Sequelize.STRING,
        allowNull: true,
        field: "manufacturer_category"
      },
      nacsCategory: {
        type: Sequelize.STRING,
        allowNull: true,
        field: "nacs_category"
      },
      upcUnit: {
        type: Sequelize.STRING,
        allowNull: true,
        field: "upc_unit"
      },
      upcBox: {
        type: Sequelize.STRING,
        allowNull: true,
        field: "upc_box"
      },
      upcCase: {
        type: Sequelize.STRING,
        allowNull: true,
        field: "upc_case"
      },
      unitPrice: {
        type: Sequelize.FLOAT,
        allowNull: true,
        field: "unit_price"
      },
      boxPrice: {
        type: Sequelize.FLOAT,
        allowNull: true,
        field: "box_price"
      },
      casePrice: {
        type: Sequelize.FLOAT,
        allowNull: true,
        field: "case_price"
      },
      isCoreProduct: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "is_core_product"
      },
      is_essential: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_flex: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      processed: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      enrichment_status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "PENDING"
      },
      is_enrichment_error: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      distRecommended: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "dist_recommended"
      },
      storeRecommended: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        field: "store_recommended"
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
    await queryInterface.dropTable("etl_csv_products_staging");
  }
};
