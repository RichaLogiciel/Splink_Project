"use strict";
const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    return queryInterface.addColumn("signup_invitations", "replace_email", {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  async down(queryInterface) {
    return queryInterface.removeColumn("signup_invitations", "replace_email");
  }
};
