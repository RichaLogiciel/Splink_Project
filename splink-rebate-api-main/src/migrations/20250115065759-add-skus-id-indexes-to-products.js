"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Adding indexes
    await queryInterface.addIndex("products", ["skus_id"], {
      name: "products_skus_id_idx"
    });
    await queryInterface.addIndex("products", ["box_skus_id"], {
      name: "products_box_skus_id_idx"
    });
    await queryInterface.addIndex("products", ["case_skus_id"], {
      name: "products_case_skus_id_idx"
    });
    await queryInterface.addIndex("products", ["unit_skus_id"], {
      name: "products_unit_skus_id_idx"
    });
  },

  async down(queryInterface) {
    // Removing indexes
    await queryInterface.removeIndex("products", "products_skus_id_idx");
    await queryInterface.removeIndex("products", "products_box_skus_id_idx");
    await queryInterface.removeIndex("products", "products_case_skus_id_idx");
    await queryInterface.removeIndex("products", "products_unit_skus_id_idx");
  }
};
