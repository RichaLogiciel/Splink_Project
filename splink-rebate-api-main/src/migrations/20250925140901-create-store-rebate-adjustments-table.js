"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Create the store_rebate_adjustments table
    await queryInterface.createTable("store_rebate_adjustments", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      distributor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "distributors",
          key: "id"
        }
      },
      store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "stores",
          key: "id"
        }
      },
      adjustment_factor: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: false,
        validate: {
          min: 0.0001,
          max: 1.0
        }
      },
      adjustment_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: "SPIFF"
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      updated_by: {
        type: DataTypes.INTEGER,
        allowNull: true
      }
    });

    // Create unique constraint for (distributor_id, store_id, adjustment_type)
    await queryInterface.addConstraint("store_rebate_adjustments", {
      fields: ["distributor_id", "store_id", "adjustment_type"],
      type: "unique",
      name: "unique_distributor_store_adjustment_type"
    });

    // Create indexes for performance
    await queryInterface.addIndex(
      "store_rebate_adjustments",
      ["distributor_id"],
      {
        name: "idx_store_rebate_adjustments_distributor_id"
      }
    );

    await queryInterface.addIndex("store_rebate_adjustments", ["store_id"], {
      name: "idx_store_rebate_adjustments_store_id"
    });

    await queryInterface.addIndex(
      "store_rebate_adjustments",
      ["adjustment_type"],
      {
        name: "idx_store_rebate_adjustments_adjustment_type"
      }
    );

    await queryInterface.addIndex("store_rebate_adjustments", ["is_active"], {
      name: "idx_store_rebate_adjustments_is_active"
    });

    // Create composite index for common queries
    await queryInterface.addIndex(
      "store_rebate_adjustments",
      ["distributor_id", "is_active"],
      {
        name: "idx_store_rebate_adjustments_distributor_active"
      }
    );

    await queryInterface.addIndex(
      "store_rebate_adjustments",
      ["store_id", "adjustment_type", "is_active"],
      {
        name: "idx_store_rebate_adjustments_store_type_active"
      }
    );

    // Add table and column comments
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE store_rebate_adjustments IS
      'Stores rebate adjustment factors for specific distributor-store combinations, allowing fine-tuning of rebate calculations'
    `);

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN store_rebate_adjustments.adjustment_factor IS
      'Multiplier factor for rebate calculations (0.0001 to 1.0000)'
    `);

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN store_rebate_adjustments.adjustment_type IS
      'Type of adjustment (e.g., SPIFF, REBATE, BONUS)'
    `);

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN store_rebate_adjustments.is_active IS
      'Whether this adjustment is currently active and should be applied'
    `);
  },

  async down(queryInterface) {
    // Drop table indexes
    await queryInterface.removeIndex(
      "store_rebate_adjustments",
      "idx_store_rebate_adjustments_distributor_id"
    );
    await queryInterface.removeIndex(
      "store_rebate_adjustments",
      "idx_store_rebate_adjustments_store_id"
    );
    await queryInterface.removeIndex(
      "store_rebate_adjustments",
      "idx_store_rebate_adjustments_adjustment_type"
    );
    await queryInterface.removeIndex(
      "store_rebate_adjustments",
      "idx_store_rebate_adjustments_is_active"
    );
    await queryInterface.removeIndex(
      "store_rebate_adjustments",
      "idx_store_rebate_adjustments_distributor_active"
    );
    await queryInterface.removeIndex(
      "store_rebate_adjustments",
      "idx_store_rebate_adjustments_store_type_active"
    );

    // Drop unique constraint
    await queryInterface.removeConstraint(
      "store_rebate_adjustments",
      "unique_distributor_store_adjustment_type"
    );

    // Drop the table
    await queryInterface.dropTable("store_rebate_adjustments");
  }
};
