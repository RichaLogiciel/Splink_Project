"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableColumns = {
      etl_csv_products_staging: await queryInterface.describeTable(
        "etl_csv_products_staging"
      ),
      products: await queryInterface.describeTable("products")
    };

    // Function to check and add column if it doesn't exist
    const addColumnIfNotExists = async (table, column, options) => {
      if (!tableColumns[table][column]) {
        await queryInterface.addColumn(table, column, options);
      }
    };

    await addColumnIfNotExists("etl_csv_products_staging", "primary_variant", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await addColumnIfNotExists(
      "etl_csv_products_staging",
      "category_tags_json",
      {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: null
      }
    );

    await addColumnIfNotExists("products", "primary_variant", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true
    });

    await addColumnIfNotExists("products", "category_tags_json", {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: null
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      "etl_csv_products_staging",
      "primary_variant"
    );
    await queryInterface.removeColumn(
      "etl_csv_products_staging",
      "category_tags_json"
    );
    await queryInterface.removeColumn("products", "primary_variant");
    await queryInterface.removeColumn("products", "category_tags_json");
  }
};
