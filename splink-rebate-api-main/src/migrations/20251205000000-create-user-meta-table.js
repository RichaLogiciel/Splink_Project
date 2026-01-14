"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Check if table exists
    const tableExists = await queryInterface
      .showAllTables()
      .then((tables) => tables.includes("user_meta"));

    if (!tableExists) {
      console.log("Creating user_meta table");
      await queryInterface.createTable("user_meta", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false
        },
        entity_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          field: "entity_id"
        },
        type: {
          type: Sequelize.STRING(50),
          allowNull: false
        },
        key: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        value: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        created_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          field: "created_at"
        },
        updated_at: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          field: "updated_at"
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true,
          field: "deleted_at"
        }
      });

      // Add unique composite index on (entity_id, type, key)
      await queryInterface.addIndex("user_meta", ["entity_id", "type", "key"], {
        unique: true,
        name: "idx_user_meta_entity_type_key_unique"
      });

      // Add index on entity_id for user lookups
      await queryInterface.addIndex("user_meta", ["entity_id"], {
        name: "idx_user_meta_entity_id"
      });

      // Add index on (type, key) for feature-based queries
      await queryInterface.addIndex("user_meta", ["type", "key"], {
        name: "idx_user_meta_type_key"
      });

      console.log("user_meta table created successfully");
    } else {
      console.log("user_meta table already exists");
    }
  },

  async down(queryInterface, Sequelize) {
    // Check if table exists before dropping
    const tableExists = await queryInterface
      .showAllTables()
      .then((tables) => tables.includes("user_meta"));

    if (tableExists) {
      console.log("Dropping user_meta table");
      await queryInterface.dropTable("user_meta");
      console.log("user_meta table dropped successfully");
    } else {
      console.log("user_meta table does not exist");
    }
  }
};
