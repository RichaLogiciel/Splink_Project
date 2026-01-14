"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    console.log(
      "Replacing store_earning_opportunity_summary materialized view with all tiers..."
    );

    try {
      // Drop the existing materialized view
      await queryInterface.sequelize.query(`
        DROP MATERIALIZED VIEW IF EXISTS public.store_earning_opportunity_summary;
      `);

      // Create the new materialized view with ALL tiers using the same name
      await queryInterface.sequelize.query(`
        CREATE MATERIALIZED VIEW IF NOT EXISTS public.store_earning_opportunity_summary
        TABLESPACE pg_default
        AS
        -- Include ALL tiers for each store and program combination
        -- This allows compliance tracking across all tiers, not just the highest
        SELECT dt.id AS distributor_id,
            pro.manufacturer_id,
            pro.id as program_id,
            pc.program_detail_id,
            ur.associated_user_id AS store_id,
            COALESCE(pc.total_purchase_volume, 0.00) AS total_purchase,
            COALESCE(pc.rebate_opportunity, 0.00) AS rebate_opportunity,
            CASE
              WHEN pd.tier = (
                SELECT MAX(tier)
                FROM program_details pd2
                WHERE pd2.program_id = pro.id
                  AND pd2.deleted_at IS NULL
              ) THEN true
              ELSE false
            END AS highest_tier,
            EXTRACT(YEAR FROM CURRENT_DATE) AS transaction_year
        FROM distributors dt
          JOIN user_roles ur ON ur.parent_entity_id = dt.id
            AND ur.parent_entity_type = 'DISTRIBUTOR'::enum_user_roles_parent_entity_type
            AND ur.role::text = 'STORE'::text
        JOIN programs as pro ON 1=1  -- We'll filter by manufacturer in WHERE clause
        -- Get ALL program compliances for each store and program
        JOIN program_compliances pc ON pc.entity_id = ur.associated_user_id
          AND pc.entity_type = 'STORE'
          AND pc.program_id = pro.id
          AND pc.deleted_at IS NULL
        JOIN program_details pd ON pd.id = pc.program_detail_id
          AND pd.deleted_at IS NULL
        WHERE
          dt.deleted_at IS NULL
          AND ur.deleted_at IS NULL
          AND pro.deleted_at IS NULL
          AND (pro.participant_type::text = ur.role::text or pro.participant_type::text = 'CHAIN')
        GROUP BY dt.id, pro.manufacturer_id, pro.id, pc.program_detail_id, ur.associated_user_id,
                 pc.total_purchase_volume, pc.rebate_opportunity, pd.tier
        WITH DATA;
      `);

      // Create indexes for better performance
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_store_id
        ON store_earning_opportunity_summary(store_id);
      `);

      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_distributor_id
        ON store_earning_opportunity_summary(distributor_id);
      `);

      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_manufacturer_id
        ON store_earning_opportunity_summary(manufacturer_id);
      `);

      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_program_id
        ON store_earning_opportunity_summary(program_id);
      `);

      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_program_detail_id
        ON store_earning_opportunity_summary(program_detail_id);
      `);

      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_transaction_year
        ON store_earning_opportunity_summary(transaction_year);
      `);

      // Composite indexes for common query patterns
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_store_distributor
        ON store_earning_opportunity_summary(store_id, distributor_id);
      `);

      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_manufacturer_year
        ON store_earning_opportunity_summary(manufacturer_id, transaction_year);
      `);

      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_distributor_year
        ON store_earning_opportunity_summary(distributor_id, transaction_year);
      `);

      // Covering index for most common query pattern
      await queryInterface.sequelize.query(`
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_store_earning_opportunity_covering
        ON store_earning_opportunity_summary(store_id, distributor_id, manufacturer_id, program_id, transaction_year);
      `);

      console.log(
        "Successfully replaced store_earning_opportunity_summary materialized view with all tiers"
      );
    } catch (error) {
      console.error("Error replacing materialized view:", error);
      throw error;
    }
  },

  async down(queryInterface) {
    console.log(
      "Restoring original store_earning_opportunity_summary materialized view..."
    );

    try {
      // Drop indexes first
      await queryInterface.sequelize.query(`
        DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_store_id;
      `);

      await queryInterface.sequelize.query(`
        DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_distributor_id;
      `);

      await queryInterface.sequelize.query(`
        DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_manufacturer_id;
      `);

      await queryInterface.sequelize.query(`
        DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_program_id;
      `);

      await queryInterface.sequelize.query(`
        DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_program_detail_id;
      `);

      await queryInterface.sequelize.query(`
        DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_transaction_year;
      `);

      await queryInterface.sequelize.query(`
        DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_store_distributor;
      `);

      await queryInterface.sequelize.query(`
        DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_manufacturer_year;
      `);

      await queryInterface.sequelize.query(`
        DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_distributor_year;
      `);

      await queryInterface.sequelize.query(`
        DROP INDEX CONCURRENTLY IF EXISTS idx_store_earning_opportunity_covering;
      `);

      // Drop the new materialized view
      await queryInterface.sequelize.query(`
        DROP MATERIALIZED VIEW IF EXISTS public.store_earning_opportunity_summary;
      `);

      // Note: The down migration doesn't recreate the old view
      // You would need to run the original migration to restore it
      console.log(
        "Dropped new materialized view. Run original migration to restore old view if needed."
      );
    } catch (error) {
      console.error("Error dropping materialized view:", error);
      throw error;
    }
  }
};
