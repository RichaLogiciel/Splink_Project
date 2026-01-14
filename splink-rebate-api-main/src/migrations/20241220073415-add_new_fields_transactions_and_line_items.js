"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("transactions", "transaction_date", {
      type: Sequelize.DATEONLY,
      allowNull: false
    });

    await queryInterface.changeColumn(
      "compliance_transactions_history",
      "transaction_date",
      {
        type: Sequelize.DATEONLY,
        allowNull: false
      }
    );

    await queryInterface.addColumn(
      "etl_csv_transactions_staging",
      "trading_partner_id",
      {
        type: Sequelize.STRING(60),
        allowNull: true
      }
    );

    await queryInterface.addColumn(
      "etl_csv_transactions_staging",
      "dist_internal_product_id",
      {
        type: Sequelize.STRING(60),
        allowNull: true
      }
    );

    await queryInterface.addColumn(
      "etl_csv_transactions_staging",
      "product_desc",
      {
        type: Sequelize.TEXT,
        allowNull: true
      }
    );

    await queryInterface.addColumn("line_items", "dist_internal_product_id", {
      type: Sequelize.STRING(60),
      allowNull: true
    });

    await queryInterface.addColumn("line_items", "product_desc", {
      type: Sequelize.TEXT,
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("transactions", "transaction_date", {
      type: Sequelize.DATE,
      allowNull: false
    });

    await queryInterface.changeColumn(
      "compliance_transactions_history",
      "transaction_date",
      {
        type: Sequelize.DATE,
        allowNull: false
      }
    );

    await queryInterface.removeColumn(
      "etl_csv_transactions_staging",
      "trading_partner_id"
    );
    await queryInterface.removeColumn(
      "etl_csv_transactions_staging",
      "dist_internal_product_id"
    );
    await queryInterface.removeColumn(
      "etl_csv_transactions_staging",
      "product_desc"
    );
    await queryInterface.removeColumn("line_items", "product_desc");
    await queryInterface.removeColumn("line_items", "product_desc");
  }
};
