"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn("users", "status", {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: "INVITATION_PENDING" // Set default value
    });

    await queryInterface.changeColumn("users", "email", {
      type: Sequelize.STRING,
      allowNull: true // Allow NULL for email
    });

    await queryInterface.changeColumn("users", "password_hash", {
      type: Sequelize.STRING,
      allowNull: true // Allow NULL for password
    });

    await queryInterface.changeColumn("users", "first_name", {
      type: Sequelize.STRING,
      allowNull: true // Allow NULL for first_name
    });

    await queryInterface.changeColumn("users", "city", {
      type: Sequelize.STRING,
      allowNull: true // Allow NULL for city
    });

    await queryInterface.changeColumn("users", "state", {
      type: Sequelize.STRING,
      allowNull: true // Allow NULL for state
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn("users", "status", {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: null // Remove default value
    });

    await queryInterface.changeColumn("users", "email", {
      type: Sequelize.STRING,
      allowNull: false // Revert to NOT NULL
    });

    await queryInterface.changeColumn("users", "password_hash", {
      type: Sequelize.STRING,
      allowNull: false // Revert to NOT NULL
    });

    await queryInterface.changeColumn("users", "first_name", {
      type: Sequelize.STRING,
      allowNull: false // Revert to NOT NULL
    });

    await queryInterface.changeColumn("users", "city", {
      type: Sequelize.STRING,
      allowNull: false // Revert to NOT NULL
    });

    await queryInterface.changeColumn("users", "state", {
      type: Sequelize.STRING,
      allowNull: false // Revert to NOT NULL
    });
  }
};
