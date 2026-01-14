"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.sales_rep_spiff_earning_summary;
    `);

    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW sales_rep_spiff_earning_summary 
      TABLESPACE pg_default
      AS
      WITH store_transactions AS (
          SELECT
              li.buyer_id as store_id,
              p.manufacturer_id,
              li.seller_id as distributor_id,
              MIN(li.product_id) as product_id,
              SUM(li.quantity) as quantity,
              SUM(li.total_price) as total_price,
              p.case_skus_id,
              p.box_skus_id,
              p.unit_skus_id,
              p.is_shipper,
			        pro.id AS program_id,
              pro.start_date AS program_start_date,
              pro.end_date AS program_end_date,

              -- Sum the quantity for products that match case_skus_id
              SUM(CASE
                  WHEN li.product_id IN (p.case_skus_id) THEN li.quantity
                  ELSE 0
              END) AS case_sku_quantity,

              -- Sum the quantity for products that match box_skus_id
              SUM(CASE
                  WHEN li.product_id IN (p.box_skus_id) THEN li.quantity
                  ELSE 0
              END) AS box_sku_quantity
          
          FROM line_items li
          JOIN products p ON (
            li.product_id IN (p.case_skus_id, p.box_skus_id)
            OR (li.product_id = p.unit_skus_id AND p.primary_variant = true)
          )
          JOIN programs pro ON pro.manufacturer_id = p.manufacturer_id and pro.participant_type = 'SALES_REP'
          WHERE li.buyer_type = 'STORE'
              AND li.seller_type = 'DISTRIBUTOR'
        AND li.transaction_date BETWEEN pro.start_date AND pro.end_date
        GROUP BY p.id, li.seller_id, li.buyer_id, li.buyer_type, li.seller_type, pro.id -- Aggregate by product's primary fields
          HAVING SUM(li.total_price) > 0
      ),
      store_compliance_stats AS (
          SELECT
              st.store_id,
              st.manufacturer_id,
              st.distributor_id,
              pd.id as program_detail_id,
              pd.program_id,
              pd.rebate_calculation,
              pd.rebate_amount,
              pd.max_qty,
              CASE 
                  -- Fixed $ amount Per Store Compliance
                  WHEN pd.rebate_calculation = 'Fixed $ amount Per Store Compliance' THEN
                      CASE 
                          WHEN EXISTS (
                              SELECT 1 FROM program_compliances pc
                              WHERE pc.entity_id = st.store_id
                              AND pc.entity_type = 'STORE'
                              AND pc.status = 'active'
                              AND pc.is_qualified = TRUE
                              AND program_id in (
                                select id from programs where manufacturer_id = st.manufacturer_id
                              )
                              AND DATE(pc.compliance_date) BETWEEN DATE(st.program_start_date) and DATE(st.program_end_date)
                          ) THEN pd.rebate_amount
                          ELSE 0
                      END
                  -- Fixed $ amount Per Item Per Store (Per POD)
                  WHEN pd.rebate_calculation = 'Fixed $ amount Per Item Per Store (Per POD)' THEN
                      LEAST(
                          COUNT(DISTINCT st.product_id),
                          COALESCE(pd.max_qty, COUNT(DISTINCT st.product_id))
                      ) * pd.rebate_amount
                  -- Fixed $ amount Per Category Item Per Store
                  WHEN pd.rebate_calculation = 'Fixed $ amount Per Category Item Per Store' THEN
                      SUM(CASE WHEN st.is_shipper THEN st.quantity ELSE 0 END) * pd.rebate_amount
                  -- Fixed $ amount Per Quantity
                  WHEN pd.rebate_calculation = 'Fixed $ amount Per Quantity' THEN
                      LEAST(
                SUM(CASE WHEN pd.quantity_type = 'box' THEN st.box_sku_quantity ELSE st.case_sku_quantity END),
                          COALESCE(pd.max_qty, SUM(CASE WHEN pd.quantity_type = 'box' THEN st.box_sku_quantity ELSE st.case_sku_quantity END))
                      ) * pd.rebate_amount
                  ELSE 0
              END as earning,
              COUNT(DISTINCT st.product_id) as unique_products,
              SUM(CASE
                    WHEN pd.rebate_calculation::text = 'Fixed $ amount Per Quantity'::text THEN
                      CASE
                        WHEN pd.quantity_type::text = 'box'::text THEN st.box_sku_quantity
                        ELSE st.case_sku_quantity
                      END
                    ELSE st.quantity
                  END) AS total_quantity,
              SUM(st.total_price) as total_purchase
          FROM store_transactions st
        JOIN program_details pd ON st.program_id = pd.program_id
          GROUP BY 
              st.store_id,
              st.manufacturer_id,
              st.distributor_id,
              st.program_start_date,
              st.program_end_date,
              pd.id,
              pd.program_id,
              pd.rebate_calculation,
              pd.rebate_amount,
              pd.max_qty
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
      FROM store_compliance_stats
      where earning > 0
      order by manufacturer_id asc
      WITH DATA;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.sales_rep_spiff_earning_summary;
    `);

    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW sales_rep_spiff_earning_summary 
      TABLESPACE pg_default
      AS
      WITH store_transactions AS (
          SELECT
              li.buyer_id as store_id,
              p.manufacturer_id,
              li.seller_id as distributor_id,
              MIN(li.product_id) as product_id,
              SUM(li.quantity) as quantity,
              SUM(li.total_price) as total_price,
              p.case_skus_id,
              p.box_skus_id,
              p.unit_skus_id,
              p.is_shipper,

              -- Sum the quantity for products that match case_skus_id
              SUM(CASE
                  WHEN li.product_id IN (p.case_skus_id) THEN li.quantity
                  ELSE 0
              END) AS case_sku_quantity,

              -- Sum the quantity for products that match box_skus_id
              SUM(CASE
                  WHEN li.product_id IN (p.box_skus_id) THEN li.quantity
                  ELSE 0
              END) AS box_sku_quantity
          
          FROM line_items li
          JOIN products p ON (
          li.product_id IN (p.case_skus_id, p.box_skus_id)
          OR (li.product_id = p.unit_skus_id AND p.primary_variant = true)
        )
          WHERE li.buyer_type = 'STORE'
              AND li.seller_type = 'DISTRIBUTOR'
        AND li.transaction_date >= DATE_TRUNC('year', CURRENT_DATE) 
        GROUP BY p.id, li.seller_id, li.buyer_id, li.buyer_type, li.seller_type -- Aggregate by product's primary fields
          HAVING SUM(li.total_price) > 0
      ),
      store_compliance_stats AS (
          SELECT
              st.store_id,
              st.manufacturer_id,
              st.distributor_id,
              pd.id as program_detail_id,
              pd.program_id,
              pd.rebate_calculation,
              pd.rebate_amount,
              pd.max_qty,
              CASE 
                  -- Fixed $ amount Per Store Compliance
                  WHEN pd.rebate_calculation = 'Fixed $ amount Per Store Compliance' THEN
                      CASE 
                          WHEN EXISTS (
                              SELECT 1 FROM program_compliances pc
                              WHERE pc.entity_id = st.store_id
                              AND pc.entity_type = 'STORE'
                              AND pc.status = 'active'
                              AND pc.is_qualified = TRUE
                  AND program_id in (
                    select id from programs where manufacturer_id = st.manufacturer_id
                  )
                          ) THEN pd.rebate_amount
                          ELSE 0
                      END
                  -- Fixed $ amount Per Item Per Store (Per POD)
                  WHEN pd.rebate_calculation = 'Fixed $ amount Per Item Per Store (Per POD)' THEN
                      LEAST(
                          COUNT(DISTINCT st.product_id),
                          COALESCE(pd.max_qty, COUNT(DISTINCT st.product_id))
                      ) * pd.rebate_amount
                  -- Fixed $ amount Per Category Item Per Store
                  WHEN pd.rebate_calculation = 'Fixed $ amount Per Category Item Per Store' THEN
                      SUM(CASE WHEN st.is_shipper THEN st.quantity ELSE 0 END) * pd.rebate_amount
                  -- Fixed $ amount Per Quantity
                  WHEN pd.rebate_calculation = 'Fixed $ amount Per Quantity' THEN
                      LEAST(
                SUM(CASE WHEN pd.quantity_type = 'box' THEN st.box_sku_quantity ELSE st.case_sku_quantity END),
                          COALESCE(pd.max_qty, SUM(CASE WHEN pd.quantity_type = 'box' THEN st.box_sku_quantity ELSE st.case_sku_quantity END))
                      ) * pd.rebate_amount
                  ELSE 0
              END as earning,
              COUNT(DISTINCT st.product_id) as unique_products,
              SUM(CASE
                    WHEN pd.rebate_calculation::text = 'Fixed $ amount Per Quantity'::text THEN
                      CASE
                        WHEN pd.quantity_type::text = 'box'::text THEN st.box_sku_quantity
                        ELSE st.case_sku_quantity
                      END
                    ELSE st.quantity
                  END) AS total_quantity,
              SUM(st.total_price) as total_purchase
          FROM store_transactions st
          JOIN programs pro ON pro.manufacturer_id = st.manufacturer_id and pro.participant_type = 'SALES_REP'
        JOIN program_details pd ON pd.program_id = pro.id
          GROUP BY 
              st.store_id,
              st.manufacturer_id,
              st.distributor_id,
              pd.id,
              pd.program_id,
              pd.rebate_calculation,
              pd.rebate_amount,
              pd.max_qty
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
      FROM store_compliance_stats
      where earning > 0
      order by manufacturer_id asc
      WITH DATA;
    `);
  }
};
