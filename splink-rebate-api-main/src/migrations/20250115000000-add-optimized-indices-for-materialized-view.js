"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if the materialized view exists before creating indices
      const [results] = await queryInterface.sequelize.query(
        `
        SELECT EXISTS (
          SELECT 1 
          FROM pg_matviews 
          WHERE matviewname = 'line_items_products_joined_materialized_view'
        ) as exists
        `,
        { transaction }
      );

      const materializedViewExists = results[0]?.exists;

      if (!materializedViewExists) {
        console.log(
          "Materialized view 'line_items_products_joined_materialized_view' does not exist. Skipping index creation."
        );
        await transaction.commit();
        return;
      }

      console.log(
        "Creating optimized indices for line_items_products_joined_materialized_view..."
      );

      // Index 1: Manufacturer, seller, buyer types with date
      await queryInterface.sequelize.query(
        `
        CREATE INDEX IF NOT EXISTS idx_mv_manufacturer_seller_buyer_types_date 
        ON line_items_products_joined_materialized_view (
          manufacturer_id, 
          seller_id, 
          seller_type, 
          buyer_type, 
          transaction_date DESC
        ) 
        INCLUDE (buyer_id, product_id)
      `,
        { transaction }
      );

      // Index 2: Distributor-to-store aggregation
      await queryInterface.sequelize.query(
        `
        CREATE INDEX IF NOT EXISTS idx_mv_dist_store_aggregation 
        ON line_items_products_joined_materialized_view (
          manufacturer_id, 
          seller_id, 
          transaction_date DESC, 
          buyer_id, 
          product_id
        ) 
        WHERE seller_type = 'DISTRIBUTOR' AND buyer_type = 'STORE'
      `,
        { transaction }
      );

      // Index 3: Store listing optimized
      await queryInterface.sequelize.query(
        `
        CREATE INDEX IF NOT EXISTS idx_mv_store_listing_optimized 
        ON line_items_products_joined_materialized_view (
          manufacturer_id, 
          seller_id, 
          buyer_id, 
          buyer_type, 
          transaction_date
        ) 
        WHERE buyer_type = 'STORE' AND total_price > 0
      `,
        { transaction }
      );

      // Index 4: Program participants entity lookup
      await queryInterface.sequelize.query(
        `
        CREATE INDEX IF NOT EXISTS idx_program_participants_entity_lookup 
        ON program_participants (
          entity_id, 
          entity_type, 
          program_id
        ) 
        WHERE entity_type = 'STORE'
      `,
        { transaction }
      );

      // Index 5: Programs manufacturer timeline
      await queryInterface.sequelize.query(
        `
        CREATE INDEX IF NOT EXISTS idx_programs_manufacturer_timeline 
        ON programs (
          manufacturer_id, 
          id, 
          start_date, 
          end_date
        ) 
        WHERE deleted_at IS NULL
      `,
        { transaction }
      );

      // Index 6: Manufacturer seller date
      await queryInterface.sequelize.query(
        `
        CREATE INDEX IF NOT EXISTS idx_mv_manufacturer_seller_date 
        ON line_items_products_joined_materialized_view (
          manufacturer_id, 
          seller_id, 
          transaction_date
        )
      `,
        { transaction }
      );

      // Index 7: Manufacturer seller covering
      await queryInterface.sequelize.query(
        `
        CREATE INDEX IF NOT EXISTS idx_mv_manufacturer_seller_covering 
        ON line_items_products_joined_materialized_view (
          manufacturer_id, 
          seller_id
        ) 
        INCLUDE (internal_product_id)
      `,
        { transaction }
      );

      // Index 8: Main filters
      await queryInterface.sequelize.query(
        `
        CREATE INDEX IF NOT EXISTS idx_line_items_main_filters 
        ON line_items_products_joined_materialized_view (
          seller_id,
          seller_type,
          buyer_type,
          warehouse_id,
          manufacturer_id,
          transaction_date
        ) 
        WHERE seller_type = 'DISTRIBUTOR' AND buyer_type = 'STORE'
      `,
        { transaction }
      );

      // Index 9: Manufacturer date with covering
      await queryInterface.sequelize.query(
        `
        CREATE INDEX IF NOT EXISTS idx_line_items_mfr_date 
        ON line_items_products_joined_materialized_view (
          manufacturer_id,
          transaction_date,
          seller_id,
          buyer_id
        )
        INCLUDE (total_price, quantity)
        WHERE seller_type = 'DISTRIBUTOR' AND buyer_type = 'STORE'
      `,
        { transaction }
      );

      // Index 10: Warehouse optimization
      await queryInterface.sequelize.query(
        `
        CREATE INDEX IF NOT EXISTS idx_line_items_warehouse 
        ON line_items_products_joined_materialized_view (
          warehouse_id,
          seller_id,
          manufacturer_id,
          transaction_date
        )
        WHERE seller_type = 'DISTRIBUTOR' AND buyer_type = 'STORE'
      `,
        { transaction }
      );

      await transaction.commit();
      console.log(
        "Successfully created all optimized indices for materialized view"
      );
    } catch (error) {
      await transaction.rollback();
      console.error("Error creating indices:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Check if the materialized view exists before dropping indices
      const [results] = await queryInterface.sequelize.query(
        `
        SELECT EXISTS (
          SELECT 1 
          FROM pg_matviews 
          WHERE matviewname = 'line_items_products_joined_materialized_view'
        ) as exists
        `,
        { transaction }
      );

      const materializedViewExists = results[0]?.exists;

      if (!materializedViewExists) {
        console.log(
          "Materialized view 'line_items_products_joined_materialized_view' does not exist. Skipping index dropping."
        );
        await transaction.commit();
        return;
      }

      console.log(
        "Dropping optimized indices for line_items_products_joined_materialized_view..."
      );

      // Drop indices in reverse order
      const indicesToDrop = [
        "idx_line_items_warehouse",
        "idx_line_items_mfr_date",
        "idx_line_items_main_filters",
        "idx_mv_manufacturer_seller_covering",
        "idx_mv_manufacturer_seller_date",
        "idx_programs_manufacturer_timeline",
        "idx_program_participants_entity_lookup",
        "idx_mv_store_listing_optimized",
        "idx_mv_dist_store_aggregation",
        "idx_mv_manufacturer_seller_buyer_types_date"
      ];

      for (const indexName of indicesToDrop) {
        await queryInterface.sequelize.query(
          `
          DROP INDEX IF EXISTS ${indexName}
        `,
          { transaction }
        );
        console.log(`Dropped index: ${indexName}`);
      }

      await transaction.commit();
      console.log("Successfully dropped all optimized indices");
    } catch (error) {
      await transaction.rollback();
      console.error("Error dropping indices:", error);
      throw error;
    }
  }
};
