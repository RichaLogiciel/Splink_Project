"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const table = await queryInterface.describeTable("products");

    if (!table.merrill_internal_code) {
      await queryInterface.addColumn("products", "merrill_internal_code", {
        type: Sequelize.STRING,
        allowNull: true,
        after: "upc"
      });
      await queryInterface.addIndex("products", ["merrill_internal_code"], {
        name: "idx_products_merrill_internal_code"
      });
    }

    if (!table.pitco_internal_code) {
      await queryInterface.addColumn("products", "pitco_internal_code", {
        type: Sequelize.STRING,
        allowNull: true,
        after: "merrill_internal_code"
      });
      await queryInterface.addIndex("products", ["pitco_internal_code"], {
        name: "idx_products_pitco_internal_code"
      });
    }

    if (!table.sandstrom_internal_code) {
      await queryInterface.addColumn("products", "sandstrom_internal_code", {
        type: Sequelize.STRING,
        allowNull: true,
        after: "pitco_internal_code"
      });
      await queryInterface.addIndex("products", ["sandstrom_internal_code"], {
        name: "idx_products_sandstrom_internal_code"
      });
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      "products",
      "idx_products_merrill_internal_code"
    );
    await queryInterface.removeIndex(
      "products",
      "idx_products_pitco_internal_code"
    );
    await queryInterface.removeIndex(
      "products",
      "idx_products_sandstrom_internal_code"
    );

    await queryInterface.removeColumn("products", "merrill_internal_code");
    await queryInterface.removeColumn("products", "pitco_internal_code");
    await queryInterface.removeColumn("products", "sandstrom_internal_code");
  }
};
