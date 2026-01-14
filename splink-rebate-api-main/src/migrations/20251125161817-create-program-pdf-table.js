"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    console.log("Creating program_pdf table...");

    // Create the program_pdf table
    await queryInterface.createTable("program_pdf", {
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
        comment: "Optional distributor ID for filtering PDFs by distributor"
      },
      timeline: {
        type: DataTypes.ENUM("Current", "Upcoming"),
        allowNull: false,
        field: "timeline",
        comment: "Timeline: Current or Upcoming (Historical programs excluded)"
      },
      filename: {
        type: DataTypes.STRING(500),
        allowNull: false,
        field: "filename",
        comment: "S3 filename/key for the PDF"
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

    // Add indexes for better query performance
    await queryInterface.addIndex("program_pdf", ["manufacturer_id"], {
      name: "idx_program_pdf_manufacturer_id"
    });

    await queryInterface.addIndex("program_pdf", ["distributor_id"], {
      name: "idx_program_pdf_distributor_id"
    });

    await queryInterface.addIndex("program_pdf", ["timeline"], {
      name: "idx_program_pdf_timeline"
    });

    // Composite index for common query pattern
    await queryInterface.addIndex(
      "program_pdf",
      ["manufacturer_id", "distributor_id", "timeline"],
      {
        name: "idx_program_pdf_manufacturer_distributor_timeline"
      }
    );

    // Add index for soft delete queries
    await queryInterface.addIndex("program_pdf", ["deleted_at"], {
      name: "idx_program_pdf_deleted_at"
    });

    // Add table comment
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE program_pdf IS 'Stores PDF references for manufacturer programs, tracking PDF files stored in S3 for Current and Upcoming programs'
    `);

    console.log("Table program_pdf created successfully");
  },

  async down(queryInterface) {
    console.log("Dropping program_pdf table...");

    // Remove indexes
    await queryInterface.removeIndex(
      "program_pdf",
      "idx_program_pdf_deleted_at"
    );
    await queryInterface.removeIndex(
      "program_pdf",
      "idx_program_pdf_manufacturer_distributor_timeline"
    );
    await queryInterface.removeIndex("program_pdf", "idx_program_pdf_timeline");
    await queryInterface.removeIndex(
      "program_pdf",
      "idx_program_pdf_distributor_id"
    );
    await queryInterface.removeIndex(
      "program_pdf",
      "idx_program_pdf_manufacturer_id"
    );

    // Drop table
    await queryInterface.dropTable("program_pdf");

    // Drop ENUM type
    await queryInterface.sequelize.query(`
      DROP TYPE IF EXISTS "enum_program_pdf_timeline"
    `);

    console.log("Table program_pdf dropped successfully");
  }
};
