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
          p.manufacturer_id AS manufacturer_id,
          p.id AS product_id,
          li.seller_id AS distributor_id, 
				  li.buyer_id AS store_id,
          li.transaction_date,
				  SUM(li.total_units) AS total_units,
  				SUM(li.total_price) AS sales
      FROM 
          line_items AS li
      JOIN 
          products AS p 
				  ON li.product_id IN (p.case_skus_id, p.unit_skus_id, p.box_skus_id) and p.primary_variant = true
      WHERE li.seller_type = 'DISTRIBUTOR' 
        AND li.buyer_type = 'STORE'
      GROUP BY li.seller_id, li.buyer_id, p.manufacturer_id, p.id, li.transaction_date
      ORDER BY p.id DESC
      WITH DATA;
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.sales_summary_materialized_view;
    `);

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
  }
};
