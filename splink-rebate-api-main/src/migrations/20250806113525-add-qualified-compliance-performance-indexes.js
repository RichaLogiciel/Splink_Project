"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add indexes for qualified_compliance_summary table
    await queryInterface.addIndex("qualified_compliance_summary", {
      fields: ["distributor_id", "manufacturer_id", "program_detail_id"],
      name: "idx_qualified_compliance_summary_dist_manuf_program"
    });

    await queryInterface.addIndex("qualified_compliance_summary", {
      fields: ["store_id", "distributor_id", "manufacturer_id"],
      name: "idx_qualified_compliance_summary_store_dist_manuf"
    });

    await queryInterface.addIndex("qualified_compliance_summary", {
      fields: ["compliance_year", "distributor_id", "manufacturer_id"],
      name: "idx_qualified_compliance_summary_year_dist_manuf"
    });

    // Add indexes for store_sales_reps table
    await queryInterface.addIndex("store_sales_reps", {
      fields: ["sales_rep_id", "store_id"],
      name: "idx_store_sales_reps_sales_rep_store"
    });

    // Add indexes for program_participants table
    await queryInterface.addIndex("program_participants", {
      fields: ["entity_type", "entity_id", "program_id"],
      name: "idx_program_participants_entity_program"
    });

    // Add indexes for program_details table
    await queryInterface.addIndex("program_details", {
      fields: ["id", "program_id"],
      name: "idx_program_details_id_program"
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex(
      "qualified_compliance_summary",
      "idx_qualified_compliance_summary_dist_manuf_program"
    );
    await queryInterface.removeIndex(
      "qualified_compliance_summary",
      "idx_qualified_compliance_summary_store_dist_manuf"
    );
    await queryInterface.removeIndex(
      "qualified_compliance_summary",
      "idx_qualified_compliance_summary_year_dist_manuf"
    );
    await queryInterface.removeIndex(
      "store_sales_reps",
      "idx_store_sales_reps_sales_rep_store"
    );
    await queryInterface.removeIndex(
      "program_participants",
      "idx_program_participants_entity_program"
    );
    await queryInterface.removeIndex(
      "program_details",
      "idx_program_details_id_program"
    );
  }
};
