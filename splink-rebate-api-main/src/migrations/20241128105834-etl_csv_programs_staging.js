"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      "etl_csv_participant_program_staging",
      {
        // Primary key
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        // Foreign keys and main identifiers
        agreement_id: {
          type: Sequelize.STRING(30),
          allowNull: true
        },
        // Program details
        program_header: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        line_item: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        participant_type: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        participant_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        participant_name: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        member_name: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        manufacturer_id: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        // Status and processing flags
        processing_status: {
          type: Sequelize.STRING,
          defaultValue: null,
          allowNull: true
        },
        enrichment_status: {
          type: Sequelize.STRING(50),
          defaultValue: "PENDING",
          allowNull: true
        },
        is_enrichment_error: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: false
        },
        // Missing columns from your table
        overview: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        rebate_calculation: {
          type: Sequelize.STRING(30),
          allowNull: true
        },
        import_file_id: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        // Timestamps
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          allowNull: false
        },
        updated_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          allowNull: false
        },
        deleted_at: {
          type: Sequelize.DATE,
          allowNull: true
        }
      },
      {
        timestamps: true,
        paranoid: true,
        underscored: true,
        indexes: [
          {
            name: "idx_participant_program_staging_agreement_id",
            fields: ["agreement_id"]
          },
          {
            name: "idx_participant_program_staging_processed",
            fields: ["processed"]
          },
          {
            name: "idx_participant_program_staging_enrichment_status",
            fields: ["enrichment_status"]
          }
        ],
        comment:
          "Staging table for participant program data loaded from CSV files"
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable("etl_csv_participant_program_staging");
  }
};
