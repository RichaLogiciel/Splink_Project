"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    // Check if table already exists
    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isTableExist = await tableExists("sales_rep_store_earnings");
    if (isTableExist) {
      console.log(
        "Table sales_rep_store_earnings already exists, skipping creation"
      );
      return;
    }

    // Create the sales_rep_store_earnings table
    await queryInterface.createTable("sales_rep_store_earnings", {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      store_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "stores",
          key: "id"
        }
      },
      manufacturer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "manufacturers",
          key: "id"
        }
      },
      distributor_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "distributors",
          key: "id"
        }
      },
      sales_rep_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "distributors",
          key: "id"
        }
      },
      program_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "programs",
          key: "id"
        }
      },
      program_detail_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: "program_details",
          key: "id"
        }
      },
      unique_products: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      total_quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      total_purchase: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0
      },
      earning: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0
      },
      compliance_date: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    });

    // Create indexes for performance
    await queryInterface.addIndex("sales_rep_store_earnings", ["store_id"], {
      name: "idx_sales_rep_store_earnings_store_id"
    });

    await queryInterface.addIndex(
      "sales_rep_store_earnings",
      ["sales_rep_id"],
      {
        name: "idx_sales_rep_store_earnings_sales_rep_id"
      }
    );

    await queryInterface.addIndex("sales_rep_store_earnings", ["program_id"], {
      name: "idx_sales_rep_store_earnings_program_id"
    });

    await queryInterface.addIndex(
      "sales_rep_store_earnings",
      ["compliance_date"],
      {
        name: "idx_sales_rep_store_earnings_compliance_date"
      }
    );

    // Create composite indexes for common queries
    await queryInterface.addIndex(
      "sales_rep_store_earnings",
      ["sales_rep_id", "program_id", "compliance_date"],
      {
        name: "idx_sales_rep_store_earnings_rep_program"
      }
    );

    await queryInterface.addIndex(
      "sales_rep_store_earnings",
      ["store_id", "program_id", "compliance_date"],
      {
        name: "idx_sales_rep_store_earnings_store_program"
      }
    );

    // Add table and column comments
    await queryInterface.sequelize.query(`
      COMMENT ON TABLE sales_rep_store_earnings IS
      'Tracks spiff earnings at the store level for each sales rep, providing granular visibility into rebate distribution'
    `);

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN sales_rep_store_earnings.store_id IS
      'ID of the store that generated the spiff earning'
    `);

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN sales_rep_store_earnings.sales_rep_id IS
      'ID of the sales rep who earned the spiff (references distributors table)'
    `);

    await queryInterface.sequelize.query(`
      COMMENT ON COLUMN sales_rep_store_earnings.earning IS
      'Spiff amount earned from this specific store'
    `);
  },

  async down(queryInterface) {
    // Drop table indexes
    await queryInterface.removeIndex(
      "sales_rep_store_earnings",
      "idx_sales_rep_store_earnings_store_id"
    );
    await queryInterface.removeIndex(
      "sales_rep_store_earnings",
      "idx_sales_rep_store_earnings_sales_rep_id"
    );
    await queryInterface.removeIndex(
      "sales_rep_store_earnings",
      "idx_sales_rep_store_earnings_program_id"
    );
    await queryInterface.removeIndex(
      "sales_rep_store_earnings",
      "idx_sales_rep_store_earnings_compliance_date"
    );
    await queryInterface.removeIndex(
      "sales_rep_store_earnings",
      "idx_sales_rep_store_earnings_rep_program"
    );
    await queryInterface.removeIndex(
      "sales_rep_store_earnings",
      "idx_sales_rep_store_earnings_store_program"
    );

    // Drop the table
    await queryInterface.dropTable("sales_rep_store_earnings");
  }
};
