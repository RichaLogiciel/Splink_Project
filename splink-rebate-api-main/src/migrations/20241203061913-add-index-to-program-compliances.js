"use strict";

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.addIndex(
      "program_compliances",
      ["entity_id", "entity_type"],
      {
        name: "program_compliances_entity_id_entity_type_idx",
        unique: false
      }
    );

    await queryInterface.addIndex(
      "program_compliances",
      ["entity_id", "entity_type", "program_id"],
      {
        name: "program_compliances_entity_id_entity_type_program_id_idx",
        unique: false
      }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex(
      "program_compliances",
      "program_compliances_entity_id_entity_type_idx"
    );
    await queryInterface.removeIndex(
      "program_compliances",
      "program_compliances_entity_id_entity_type_program_id_idx"
    );
  }
};
