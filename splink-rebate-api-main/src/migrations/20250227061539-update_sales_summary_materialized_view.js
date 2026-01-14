"use strict";

module.exports = {
  up: async (queryInterface) => {
    // Drop the existing materialized view before creating the updated one
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.sales_summary_materialized_view;
    `);

    // Create the updated materialized view
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW public.sales_summary_materialized_view
      TABLESPACE pg_default
      AS
      SELECT 
          m.id AS manufacturer_id,
          p.id AS product_id,
          li.seller_id AS distributor_id,
          li.buyer_id AS store_id,
          li.transaction_date,
          SUM(li.total_units) AS total_units,
          SUM(li.total_price) AS sales
      FROM manufacturers m
      JOIN products p ON p.manufacturer_id = m.id
      JOIN line_items li 
        ON li.product_id = p.unit_skus_id 
        OR li.product_id = p.case_skus_id 
        OR li.product_id = p.box_skus_id
      WHERE li.seller_type = 'DISTRIBUTOR' 
        AND li.buyer_type = 'STORE'
      GROUP BY li.seller_id, li.buyer_id, m.id, p.id, li.transaction_date
      ORDER BY p.id DESC
      WITH DATA;
    `);

    // Create or replace the trigger function to refresh the materialized view
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION public.refresh_sales_summary_materialized_view()
          RETURNS trigger
          LANGUAGE 'plpgsql'
          COST 100
          VOLATILE NOT LEAKPROOF
      AS $BODY$
      BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY sales_summary_materialized_view;
          RETURN NULL;
      END;
      $BODY$;
    `);

    // Create the triggers for automatic refresh on insert/update/delete
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 
              FROM pg_trigger 
              WHERE tgname = 'line_items_sales_refresh_trigger'
          ) THEN
              CREATE TRIGGER line_items_sales_refresh_trigger
              AFTER INSERT OR UPDATE OR DELETE ON line_items
              FOR EACH STATEMENT
              EXECUTE FUNCTION refresh_sales_summary_materialized_view();
          END IF;
      END $$;
    `);

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 
              FROM pg_trigger 
              WHERE tgname = 'products_sales_refresh_trigger'
          ) THEN
              CREATE TRIGGER products_sales_refresh_trigger
              AFTER INSERT OR UPDATE OR DELETE ON products
              FOR EACH STATEMENT
              EXECUTE FUNCTION refresh_sales_summary_materialized_view();
          END IF;
      END $$;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.sales_summary_materialized_view;
    `);

    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS public.sales_summary_materialized_view
      TABLESPACE pg_default
      AS
      SELECT 
          m.id AS manufacturer_id,
          p.id AS product_id,
          li.seller_id AS distributor_id,
          li.buyer_id AS store_id,
          li.transaction_date,
          SUM(
              CASE
                  WHEN li.product_id = p.case_skus_id THEN li.quantity
                  ELSE 0
              END
          ) AS case_quantity,
          SUM(
              CASE
                  WHEN li.product_id = p.box_skus_id THEN li.quantity
                  ELSE 0
              END
          ) AS box_quantity,
          SUM(
              CASE
                  WHEN li.product_id = p.unit_skus_id THEN li.quantity
                  ELSE 0
              END
          ) AS unit_quantity,
          SUM(li.total_price) AS sales
      FROM manufacturers m
      JOIN products p ON p.manufacturer_id = m.id
      JOIN line_items li 
        ON li.product_id = p.unit_skus_id 
        OR li.product_id = p.case_skus_id 
        OR li.product_id = p.box_skus_id
      WHERE li.seller_type = 'DISTRIBUTOR' 
        AND li.buyer_type = 'STORE'
      GROUP BY li.seller_id, li.buyer_id, m.id, p.id, li.transaction_date
      ORDER BY p.id DESC
      WITH DATA;
    `);

    // Create the trigger function
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION public.refresh_sales_summary_materialized_view()
          RETURNS trigger
          LANGUAGE 'plpgsql'
          COST 100
          VOLATILE NOT LEAKPROOF
      AS $BODY$
      BEGIN
          REFRESH MATERIALIZED VIEW CONCURRENTLY sales_summary_materialized_view;
          RETURN NULL;
      END;
      $BODY$;
    `);

    // Create the trigger function
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 
              FROM pg_trigger 
              WHERE tgname = 'line_items_sales_refresh_trigger'
          ) THEN
              CREATE TRIGGER line_items_sales_refresh_trigger
              AFTER INSERT OR UPDATE OR DELETE ON line_items
              FOR EACH STATEMENT
              EXECUTE FUNCTION refresh_sales_summary_materialized_view();
          END IF;
      END $$;
    `);

    // Create the trigger function
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 
              FROM pg_trigger 
              WHERE tgname = 'products_sales_refresh_trigger'
          ) THEN
              CREATE TRIGGER products_sales_refresh_trigger
              AFTER INSERT OR UPDATE OR DELETE ON products
              FOR EACH STATEMENT
              EXECUTE FUNCTION refresh_sales_summary_materialized_view();
          END IF;
      END $$;
    `);
  }
};
