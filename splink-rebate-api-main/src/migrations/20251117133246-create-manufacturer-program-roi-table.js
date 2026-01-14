"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    console.log("Creating manufacturer_program_roi table...");

    // Create the manufacturer_program_roi table
    await queryInterface.createTable("manufacturer_program_roi", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        field: "id"
      },
      manufacturerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "manufacturer_id",
        references: {
          model: "manufacturers",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      programId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: "program_id",
        references: {
          model: "programs",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      distributorId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "distributor_id",
        references: {
          model: "distributors",
          key: "id"
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        comment: "Optional distributor ID for filtering ROI by distributor"
      },
      rebateType: {
        type: DataTypes.ENUM("STORE", "SALES_REP"),
        allowNull: false,
        field: "rebate_type",
        comment:
          "Type of rebate: STORE for store rebates, SALES_REP for sales rep rebates"
      },
      costOfProgram: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: "cost_of_program",
        comment: "Total cost of the program"
      },
      currentYearProgramProductSales: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: "current_year_program_product_sales",
        comment:
          "Sales of program products for current year (for calculating incremental lift and sales/cost ratio)"
      },
      previousYearProgramProductSales: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        field: "previous_year_program_product_sales",
        comment:
          "Sales of program products for previous year (for calculating incremental lift)"
      },
      newDoorsCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        field: "new_doors_count",
        comment: "Number of new doors"
      },
      totalDoorsCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        field: "last_year_doors_count",
        comment: "Number of doors from last year (for percentage calculation)"
      },
      newPodCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        field: "new_pod_count",
        comment: "Number of new points of distribution"
      },
      totalPodCount: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: 0,
        field: "total_pod_count",
        comment: "Total points of distribution (for percentage calculation)"
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
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "deleted_at"
      }
    });

    // Add unique constraint on manufacturer_id, program_id, distributor_id, and rebate_type
    await queryInterface.addConstraint("manufacturer_program_roi", {
      fields: [
        "manufacturer_id",
        "program_id",
        "distributor_id",
        "rebate_type"
      ],
      type: "unique",
      name: "uq_manufacturer_program_roi_manufacturer_program_dist_type"
    });

    // Add indexes for better query performance
    await queryInterface.addIndex(
      "manufacturer_program_roi",
      ["manufacturer_id"],
      {
        name: "idx_manufacturer_program_roi_manufacturer_id"
      }
    );

    await queryInterface.addIndex("manufacturer_program_roi", ["program_id"], {
      name: "idx_manufacturer_program_roi_program_id"
    });

    await queryInterface.addIndex(
      "manufacturer_program_roi",
      ["distributor_id"],
      {
        name: "idx_manufacturer_program_roi_distributor_id"
      }
    );

    await queryInterface.addIndex("manufacturer_program_roi", ["rebate_type"], {
      name: "idx_manufacturer_program_roi_rebate_type"
    });

    // Composite index for common query pattern
    await queryInterface.addIndex(
      "manufacturer_program_roi",
      ["manufacturer_id", "program_id"],
      {
        name: "idx_manufacturer_program_roi_manufacturer_program"
      }
    );

    // Add table comment
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE manufacturer_program_roi IS 'Stores ROI metrics for manufacturer programs, tracking sales, costs, and performance indicators for store and sales rep rebates'
    `);

    console.log("Table manufacturer_program_roi created successfully");
  },

  async down(queryInterface) {
    console.log("Dropping manufacturer_program_roi table...");

    // Remove indexes
    await queryInterface.removeIndex(
      "manufacturer_program_roi",
      "idx_manufacturer_program_roi_manufacturer_program"
    );
    await queryInterface.removeIndex(
      "manufacturer_program_roi",
      "idx_manufacturer_program_roi_rebate_type"
    );
    await queryInterface.removeIndex(
      "manufacturer_program_roi",
      "idx_manufacturer_program_roi_distributor_id"
    );
    await queryInterface.removeIndex(
      "manufacturer_program_roi",
      "idx_manufacturer_program_roi_program_id"
    );
    await queryInterface.removeIndex(
      "manufacturer_program_roi",
      "idx_manufacturer_program_roi_manufacturer_id"
    );

    // Remove constraint
    await queryInterface.removeConstraint(
      "manufacturer_program_roi",
      "uq_manufacturer_program_roi_manufacturer_program_dist_type"
    );

    // Drop table
    await queryInterface.dropTable("manufacturer_program_roi");

    // Drop ENUM type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_manufacturer_program_roi_rebate_type"
    `);

    console.log("Table manufacturer_program_roi dropped successfully");
  }
};
