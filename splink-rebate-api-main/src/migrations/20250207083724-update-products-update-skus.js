"use strict";

const tables = ["products"];

const columns = ["old_unit_skus_id", "old_case_skus_id", "old_box_skus_id"];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    for (const table of tables) {
      const tableInfo = await queryInterface.describeTable(table);

      for (const column of columns) {
        if (!tableInfo[column]) continue;

        // Remove the Default Value
        await queryInterface.sequelize.query(`
          ALTER TABLE ${table}
          ALTER COLUMN ${column} DROP DEFAULT;
        `);

        // Convert All Non-Numeric Values to NULL
        await queryInterface.sequelize.query(`
          UPDATE ${table}
          SET ${column} = NULL
          WHERE ${column} ~ '[^0-9]' ;  -- Remove non-numeric values
        `);

        // Remove Commas and Dollar Signs (If Needed)
        await queryInterface.sequelize.query(`
          UPDATE ${table}
          SET ${column} = REGEXP_REPLACE(${column}, '[^0-9]', '', 'g')
          WHERE ${column} ~ '[^0-9]';
        `);

        // Ensure Empty Strings are NULL
        await queryInterface.sequelize.query(`
          UPDATE ${table}
          SET ${column} = NULL
          WHERE ${column} = '';
        `);

        // Finally, Change Column Type to BIGINT
        await queryInterface.sequelize.query(`
          ALTER TABLE ${table}
          ALTER COLUMN ${column} TYPE BIGINT
          USING NULLIF(${column}, '')::BIGINT;
        `);

        // Restore the Default Value -  NULL
        await queryInterface.sequelize.query(`
          ALTER TABLE ${table}
          ALTER COLUMN ${column} SET DEFAULT NULL;
        `);
      }
    }
  },

  async down(queryInterface) {
    for (const table of tables) {
      const tableInfo = await queryInterface.describeTable(table);

      for (const column of columns) {
        if (!tableInfo[column]) continue;

        // Step 1: Revert the column type back to VARCHAR
        await queryInterface.sequelize.query(`
          ALTER TABLE ${table}
          ALTER COLUMN ${column} TYPE VARCHAR
          USING ${column}::varchar;
        `);
      }
    }
  }
};
