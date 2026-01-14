"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("etl_csv_products_staging", "ranking", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn(
      "etl_csv_products_staging",
      "is_core_display",
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      }
    );

    await queryInterface.addColumn("etl_csv_products_staging", "is_carousel", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn(
      "etl_csv_products_staging",
      "is_innovation",
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      }
    );

    await queryInterface.addColumn("etl_csv_products_staging", "is_bakeshop", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn(
      "etl_csv_products_staging",
      "is_tic_tac_display",
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      }
    );

    await queryInterface.addColumn(
      "etl_csv_products_staging",
      "is_kinder_display",
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      }
    );

    await queryInterface.addColumn(
      "etl_csv_products_staging",
      "is_bf_display",
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      }
    );

    await queryInterface.addColumn("etl_csv_products_staging", "is_10oz", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn("etl_csv_products_staging", "is_4oz", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn("etl_csv_products_staging", "is_15oz", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn("etl_csv_products_staging", "is_80ct", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn(
      "etl_csv_products_staging",
      "is_cold_crafted",
      {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      }
    );

    await queryInterface.addColumn("products", "ranking", {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("products", "is_core_display", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn("products", "is_carousel", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn("products", "is_bakeshop", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn("products", "is_tic_tac_display", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn("products", "is_kinder_display", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn("products", "is_bf_display", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn("products", "is_10oz", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn("products", "is_4oz", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn("products", "is_15oz", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn("products", "is_80ct", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });

    await queryInterface.addColumn("products", "is_cold_crafted", {
      type: Sequelize.BOOLEAN,
      defaultValue: false,
      allowNull: false
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("etl_csv_products_staging", "ranking");
    await queryInterface.removeColumn(
      "etl_csv_products_staging",
      "is_core_product"
    );
    await queryInterface.removeColumn(
      "etl_csv_products_staging",
      "is_essential"
    );
    await queryInterface.removeColumn(
      "etl_csv_products_staging",
      "is_core_display"
    );
    await queryInterface.removeColumn(
      "etl_csv_products_staging",
      "is_carousel"
    );
    await queryInterface.removeColumn(
      "etl_csv_products_staging",
      "is_innovation"
    );
    await queryInterface.removeColumn(
      "etl_csv_products_staging",
      "is_bakeshop"
    );
    await queryInterface.removeColumn(
      "etl_csv_products_staging",
      "is_tic_tac_display"
    );
    await queryInterface.removeColumn(
      "etl_csv_products_staging",
      "is_kinder_display"
    );
    await queryInterface.removeColumn(
      "etl_csv_products_staging",
      "is_bf_display"
    );
    await queryInterface.removeColumn("etl_csv_products_staging", "is_10oz");
    await queryInterface.removeColumn("etl_csv_products_staging", "is_4oz");
    await queryInterface.removeColumn("etl_csv_products_staging", "is_15oz");
    await queryInterface.removeColumn("etl_csv_products_staging", "is_80ct");
    await queryInterface.removeColumn(
      "etl_csv_products_staging",
      "is_cold_crafted"
    );

    await queryInterface.removeColumn("products", "ranking");
    await queryInterface.removeColumn("products", "is_core_product");
    await queryInterface.removeColumn("products", "is_essential");
    await queryInterface.removeColumn("products", "is_core_display");
    await queryInterface.removeColumn("products", "is_carousel");
    await queryInterface.removeColumn("products", "is_bakeshop");
    await queryInterface.removeColumn("products", "is_tic_tac_display");
    await queryInterface.removeColumn("products", "is_kinder_display");
    await queryInterface.removeColumn("products", "is_bf_display");
    await queryInterface.removeColumn("products", "is_10oz");
    await queryInterface.removeColumn("products", "is_4oz");
    await queryInterface.removeColumn("products", "is_15oz");
    await queryInterface.removeColumn("products", "is_80ct");
    await queryInterface.removeColumn("products", "is_cold_crafted");
  }
};
