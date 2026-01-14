"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "store_void_fill_targets";

    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isExist = await tableExists(tableName);

    if (!isExist) {
      // Create the main table
      await queryInterface.createTable(tableName, {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
          field: "id"
        },
        storeId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "store_id"
        },
        programId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "program_id"
        },
        programDetailId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "program_detail_id"
        },
        totalRequiredProducts: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "total_required_products"
        },
        productsPurchasedLookback: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: "products_purchased_lookback"
        },
        remainingTarget: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "remaining_target"
        },
        earningOpportunity: {
          type: DataTypes.DECIMAL(10, 2),
          allowNull: false,
          field: "earning_opportunity"
        },
        categoryPurchases: {
          type: DataTypes.JSONB,
          allowNull: false,
          defaultValue: {},
          field: "category_purchases"
        },
        lookbackStartDate: {
          type: DataTypes.DATEONLY,
          allowNull: false,
          field: "lookback_start_date"
        },
        lookbackEndDate: {
          type: DataTypes.DATEONLY,
          allowNull: false,
          field: "lookback_end_date"
        },
        lastCalculated: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "last_calculated"
        },
        isActive: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          field: "is_active"
        },
        createdAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "created_at"
        },
        updatedAt: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "updated_at"
        }
      });

      // Add unique constraint
      await queryInterface.addConstraint(tableName, {
        fields: ["store_id", "program_id"],
        type: "unique",
        name: "uq_store_void_fill_targets_store_program"
      });

      // Performance indexes for optimal query performance using raw SQL for partial indexes

      // 1. Composite index for store and program lookups
      await queryInterface.addIndex(tableName, ["store_id", "program_id"], {
        name: "idx_targets_store_program"
      });

      // 2. GIN index for JSONB category_purchases (essential for JSON queries)
      await queryInterface.addIndex(tableName, ["category_purchases"], {
        using: "GIN",
        name: "idx_targets_category_purchases"
      });

      // 3. Composite index for lookback date range queries
      await queryInterface.addIndex(
        tableName,
        ["lookback_start_date", "lookback_end_date"],
        {
          name: "idx_targets_lookback_dates"
        }
      );

      // 4. Partial index for active targets only (WHERE is_active = TRUE)
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_targets_active 
        ON ${tableName}(is_active) 
        WHERE is_active = TRUE;
      `);

      // 5. Composite partial index for program and active status
      await queryInterface.sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_targets_program_active 
        ON ${tableName}(program_id, is_active) 
        WHERE is_active = TRUE;
      `);

      // 6. Index for program detail lookups
      await queryInterface.addIndex(tableName, ["program_detail_id"], {
        name: "idx_targets_program_detail"
      });

      // 7. Index for earning opportunity queries (for sorting/filtering)
      await queryInterface.addIndex(tableName, ["earning_opportunity"], {
        name: "idx_targets_earning_opportunity"
      });

      // 8. Index for last calculated timestamp (for maintenance queries)
      await queryInterface.addIndex(tableName, ["last_calculated"], {
        name: "idx_targets_last_calculated"
      });

      // 9. Composite index for store and active status (common query pattern)
      await queryInterface.addIndex(tableName, ["store_id", "is_active"], {
        name: "idx_targets_store_active"
      });

      // 10. Index for remaining target (for sorting/filtering)
      await queryInterface.addIndex(tableName, ["remaining_target"], {
        name: "idx_targets_remaining_target"
      });

      console.log(
        `Table ${tableName} created successfully with comprehensive indexing`
      );
    } else {
      console.log(`Table ${tableName} already exists, skipping creation`);
    }
  },

  async down(queryInterface) {
    const tableName = "store_void_fill_targets";

    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isExist = await tableExists(tableName);

    if (isExist) {
      // Drop partial indexes first (since they might not be automatically dropped)
      try {
        await queryInterface.sequelize.query(`
          DROP INDEX IF EXISTS idx_targets_active;
        `);
        await queryInterface.sequelize.query(`
          DROP INDEX IF EXISTS idx_targets_program_active;
        `);
      } catch (error) {
        console.log("Some indexes may not exist, continuing with table drop");
      }

      // Drop the table (this will automatically drop all other indexes and constraints)
      await queryInterface.dropTable(tableName);
      console.log(`Table ${tableName} dropped successfully`);
    } else {
      console.log(`Table ${tableName} does not exist, nothing to drop`);
    }
  }
};
