"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS sales_rep_spiff_earning_summary;
    `);

    await queryInterface.sequelize.query(`
      -- Create the final optimized materialized view
      CREATE MATERIALIZED VIEW sales_rep_spiff_earning_summary AS
      WITH store_transactions AS (
          SELECT 
              li.buyer_id AS store_id,
              p.manufacturer_id,
              li.seller_id AS distributor_id,
              p.id AS product_id,
              sum(li.quantity) AS quantity,
              sum(li.total_price) AS total_price,
              p.case_skus_id,
              p.box_skus_id,
              p.unit_skus_id,
              p.category_tags_json AS category_tags,
              pro.id AS program_id,
              pro.start_date AS program_start_date,
              pro.end_date AS program_end_date,
              sum(CASE WHEN li.product_id = p.case_skus_id THEN li.quantity ELSE 0 END) AS case_sku_quantity,
              sum(CASE WHEN li.product_id = p.box_skus_id THEN li.quantity ELSE 0 END) AS box_sku_quantity
          FROM line_items li
          JOIN products p ON (
              li.product_id = p.case_skus_id 
              OR li.product_id = p.box_skus_id 
              OR (li.product_id = p.unit_skus_id AND p.primary_variant = true)
          )
          JOIN programs pro ON (
              pro.manufacturer_id = p.manufacturer_id 
              AND pro.participant_type = 'SALES_REP'
          )
          WHERE li.buyer_type = 'STORE'
              AND li.seller_type = 'DISTRIBUTOR'
              AND li.transaction_date >= pro.start_date
              AND li.transaction_date <= pro.end_date
              AND li.deleted_at IS NULL
              AND pro.deleted_at IS NULL
              AND p.deleted_at IS NULL
          GROUP BY p.id, li.seller_id, li.buyer_id, li.buyer_type, li.seller_type, pro.id
          HAVING sum(li.total_price) > 0
      ),
      -- Efficient VOID_FILL eligible products with pre-computed JSON
      void_fill_eligible_products AS (
          SELECT 
              svft.store_id,
              svft.program_id,
              jsonb_array_elements_text(svft.category_purchases->'all_products'->'eligible_products')::integer AS eligible_product_id
          FROM store_void_fill_targets svft
          WHERE svft.category_purchases IS NOT NULL
          AND svft.category_purchases->'all_products'->'eligible_products' IS NOT NULL
      ),
      -- Pre-compute VOID_FILL earnings separately to avoid correlated subqueries
      void_fill_earnings AS (
          SELECT 
              st.store_id,
              st.manufacturer_id,
              st.distributor_id,
              pd.id AS program_detail_id,
              pd.program_id,
              pd.rebate_calculation,
              pd.rebate_amount,
              pd.max_qty,
              pd.products_tags,
              pd.quantity_type,
              pd.tier,
              count(DISTINCT st.product_id) AS unique_products,
              sum(st.quantity) AS total_quantity,
              sum(st.total_price) AS total_purchase,
              count(DISTINCT st.product_id) * pd.rebate_amount AS earning
          FROM store_transactions st
          JOIN program_details pd ON st.program_id = pd.program_id
          JOIN void_fill_eligible_products vfep ON (
              vfep.store_id = st.store_id 
              AND vfep.program_id = st.program_id 
              AND vfep.eligible_product_id = st.product_id
          )
          WHERE pd.deleted_at IS NULL
          GROUP BY 
              st.store_id, st.manufacturer_id, st.distributor_id,
              pd.id, pd.program_id, pd.rebate_calculation, 
              pd.rebate_amount, pd.max_qty, pd.products_tags, pd.quantity_type, pd.tier
      ),
      -- Regular earnings (excluding VOID_FILL programs)
      regular_earnings AS (
          SELECT 
              st.store_id,
              st.manufacturer_id,
              st.distributor_id,
              pd.id AS program_detail_id,
              pd.program_id,
              pd.rebate_calculation,
              pd.rebate_amount,
              pd.max_qty,
              pd.products_tags,
              pd.quantity_type,
              pd.tier,
              count(DISTINCT st.product_id) AS unique_products,
              sum(st.quantity) AS total_quantity,
              sum(st.total_price) AS total_purchase,
              -- Calculate earning based on rebate calculation type
              CASE
                  -- Store Compliance
                  WHEN pd.rebate_calculation = 'Fixed $ amount Per Store Compliance' THEN
                      CASE
                          WHEN EXISTS (
                              SELECT 1 FROM program_compliances pc
                              WHERE pc.entity_id = st.store_id 
                              AND pc.entity_type = 'STORE'
                              AND pc.is_qualified = true
                              AND pc.status = 'active'
                              AND pc.program_detail_id IN (
                                  SELECT pd2.id FROM program_details pd2
                                  WHERE pd2.program_id IN (
                                      SELECT p2.id FROM programs p2
                                      WHERE p2.participant_type = 'STORE'
                                      AND p2.manufacturer_id = st.manufacturer_id
                                  )
                                  AND pd2.tier = pd.tier
                              )
                              AND date(pc.compliance_date) >= date(st.program_start_date)
                              AND date(pc.compliance_date) <= date(st.program_end_date)
                          ) THEN pd.rebate_amount
                          ELSE 0
                      END
                  
                  -- Per Item Per Store (POD) - regular logic only
                  WHEN pd.rebate_calculation = 'Fixed $ amount Per Item Per Store (Per POD)' THEN
                      LEAST(count(DISTINCT st.product_id), COALESCE(pd.max_qty, count(DISTINCT st.product_id))) * pd.rebate_amount
                  
                  -- Category Item Per Store
                  WHEN pd.rebate_calculation = 'Fixed $ amount Per Category Item Per Store' THEN
                      sum(
                          CASE
                              WHEN pd.products_tags IS NULL OR pd.products_tags = '' THEN st.quantity
                              WHEN pd.products_tags LIKE '%,%' THEN
                                  CASE
                                      WHEN EXISTS (
                                          SELECT 1 FROM unnest(string_to_array(pd.products_tags, ',')) AS tag(tag)
                                          WHERE st.category_tags @> to_jsonb(trim(tag.tag))
                                      ) THEN st.quantity
                                      ELSE 0
                                  END
                              ELSE
                                  CASE
                                      WHEN st.category_tags @> to_jsonb(pd.products_tags) THEN st.quantity
                                      ELSE 0
                                  END
                          END
                      ) * pd.rebate_amount
                  
                  -- Per Quantity
                  WHEN pd.rebate_calculation = 'Fixed $ amount Per Quantity' THEN
                      LEAST(
                          sum(
                              CASE
                                  WHEN pd.quantity_type = 'box' THEN st.box_sku_quantity
                                  WHEN pd.quantity_type = 'unit' THEN st.quantity
                                  ELSE st.case_sku_quantity
                              END
                          ),
                          COALESCE(pd.max_qty, sum(
                              CASE
                                  WHEN pd.quantity_type = 'box' THEN st.box_sku_quantity
                                  WHEN pd.quantity_type = 'unit' THEN st.quantity
                                  ELSE st.case_sku_quantity
                              END
                          ))
                      ) * pd.rebate_amount
                  
                  -- Per Item
                  WHEN pd.rebate_calculation = 'Fixed $ amount Per Item' THEN
                      LEAST(count(DISTINCT st.product_id), COALESCE(pd.max_qty, count(DISTINCT st.product_id))) * pd.rebate_amount
                  
                  ELSE 0
              END AS earning
          FROM store_transactions st
          JOIN program_details pd ON st.program_id = pd.program_id
          WHERE pd.deleted_at IS NULL
          -- Exclude programs that have VOID_FILL targets (they're handled separately)
          AND NOT EXISTS (
              SELECT 1 FROM store_void_fill_targets svft 
              WHERE svft.store_id = st.store_id 
              AND svft.program_id = st.program_id
          )
          GROUP BY 
              st.store_id, st.manufacturer_id, st.distributor_id, 
              st.program_start_date, st.program_end_date,
              pd.id, pd.program_id, pd.rebate_calculation, 
              pd.rebate_amount, pd.max_qty, pd.products_tags, pd.quantity_type, pd.tier
      ),
      -- Combine both types of earnings
      combined_earnings AS (
          SELECT store_id, manufacturer_id, distributor_id, program_detail_id, program_id, rebate_calculation, unique_products, total_quantity, total_purchase, earning FROM regular_earnings
          UNION ALL
          SELECT store_id, manufacturer_id, distributor_id, program_detail_id, program_id, rebate_calculation, unique_products, total_quantity, total_purchase, earning FROM void_fill_earnings
      )
      SELECT 
          store_id,
          manufacturer_id,
          distributor_id,
          program_detail_id,
          program_id,
          rebate_calculation,
          unique_products,
          total_quantity,
          total_purchase,
          earning
      FROM combined_earnings
      WHERE earning > 0
      ORDER BY manufacturer_id;
    `);

    await queryInterface.sequelize.query(`
      -- Create optimized indexes
      CREATE INDEX idx_sales_rep_spiff_earning_summary_store_program 
      ON sales_rep_spiff_earning_summary(store_id, program_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX idx_sales_rep_spiff_earning_summary_manufacturer 
      ON sales_rep_spiff_earning_summary(manufacturer_id);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX idx_sales_rep_spiff_earning_summary_rebate_calc 
      ON sales_rep_spiff_earning_summary(rebate_calculation);
    `);

    await queryInterface.sequelize.query(`
      -- Create index on store_void_fill_targets for better VOID_FILL performance
      CREATE INDEX IF NOT EXISTS idx_store_void_fill_targets_store_program 
      ON store_void_fill_targets(store_id, program_id);
    `);

    await queryInterface.sequelize.query(`
      -- Create index on program_compliances for better compliance checks
      CREATE INDEX IF NOT EXISTS idx_program_compliances_entity_program 
      ON program_compliances(entity_id, program_detail_id, entity_type, status, is_qualified);
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS sales_rep_spiff_earning_summary;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sales_rep_spiff_earning_summary_store_program;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sales_rep_spiff_earning_summary_manufacturer;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_sales_rep_spiff_earning_summary_rebate_calc;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_store_void_fill_targets_store_program;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_program_compliances_entity_program;
    `);
  }
};
