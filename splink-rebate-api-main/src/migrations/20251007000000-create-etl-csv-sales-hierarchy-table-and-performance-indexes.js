"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    console.log(
      "Creating ETL CSV sales hierarchy table and performance indexes..."
    );

    // 1. Create the staging table (NO FOREIGN KEY CONSTRAINTS)
    await queryInterface.createTable("etl_csv_sales_hierarchy", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      import_file_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      distributor_id: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      division_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      vp_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      rm_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      rep_name: {
        type: Sequelize.STRING(255),
        allowNull: true
      },

      // Enrichment fields (INTEGER type)
      warehouse_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      gm_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      rm_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      rep_id: {
        type: Sequelize.INTEGER,
        allowNull: true
      },

      // Status fields
      is_warehouse_exists: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      is_gm_exists: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      is_rm_exists: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      is_rep_exists: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },

      // Processing status
      enrichment_status: {
        type: Sequelize.STRING(50),
        defaultValue: "PENDING",
        allowNull: false
      },
      is_enrichment_error: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      processed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      processed_at: {
        type: Sequelize.DATE,
        allowNull: true
      },

      // Audit fields
      created_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      },
      updated_at: {
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW,
        allowNull: false
      }
    });

    // 2. Create ESSENTIAL indexes only (for performance)
    console.log("Creating indexes for etl_csv_sales_hierarchy table...");

    // Index on import_file_id for faster lookups
    await queryInterface.addIndex("etl_csv_sales_hierarchy", {
      fields: ["import_file_id"],
      name: "idx_etl_csv_sales_hierarchy_import_file_id"
    });

    // Index on distributor_id for faster lookups
    await queryInterface.addIndex("etl_csv_sales_hierarchy", {
      fields: ["distributor_id"],
      name: "idx_etl_csv_sales_hierarchy_distributor_id"
    });

    // Index on processed status for faster processing queries
    await queryInterface.addIndex("etl_csv_sales_hierarchy", {
      fields: ["processed"],
      name: "idx_etl_csv_sales_hierarchy_processed"
    });

    // Composite index for common query patterns (file + distributor + processed)
    await queryInterface.addIndex("etl_csv_sales_hierarchy", {
      fields: ["import_file_id", "distributor_id", "processed"],
      name: "idx_etl_csv_sales_hierarchy_file_distributor_processed"
    });

    // 3. Create indexes on existing tables for better performance
    console.log("Creating performance indexes on existing tables...");

    // Index on manager_sales_rep_mapping for faster lookups
    try {
      await queryInterface.addIndex("manager_sales_rep_mapping", {
        fields: ["sales_rep_id"],
        name: "idx_manager_sales_rep_mapping_sales_rep_id"
      });
    } catch (error) {
      console.log(
        "Index idx_manager_sales_rep_mapping_sales_rep_id already exists, skipping..."
      );
    }

    try {
      await queryInterface.addIndex("manager_sales_rep_mapping", {
        fields: ["sales_manager_id"],
        name: "idx_manager_sales_rep_mapping_sales_manager_id"
      });
    } catch (error) {
      console.log(
        "Index idx_manager_sales_rep_mapping_sales_manager_id already exists, skipping..."
      );
    }

    // Index on distributor_manager_warehouses for faster lookups
    try {
      await queryInterface.addIndex("distributor_manager_warehouses", {
        fields: ["warehouse_id"],
        name: "idx_distributor_manager_warehouses_warehouse_id"
      });
    } catch (error) {
      console.log(
        "Index idx_distributor_manager_warehouses_warehouse_id already exists, skipping..."
      );
    }

    try {
      await queryInterface.addIndex("distributor_manager_warehouses", {
        fields: ["distributor_id"],
        name: "idx_distributor_manager_warehouses_distributor_id"
      });
    } catch (error) {
      console.log(
        "Index idx_distributor_manager_warehouses_distributor_id already exists, skipping..."
      );
    }

    // Index on user_roles for faster role lookups
    try {
      await queryInterface.addIndex("user_roles", {
        fields: ["parent_entity_id", "role"],
        name: "idx_user_roles_parent_entity_id_role"
      });
    } catch (error) {
      console.log(
        "Index idx_user_roles_parent_entity_id_role already exists, skipping..."
      );
    }

    try {
      await queryInterface.addIndex("user_roles", {
        fields: ["associated_user_id"],
        name: "idx_user_roles_associated_user_id"
      });
    } catch (error) {
      console.log(
        "Index idx_user_roles_associated_user_id already exists, skipping..."
      );
    }

    // Index on distributors for faster name lookups
    try {
      await queryInterface.addIndex("distributors", {
        fields: ["name"],
        name: "idx_distributors_name"
      });
    } catch (error) {
      console.log("Index idx_distributors_name already exists, skipping...");
    }

    // Index on warehouses for faster name lookups
    try {
      await queryInterface.addIndex("warehouses", {
        fields: ["name"],
        name: "idx_warehouses_name"
      });
    } catch (error) {
      console.log("Index idx_warehouses_name already exists, skipping...");
    }

    console.log(
      "Successfully created ETL CSV sales hierarchy table and performance indexes"
    );
  },

  async down(queryInterface, Sequelize) {
    console.log(
      "Dropping ETL CSV sales hierarchy table and performance indexes..."
    );

    // Drop indexes on existing tables
    const indexesToDrop = [
      "idx_warehouses_name",
      "idx_distributors_name",
      "idx_user_roles_associated_user_id",
      "idx_user_roles_parent_entity_id_role",
      "idx_distributor_manager_warehouses_distributor_id",
      "idx_distributor_manager_warehouses_warehouse_id",
      "idx_manager_sales_rep_mapping_sales_manager_id",
      "idx_manager_sales_rep_mapping_sales_rep_id"
    ];

    for (const indexName of indexesToDrop) {
      try {
        await queryInterface.removeIndex("etl_csv_sales_hierarchy", indexName);
      } catch (error) {
        console.log(`Index ${indexName} does not exist, skipping...`);
      }
    }

    // Drop indexes on etl_csv_sales_hierarchy table
    const etlIndexesToDrop = [
      "idx_etl_csv_sales_hierarchy_file_distributor_processed",
      "idx_etl_csv_sales_hierarchy_processed",
      "idx_etl_csv_sales_hierarchy_distributor_id",
      "idx_etl_csv_sales_hierarchy_import_file_id"
    ];

    for (const indexName of etlIndexesToDrop) {
      try {
        await queryInterface.removeIndex("etl_csv_sales_hierarchy", indexName);
      } catch (error) {
        console.log(`Index ${indexName} does not exist, skipping...`);
      }
    }

    // Drop the table
    await queryInterface.dropTable("etl_csv_sales_hierarchy");

    console.log(
      "Successfully dropped ETL CSV sales hierarchy table and performance indexes"
    );
  }
};
