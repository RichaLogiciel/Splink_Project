"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("entity_access_mappings", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      parentEntityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "parent_entity_id"
      },
      parentEntityType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "parent_entity_type"
      },
      associatedEntityId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "associated_entity_id"
      },
      associatedEntityType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "associated_entity_type"
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        field: "created_at"
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        onUpdate: DataTypes.NOW,
        field: "updated_at"
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "deleted_at"
      }
    });

    await queryInterface.addIndex(
      "entity_access_mappings",
      ["parent_entity_id", "parent_entity_type"],
      {
        name: "entity_access_mappings_parent_entity_id_parent_entity_type_idx",
        unique: false
      }
    );

    await queryInterface.addIndex(
      "entity_access_mappings",
      ["associated_entity_id", "associated_entity_type"],
      {
        name: "entity_access_mappings_associated_entity_id_associated_entity_type_idx",
        unique: false
      }
    );

    await queryInterface.addIndex(
      "entity_access_mappings",
      [
        "associated_entity_id",
        "associated_entity_type",
        "parent_entity_id",
        "parent_entity_type"
      ],
      {
        name: "entity_access_mappings_associatedentity_associatedentity_parententity_idx",
        unique: false
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      "entity_access_mappings",
      "entity_access_mappings_associatedentity_associatedentity_parententity_idx"
    );
    await queryInterface.removeIndex(
      "entity_access_mappings",
      "entity_access_mappings_associated_entity_id_associated_entity_type_idx"
    );
    await queryInterface.removeIndex(
      "entity_access_mappings",
      "entity_access_mappings_parent_entity_id_parent_entity_type_idx"
    );
    await queryInterface.dropTable("entity_access_mappings");
  }
};
