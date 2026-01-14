"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.createTable("user_roles", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        field: "id"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "user_id"
      },
      role: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "role"
      },
      parentEntityId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "parent_entity_id"
      },
      parentEntityType: {
        type: DataTypes.ENUM("MANUFACTURER", "DISTRIBUTOR", "STORE"),
        allowNull: true,
        field: "parent_entity_type"
      },
      associatedUserId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "associated_user_id"
      },
      associatedEntityType: {
        type: DataTypes.ENUM(
          "MANUFACTURER",
          "DISTRIBUTOR",
          "STORE",
          "SUPER_ADMIN"
        ),
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

    await queryInterface.addIndex("user_roles", ["user_id"], {
      name: "idx_user_roles_user_id"
    });

    await queryInterface.addIndex("user_roles", ["parent_entity_id"], {
      name: "idx_user_roles_parent_entity_id"
    });

    await queryInterface.addIndex("user_roles", ["associated_user_id"], {
      name: "idx_user_roles_associated_user_id"
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeIndex("user_roles", "idx_user_roles_user_id");
    await queryInterface.removeIndex(
      "user_roles",
      "idx_user_roles_parent_entity_id"
    );
    await queryInterface.removeIndex(
      "user_roles",
      "idx_user_roles_associated_user_id"
    );
    await queryInterface.dropTable("user_roles");
  }
};
