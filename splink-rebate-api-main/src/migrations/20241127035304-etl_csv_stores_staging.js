"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create table
    await queryInterface.createTable("etl_csv_stores_staging", {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      distributor_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      external_store_id: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      import_file_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      store_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      sales_rep_name: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      address: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      parent_org: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      associated_store_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      associated_sales_rep_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      is_store_exists: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      is_sales_rep_exists: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      timestamp: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        allowNull: false
      },
      enrichment_status: {
        type: Sequelize.STRING(50),
        defaultValue: "PENDING",
        allowNull: false
      },
      is_enrichment_error: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      processed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
        allowNull: false
      }
    });

    // Create indexes
    await queryInterface.addIndex(
      "etl_csv_stores_staging",
      ["external_store_id"],
      {
        name: "idx_stores_staging_external_store_id"
      }
    );

    await queryInterface.addIndex("etl_csv_stores_staging", ["processed"], {
      name: "idx_stores_staging_processed"
    });

    await queryInterface.addIndex(
      "etl_csv_stores_staging",
      ["enrichment_status"],
      {
        name: "idx_stores_staging_enrichment_status"
      }
    );

    await queryInterface.addIndex(
      "etl_csv_stores_staging",
      ["associated_store_id"],
      {
        name: "idx_stores_staging_associated_store_id"
      }
    );

    await queryInterface.addIndex(
      "etl_csv_stores_staging",
      ["associated_sales_rep_id"],
      {
        name: "idx_stores_staging_associated_sales_rep_id"
      }
    );
  },

  async down(queryInterface) {
    // Drop indexes first
    await queryInterface.removeIndex(
      "etl_csv_stores_staging",
      "idx_stores_staging_external_store_id"
    );
    await queryInterface.removeIndex(
      "etl_csv_stores_staging",
      "idx_stores_staging_processed"
    );
    await queryInterface.removeIndex(
      "etl_csv_stores_staging",
      "idx_stores_staging_enrichment_status"
    );
    await queryInterface.removeIndex(
      "etl_csv_stores_staging",
      "idx_stores_staging_associated_store_id"
    );
    await queryInterface.removeIndex(
      "etl_csv_stores_staging",
      "idx_stores_staging_associated_sales_rep_id"
    );

    // Drop table
    await queryInterface.dropTable("etl_csv_stores_staging");
  }
};
