"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Check if table exists
    const tableExists = await queryInterface.tableExists("program_approvals");

    if (!tableExists) {
      await queryInterface.createTable("program_approvals", {
        id: {
          type: DataTypes.INTEGER,
          primaryKey: true,
          autoIncrement: true
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
        approver_type: {
          type: DataTypes.STRING(20),
          allowNull: false,
          validate: {
            isIn: [["DISTRIBUTOR", "STORE"]]
          }
        },
        approver_id: {
          type: DataTypes.INTEGER,
          allowNull: false
        },
        status: {
          type: DataTypes.STRING(20),
          allowNull: false,
          defaultValue: "PENDING",
          validate: {
            isIn: [["PENDING", "APPROVED", "REJECTED"]]
          }
        },
        notes: {
          type: DataTypes.TEXT,
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

      // Get existing indexes
      const indexes = await queryInterface.showIndex("program_approvals");
      const requiredIndexes = [
        "program_id",
        "program_detail_id",
        "approver_id"
      ];

      // Add only missing indexes
      for (const indexColumn of requiredIndexes) {
        const indexExists = indexes.some((index) =>
          index.fields.some((field) => field.name === indexColumn)
        );
        if (!indexExists) {
          try {
            await queryInterface.addIndex("program_approvals", [indexColumn], {
              name: `program_approvals_${indexColumn}`
            });
          } catch (error) {
            // If index already exists with a different name, continue
            if (!error.message.includes("already exists")) {
              throw error;
            }
          }
        }
      }
    }
  },

  async down(queryInterface) {
    const tableExists = await queryInterface.tableExists("program_approvals");
    if (tableExists) {
      // Remove indexes first
      const indexes = await queryInterface.showIndex("program_approvals");
      for (const index of indexes) {
        if (index.name.startsWith("program_approvals_")) {
          await queryInterface.removeIndex("program_approvals", index.name);
        }
      }
      // Then drop the table
      await queryInterface.dropTable("program_approvals");
    }
  }
};
