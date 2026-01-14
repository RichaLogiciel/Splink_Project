"use strict";

/**
 * This migration re-enables the product_insights_aggregated_view triggers
 * after the splink_product_id migration is complete.
 *
 * The triggers were temporarily disabled in migration 20241009153559 to prevent
 * concurrent refresh errors. Now that splink_product_id is added, we can
 * safely re-enable them with non-concurrent refreshes.
 */
module.exports = {
  async up(queryInterface) {
    // Re-enable the triggers (using non-concurrent refresh to avoid errors)
    // await queryInterface.sequelize.query(`
    //   DO $$
    //   BEGIN
    //       IF NOT EXISTS (
    //           SELECT 1
    //           FROM pg_trigger
    //           WHERE tgname = 'line_items_product_insights_refresh_trigger'
    //       ) THEN
    //           CREATE TRIGGER line_items_product_insights_refresh_trigger
    //           AFTER INSERT OR UPDATE OR DELETE ON line_items
    //           FOR EACH STATEMENT
    //           EXECUTE FUNCTION refresh_product_insights_aggregated_view();
    //       END IF;
    //   END $$;
    // `);
    // await queryInterface.sequelize.query(`
    //   DO $$
    //   BEGIN
    //       IF NOT EXISTS (
    //           SELECT 1
    //           FROM pg_trigger
    //           WHERE tgname = 'products_product_insights_refresh_trigger'
    //       ) THEN
    //           CREATE TRIGGER products_product_insights_refresh_trigger
    //           AFTER INSERT OR UPDATE OR DELETE ON products
    //           FOR EACH STATEMENT
    //           EXECUTE FUNCTION refresh_product_insights_aggregated_view();
    //       END IF;
    //   END $$;
    // `);
    // // Manually refresh the view once to ensure it's up to date
    // await queryInterface.sequelize.query(`
    //   REFRESH MATERIALIZED VIEW product_insights_aggregated_view;
    // `);
  },

  async down(queryInterface) {
    // Drop the triggers again
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS line_items_product_insights_refresh_trigger ON line_items;
    `);

    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS products_product_insights_refresh_trigger ON products;
    `);
  }
};
