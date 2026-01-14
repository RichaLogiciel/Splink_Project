"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Adding indexes for chain-related queries

    // Index for chain_stores table - chain_id lookup (most common query)
    await queryInterface.addIndex("chain_stores", ["chain_id"], {
      name: "idx_chain_stores_chain_id"
    });

    // Index for chain_stores table - store_id lookup (reverse chain lookup)
    await queryInterface.addIndex("chain_stores", ["store_id"], {
      name: "idx_chain_stores_store_id"
    });

    // Composite index for chain_stores table - chain_id and store_id together
    await queryInterface.addIndex("chain_stores", ["chain_id", "store_id"], {
      name: "idx_chain_stores_chain_store_composite"
    });

    // Index for chains table - name lookup (for search queries)
    await queryInterface.addIndex("chains", ["name"], {
      name: "idx_chains_name"
    });

    // Index for program_participants table - entity_type lookup (for filtering CHAIN participants)
    await queryInterface.addIndex("program_participants", ["entity_type"], {
      name: "idx_program_participants_entity_type"
    });

    // Composite index for program_participants table - entity_type and program_id together
    await queryInterface.addIndex(
      "program_participants",
      ["entity_type", "program_id"],
      {
        name: "idx_program_participants_entity_type_program_id"
      }
    );

    // Composite index for program_participants table - entity_type and entity_id together
    await queryInterface.addIndex(
      "program_participants",
      ["entity_type", "entity_id"],
      {
        name: "idx_program_participants_entity_type_entity_id"
      }
    );

    // Index for program_compliances table - entity_type lookup (for chain compliance queries)
    await queryInterface.addIndex("program_compliances", ["entity_type"], {
      name: "idx_program_compliances_entity_type"
    });

    // Composite index for program_compliances table - entity_type and program_id together
    await queryInterface.addIndex(
      "program_compliances",
      ["entity_type", "program_id"],
      {
        name: "idx_program_compliances_entity_type_program_id"
      }
    );

    // Index for program_compliances table - is_qualified lookup (for compliance filtering)
    await queryInterface.addIndex("program_compliances", ["is_qualified"], {
      name: "idx_program_compliances_is_qualified"
    });
  },

  async down(queryInterface) {
    // Removing indexes in reverse order
    await queryInterface.removeIndex(
      "program_compliances",
      "idx_program_compliances_is_qualified"
    );
    await queryInterface.removeIndex(
      "program_compliances",
      "idx_program_compliances_entity_type_program_id"
    );
    await queryInterface.removeIndex(
      "program_compliances",
      "idx_program_compliances_entity_type"
    );
    await queryInterface.removeIndex(
      "program_participants",
      "idx_program_participants_entity_type_entity_id"
    );
    await queryInterface.removeIndex(
      "program_participants",
      "idx_program_participants_entity_type_program_id"
    );
    await queryInterface.removeIndex(
      "program_participants",
      "idx_program_participants_entity_type"
    );
    await queryInterface.removeIndex("chains", "idx_chains_name");
    await queryInterface.removeIndex(
      "chain_stores",
      "idx_chain_stores_chain_store_composite"
    );
    await queryInterface.removeIndex(
      "chain_stores",
      "idx_chain_stores_store_id"
    );
    await queryInterface.removeIndex(
      "chain_stores",
      "idx_chain_stores_chain_id"
    );
  }
};
