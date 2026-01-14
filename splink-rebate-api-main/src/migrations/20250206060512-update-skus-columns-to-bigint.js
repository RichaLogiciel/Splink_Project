"use strict";

const columns = ["skus_id", "box_skus_id", "case_skus_id", "unit_skus_id"];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const column of columns) {
      // Step 1: Remove hyphens from the column values
      await queryInterface.sequelize.query(`
        UPDATE products
        SET ${column} = REPLACE(${column}, '-', '')
        WHERE ${column} LIKE '%-%';
      `);

      // Step 2: Set invalid values to NULL
      await queryInterface.sequelize.query(`
        UPDATE products
        SET ${column} = NULL
        WHERE ${column} IN ('', 'various', '**');
      `);

      // Step 3: Change the column type to BIGINT
      await queryInterface.sequelize.query(`
        ALTER TABLE products
        ALTER COLUMN ${column} TYPE BIGINT
        USING ${column}::bigint;
      `);
    }
  },

  async down(queryInterface) {
    for (const column of columns) {
      // Step 1: Revert the column type back to VARCHAR
      await queryInterface.sequelize.query(`
        ALTER TABLE products
        ALTER COLUMN ${column} TYPE VARCHAR
        USING ${column}::varchar;
      `);
    }
  }
};
