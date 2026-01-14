"use strict";

/**
 * This migration disables the product_insights_aggregated_view triggers temporarily
 * to prevent concurrent refresh errors during the splink_product_id migration.
 *
 * The triggers will be re-enabled in a later migration after splink_product_id is added.
 * This is necessary because:
 * 1. The view has duplicate rows and can't have a UNIQUE index
 * 2. REFRESH MATERIALIZED VIEW CONCURRENTLY requires a UNIQUE index
 * 3. The triggers attempt concurrent refreshes when line_items changes
 */
module.exports = {
  async up(queryInterface) {
    // Disable the triggers that attempt concurrent materialized view refreshes
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS line_items_product_insights_refresh_trigger ON line_items;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS products_product_insights_refresh_trigger ON products;
    `);

    // Update the refresh function to use non-concurrent refresh
    // This prevents errors but still allows manual refreshes
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION public.refresh_product_insights_aggregated_view()
          RETURNS trigger
          LANGUAGE 'plpgsql'
          COST 100
          VOLATILE NOT LEAKPROOF
      AS $BODY$
      BEGIN
          REFRESH MATERIALIZED VIEW product_insights_aggregated_view;
          RETURN NULL;
      END;
      $BODY$;
    `);
  },

  async down(queryInterface) {
    // Restore the original concurrent refresh function
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION public.refresh_product_insights_aggregated_view()
          RETURNS trigger
          LANGUAGE 'plpgsql'
          COST 100
          VOLATILE NOT LEAKPROOF
      AS $BODY$
      BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY product_insights_aggregated_view;
          RETURN NULL;
      END;
      $BODY$;
    `);

    // Re-enable the triggers
    await queryInterface.sequelize.query(`
      CREATE TRIGGER line_items_product_insights_refresh_trigger
      AFTER INSERT OR UPDATE OR DELETE ON line_items
      FOR EACH STATEMENT
      EXECUTE FUNCTION refresh_product_insights_aggregated_view();
    `);

    await queryInterface.sequelize.query(`
      CREATE TRIGGER products_product_insights_refresh_trigger
      AFTER INSERT OR UPDATE OR DELETE ON products
      FOR EACH STATEMENT
      EXECUTE FUNCTION refresh_product_insights_aggregated_view();
    `);
  }
};
