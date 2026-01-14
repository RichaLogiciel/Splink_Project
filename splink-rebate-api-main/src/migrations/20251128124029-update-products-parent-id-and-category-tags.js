"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Verify required columns exist
    const productsTableInfo = await queryInterface.describeTable("products");

    // Check if required columns exist
    if (!productsTableInfo.parent_product_id) {
      throw new Error(
        "parent_product_id column does not exist. Please run migration 20251110093000-add-parent-product-id-to-products.js first."
      );
    }

    // Check if there are rows that need updating for parent_product_id
    const [parentProductIdCount] = await queryInterface.sequelize.query(`
      SELECT COUNT(*) as count
      FROM products p_variant
      INNER JOIN products p_primary
        ON p_primary.unit_skus_id = p_variant.unit_skus_id
        AND p_primary.manufacturer_id = p_variant.manufacturer_id
      WHERE p_variant.primary_variant = false
        AND p_variant.unit_skus_id IS NOT NULL
        AND p_variant.deleted_at IS NULL
        AND p_primary.primary_variant = true
        AND p_primary.unit_skus_id IS NOT NULL
        AND p_primary.deleted_at IS NULL
        AND (
          p_variant.parent_product_id IS NULL
          OR p_variant.parent_product_id != p_primary.id
        );
    `);

    const needsParentProductIdUpdate = parentProductIdCount[0]?.count > 0;

    if (needsParentProductIdUpdate) {
      // Update parent_product_id - matches Python script behavior
      await queryInterface.sequelize.query(`
        UPDATE products p_variant
        SET 
          parent_product_id = p_primary.id,
          updated_at = CURRENT_TIMESTAMP
        FROM products p_primary
        WHERE p_variant.primary_variant = false
          AND p_variant.unit_skus_id IS NOT NULL
          AND p_variant.deleted_at IS NULL
          AND p_primary.primary_variant = true
          AND p_primary.unit_skus_id IS NOT NULL
          AND p_primary.deleted_at IS NULL
          AND p_variant.manufacturer_id = p_primary.manufacturer_id
          AND p_variant.unit_skus_id = p_primary.unit_skus_id
          AND (
            p_variant.parent_product_id IS NULL
            OR p_variant.parent_product_id != p_primary.id
          );
      `);
    }

    // Check if there are rows that need updating for category_tags_json
    // Note: This matches by unit_skus_id and manufacturer_id, not parent_product_id
    const [categoryTagsCount] = await queryInterface.sequelize.query(`
      SELECT COUNT(*) as count
      FROM products p_variant
      INNER JOIN products p_primary
        ON p_primary.unit_skus_id = p_variant.unit_skus_id
        AND p_primary.manufacturer_id = p_variant.manufacturer_id
      WHERE p_variant.primary_variant = false
        AND p_variant.unit_skus_id IS NOT NULL
        AND p_variant.deleted_at IS NULL
        AND p_primary.primary_variant = true
        AND p_primary.unit_skus_id IS NOT NULL
        AND p_primary.deleted_at IS NULL
        AND (
          p_variant.category_tags_json::text != p_primary.category_tags_json::text
          OR p_variant.category_tags_json IS NULL
        );
    `);

    const needsCategoryTagsUpdate = categoryTagsCount[0]?.count > 0;

    if (needsCategoryTagsUpdate) {
      // Update category_tags_json - matches Python script behavior
      // Joins on unit_skus_id and manufacturer_id, not parent_product_id
      await queryInterface.sequelize.query(`
        UPDATE products p_variant
        SET 
          category_tags_json = p_primary.category_tags_json,
          updated_at = CURRENT_TIMESTAMP
        FROM products p_primary
        WHERE p_variant.primary_variant = false
          AND p_variant.unit_skus_id IS NOT NULL
          AND p_variant.deleted_at IS NULL
          AND p_primary.primary_variant = true
          AND p_primary.unit_skus_id IS NOT NULL
          AND p_primary.deleted_at IS NULL
          AND p_variant.manufacturer_id = p_primary.manufacturer_id
          AND p_variant.unit_skus_id = p_primary.unit_skus_id
          AND (
            p_variant.category_tags_json::text != p_primary.category_tags_json::text
            OR p_variant.category_tags_json IS NULL
          );
      `);
    }
  },

  async down(queryInterface) {
    // Data updates cannot be reversed without backup
    // No rollback needed
  }
};
