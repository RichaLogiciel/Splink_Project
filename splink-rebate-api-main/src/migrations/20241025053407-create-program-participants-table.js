"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    await queryInterface.createTable("program_participants", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      programId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "program_id"
      },
      entityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "entity_id"
      },
      entityType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "entity_type"
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at"
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "updated_at",
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "deleted_at"
      }
    });

    await queryInterface.addIndex("program_participants", ["program_id"], {
      name: "idx_program_participants_program_id"
    });

    await queryInterface.addIndex("program_participants", ["entity_id"], {
      name: "idx_program_participants_entity_id"
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      "program_participants",
      "idx_program_participants_program_id"
    );
    await queryInterface.removeIndex(
      "program_participants",
      "idx_program_participants_entity_id"
    );
    await queryInterface.dropTable("program_participants");
  }
};
