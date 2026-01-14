"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Create materialized view if it does not exist
    await queryInterface.sequelize.query(`
      CREATE MATERIALIZED VIEW IF NOT EXISTS qualified_compliance_summary AS
      SELECT 
          dt.id AS distributor_id, 
          pro.manufacturer_id, 
          pc.program_detail_id,
          COUNT(CASE WHEN pc.is_qualified = true THEN 1 ELSE NULL END) AS qualified_compliance_count
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
      JOIN 
          programs AS pro 
          ON pro.id = pc.program_id 
          AND pro.participant_type = ur.role
      GROUP BY 
          dt.id, 
          pro.manufacturer_id,
          pc.program_detail_id;
    `);

    // Create refresh function if not exists
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION refresh_distributor_sales_summary()
      RETURNS TRIGGER AS $$
      BEGIN
          REFRESH MATERIALIZED VIEW distributor_sales_summary;
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);
    // Create refresh function if it does not exist
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE FUNCTION refresh_qualified_compliance_summary()
      RETURNS TRIGGER AS $$
      BEGIN
          REFRESH MATERIALIZED VIEW qualified_compliance_summary;
          RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;
    `);

    // Create trigger if it does not exist
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
          IF NOT EXISTS (
              SELECT 1 
              FROM pg_trigger 
              WHERE tgname = 'trigger_refresh_qualified_compliance_summary'
          ) THEN
              CREATE TRIGGER trigger_refresh_qualified_compliance_summary
              AFTER INSERT OR UPDATE OR DELETE 
              ON program_compliances
              FOR EACH STATEMENT
              EXECUTE FUNCTION refresh_qualified_compliance_summary();
          END IF;
      END $$;
    `);
  },

  async down(queryInterface) {
    // Drop the trigger if it exists
    await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trigger_refresh_qualified_compliance_summary ON program_compliances;
    `);

    // Drop the refresh function if it exists
    await queryInterface.sequelize.query(`
      DROP FUNCTION IF EXISTS refresh_qualified_compliance_summary;
    `);

    // Drop the materialized view if it exists
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS qualified_compliance_summary;
    `);
  }
};
