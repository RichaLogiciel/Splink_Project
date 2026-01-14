"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      console.log(
        "Starting simplified migration of old programs to new workflow..."
      );

      // ========================================
      // 1. GET ALL MANUFACTURER PROGRAMS
      // ========================================
      console.log("\n=== PROCESSING ALL MANUFACTURER PROGRAMS ===");

      const programsToMigrate = await queryInterface.sequelize.query(
        `
        SELECT 
          p.id as program_id,
          p.name,
          p.participant_type,
          p.visibility_scope,
          p.creator_type,
          p.program_type,
          p.manufacturer_id,
          pd.id as program_detail_id,
          pd.tier
        FROM programs p
        JOIN program_details pd ON p.id = pd.program_id
        WHERE p.creator_type = 'MANUFACTURER'
          AND p.deleted_at IS NULL
          AND pd.deleted_at IS NULL
        ORDER BY p.id, pd.tier
      `,
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      console.log(
        `Found ${programsToMigrate.length} program details to migrate`
      );

      if (programsToMigrate.length > 0) {
        // Get all distributor admins from user_roles
        const allDistributors = await queryInterface.sequelize.query(
          `
          SELECT 
            ur.associated_user_id as distributor_id,
            d.name as distributor_name,
            d.is_disabled
          FROM user_roles ur
          JOIN distributors d ON ur.associated_user_id = d.id
          WHERE ur.role = 'DISTRIBUTOR_ADMIN'
            AND ur.deleted_at IS NULL
            AND d.deleted_at IS NULL
          ORDER BY ur.associated_user_id
        `,
          {
            type: Sequelize.QueryTypes.SELECT,
            transaction
          }
        );

        console.log(`Found ${allDistributors.length} distributor admins`);

        // Get excluded distributor programs
        const excludedDistributorPrograms =
          await queryInterface.sequelize.query(
            `
          SELECT 
            edp.distributor_id,
            edp.program_id,
            edp.program_detail_id,
            edp.manufacturer_id
          FROM excluded_distributor_programs edp
          JOIN programs p ON edp.program_id = p.id
          WHERE edp.deleted_at IS NULL
            AND p.creator_type = 'MANUFACTURER'
          ORDER BY edp.distributor_id, edp.program_id
        `,
            {
              type: Sequelize.QueryTypes.SELECT,
              transaction
            }
          );

        console.log(
          `Found ${excludedDistributorPrograms.length} excluded distributor-program combinations`
        );

        // Get all stores for spiff programs
        const allStores = await queryInterface.sequelize.query(
          `
          SELECT 
            s.id as store_id,
            s.name as store_name
          FROM stores s
          WHERE s.deleted_at IS NULL
          ORDER BY s.id
        `,
          {
            type: Sequelize.QueryTypes.SELECT,
            transaction
          }
        );

        console.log(`Found ${allStores.length} stores`);

        // Process all programs
        let programVisibilityInserted = 0;
        let programApprovalsInserted = 0;
        let spiffProgramEligibleStoreInserted = 0;

        for (const program of programsToMigrate) {
          console.log(
            `Processing program ${program.program_id} (${program.name}) - ${program.participant_type}/${program.visibility_scope}`
          );

          // 1. MIGRATE PROGRAM VISIBILITY
          await migrateProgramVisibility(
            queryInterface,
            Sequelize,
            transaction,
            {
              program,
              allDistributors,
              allStores,
              counter: () => programVisibilityInserted++
            }
          );

          // 2. MIGRATE PROGRAM APPROVALS (with exclusion logic)
          await migrateProgramApprovals(
            queryInterface,
            Sequelize,
            transaction,
            {
              program,
              allDistributors,
              excludedDistributorPrograms,
              counter: () => programApprovalsInserted++
            }
          );

          // 3. MIGRATE SPIFF PROGRAM ELIGIBLE STORES
          await migrateSpiffProgramEligibleStores(
            queryInterface,
            Sequelize,
            transaction,
            {
              program,
              allStores,
              counter: () => spiffProgramEligibleStoreInserted++
            }
          );
        }

        console.log("\n=== MIGRATION SUMMARY ===");
        console.log(
          `Program Visibility entries created: ${programVisibilityInserted}`
        );
        console.log(
          `Program Approvals entries created: ${programApprovalsInserted}`
        );
        console.log(
          `Spiff Program Eligible Store entries created: ${spiffProgramEligibleStoreInserted}`
        );
      } else {
        console.log("No programs to migrate.");
      }

      console.log("\n=== MIGRATION COMPLETED SUCCESSFULLY ===");
      await transaction.commit();
    } catch (error) {
      console.error("Migration failed:", error);
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log("Rolling back migration...");

    const transaction = await queryInterface.sequelize.transaction();

    try {
      // Remove program visibility entries for manufacturer programs
      const visibilityCount = await queryInterface.sequelize.query(
        `
        SELECT COUNT(*) as count
        FROM program_visibility 
        WHERE program_id IN (
          SELECT p.id 
          FROM programs p 
          WHERE p.creator_type = 'MANUFACTURER'
        )
      `,
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      await queryInterface.sequelize.query(
        `
        DELETE FROM program_visibility 
        WHERE program_id IN (
          SELECT p.id 
          FROM programs p 
          WHERE p.creator_type = 'MANUFACTURER'
        )
      `,
        { transaction }
      );

      console.log(
        `Removed ${visibilityCount[0].count} program visibility entries`
      );

      // Remove program approvals entries for manufacturer programs
      const approvalsCount = await queryInterface.sequelize.query(
        `
        SELECT COUNT(*) as count
        FROM program_approvals 
        WHERE program_id IN (
          SELECT p.id 
          FROM programs p 
          WHERE p.creator_type = 'MANUFACTURER'
        )
      `,
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      await queryInterface.sequelize.query(
        `
        DELETE FROM program_approvals 
        WHERE program_id IN (
          SELECT p.id 
          FROM programs p 
          WHERE p.creator_type = 'MANUFACTURER'
        )
      `,
        { transaction }
      );

      console.log(
        `Removed ${approvalsCount[0].count} program approval entries`
      );

      // Remove spiff program eligible store entries for manufacturer programs
      const spiffCount = await queryInterface.sequelize.query(
        `
        SELECT COUNT(*) as count
        FROM spiff_program_eligible_store 
        WHERE program_id IN (
          SELECT p.id 
          FROM programs p 
          WHERE p.creator_type = 'MANUFACTURER'
        )
      `,
        {
          type: Sequelize.QueryTypes.SELECT,
          transaction
        }
      );

      await queryInterface.sequelize.query(
        `
        DELETE FROM spiff_program_eligible_store 
        WHERE program_id IN (
          SELECT p.id 
          FROM programs p 
          WHERE p.creator_type = 'MANUFACTURER'
        )
      `,
        { transaction }
      );

      console.log(
        `Removed ${spiffCount[0].count} spiff program eligible store entries`
      );

      await transaction.commit();
      console.log("\n=== ROLLBACK COMPLETED SUCCESSFULLY ===");
    } catch (error) {
      console.error("Rollback failed:", error);
      await transaction.rollback();
      throw error;
    }
  }
};

// ========================================
// MIGRATION FUNCTIONS
// ========================================

/**
 * Migrate program visibility entries
 */
async function migrateProgramVisibility(
  queryInterface,
  Sequelize,
  transaction,
  { program, allDistributors, allStores, counter }
) {
  const { program_id, program_detail_id, participant_type, visibility_scope } =
    program;

  // Check if entries already exist for this program detail
  const existingVisibility = await queryInterface.sequelize.query(
    `
    SELECT COUNT(*) as count 
    FROM program_visibility 
    WHERE program_detail_id = :program_detail_id
  `,
    {
      replacements: { program_detail_id },
      type: Sequelize.QueryTypes.SELECT,
      transaction
    }
  );

  if (existingVisibility[0].count > 0) {
    console.log(
      `  Skipping program visibility - entries already exist for program_detail_id ${program_detail_id}`
    );
    return;
  }

  let entitiesToInsert = [];

  switch (visibility_scope) {
    case "SPECIFIC_STORES":
      // For specific stores, we need to create entries for each store
      // Since we don't have specific store programs currently, skip this
      console.log(
        `  Skipping SPECIFIC_STORES visibility - no specific store programs exist`
      );
      break;

    case "SPECIFIC_DISTRIBUTORS":
      // For specific distributors, create entries for each distributor
      // This would be used for programs that should only be visible to specific distributors
      console.log(
        `  Skipping SPECIFIC_DISTRIBUTORS visibility - using program_approvals for visibility control`
      );
      break;

    case "ALL_DISTRIBUTORS":
    case "ALL_STORES_UNDER_DISTRIBUTOR":
    case "ALL_SALES_REPS":
      // For ALL_* scopes, no program_visibility entries are needed (implicit visibility)
      console.log(
        `  Skipping ${visibility_scope} visibility - implicit visibility, no DB entries needed`
      );
      break;

    default:
      console.log(`  Unknown visibility scope: ${visibility_scope}`);
      break;
  }

  if (entitiesToInsert.length > 0) {
    await queryInterface.bulkInsert("program_visibility", entitiesToInsert, {
      transaction
    });
    console.log(
      `  Created ${entitiesToInsert.length} program visibility entries`
    );
    counter();
  }
}

/**
 * Migrate program approvals (with exclusion logic)
 */
async function migrateProgramApprovals(
  queryInterface,
  Sequelize,
  transaction,
  { program, allDistributors, excludedDistributorPrograms, counter }
) {
  const { program_id, program_detail_id } = program;

  // Check if entries already exist for this program detail
  const existingApprovals = await queryInterface.sequelize.query(
    `
    SELECT COUNT(*) as count 
    FROM program_approvals 
    WHERE program_detail_id = :program_detail_id
  `,
    {
      replacements: { program_detail_id },
      type: Sequelize.QueryTypes.SELECT,
      transaction
    }
  );

  if (existingApprovals[0].count > 0) {
    console.log(
      `  Skipping program approvals - entries already exist for program_detail_id ${program_detail_id}`
    );
    return;
  }

  // Check for existing entries with specific combinations to ensure uniqueness
  const existingCombinations = await queryInterface.sequelize.query(
    `
    SELECT program_id, program_detail_id, approver_id
    FROM program_approvals 
    WHERE program_id = :program_id AND program_detail_id = :program_detail_id
  `,
    {
      replacements: { program_id, program_detail_id },
      type: Sequelize.QueryTypes.SELECT,
      transaction
    }
  );

  const existingCombinationSet = new Set();
  existingCombinations.forEach((entry) => {
    existingCombinationSet.add(
      `${entry.program_id}-${entry.program_detail_id}-${entry.approver_id}`
    );
  });

  // Create a set of excluded distributor-program combinations for quick lookup
  const excludedCombinations = new Set();
  excludedDistributorPrograms.forEach((exclusion) => {
    if (exclusion.program_id === program_id) {
      // Handle both specific program_detail_id exclusions and general program exclusions
      if (exclusion.program_detail_id) {
        excludedCombinations.add(
          `${exclusion.distributor_id}-${exclusion.program_detail_id}`
        );
      } else {
        // If program_detail_id is null, exclude this distributor from all details of this program
        excludedCombinations.add(`${exclusion.distributor_id}-all`);
      }
    }
  });

  // Create approval entries for distributors that don't already exist
  const approvalsToInsert = allDistributors
    .filter((dist) => {
      const combinationKey = `${program_id}-${program_detail_id}-${dist.distributor_id}`;
      return !existingCombinationSet.has(combinationKey);
    })
    .map((dist) => {
      const combinationKey = `${dist.distributor_id}-${program_detail_id}`;
      const generalKey = `${dist.distributor_id}-all`;
      const isExcluded =
        excludedCombinations.has(combinationKey) ||
        excludedCombinations.has(generalKey);

      return {
        program_id,
        program_detail_id,
        approver_type: "DISTRIBUTOR",
        approver_id: dist.distributor_id,
        status: isExcluded ? "PENDING" : "APPROVED", // PENDING for excluded, APPROVED for others
        notes: isExcluded ? "Excluded from program visibility" : null,
        created_at: new Date(),
        updated_at: new Date()
      };
    });

  if (approvalsToInsert.length > 0) {
    await queryInterface.bulkInsert("program_approvals", approvalsToInsert, {
      transaction
    });
    console.log(
      `  Created ${approvalsToInsert.length} program approval entries (${approvalsToInsert.filter((a) => a.status === "APPROVED").length} APPROVED, ${approvalsToInsert.filter((a) => a.status === "PENDING").length} PENDING) - Skipped ${allDistributors.length - approvalsToInsert.length} existing entries`
    );
    counter();
  } else {
    console.log(
      `  Skipping program approvals - all distributor combinations already exist for program_detail_id ${program_detail_id}`
    );
  }
}

/**
 * Migrate spiff program eligible stores
 */
async function migrateSpiffProgramEligibleStores(
  queryInterface,
  Sequelize,
  transaction,
  { program, allStores, counter }
) {
  const { program_id, participant_type, program_type, visibility_scope } =
    program;

  // Only migrate for SALES_REP participant type and SPIFF/NA program types
  if (
    participant_type !== "SALES_REP" ||
    (program_type !== "SPIFF" && program_type !== "NA")
  ) {
    console.log(
      `  Skipping spiff program eligible stores - participant_type: ${participant_type}, program_type: ${program_type}`
    );
    return;
  }

  // Check if entries already exist for this program
  const existingSpiffStores = await queryInterface.sequelize.query(
    `
    SELECT COUNT(*) as count 
    FROM spiff_program_eligible_store 
    WHERE program_id = :program_id
  `,
    {
      replacements: { program_id },
      type: Sequelize.QueryTypes.SELECT,
      transaction
    }
  );

  if (existingSpiffStores[0].count > 0) {
    console.log(
      `  Skipping spiff program eligible stores - entries already exist for program_id ${program_id}`
    );
    return;
  }

  // For ALL_SALES_REPS scope, no explicit store entries needed (implicit visibility)
  if (visibility_scope === "ALL_SALES_REPS") {
    console.log(
      "  Skipping spiff program eligible stores - ALL_SALES_REPS has implicit visibility"
    );
    return;
  }

  // Create entries for all stores (for future SPECIFIC_SALES_REPS scope)
  const spiffStoresToInsert = allStores.map((store) => ({
    program_id,
    store_id: store.store_id,
    created_at: new Date(),
    updated_at: new Date()
  }));

  if (spiffStoresToInsert.length > 0) {
    await queryInterface.bulkInsert(
      "spiff_program_eligible_store",
      spiffStoresToInsert,
      {
        transaction
      }
    );
    console.log(
      `  Created ${spiffStoresToInsert.length} spiff program eligible store entries`
    );
    counter();
  }
}
