"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log(
        "Creating performance optimization indexes for getKeyMetrics..."
      );

      // 1. program_participants indexes for countStoresProgramsEnrolled optimization
      console.log("Creating program_participants composite indexes...");

      // Primary composite index for entity lookups with entity_type filter
      await queryInterface.addIndex("program_participants", {
        fields: ["entity_id", "program_id", "entity_type"],
        name: "idx_program_participants_entity_program_type",
        where: {
          entity_type: "STORE",
          deleted_at: null
        },
        transaction
      });

      // Covering index for program_id, entity_id joins
      await queryInterface.addIndex("program_participants", {
        fields: ["program_id", "entity_id"],
        name: "idx_program_participants_program_entity_covering",
        where: {
          deleted_at: null
        },
        transaction
      });

      // 2. program_compliances indexes for getComplianceAggregates optimization
      console.log("Creating program_compliances composite indexes...");

      // Primary composite covering index for compliance aggregations
      await queryInterface.addIndex("program_compliances", {
        fields: ["entity_id", "program_id", "status", "deleted_at"],
        name: "idx_program_compliances_entity_program_status_covering",
        include: ["earned_rebate", "entity_type"],
        where: {
          deleted_at: null
        },
        transaction
      });

      // Alternative index for entity_type filtering
      await queryInterface.addIndex("program_compliances", {
        fields: ["entity_type", "entity_id", "program_id", "status"],
        name: "idx_program_compliances_type_entity_program_status",
        where: {
          deleted_at: null
        },
        transaction
      });

      // 3. program_store_ineligibility indexes for exclusion checks
      console.log("Creating program_store_ineligibility composite indexes...");

      // Covering index for exclusion checks
      await queryInterface.addIndex("program_store_ineligibility", {
        fields: ["program_id", "store_id", "deleted_at"],
        name: "idx_program_store_ineligibility_program_store_covering",
        where: {
          deleted_at: null
        },
        transaction
      });

      // Alternative index for store_id lookups
      await queryInterface.addIndex("program_store_ineligibility", {
        fields: ["store_id", "program_id"],
        name: "idx_program_store_ineligibility_store_program",
        where: {
          deleted_at: null
        },
        transaction
      });

      // 4. Additional user_roles index for distributor lookups
      console.log("Creating user_roles optimization index...");

      await queryInterface.addIndex("user_roles", {
        fields: [
          "parent_entity_id",
          "parent_entity_type",
          "role",
          "associated_entity_type"
        ],
        name: "idx_user_roles_distributor_stores_optimized",
        where: {
          parent_entity_type: "DISTRIBUTOR",
          role: "STORE",
          associated_entity_type: "STORE",
          deleted_at: null
        },
        transaction
      });

      await transaction.commit();
      console.log("Performance optimization indexes created successfully!");
    } catch (error) {
      await transaction.rollback();
      console.error("Error creating performance optimization indexes:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log("Dropping performance optimization indexes...");

      // Drop indexes in reverse order
      const indexesToDrop = [
        "idx_user_roles_distributor_stores_optimized",
        "idx_program_store_ineligibility_store_program",
        "idx_program_store_ineligibility_program_store_covering",
        "idx_program_compliances_type_entity_program_status",
        "idx_program_compliances_entity_program_status_covering",
        "idx_program_participants_program_entity_covering",
        "idx_program_participants_entity_program_type"
      ];

      for (const indexName of indexesToDrop) {
        try {
          await queryInterface.removeIndex("program_participants", indexName, {
            transaction
          });
        } catch (error) {
          // Index might not exist, continue
        }

        try {
          await queryInterface.removeIndex("program_compliances", indexName, {
            transaction
          });
        } catch (error) {
          // Index might not exist, continue
        }

        try {
          await queryInterface.removeIndex(
            "program_store_ineligibility",
            indexName,
            { transaction }
          );
        } catch (error) {
          // Index might not exist, continue
        }

        try {
          await queryInterface.removeIndex("user_roles", indexName, {
            transaction
          });
        } catch (error) {
          // Index might not exist, continue
        }
      }

      await transaction.commit();
      console.log("Performance optimization indexes dropped successfully!");
    } catch (error) {
      await transaction.rollback();
      console.error("Error dropping performance optimization indexes:", error);
      throw error;
    }
  }
};
