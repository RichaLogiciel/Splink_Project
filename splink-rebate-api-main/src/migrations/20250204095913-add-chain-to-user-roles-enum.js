"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface) => {
    // Add the new "CHAIN" value to the ENUM
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_user_roles_parent_entity_type"
      ADD VALUE 'CHAIN';
    `);

    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_user_roles_associated_entity_type"
      ADD VALUE 'CHAIN';
    `);
  },

  down: async (queryInterface) => {
    // parent_entity_type
    // Rename the old ENUM type
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_user_roles_parent_entity_type" RENAME TO "enum_user_roles_parent_entity_type_old";
    `);

    // Create a new ENUM type without "CHAIN"
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_user_roles_parent_entity_type" AS ENUM('MANUFACTURER', 'DISTRIBUTOR', 'STORE');
    `);

    // Update the column to use the new ENUM type
    await queryInterface.sequelize.query(`
      ALTER TABLE "user_roles"
      ALTER COLUMN "parent_entity_type" TYPE "enum_user_roles_parent_entity_type"
      USING "parent_entity_type"::text::"enum_user_roles_parent_entity_type";
    `);

    // Drop the old ENUM type
    await queryInterface.sequelize.query(`
      DROP TYPE "enum_user_roles_parent_entity_type_old";
    `);

    // remove "CHAIN" from associated_entity_type
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_user_roles_parent_entity_type" RENAME TO "enum_user_roles_associated_entity_type_old";
    `);

    // associated_entity_type
    // Create a new ENUM type without "CHAIN"
    await queryInterface.sequelize.query(`
      CREATE TYPE "enum_user_roles_associated_entity_type" AS ENUM('MANUFACTURER', 'DISTRIBUTOR', 'STORE');
    `);

    // Update the column to use the new ENUM type
    await queryInterface.sequelize.query(`
      ALTER TABLE "user_roles"
      ALTER COLUMN "associated_entity_type" TYPE "enum_user_roles_associated_entity_type"
      USING "associated_entity_type"::text::"enum_user_roles_associated_entity_type";
    `);

    // Drop the old ENUM type
    await queryInterface.sequelize.query(`
      DROP TYPE "enum_user_roles_associated_entity_type_old";
    `);
  }
};
