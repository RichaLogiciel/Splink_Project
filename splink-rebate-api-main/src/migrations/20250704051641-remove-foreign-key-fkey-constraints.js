"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Helper to check and remove constraint if it exists
    async function safeRemoveConstraint(table, constraint) {
      const constraints = await queryInterface.showConstraint(table);
      if (constraints.some((c) => c.constraintName === constraint)) {
        await queryInterface.removeConstraint(table, constraint);
      }
    }

    // Remove _fkey constraints from all relevant tables/columns
    await safeRemoveConstraint(
      "product_code_mappings",
      "product_code_mappings_product_id_fkey"
    );
    await safeRemoveConstraint(
      "product_code_mappings",
      "product_code_mappings_distributor_id_fkey"
    );
    await safeRemoveConstraint(
      "product_code_mappings",
      "product_code_mappings_warehouse_id_fkey"
    );

    await safeRemoveConstraint(
      "program_products",
      "program_products_program_id_fkey"
    );
    await safeRemoveConstraint(
      "program_products",
      "program_products_program_detail_id_fkey"
    );
    await safeRemoveConstraint(
      "program_products",
      "program_products_product_id_fkey"
    );

    await safeRemoveConstraint(
      "spiff_program_eligible_store",
      "spiff_program_eligible_store_program_id_fkey"
    );
    await safeRemoveConstraint(
      "spiff_program_eligible_store",
      "spiff_program_eligible_store_store_id_fkey"
    );

    await safeRemoveConstraint(
      "program_visibility",
      "program_visibility_program_id_fkey"
    );
    await safeRemoveConstraint(
      "program_visibility",
      "program_visibility_program_detail_id_fkey"
    );
    await safeRemoveConstraint(
      "program_visibility",
      "program_visibility_distributor_id_fkey"
    );

    await safeRemoveConstraint(
      "program_approvals",
      "program_approvals_program_id_fkey"
    );
    await safeRemoveConstraint(
      "program_approvals",
      "program_approvals_program_detail_id_fkey"
    );

    await safeRemoveConstraint("programs", "programs_manufacturer_id_fkey");
    await safeRemoveConstraint(
      "program_details",
      "program_details_program_id_fkey"
    );

    await safeRemoveConstraint(
      "user_linked_accounts",
      "user_linked_accounts_user_id_fkey"
    );
    await safeRemoveConstraint(
      "user_linked_accounts",
      "user_linked_accounts_related_user_id_fkey"
    );
  },

  async down(queryInterface, Sequelize) {
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  }
};
