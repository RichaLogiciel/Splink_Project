"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.renameColumn(
      "etl_import_file_registry",
      "filename",
      "name"
    );
  },

  async down(queryInterface) {
    await queryInterface.renameColumn(
      "etl_import_file_registry",
      "name",
      "filename"
    );
  }
};
