"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Create users table
    await queryInterface.createTable("users", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true
      },
      password: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      first_name: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      last_name: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "ACTIVE"
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    });

    // Create programs table
    await queryInterface.createTable("programs", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      start_date: {
        type: DataTypes.DATE,
        allowNull: false
      },
      end_date: {
        type: DataTypes.DATE,
        allowNull: false
      },
      program_type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      program_header: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      payment_term: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      manufacturer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id"
        }
      },
      target_audience: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "BOTH"
      },
      visibility_scope: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "ALL_DISTRIBUTORS"
      },
      approval_status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "DRAFT"
      },
      creator_type: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: "MANUFACTURER"
      },
      creator_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      min_purchase_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      rebate_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    });

    // Create program_details table
    await queryInterface.createTable("program_details", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      program_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "programs",
          key: "id"
        }
      },
      tier: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      min_qty: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      max_qty: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      rebate_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      rebate_percentage: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: true
      },
      rebate_type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      rebate_calculation: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      rebate_calculation_type: {
        type: DataTypes.STRING(50),
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      deleted_at: {
        type: DataTypes.DATE,
        allowNull: true
      }
    });

    // Create program_visibility table
    await queryInterface.createTable("program_visibility", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      program_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "programs",
          key: "id"
        }
      },
      program_detail_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "program_details",
          key: "id"
        }
      },
      entity_type: {
        type: DataTypes.STRING(20),
        allowNull: false
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Add indexes
    await queryInterface.addIndex("users", ["email"]);
    await queryInterface.addIndex("users", ["status"]);
    await queryInterface.addIndex("users", ["deleted_at"]);

    await queryInterface.addIndex("programs", ["manufacturer_id"]);
    await queryInterface.addIndex("programs", ["start_date"]);
    await queryInterface.addIndex("programs", ["end_date"]);
    await queryInterface.addIndex("programs", ["deleted_at"]);

    await queryInterface.addIndex("program_details", ["program_id"]);
    await queryInterface.addIndex("program_details", ["deleted_at"]);

    await queryInterface.addIndex("program_visibility", [
      "program_id",
      "program_detail_id"
    ]);
    await queryInterface.addIndex("program_visibility", [
      "entity_type",
      "entity_id"
    ]);
  },

  async down(queryInterface) {
    // Drop tables in reverse order due to foreign key constraints
    await queryInterface.dropTable("program_visibility");
    await queryInterface.dropTable("program_details");
    await queryInterface.dropTable("programs");
    await queryInterface.dropTable("users");
  }
};
