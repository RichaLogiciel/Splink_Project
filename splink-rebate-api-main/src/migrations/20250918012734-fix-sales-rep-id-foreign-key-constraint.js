"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Function to check if a constraint exists
    const constraintExists = async (tableName, constraintName) => {
      try {
        const [constraints] = await queryInterface.sequelize.query(`
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = '${tableName}' 
          AND constraint_name = '${constraintName}'
        `);
        return constraints.length > 0;
      } catch (error) {
        console.error(
          `Error checking if constraint ${constraintName} exists in ${tableName}:`,
          error
        );
        return false;
      }
    };

    // Check if the foreign key constraint exists
    const fkConstraintExists = await constraintExists(
      "line_items",
      "line_items_sales_rep_id_fkey"
    );

    if (fkConstraintExists) {
      // Drop the existing foreign key constraint
      await queryInterface.sequelize.query(`
        ALTER TABLE line_items 
        DROP CONSTRAINT line_items_sales_rep_id_fkey;
      `);

      console.log(
        "Removed incorrect sales_rep_id foreign key constraint to users table"
      );
    } else {
      console.log("sales_rep_id foreign key constraint does not exist");
    }
  },

  async down(queryInterface, Sequelize) {
    // Function to check if a constraint exists
    const constraintExists = async (tableName, constraintName) => {
      try {
        const [constraints] = await queryInterface.sequelize.query(`
          SELECT constraint_name 
          FROM information_schema.table_constraints 
          WHERE table_name = '${tableName}' 
          AND constraint_name = '${constraintName}'
        `);
        return constraints.length > 0;
      } catch (error) {
        console.error(
          `Error checking if constraint ${constraintName} exists in ${tableName}:`,
          error
        );
        return false;
      }
    };

    // Check if the foreign key constraint exists
    const fkConstraintExists = await constraintExists(
      "line_items",
      "line_items_sales_rep_id_fkey"
    );

    if (!fkConstraintExists) {
      // Restore the foreign key constraint (if you want to rollback)
      await queryInterface.sequelize.query(`
        ALTER TABLE line_items 
        ADD CONSTRAINT line_items_sales_rep_id_fkey 
        FOREIGN KEY (sales_rep_id) 
        REFERENCES users(id) 
        ON UPDATE CASCADE 
        ON DELETE SET NULL;
      `);

      console.log(
        "Restored sales_rep_id foreign key constraint to users table"
      );
    } else {
      console.log("sales_rep_id foreign key constraint already exists");
    }
  }
};
