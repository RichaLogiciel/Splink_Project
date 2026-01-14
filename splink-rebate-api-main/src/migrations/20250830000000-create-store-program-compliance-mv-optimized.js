"use strict";

/**
 * Migration to replace store_program_compliance_mv materialized view with spiff_store_program_compliance table
 *
 * This migration transitions from the old materialized view approach to the new table-based approach.
 * The table approach provides better performance, easier maintenance, and supports chunked data ingestion.
 *
 * Key Changes:
 * - Drops old materialized view if it exists
 * - Creates new spiff_store_program_compliance table
 * - Sets up all necessary indexes for optimal performance
 * - Supports ETL-based data population
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log(
        "🔄 Starting transition from materialized view to table approach..."
      );

      // Drop existing materialized view if it exists
      await queryInterface.sequelize.query(`
        DROP MATERIALIZED VIEW IF EXISTS store_program_compliance_mv CASCADE;
      `);

      console.log("✅ Dropped existing materialized view");

      // Drop any related refresh functions
      await queryInterface.sequelize.query(`
        DROP FUNCTION IF EXISTS refresh_store_program_compliance_mv() CASCADE;
      `);

      console.log("✅ Dropped related refresh functions");

      // Create the new spiff_store_program_compliance table
      await queryInterface.createTable("spiff_store_program_compliance", {
        buyer_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: "Store ID (buyer in line_items)"
        },
        seller_id: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: "Distributor ID (seller in line_items)"
        },
        manufacturer_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: "Manufacturer ID from programs table"
        },
        program_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: "Program ID from programs table"
        },
        program_detail_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: "Program detail ID from program_details table"
        },
        products_tags: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment:
            "Comma-separated product category tags (e.g., 'Beverages,Snacks')"
        },
        required_count_by_tag: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: "Comma-separated required counts per tag (e.g., '5,3')"
        },
        purchased_distinct_product_ids: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: "Array of purchased product IDs for this program detail"
        },
        total_product_tags: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: "Sum of all required counts from required_count_by_tag"
        },
        total_purchased_distinct_product_ids: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment:
            "Total count of purchased distinct products (clamped by required counts)"
        },
        compliance_percentage: {
          type: Sequelize.DECIMAL(5, 2),
          allowNull: true,
          comment: "Calculated compliance percentage (0.00 to 100.00)"
        },
        total_units: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: "Total quantity of products purchased (for future use)"
        },
        total_spend: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          comment: "Total spend on products (for future use)"
        },
        earning_opportunity: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: true,
          comment:
            "Potential rebate earnings from store_earning_opportunity_summary"
        },
        latest_transaction_date: {
          type: Sequelize.DATE,
          allowNull: true,
          comment:
            "Most recent transaction date for this store-program combination"
        },
        last_refreshed_at: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Timestamp when this record was last updated"
        },
        program_start_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: "Timestamp when this record was last updated"
        },
        program_end_date: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: "Program end date for filtering active programs"
        }
      });

      console.log("✅ Created spiff_store_program_compliance table");

      // Create primary composite index for the most common query pattern
      await queryInterface.addIndex("spiff_store_program_compliance", {
        fields: ["buyer_id", "manufacturer_id", "program_detail_id"],
        name: "idx_spiff_store_program_compliance_buyer_manufacturer_program_detail",
        comment: "Primary composite index for store compliance queries"
      });

      // Create index for program detail filtering
      await queryInterface.addIndex("spiff_store_program_compliance", {
        fields: ["program_detail_id"],
        name: "idx_spiff_store_program_compliance_program_detail",
        comment: "Index for program detail filtering"
      });

      // Create index for compliance percentage filtering
      await queryInterface.addIndex("spiff_store_program_compliance", {
        fields: ["compliance_percentage"],
        name: "idx_spiff_store_program_compliance_compliance_percentage",
        comment: "Index for compliance percentage range queries"
      });

      // Create index for program date filtering
      await queryInterface.addIndex("spiff_store_program_compliance", {
        fields: ["program_start_date", "program_end_date"],
        name: "idx_spiff_store_program_compliance_program_dates",
        comment: "Index for active program filtering by date range"
      });

      // Create index for seller (distributor) filtering
      await queryInterface.addIndex("spiff_store_program_compliance", {
        fields: ["seller_id"],
        name: "idx_spiff_store_program_compliance_seller",
        comment: "Index for distributor-specific filtering"
      });

      // Create index for program filtering
      await queryInterface.addIndex("spiff_store_program_compliance", {
        fields: ["program_id"],
        name: "idx_spiff_store_program_compliance_program",
        comment: "Index for program filtering"
      });

      // Create index for manufacturer filtering
      await queryInterface.addIndex("spiff_store_program_compliance", {
        fields: ["manufacturer_id"],
        name: "idx_spiff_store_program_compliance_manufacturer",
        comment: "Index for manufacturer filtering"
      });

      // Create index for buyer (store) filtering
      await queryInterface.addIndex("spiff_store_program_compliance", {
        fields: ["buyer_id"],
        name: "idx_spiff_store_program_compliance_buyer",
        comment: "Index for store filtering"
      });

      // Create composite index for seller + buyer combination (common query pattern)
      await queryInterface.addIndex("spiff_store_program_compliance", {
        fields: ["seller_id", "buyer_id"],
        name: "idx_spiff_store_program_compliance_seller_buyer",
        comment: "Composite index for distributor-store queries"
      });

      // Create composite index for manufacturer + program combination
      await queryInterface.addIndex("spiff_store_program_compliance", {
        fields: ["manufacturer_id", "program_id"],
        name: "idx_spiff_store_program_compliance_manufacturer_program",
        comment: "Composite index for manufacturer-program queries"
      });

      // Create partial index for active programs (where dates are not null)
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_spiff_store_program_compliance_active_programs 
        ON spiff_store_program_compliance (buyer_id, manufacturer_id, program_detail_id)
        WHERE program_start_date IS NOT NULL AND program_end_date IS NOT NULL
      `);

      console.log(
        "✅ Created all indexes for spiff_store_program_compliance table"
      );

      // Add table comment
      await queryInterface.sequelize.query(`
        COMMENT ON TABLE spiff_store_program_compliance IS 
        'Pre-calculated store program compliance data replacing materialized view for better performance and maintainability'
      `);

      console.log("✅ Added table comment");

      console.log(
        "🎉 Transition from materialized view to table completed successfully!"
      );
      console.log(
        "ℹ️  Data population will be handled by ETL scripts in splink-data-etl repository"
      );
    } catch (error) {
      console.error(
        "❌ Error during transition from materialized view to table:",
        error
      );
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      console.log(
        "🔄 Rolling back: Recreating store_program_compliance_mv materialized view..."
      );

      // Drop the new table
      await queryInterface.dropTable("spiff_store_program_compliance");

      // Recreate the materialized view (basic structure for rollback)
      await queryInterface.sequelize.query(`
        CREATE MATERIALIZED VIEW store_program_compliance_mv AS
        SELECT 
          buyer_id,
          seller_id,
          manufacturer_id,
          program_id,
          program_detail_id,
          products_tags,
          required_count_by_tag,
          purchased_distinct_product_ids,
          total_product_tags,
          total_purchased_distinct_product_ids,
          compliance_percentage,
          total_units,
          total_spend,
          earning_opportunity,
          latest_transaction_date,
          last_refreshed_at
        FROM (SELECT 1 as dummy) t
        WHERE false
        WITH DATA;
      `);

      // Recreate basic indexes
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_store_program_compliance_mv_buyer_manufacturer
        ON store_program_compliance_mv (buyer_id, manufacturer_id);
      `);

      console.log(
        "✅ Successfully recreated store_program_compliance_mv materialized view for rollback"
      );
    } catch (error) {
      console.error(
        "❌ Error recreating materialized view during rollback:",
        error
      );
      throw error;
    }
  }
};
