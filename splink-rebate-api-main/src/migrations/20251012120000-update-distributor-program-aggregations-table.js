"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "distributor_program_aggregations";

    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        return !!tableDescription[columnName];
      } catch {
        return false;
      }
    };

    const isTableExist = await tableExists(tableName);

    if (!isTableExist) {
      console.log(`Table ${tableName} does not exist. Skipping migration.`);
      return;
    }

    // Remove old columns
    if (await columnExists(tableName, "total_sales_volume")) {
      await queryInterface.removeColumn(tableName, "total_sales_volume");
      console.log(`Removed column: total_sales_volume`);
    }

    if (await columnExists(tableName, "total_store_earnings")) {
      await queryInterface.removeColumn(tableName, "total_store_earnings");
      console.log(`Removed column: total_store_earnings`);
    }

    if (await columnExists(tableName, "compliant_stores")) {
      await queryInterface.removeColumn(tableName, "compliant_stores");
      console.log(`Removed column: compliant_stores`);
    }

    // Add new columns - Sales Volumes (stores then chains)
    if (!(await columnExists(tableName, "stores_sales_volume"))) {
      await queryInterface.addColumn(tableName, "stores_sales_volume", {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: "Sales volume for individual stores"
      });
      console.log(`Added column: stores_sales_volume`);
    }

    if (!(await columnExists(tableName, "chains_stores_sales_volume"))) {
      await queryInterface.addColumn(tableName, "chains_stores_sales_volume", {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: "Sales volume for chain stores"
      });
      console.log(`Added column: chains_stores_sales_volume`);
    }

    // Earnings (stores then chains)
    if (!(await columnExists(tableName, "stores_earnings"))) {
      await queryInterface.addColumn(tableName, "stores_earnings", {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: "Earnings for individual stores"
      });
      console.log(`Added column: stores_earnings`);
    }

    if (!(await columnExists(tableName, "chains_stores_earnings"))) {
      await queryInterface.addColumn(tableName, "chains_stores_earnings", {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: "Earnings for chain stores"
      });
      console.log(`Added column: chains_stores_earnings`);
    }

    // Enrolled (chains - stores already exists)
    if (!(await columnExists(tableName, "chains_stores_enrolled"))) {
      await queryInterface.addColumn(tableName, "chains_stores_enrolled", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Number of chain stores enrolled"
      });
      console.log(`Added column: chains_stores_enrolled`);
    }

    // Total counts (chains - stores already exists)
    if (!(await columnExists(tableName, "total_chain_stores"))) {
      await queryInterface.addColumn(tableName, "total_chain_stores", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Total number of chain stores"
      });
      console.log(`Added column: total_chain_stores`);
    }

    // Compliant (stores then chains)
    if (!(await columnExists(tableName, "stores_compliant"))) {
      await queryInterface.addColumn(tableName, "stores_compliant", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Number of compliant individual stores"
      });
      console.log(`Added column: stores_compliant`);
    }

    if (!(await columnExists(tableName, "chains_stores_compliant"))) {
      await queryInterface.addColumn(tableName, "chains_stores_compliant", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Number of compliant chain stores"
      });
      console.log(`Added column: chains_stores_compliant`);
    }

    console.log(
      `Successfully updated table: ${tableName} with chain store columns`
    );
  },

  async down(queryInterface) {
    const tableName = "distributor_program_aggregations";

    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const columnExists = async (tableName, columnName) => {
      try {
        const tableDescription = await queryInterface.describeTable(tableName);
        return !!tableDescription[columnName];
      } catch {
        return false;
      }
    };

    const isTableExist = await tableExists(tableName);

    if (!isTableExist) {
      console.log(`Table ${tableName} does not exist. Skipping rollback.`);
      return;
    }

    // Remove new compliant columns
    if (await columnExists(tableName, "chains_stores_compliant")) {
      await queryInterface.removeColumn(tableName, "chains_stores_compliant");
      console.log(`Removed column: chains_stores_compliant`);
    }

    if (await columnExists(tableName, "stores_compliant")) {
      await queryInterface.removeColumn(tableName, "stores_compliant");
      console.log(`Removed column: stores_compliant`);
    }

    // Remove new total counts
    if (await columnExists(tableName, "total_chain_stores")) {
      await queryInterface.removeColumn(tableName, "total_chain_stores");
      console.log(`Removed column: total_chain_stores`);
    }

    // Remove new enrolled
    if (await columnExists(tableName, "chains_stores_enrolled")) {
      await queryInterface.removeColumn(tableName, "chains_stores_enrolled");
      console.log(`Removed column: chains_stores_enrolled`);
    }

    // Remove new earnings
    if (await columnExists(tableName, "chains_stores_earnings")) {
      await queryInterface.removeColumn(tableName, "chains_stores_earnings");
      console.log(`Removed column: chains_stores_earnings`);
    }

    if (await columnExists(tableName, "stores_earnings")) {
      await queryInterface.removeColumn(tableName, "stores_earnings");
      console.log(`Removed column: stores_earnings`);
    }

    // Remove new sales volumes
    if (await columnExists(tableName, "chains_stores_sales_volume")) {
      await queryInterface.removeColumn(
        tableName,
        "chains_stores_sales_volume"
      );
      console.log(`Removed column: chains_stores_sales_volume`);
    }

    if (await columnExists(tableName, "stores_sales_volume")) {
      await queryInterface.removeColumn(tableName, "stores_sales_volume");
      console.log(`Removed column: stores_sales_volume`);
    }

    // Restore original columns
    if (!(await columnExists(tableName, "total_sales_volume"))) {
      await queryInterface.addColumn(tableName, "total_sales_volume", {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: "Total sales volume"
      });
      console.log(`Restored column: total_sales_volume`);
    }

    if (!(await columnExists(tableName, "total_store_earnings"))) {
      await queryInterface.addColumn(tableName, "total_store_earnings", {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0.0,
        comment: "Total earnings for stores"
      });
      console.log(`Restored column: total_store_earnings`);
    }

    if (!(await columnExists(tableName, "compliant_stores"))) {
      await queryInterface.addColumn(tableName, "compliant_stores", {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: "Number of compliant stores"
      });
      console.log(`Restored column: compliant_stores`);
    }

    console.log(`Successfully rolled back changes to table: ${tableName}`);
  }
};
