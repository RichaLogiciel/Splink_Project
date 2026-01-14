"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("chain_stores", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      chain_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        onDelete: "CASCADE"
      },
      store_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        onDelete: "CASCADE"
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("chain_stores");
  }
};
