"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "distributor_program_aggregations";

    const tableExists = async (tableName) => {
      try {
        // Get the table description which includes column information
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isTableExist = await tableExists(tableName);

    // Check if the table already exists
    if (!isTableExist) {
      await queryInterface.createTable(tableName, {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
          field: "id"
        },
        distributorId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "distributor_id",
          comment: "Foreign key reference to distributors table"
        },
        manufacturerId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "manufacturer_id",
          comment: "Foreign key reference to manufacturers table"
        },
        programId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "program_id",
          comment: "Foreign key reference to programs table"
        },
        programDetailId: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "program_detail_id",
          comment: "Foreign key reference to program_details table"
        },
        participantType: {
          type: DataTypes.STRING,
          allowNull: false,
          field: "participant_type",
          comment: "Type of participant (e.g., 'chain', 'store')"
        },
        totalSalesVolume: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0.0,
          field: "total_sales_volume",
          comment: "Total sales volume"
        },
        totalStoreEarnings: {
          type: DataTypes.DECIMAL(15, 2),
          allowNull: false,
          defaultValue: 0.0,
          field: "total_store_earnings",
          comment: "Total earnings for stores"
        },
        storesEnrolled: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: "stores_enrolled",
          comment: "Number of stores enrolled"
        },
        totalStores: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: "total_stores",
          comment: "Total number of stores"
        },
        compliantStores: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: "compliant_stores",
          comment: "Number of compliant stores"
        },
        totalPrograms: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          field: "total_programs",
          comment: "Total number of programs"
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

      // Create indexes for better query performance
      await queryInterface.addIndex(tableName, ["distributor_id"], {
        name: "idx_distributor_program_aggregations_distributor_id"
      });

      await queryInterface.addIndex(tableName, ["manufacturer_id"], {
        name: "idx_distributor_program_aggregations_manufacturer_id"
      });

      await queryInterface.addIndex(tableName, ["program_id"], {
        name: "idx_distributor_program_aggregations_program_id"
      });

      await queryInterface.addIndex(tableName, ["program_detail_id"], {
        name: "idx_distributor_program_aggregations_program_detail_id"
      });

      await queryInterface.addIndex(
        tableName,
        [
          "distributor_id",
          "manufacturer_id",
          "program_id",
          "program_detail_id",
          "participant_type"
        ],
        {
          name: "idx_distributor_program_aggregations_composite",
          unique: true
        }
      );

      await queryInterface.addIndex(tableName, ["participant_type"], {
        name: "idx_distributor_program_aggregations_participant_type"
      });

      console.log(`Table created successfully: ${tableName}`);
    } else {
      console.error(`Table already exists: ${tableName}`);
    }
  },

  async down(queryInterface) {
    const tableName = "distributor_program_aggregations";

    const tableExists = async (tableName) => {
      try {
        // Get the table description which includes column information
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isTableExist = await tableExists(tableName);

    if (isTableExist) {
      await queryInterface.dropTable(tableName);
      console.log(`Table dropped successfully: ${tableName}`);
    } else {
      console.error(
        `Table ${tableName} could not be dropped as it does not exist`
      );
    }
  }
};
