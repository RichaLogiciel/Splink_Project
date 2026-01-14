"use strict";

/**
 * Final migration for store_program_compliance_mv materialized view
 *
 * This migration creates the optimized store_program_compliance_mv materialized view
 * that provides pre-calculated compliance data for sales rep compliance dashboard.
 *
 * Key Features:
 * - Pre-calculated compliance percentages using complex business logic
 * - Aggregated purchased product IDs across all transaction dates
 * - Total product tags and purchased product counts for easy filtering
 * - Optimized for sales rep compliance queries with proper indexing
 * - Handles the complex products_tags_qty parsing and calculation
 * - Properly filters products based on products_tags from program_details
 * - Includes proper seller/buyer type and year filtering
 * - Implements correct business logic: count products per category separately
 *
 * Performance Benefits:
 * - Eliminates N+1 queries in compliance dashboard
 * - Reduces query time from seconds to milliseconds
 * - Pre-aggregated data reduces application-level processing
 * - Proper indexing for common query patterns
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      console.log("🔄 Starting materialized view creation...");

      // Drop and recreate the MV with additional calculated columns
      await queryInterface.sequelize.query(`
        DROP MATERIALIZED VIEW IF EXISTS store_program_compliance_mv CASCADE;
      `);

      console.log("✅ Dropped existing materialized view");

      await queryInterface.sequelize.query(`
        CREATE MATERIALIZED VIEW store_program_compliance_mv AS
        WITH earning_opportunities AS (
          SELECT DISTINCT
            pc.entity_id as buyer_id,
            pc.program_id,
            pc.program_detail_id,
            COALESCE(seos.rebate_opportunity, 0) as earning_opportunity
          FROM program_compliances pc
          LEFT JOIN store_earning_opportunity_summary seos 
            ON seos.store_id = pc.entity_id 
            AND seos.program_id = pc.program_id 
            AND seos.program_detail_id = pc.program_detail_id
            AND seos.transaction_year = EXTRACT(YEAR FROM CURRENT_DATE)
          WHERE pc.entity_type = 'STORE'
            AND pc.is_qualified != true
        ),
        product_category_assignments AS (
          SELECT 
              pc.entity_id as buyer_id,
              li.seller_id,
              p.manufacturer_id,
              pc.program_id,
              pc.program_detail_id,
              pd.products_tags,
              pd.products_tags_qty as required_count_by_tag,
              prod.id as product_id,
              prod.category_tags_json,
              tag.tag_name as category_tag,
              tag_position,
              required_qty
            FROM program_compliances pc
            JOIN program_details pd ON pd.id = pc.program_detail_id
            JOIN programs p ON p.id = pc.program_id
            JOIN manufacturers m ON m.id = p.manufacturer_id
            JOIN stores s ON s.id = pc.entity_id
            
            -- Join with line items to get purchase data
            JOIN line_items li ON li.buyer_id = pc.entity_id 
                AND li.quantity > 0
                AND li.deleted_at IS NULL
                AND li.seller_type = 'DISTRIBUTOR'
                AND li.buyer_type = 'STORE'
                AND Date(li.transaction_date) >= Date(p.start_date)
                
            -- Join with products to get product information
            JOIN products prod ON ((li.product_id = prod.unit_skus_id AND prod.primary_variant = true) 
                                  OR li.product_id IN (prod.case_skus_id, prod.box_skus_id))
                AND prod.manufacturer_id = p.manufacturer_id
                AND prod.deleted_at IS NULL
                
            CROSS JOIN LATERAL (
              SELECT 
                tag.tag_name,
                tag.position as tag_position,
                (string_to_array(pd.products_tags_qty, ','))[tag.position]::int as required_qty
              FROM unnest(string_to_array(pd.products_tags, ',')) WITH ORDINALITY AS tag(tag_name, position)
            ) AS tag
            

            
            WHERE pc.entity_type = 'STORE'
                AND pc.is_qualified != true
                AND p.participant_type = 'STORE'
                AND p.start_date <= CURRENT_DATE
                AND p.end_date >= CURRENT_DATE
                AND pd.deleted_at IS NULL
                AND p.deleted_at IS NULL
                AND m.deleted_at IS NULL
                AND s.deleted_at IS NULL
                AND prod.category_tags_json @> jsonb_build_array(trim(tag.tag_name))
        ),
        category_counts AS (
          SELECT 
            buyer_id,
            seller_id,
            manufacturer_id,
            program_id,
            program_detail_id,
            products_tags,
            required_count_by_tag,
            category_tag,
            required_qty,
            COUNT(DISTINCT product_id) as purchased_count,
            LEAST(COUNT(DISTINCT product_id), required_qty) as counted_products
          FROM product_category_assignments
          GROUP BY 
            buyer_id, seller_id, manufacturer_id, program_id, 
            program_detail_id, products_tags, required_count_by_tag, category_tag, required_qty
        ),
        flat_product_ids AS (
          SELECT 
            buyer_id,
            seller_id,
            manufacturer_id,
            program_id,
            program_detail_id,
            products_tags,
            required_count_by_tag,
            jsonb_agg(DISTINCT product_id) as purchased_distinct_product_ids
          FROM product_category_assignments
          GROUP BY 
            buyer_id, seller_id, manufacturer_id, program_id, 
            program_detail_id, products_tags, required_count_by_tag
        )
        SELECT
            cc.buyer_id,
            cc.seller_id,
            cc.manufacturer_id,
            cc.program_id,
            cc.program_detail_id,
            cc.products_tags,
            cc.required_count_by_tag,
            fpi.purchased_distinct_product_ids,
            COALESCE(
              (
                SELECT SUM((trim(qty))::int)
                FROM unnest(string_to_array(cc.required_count_by_tag, ',')) AS t(qty)
                WHERE trim(qty) ~ '^[0-9]+$'
              ), 0
            ) AS total_product_tags,
            SUM(cc.counted_products) AS total_purchased_distinct_product_ids,
            CASE 
              WHEN COALESCE(
                (
                  SELECT SUM((trim(qty))::int)
                  FROM unnest(string_to_array(cc.required_count_by_tag, ',')) AS t(qty)
                  WHERE trim(qty) ~ '^[0-9]+$'
                ), 0
              ) > 0
              THEN ROUND(
                (
                  SUM(cc.counted_products)::numeric
                  /
                  COALESCE(
                    (
                      SELECT SUM((trim(qty))::int)
                      FROM unnest(string_to_array(cc.required_count_by_tag, ',')) AS t(qty)
                      WHERE trim(qty) ~ '^[0-9]+$'
                    ), 1
                  )::numeric
                ) * 100, 1
              )
              ELSE 0 
            END as compliance_percentage,
            0 as total_units,
            0 as total_spend,
            COALESCE(eo.earning_opportunity, 0) AS earning_opportunity,
            CURRENT_TIMESTAMP as latest_transaction_date,
            CURRENT_TIMESTAMP as last_refreshed_at
        FROM category_counts cc
        JOIN flat_product_ids fpi ON fpi.buyer_id = cc.buyer_id 
            AND fpi.program_detail_id = cc.program_detail_id
        LEFT JOIN earning_opportunities eo ON eo.buyer_id = cc.buyer_id 
            AND eo.program_detail_id = cc.program_detail_id
        GROUP BY 
            cc.buyer_id, cc.seller_id, cc.manufacturer_id, cc.program_id, 
            cc.program_detail_id, cc.products_tags, cc.required_count_by_tag,
            fpi.purchased_distinct_product_ids, eo.earning_opportunity
            
        WITH DATA;
      `);

      console.log(
        "✅ Created materialized view with proper category-based counting"
      );

      // Create index for better performance
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_store_program_compliance_mv_buyer_manufacturer 
        ON store_program_compliance_mv (buyer_id, manufacturer_id);
      `);

      console.log("✅ Created index");
      console.log("✅ Materialized view created successfully");
    } catch (error) {
      console.error("❌ Error creating materialized view:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS store_program_compliance_mv CASCADE;
    `);
  }
};
