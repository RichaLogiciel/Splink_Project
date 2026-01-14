"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
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
        ) AS qualified_compliance_count
      FROM
        distributors AS dt
        JOIN user_roles AS ur ON ur.parent_entity_id = dt.id
        AND ur.parent_entity_type = 'DISTRIBUTOR'
        AND ur.role = 'STORE'
        JOIN program_compliances AS pc ON pc.entity_id = ur.associated_user_id
        AND pc.entity_type = ur.role
        JOIN programs AS pro ON pro.id = pc.program_id
        AND pro.participant_type = ur.role
      GROUP BY
        dt.id,
        pro.manufacturer_id,
        pc.program_detail_id,
        ur.associated_user_id;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(`
      DROP MATERIALIZED VIEW IF EXISTS qualified_compliance_summary;
    `);

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
  }
};
