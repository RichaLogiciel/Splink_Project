"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Create materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS distributor_sales_summary;
      CREATE MATERIALIZED VIEW distributor_sales_summary AS
      SELECT 
          COALESCE(dist_query.distributor_id, pc_query.distributor_id) AS distributor_id,
          COALESCE(dist_query.manufacturer_id, pc_query.manufacturer_id) AS manufacturer_id,
          COALESCE(dist_query.total_price_sum, 0) AS total_price_sum,
          COALESCE(pc_query.total_rebate_sum, 0) AS total_rebate_sum
      FROM 
          (
              SELECT 
                  dt.id AS distributor_id, 
                  p.manufacturer_id, 
                  SUM(li.total_price) AS total_price_sum
              FROM 
                  distributors AS dt
              JOIN 
                  line_items AS li 
                  ON li.seller_id = dt.id AND li.seller_type = 'DISTRIBUTOR'
              JOIN 
                  products AS p 
                  ON li.product_id IN (p.case_skus_id, p.unit_skus_id, p.box_skus_id) and p.primary_variant = true
              GROUP BY 
                  dt.id, 
                  p.manufacturer_id
          ) AS dist_query
      FULL OUTER JOIN 
          (
              SELECT 
                  dt.id AS distributor_id, 
                  pro.manufacturer_id, 
                  SUM(pc.earned_rebate) AS total_rebate_sum
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
              GROUP BY 
                  dt.id, 
                  pro.manufacturer_id
          ) AS pc_query
      ON 
          dist_query.distributor_id = pc_query.distributor_id 
          AND dist_query.manufacturer_id = pc_query.manufacturer_id
      ORDER BY 
          distributor_id;
    `);
  },

  async down(queryInterface) {
    // Drop the materialized view
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS distributor_sales_summary;
    `);

    await queryInterface.sequelize.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS distributor_sales_summary AS
        SELECT 
            COALESCE(dist_query.distributor_id, pc_query.distributor_id) AS distributor_id,
            COALESCE(dist_query.manufacturer_id, pc_query.manufacturer_id) AS manufacturer_id,
            COALESCE(dist_query.total_price_sum, 0) AS total_price_sum,
            COALESCE(pc_query.total_rebate_sum, 0) AS total_rebate_sum
        FROM 
            (
                SELECT 
                    dt.id AS distributor_id, 
                    p.manufacturer_id, 
                    SUM(li.total_price) AS total_price_sum
                FROM 
                    distributors AS dt
                JOIN 
                    line_items AS li 
                    ON li.seller_id = dt.id AND li.seller_type = 'DISTRIBUTOR'
                JOIN 
                    products AS p 
                    ON li.product_id IN (p.case_skus_id, p.unit_skus_id, p.box_skus_id)
                GROUP BY 
                    dt.id, 
                    p.manufacturer_id
            ) AS dist_query
        FULL OUTER JOIN 
            (
                SELECT 
                    dt.id AS distributor_id, 
                    pro.manufacturer_id, 
                    SUM(pc.earned_rebate) AS total_rebate_sum
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
                GROUP BY 
                    dt.id, 
                    pro.manufacturer_id
            ) AS pc_query
        ON 
            dist_query.distributor_id = pc_query.distributor_id 
            AND dist_query.manufacturer_id = pc_query.manufacturer_id
        ORDER BY 
            distributor_id;
      `);
  }
};
