"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Create combined_store_enrolled_summary materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS combined_store_enrolled_summary;
      CREATE MATERIALIZED VIEW combined_store_enrolled_summary AS
      SELECT 
          COALESCE(q1.distributor_id, q2.distributor_id) AS distributor_id,
          COALESCE(q1.manufacturer_id, q2.manufacturer_id) AS manufacturer_id,
          COALESCE(q1.store_id, q2.store_id) AS store_id,
          COALESCE(q1.total_price_sum, 0) AS total_purchase,
          COALESCE(q2.total_rebate_sum, 0) AS earned_rebate,
          COALESCE(q1.transaction_year, q2.transaction_year) AS transaction_year,
          COALESCE(q1.warehouse_id, null) AS warehouse_id
      FROM 
          (
              SELECT 
                  dt.id AS distributor_id, 
                  p.manufacturer_id, 
                  li.buyer_id AS store_id,
                  SUM(li.total_price) AS total_price_sum,
                  EXTRACT(YEAR FROM li.transaction_date) AS transaction_year,
                  li.warehouse_id
              FROM 
                  distributors AS dt
              JOIN 
                  line_items AS li 
                  ON li.seller_id = dt.id AND li.seller_type = 'DISTRIBUTOR'
                JOIN 
                    products AS p 
                    ON (
                        (li.product_id = p.unit_skus_id AND p.primary_variant = true)
                        OR li.product_id IN (p.case_skus_id, p.box_skus_id)
                    )
              WHERE 
                li.deleted_at IS NULL 
                AND p.deleted_at IS NULL 
                AND dt.deleted_at IS NULL 
              GROUP BY 
                  dt.id, 
                  li.buyer_id,
                  p.manufacturer_id,
                  EXTRACT(YEAR FROM li.transaction_date),
                  li.warehouse_id
          ) AS q1
      FULL OUTER JOIN 
          (
              SELECT 
                  dt.id AS distributor_id, 
                  pro.manufacturer_id, 
                  ur.associated_user_id AS store_id,
                  SUM(pc.earned_rebate) AS total_rebate_sum,
                  EXTRACT(YEAR FROM pro.end_date) AS transaction_year
              FROM 
                  distributors AS dt
              JOIN 
                  user_roles AS ur 
                  ON ur.parent_entity_id = dt.id 
                  AND ur.parent_entity_type = 'DISTRIBUTOR' 
                  AND ur.role = 'STORE'
              JOIN 
                  program_compliances AS pc 
                  ON pc.entity_id = ur.associated_user_id 
                  AND pc.entity_type = ur.role 
                  AND pc.status = 'active'
              JOIN 
                  programs AS pro 
                  ON pro.id = pc.program_id 
                  AND pro.participant_type = ur.role
              JOIN (
                  SELECT DISTINCT ON (program_id, entity_id, entity_type) *
                  FROM program_participants
                  ORDER BY program_id, entity_id, entity_type, id  -- pick first based on id
                ) as pro_p
                ON 
                    pro.id = pro_p.program_id 
                  and pro_p.entity_id = pc.entity_id 
                  and pro_p.entity_type =ur.role 
              LEFT JOIN program_visibility pv 
                ON pv.program_id = pro.id 
                AND (pv.entity_id = pc.entity_id OR pv.entity_id IS NULL) AND pv.deleted_at IS NULL
              WHERE 
                (pv.id IS NULL
                OR pv.entity_id = pc.entity_id)
                AND dt.deleted_at IS NULL
                AND ur.deleted_at IS NULL
                AND pc.deleted_at IS NULL
                AND pro.deleted_at IS NULL
                AND pro_p.deleted_at IS NULL
              GROUP BY 
                  dt.id, 
                  ur.associated_user_id,
                  pro.manufacturer_id,
                  EXTRACT(YEAR FROM pro.end_date)
          ) AS q2
      ON 
          q1.distributor_id = q2.distributor_id 
          AND q1.manufacturer_id = q2.manufacturer_id 
          AND q1.store_id = q2.store_id
          AND q1.transaction_year = q2.transaction_year;
    `);

    // Create combined_store_summary materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS combined_store_summary;
      CREATE MATERIALIZED VIEW combined_store_summary AS
      SELECT 
          COALESCE(q1.distributor_id, q2.distributor_id) AS distributor_id,
          COALESCE(q1.manufacturer_id, q2.manufacturer_id) AS manufacturer_id,
          COALESCE(q1.store_id, q2.store_id) AS store_id,
          COALESCE(q1.total_price_sum, 0) AS total_purchase,
          COALESCE(q2.total_rebate_sum, 0) AS earned_rebate,
          COALESCE(q1.transaction_year, q2.transaction_year) AS transaction_year,
          COALESCE(q1.warehouse_id, null) AS warehouse_id
      FROM 
          (
              With store_combined_items AS (
                  SELECT 
                    dt.id AS distributor_id, 
                    p.manufacturer_id, 
                    li.buyer_id AS store_id,
                    SUM(li.total_price) AS total_price_sum,
                    EXTRACT(YEAR FROM li.transaction_date) AS transaction_year,
                    li.warehouse_id
                  FROM 
                    distributors AS dt
                  JOIN 
                    line_items AS li 
                    ON li.seller_id = dt.id AND li.seller_type = 'DISTRIBUTOR'
                  JOIN 
                    products AS p 
                    ON (
                      (li.product_id = p.unit_skus_id AND p.primary_variant = true)
                      OR li.product_id IN (p.case_skus_id, p.box_skus_id)
                    )
                  WHERE 
                    li.deleted_at IS NULL 
                    AND p.deleted_at IS NULL 
                    AND dt.deleted_at IS NULL 
                  GROUP BY 
                    p.id,
                    dt.id, 
                    li.buyer_id,
                    p.manufacturer_id,
                    EXTRACT(YEAR FROM li.transaction_date),
                    li.warehouse_id
                  Having sum(li.total_price) > 0
              )
              SELECT 
                distributor_id,
                store_id,
                manufacturer_id,
                SUM(total_price_sum) AS total_price_sum,
                transaction_year,
                warehouse_id 
              FROM store_combined_items 
              GROUP BY 
                distributor_id,
                store_id,
                manufacturer_id,
                transaction_year,
                warehouse_id
          ) AS q1
      FULL OUTER JOIN 
          (
              SELECT 
                  dt.id AS distributor_id, 
                  pro.manufacturer_id, 
                  ur.associated_user_id AS store_id,
                  SUM(pc.earned_rebate) AS total_rebate_sum,
                  EXTRACT(YEAR FROM pro.end_date) AS transaction_year
              FROM 
                  distributors AS dt
              JOIN 
                  user_roles AS ur 
                  ON ur.parent_entity_id = dt.id 
                  AND ur.parent_entity_type = 'DISTRIBUTOR' 
                  AND ur.role = 'STORE'
              JOIN 
                  program_compliances AS pc 
                  ON pc.entity_id = ur.associated_user_id 
                  AND pc.entity_type = ur.role 
                  AND pc.status = 'active'
              JOIN 
                  programs AS pro 
                  ON pro.id = pc.program_id 
                  AND pro.participant_type = ur.role
              LEFT JOIN program_visibility pv 
                ON pv.program_id = pro.id 
                AND (pv.entity_id = pc.entity_id OR pv.entity_id IS NULL) AND pv.deleted_at IS NULL
              WHERE 
                (pv.id IS NULL
                OR pv.entity_id = pc.entity_id)
                AND dt.deleted_at IS NULL
                AND ur.deleted_at IS NULL
                AND pc.deleted_at IS NULL
                AND pro.deleted_at IS NULL
              GROUP BY 
                  dt.id, 
                  ur.associated_user_id,
                  pro.manufacturer_id,
                  EXTRACT(YEAR FROM pro.end_date)
          ) AS q2
      ON 
          q1.distributor_id = q2.distributor_id 
          AND q1.manufacturer_id = q2.manufacturer_id 
          AND q1.store_id = q2.store_id
          AND q1.transaction_year = q2.transaction_year;
    `);

    // Create qualified_compliance_summary materialized view
    await queryInterface.sequelize.query(`
        DROP MATERIALIZED VIEW IF EXISTS qualified_compliance_summary;
      `);

    await queryInterface.sequelize.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS qualified_compliance_summary AS
        SELECT
          dt.id AS distributor_id,
          pro.manufacturer_id,
          pc.program_detail_id,
          ur.associated_user_id as store_id,
          COUNT(
              CASE
                  WHEN pc.is_qualified = true THEN 1
                  ELSE NULL
              END
          ) AS qualified_compliance_count,
	      EXTRACT(YEAR FROM  pc.compliance_date) AS compliance_year
        FROM
          distributors AS dt
          JOIN user_roles AS ur ON ur.parent_entity_id = dt.id
            AND ur.parent_entity_type = 'DISTRIBUTOR'
            AND ur.role = 'STORE'
          JOIN program_compliances AS pc ON pc.entity_id = ur.associated_user_id
            AND pc.entity_type = ur.role
          JOIN programs AS pro ON pro.id = pc.program_id
            AND pro.participant_type = ur.role
          LEFT JOIN program_visibility pv 
            ON pv.program_id = pro.id 
            AND (pv.entity_id = pc.entity_id OR pv.entity_id IS NULL) AND pv.deleted_at IS NULL
        WHERE
          (pv.id IS NULL
          OR pv.entity_id = pc.entity_id)
          AND dt.deleted_at IS NULL
          AND ur.deleted_at IS NULL
          AND pc.deleted_at IS NULL
          AND pro.deleted_at IS NULL
        GROUP BY
          dt.id,
          pro.manufacturer_id,
          pc.program_detail_id,
          ur.associated_user_id,
          EXTRACT(YEAR FROM pc.compliance_date);
      `);

    // Create sales_rep_spiff_earning_summary materialized view
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
              p.category_tags_json as category_tags,
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
        AND li.deleted_at IS NULL
        AND pro.deleted_at IS NULL
        AND p.deleted_at IS NULL
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
                              AND pc.is_qualified = TRUE
                              AND pc.status = 'active'
                              AND (pc.program_detail_id IN ( 
                                select program_details.id from program_details
                                where program_details.program_id in (
                                select id from programs where participant_type = 'STORE' and manufacturer_id = st.manufacturer_id
                                ) 
                                AND program_details.tier = pd.tier
                                limit 1
                              ))
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
                      SUM(CASE WHEN (st.category_tags ->> 'Shipper')::boolean THEN st.quantity ELSE 0 END) * pd.rebate_amount
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
                    WHEN pd.rebate_calculation::text = 'Fixed $ amount Per Category Item Per Store'::text THEN
                      CASE
                          WHEN (st.category_tags ->> 'Shipper')::boolean THEN st.quantity
                          ELSE 0::numeric
                      END
                    ELSE st.quantity
                  END) AS total_quantity,
              SUM(st.total_price) as total_purchase
          FROM store_transactions st
        JOIN program_details pd ON st.program_id = pd.program_id
        WHERE pd.deleted_at IS NULL
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

    // Drop the existing sales_summary_materialized_view materialized view before creating the updated one
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
              SUM(li.total_price) AS sales,
              li.warehouse_id
          FROM 
              line_items AS li
          JOIN 
              products AS p 
              ON (
                  (li.product_id = p.unit_skus_id AND p.primary_variant = true)
                  OR li.product_id IN (p.case_skus_id, p.box_skus_id)
              )
          WHERE li.seller_type = 'DISTRIBUTOR' 
            AND li.buyer_type = 'STORE'
            AND p.deleted_at IS NULL
            AND li.deleted_at IS NULL
          GROUP BY li.seller_id, li.buyer_id, p.manufacturer_id, p.id, li.transaction_date, li.warehouse_id
          ORDER BY p.id DESC
          WITH DATA;
        `);

    // Create store_earning_opportunity_summary materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.store_earning_opportunity_summary;
    `);

    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS public.store_earning_opportunity_summary
      TABLESPACE pg_default
      AS
      SELECT dt.id AS distributor_id,
          pro.manufacturer_id,
          pro_d.id as program_detail_id,
          ur.associated_user_id AS store_id,
      SUM(COALESCE(
              CASE 
                  WHEN pro_d.rebate_calculation_type = 'list_value' THEN 
                      CASE 
                          WHEN li.product_id = p.unit_skus_id THEN p.unit_price * li.quantity
                          WHEN li.product_id = p.case_skus_id THEN p.case_price * li.quantity
                          WHEN li.product_id = p.box_skus_id THEN p.box_price * li.quantity
                          ELSE 0
                      END
                  ELSE li.total_price
              END,
              0
          )) AS total_purchase,
      CASE
            WHEN pro_d.rebate_type::text = 'percentage'::text THEN sum(COALESCE(
            CASE
                WHEN pro_d.rebate_calculation_type::text = 'list_value'::text THEN
                CASE
                    WHEN li.product_id = p.unit_skus_id THEN p.unit_price * li.quantity::double precision
                    WHEN li.product_id = p.case_skus_id THEN p.case_price * li.quantity::double precision
                    WHEN li.product_id = p.box_skus_id THEN p.box_price * li.quantity::double precision
                    ELSE 0::double precision
                END
                ELSE li.total_price::double precision
            END * pro_d.rebate_percentage::double precision / 100::double precision, 0::double precision))
            WHEN pro_d.rebate_type::text = 'fixed'::text THEN
            SUM(CASE
				WHEN pro_d.quantity_type IS NOT NULL THEN
			        CASE
			          WHEN 
			            (
			              (pro_d.quantity_type = 'unit' AND li.product_id = p.unit_skus_id)
			              OR (pro_d.quantity_type = 'case' AND li.product_id = p.case_skus_id)
			              OR (pro_d.quantity_type = 'box' AND li.product_id = p.box_skus_id)
			            )
			            AND (pro_d.min_qty > 0 OR pro_d.max_qty > 0)
			          THEN pro_d.rebate_amount * li.quantity
			          ELSE 0
		        	END
				ELSE
					CASE
		                WHEN pro_d.min_qty > 0::numeric OR pro_d.max_qty > 0::numeric THEN pro_d.rebate_amount * li.quantity
		                ELSE 0
					END
            END::double precision
			) + 
	        CASE
	            WHEN pro_d.quantity_type IS NULL AND ((pro_d.min_qty = 0 OR pro_d.min_qty is null) AND (pro_d.max_qty = 0 OR pro_d.max_qty is null))
	            THEN pro_d.rebate_amount
	            ELSE 0
	        END
            ELSE 0::double precision
        END AS rebate_opportunity,
      CASE 
            WHEN (SELECT COUNT(*) FROM program_details pd WHERE pd.program_id = pro.id) = 1 THEN true
            WHEN pro_d.tier = (SELECT MAX(pd.tier) FROM program_details pd WHERE pd.program_id = pro.id) THEN true
            ELSE false
        END AS highest_tier,
      EXTRACT(YEAR FROM li.transaction_date) AS transaction_year
      FROM distributors dt
        JOIN user_roles ur ON ur.parent_entity_id = dt.id AND ur.parent_entity_type = 'DISTRIBUTOR'::enum_user_roles_parent_entity_type AND ur.role::text = 'STORE'::text
        JOIN line_items as li on li.buyer_id = ur.associated_user_id and li.buyer_type = 'STORE' and li.seller_id = dt.id and li.seller_type = 'DISTRIBUTOR'
      JOIN products as p ON (li.product_id in (p.case_skus_id, p.box_skus_id) OR (li.product_id = p.unit_skus_id AND p.primary_variant = true)) 
      JOIN programs as pro ON p.manufacturer_id = pro.manufacturer_id AND pro.participant_type::text = ur.role::text
      JOIN program_details as pro_d ON pro.id = pro_d.program_id
      WHERE
      	li.transaction_date BETWEEN Date(pro.start_date) AND Date(pro.end_date)
        AND li.deleted_at IS NULL
        AND pro_d.deleted_at IS NULL
        AND pro.deleted_at IS NULL
        AND ur.deleted_at IS NULL
        AND dt.deleted_at IS NULL
        AND p.deleted_at IS NULL
      GROUP BY dt.id, pro.manufacturer_id, pro.id,  pro_d.id, ur.associated_user_id, EXTRACT(YEAR FROM li.transaction_date)
      WITH DATA;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS combined_store_enrolled_summary;
      CREATE MATERIALIZED VIEW combined_store_enrolled_summary AS
      SELECT 
          COALESCE(q1.distributor_id, q2.distributor_id) AS distributor_id,
          COALESCE(q1.manufacturer_id, q2.manufacturer_id) AS manufacturer_id,
          COALESCE(q1.store_id, q2.store_id) AS store_id,
          COALESCE(q1.total_price_sum, 0) AS total_purchase,
          COALESCE(q2.total_rebate_sum, 0) AS earned_rebate,
          COALESCE(q1.transaction_year, q2.transaction_year) AS transaction_year,
          COALESCE(q1.warehouse_id, null) AS warehouse_id
      FROM 
          (
              SELECT 
                  dt.id AS distributor_id, 
                  p.manufacturer_id, 
                  li.buyer_id AS store_id,
                  SUM(li.total_price) AS total_price_sum,
                  EXTRACT(YEAR FROM li.transaction_date) AS transaction_year,
                  li.warehouse_id
              FROM 
                  distributors AS dt
              JOIN 
                  line_items AS li 
                  ON li.seller_id = dt.id AND li.seller_type = 'DISTRIBUTOR'
                JOIN 
                    products AS p 
                    ON (
                        (li.product_id = p.unit_skus_id AND p.primary_variant = true)
                        OR li.product_id IN (p.case_skus_id, p.box_skus_id)
                    )
              GROUP BY 
                  dt.id, 
                  li.buyer_id,
                  p.manufacturer_id,
                  EXTRACT(YEAR FROM li.transaction_date),
                  li.warehouse_id
          ) AS q1
      FULL OUTER JOIN 
          (
              SELECT 
                  dt.id AS distributor_id, 
                  pro.manufacturer_id, 
                  ur.associated_user_id AS store_id,
                  SUM(pc.earned_rebate) AS total_rebate_sum,
                  EXTRACT(YEAR FROM pro.end_date) AS transaction_year
              FROM 
                  distributors AS dt
              JOIN 
                  user_roles AS ur 
                  ON ur.parent_entity_id = dt.id 
                  AND ur.parent_entity_type = 'DISTRIBUTOR' 
                  AND ur.role = 'STORE'
              JOIN 
                  program_compliances AS pc 
                  ON pc.entity_id = ur.associated_user_id 
                  AND pc.entity_type = ur.role 
                  AND pc.status = 'active'
              JOIN 
                  programs AS pro 
                  ON pro.id = pc.program_id 
                  AND pro.participant_type = ur.role
              JOIN (
                  SELECT DISTINCT ON (program_id, entity_id, entity_type) *
                  FROM program_participants
                  ORDER BY program_id, entity_id, entity_type, id  -- pick first based on id
                ) as pro_p
                ON 
                    pro.id = pro_p.program_id 
                  and pro_p.entity_id = pc.entity_id 
                  and pro_p.entity_type =ur.role 
              LEFT JOIN program_visibility pv 
                ON pv.program_id = pro.id 
                AND (pv.entity_id = pc.entity_id OR pv.entity_id IS NULL)
              WHERE 
                pv.id IS NULL
                OR pv.entity_id = pc.entity_id
              GROUP BY 
                  dt.id, 
                  ur.associated_user_id,
                  pro.manufacturer_id,
                  EXTRACT(YEAR FROM pro.end_date)
          ) AS q2
      ON 
          q1.distributor_id = q2.distributor_id 
          AND q1.manufacturer_id = q2.manufacturer_id 
          AND q1.store_id = q2.store_id
          AND q1.transaction_year = q2.transaction_year;
    `);

    // Create materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS combined_store_summary;
      CREATE MATERIALIZED VIEW combined_store_summary AS
      SELECT 
          COALESCE(q1.distributor_id, q2.distributor_id) AS distributor_id,
          COALESCE(q1.manufacturer_id, q2.manufacturer_id) AS manufacturer_id,
          COALESCE(q1.store_id, q2.store_id) AS store_id,
          COALESCE(q1.total_price_sum, 0) AS total_purchase,
          COALESCE(q2.total_rebate_sum, 0) AS earned_rebate,
          COALESCE(q1.transaction_year, q2.transaction_year) AS transaction_year,
          COALESCE(q1.warehouse_id, null) AS warehouse_id
      FROM 
          (
              With store_combined_items AS (
                  SELECT 
                    dt.id AS distributor_id, 
                    p.manufacturer_id, 
                    li.buyer_id AS store_id,
                    SUM(li.total_price) AS total_price_sum,
                    EXTRACT(YEAR FROM li.transaction_date) AS transaction_year,
                    li.warehouse_id
                  FROM 
                    distributors AS dt
                  JOIN 
                    line_items AS li 
                    ON li.seller_id = dt.id AND li.seller_type = 'DISTRIBUTOR'
                  JOIN 
                    products AS p 
                    ON (
                      (li.product_id = p.unit_skus_id AND p.primary_variant = true)
                      OR li.product_id IN (p.case_skus_id, p.box_skus_id)
                    )
                  GROUP BY 
                    p.id,
                    dt.id, 
                    li.buyer_id,
                    p.manufacturer_id,
                    EXTRACT(YEAR FROM li.transaction_date),
                    li.warehouse_id
                  Having sum(li.total_price) > 0
              )
              SELECT 
                distributor_id,
                store_id,
                manufacturer_id,
                SUM(total_price_sum) AS total_price_sum,
                transaction_year,
                warehouse_id 
              FROM store_combined_items 
              GROUP BY 
                distributor_id,
                store_id,
                manufacturer_id,
                transaction_year,
                warehouse_id
          ) AS q1
      FULL OUTER JOIN 
          (
              SELECT 
                  dt.id AS distributor_id, 
                  pro.manufacturer_id, 
                  ur.associated_user_id AS store_id,
                  SUM(pc.earned_rebate) AS total_rebate_sum,
                  EXTRACT(YEAR FROM pro.end_date) AS transaction_year
              FROM 
                  distributors AS dt
              JOIN 
                  user_roles AS ur 
                  ON ur.parent_entity_id = dt.id 
                  AND ur.parent_entity_type = 'DISTRIBUTOR' 
                  AND ur.role = 'STORE'
              JOIN 
                  program_compliances AS pc 
                  ON pc.entity_id = ur.associated_user_id 
                  AND pc.entity_type = ur.role 
                  AND pc.status = 'active'
              JOIN 
                  programs AS pro 
                  ON pro.id = pc.program_id 
                  AND pro.participant_type = ur.role
              LEFT JOIN program_visibility pv 
                ON pv.program_id = pro.id 
                AND (pv.entity_id = pc.entity_id OR pv.entity_id IS NULL)
              WHERE 
                pv.id IS NULL
                OR pv.entity_id = pc.entity_id
              GROUP BY 
                  dt.id, 
                  ur.associated_user_id,
                  pro.manufacturer_id,
                  EXTRACT(YEAR FROM pro.end_date)
          ) AS q2
      ON 
          q1.distributor_id = q2.distributor_id 
          AND q1.manufacturer_id = q2.manufacturer_id 
          AND q1.store_id = q2.store_id
          AND q1.transaction_year = q2.transaction_year;
    `);

    // Create qualified_compliance_summary materialized view
    await queryInterface.sequelize.query(`
        DROP MATERIALIZED VIEW IF EXISTS qualified_compliance_summary;
      `);

    await queryInterface.sequelize.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS qualified_compliance_summary AS
        SELECT
          dt.id AS distributor_id,
          pro.manufacturer_id,
          pc.program_detail_id,
          ur.associated_user_id as store_id,
          COUNT(
              CASE
                  WHEN pc.is_qualified = true THEN 1
                  ELSE NULL
              END
          ) AS qualified_compliance_count,
	      EXTRACT(YEAR FROM  pc.compliance_date) AS compliance_year
        FROM
          distributors AS dt
          JOIN user_roles AS ur ON ur.parent_entity_id = dt.id
            AND ur.parent_entity_type = 'DISTRIBUTOR'
            AND ur.role = 'STORE'
          JOIN program_compliances AS pc ON pc.entity_id = ur.associated_user_id
            AND pc.entity_type = ur.role
          JOIN programs AS pro ON pro.id = pc.program_id
            AND pro.participant_type = ur.role
          LEFT JOIN program_visibility pv 
            ON pv.program_id = pro.id 
            AND (pv.entity_id = pc.entity_id OR pv.entity_id IS NULL)
        WHERE
          pv.id IS NULL
          OR pv.entity_id = pc.entity_id
        GROUP BY
          dt.id,
          pro.manufacturer_id,
          pc.program_detail_id,
          ur.associated_user_id,
          EXTRACT(YEAR FROM pc.compliance_date);
      `);

    // Create sales_rep_spiff_earning_summary materialized view
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
              p.category_tags_json as category_tags,
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
                              AND pc.is_qualified = TRUE
                              AND pc.status = 'active'
                              AND (pc.program_detail_id IN ( 
                                select program_details.id from program_details
                                where program_details.program_id in (
                                select id from programs where participant_type = 'STORE' and manufacturer_id = st.manufacturer_id
                                ) 
                                AND program_details.tier = pd.tier
                                limit 1
                              ))
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
                      SUM(CASE WHEN (st.category_tags ->> 'Shipper')::boolean THEN st.quantity ELSE 0 END) * pd.rebate_amount
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
                    WHEN pd.rebate_calculation::text = 'Fixed $ amount Per Category Item Per Store'::text THEN
                      CASE
                          WHEN (st.category_tags ->> 'Shipper')::boolean THEN st.quantity
                          ELSE 0::numeric
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

    // Drop the existing sales_summary_materialized_view materialized view before creating the updated one
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
              SUM(li.total_price) AS sales,
              li.warehouse_id
          FROM 
              line_items AS li
          JOIN 
              products AS p 
              ON (
                  (li.product_id = p.unit_skus_id AND p.primary_variant = true)
                  OR li.product_id IN (p.case_skus_id, p.box_skus_id)
              )
          WHERE li.seller_type = 'DISTRIBUTOR' 
            AND li.buyer_type = 'STORE'
          GROUP BY li.seller_id, li.buyer_id, p.manufacturer_id, p.id, li.transaction_date, li.warehouse_id
          ORDER BY p.id DESC
          WITH DATA;
        `);

    // Create store_earning_opportunity_summary materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS public.store_earning_opportunity_summary;
    `);

    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS public.store_earning_opportunity_summary
      TABLESPACE pg_default
      AS
      SELECT dt.id AS distributor_id,
          pro.manufacturer_id,
          pro_d.id as program_detail_id,
          ur.associated_user_id AS store_id,
      SUM(COALESCE(
              CASE 
                  WHEN pro_d.rebate_calculation_type = 'list_value' THEN 
                      CASE 
                          WHEN li.product_id = p.unit_skus_id THEN p.unit_price * li.quantity
                          WHEN li.product_id = p.case_skus_id THEN p.case_price * li.quantity
                          WHEN li.product_id = p.box_skus_id THEN p.box_price * li.quantity
                          ELSE 0
                      END
                  ELSE li.total_price
              END,
              0
          )) AS total_purchase,
      CASE
            WHEN pro_d.rebate_type::text = 'percentage'::text THEN sum(COALESCE(
            CASE
                WHEN pro_d.rebate_calculation_type::text = 'list_value'::text THEN
                CASE
                    WHEN li.product_id = p.unit_skus_id THEN p.unit_price * li.quantity::double precision
                    WHEN li.product_id = p.case_skus_id THEN p.case_price * li.quantity::double precision
                    WHEN li.product_id = p.box_skus_id THEN p.box_price * li.quantity::double precision
                    ELSE 0::double precision
                END
                ELSE li.total_price::double precision
            END * pro_d.rebate_percentage::double precision / 100::double precision, 0::double precision))
            WHEN pro_d.rebate_type::text = 'fixed'::text THEN
            SUM(CASE
				WHEN pro_d.quantity_type IS NOT NULL THEN
			        CASE
			          WHEN 
			            (
			              (pro_d.quantity_type = 'unit' AND li.product_id = p.unit_skus_id)
			              OR (pro_d.quantity_type = 'case' AND li.product_id = p.case_skus_id)
			              OR (pro_d.quantity_type = 'box' AND li.product_id = p.box_skus_id)
			            )
			            AND (pro_d.min_qty > 0 OR pro_d.max_qty > 0)
			          THEN pro_d.rebate_amount * li.quantity
			          ELSE 0
		        	END
				ELSE
					CASE
		                WHEN pro_d.min_qty > 0::numeric OR pro_d.max_qty > 0::numeric THEN pro_d.rebate_amount * li.quantity
		                ELSE 0
					END
            END::double precision
			) + 
	        CASE
	            WHEN pro_d.quantity_type IS NULL AND ((pro_d.min_qty = 0 OR pro_d.min_qty is null) AND (pro_d.max_qty = 0 OR pro_d.max_qty is null))
	            THEN pro_d.rebate_amount
	            ELSE 0
	        END
            ELSE 0::double precision
        END AS rebate_opportunity,
      CASE 
            WHEN (SELECT COUNT(*) FROM program_details pd WHERE pd.program_id = pro.id) = 1 THEN true
            WHEN pro_d.tier = (SELECT MAX(pd.tier) FROM program_details pd WHERE pd.program_id = pro.id) THEN true
            ELSE false
        END AS highest_tier,
      EXTRACT(YEAR FROM li.transaction_date) AS transaction_year
      FROM distributors dt
        JOIN user_roles ur ON ur.parent_entity_id = dt.id AND ur.parent_entity_type = 'DISTRIBUTOR'::enum_user_roles_parent_entity_type AND ur.role::text = 'STORE'::text
        JOIN line_items as li on li.buyer_id = ur.associated_user_id and li.buyer_type = 'STORE' and li.seller_id = dt.id and li.seller_type = 'DISTRIBUTOR'
      JOIN products as p ON (li.product_id in (p.case_skus_id, p.box_skus_id) OR (li.product_id = p.unit_skus_id AND p.primary_variant = true)) 
      JOIN programs as pro ON p.manufacturer_id = pro.manufacturer_id AND pro.participant_type::text = ur.role::text
      JOIN program_details as pro_d ON pro.id = pro_d.program_id
      WHERE
      	li.transaction_date BETWEEN Date(pro.start_date) AND Date(pro.end_date)
      GROUP BY dt.id, pro.manufacturer_id, pro.id,  pro_d.id, ur.associated_user_id, EXTRACT(YEAR FROM li.transaction_date)
      WITH DATA;
    `);
  }
};
