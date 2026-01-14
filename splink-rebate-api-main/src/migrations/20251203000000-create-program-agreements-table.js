"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Check if table exists and drop it if it does
    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const tableExist = await tableExists("program_agreements");
    if (tableExist) {
      console.log(
        "program_agreements table already exists. Dropping it before recreating..."
      );
      // Remove index if it exists
      try {
        await queryInterface.removeIndex(
          "program_agreements",
          "idx_program_agreements_program_id"
        );
      } catch (error) {
        // Index might not exist, continue
        console.log("Index may not exist, continuing...");
      }
      // Drop the table
      await queryInterface.dropTable("program_agreements");
      console.log("Successfully dropped program_agreements table.");
    }

    await queryInterface.createTable("program_agreements", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
        field: "id"
      },
      agreementId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        field: "agreement_id"
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
      agreementName: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "agreement_name"
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
        onUpdate: DataTypes.NOW,
        field: "updated_at"
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
        field: "deleted_at"
      }
    });

    // Add index for program_id to optimize joins with programs table
    await queryInterface.addIndex("program_agreements", ["program_id"], {
      name: "idx_program_agreements_program_id"
    });
  },

  async down(queryInterface) {
    // Check if table exists before trying to drop
    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const tableExist = await tableExists("program_agreements");
    if (tableExist) {
      // Remove index if it exists
      try {
        await queryInterface.removeIndex(
          "program_agreements",
          "idx_program_agreements_program_id"
        );
      } catch (error) {
        // Index might not exist, continue
        console.log("Index may not exist, continuing...");
      }
      await queryInterface.dropTable("program_agreements");
    }
  }
};
