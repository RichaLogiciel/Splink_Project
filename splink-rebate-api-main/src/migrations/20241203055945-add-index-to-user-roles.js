"use strict";

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex(
      "user_roles",
      ["role", "parent_entity_id", "parent_entity_type"],
      {
        name: "user_roles_role_parent_entity_id_parent_entity_type_idx",
        unique: false
      }
    );

    await queryInterface.addIndex(
      "user_roles",
      ["parent_entity_id", "parent_entity_type"],
      {
        name: "user_roles_parent_entity_id_parent_entity_type_idx",
        unique: false
      }
    );

    await queryInterface.addIndex(
      "user_roles",
      [
        "associated_user_id",
        "associated_entity_type",
        "parent_entity_id",
        "parent_entity_type"
      ],
      {
        name: "user_roles_associateduser_associatedentity_parententity_idx",
        unique: false
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      "user_roles",
      "user_roles_role_parent_entity_id_parent_entity_type_idx"
    );
    await queryInterface.removeIndex(
      "user_roles",
      "user_roles_parent_entity_id_parent_entity_type_idx"
    );
    await queryInterface.removeIndex(
      "user_roles",
      "user_roles_associateduser_associatedentity_parententity_idx"
    );
  }
};
