"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.removeIndex(
      "entity_access_mappings",
      "entity_access_mappings_associatedentity_associatedentity_parententity_idx"
    );
  },

  async down(queryInterface) {
    await queryInterface.addIndex(
      "entity_access_mappings",
      [
        "associated_entity_id",
        "associated_entity_type",
        "parent_entity_id",
        "parent_entity_type"
      ],
      {
        name: "entity_access_mappings_associatedentity_associatedentity_parententity_idx",
        unique: false
      }
    );
  }
};
