"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "distributor_program_aggregations";
    const columnName = "warehouse_id";
    const compositeIndexName = "idx_distributor_program_aggregations_composite";
    const warehouseIndexName =
      "idx_distributor_program_aggregations_warehouse_id";

    const tableExists = async (name) => {
      try {
        await queryInterface.describeTable(name);
        return true;
      } catch {
        return false;
      }
    };

    const columnExists = async (name, column) => {
      try {
        const description = await queryInterface.describeTable(name);
        return !!description[column];
      } catch {
        return false;
      }
    };

    const indexExists = async (name, indexName) => {
      try {
        const indexes = await queryInterface.showIndex(name);
        return indexes.some((index) => index.name === indexName);
      } catch {
        return false;
      }
    };

    const hasTable = await tableExists(tableName);

    if (!hasTable) {
      console.log(
        `Table ${tableName} does not exist. Skipping warehouse_id addition.`
      );
      return;
    }

    if (!(await columnExists(tableName, columnName))) {
      await queryInterface.addColumn(tableName, columnName, {
        type: DataTypes.INTEGER,
        allowNull: true,
        comment: "Optional warehouse reference for warehouse-level aggregations"
      });
      console.log(`Added column: ${columnName}`);
    } else {
      console.log(`Column ${columnName} already exists on ${tableName}`);
    }

    if (await indexExists(tableName, compositeIndexName)) {
      await queryInterface.removeIndex(tableName, compositeIndexName);
      console.log(`Removed existing composite index: ${compositeIndexName}`);
    }

    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX ${compositeIndexName}
      ON ${tableName} (
        distributor_id,
        manufacturer_id,
        program_id,
        program_detail_id,
        participant_type,
        COALESCE(warehouse_id, -1)
      );
    `);
    console.log(`Created updated composite index: ${compositeIndexName}`);

    if (!(await indexExists(tableName, warehouseIndexName))) {
      await queryInterface.addIndex(tableName, [columnName], {
        name: warehouseIndexName
      });
      console.log(`Added index: ${warehouseIndexName}`);
    } else {
      console.log(`Index ${warehouseIndexName} already exists on ${tableName}`);
    }
  },

  async down(queryInterface) {
    const tableName = "distributor_program_aggregations";
    const columnName = "warehouse_id";
    const compositeIndexName = "idx_distributor_program_aggregations_composite";
    const warehouseIndexName =
      "idx_distributor_program_aggregations_warehouse_id";

    const tableExists = async (name) => {
      try {
        await queryInterface.describeTable(name);
        return true;
      } catch {
        return false;
      }
    };

    const columnExists = async (name, column) => {
      try {
        const description = await queryInterface.describeTable(name);
        return !!description[column];
      } catch {
        return false;
      }
    };

    const indexExists = async (name, indexName) => {
      try {
        const indexes = await queryInterface.showIndex(name);
        return indexes.some((index) => index.name === indexName);
      } catch {
        return false;
      }
    };

    const hasTable = await tableExists(tableName);

    if (!hasTable) {
      console.log(
        `Table ${tableName} does not exist. Skipping warehouse_id removal.`
      );
      return;
    }

    if (await indexExists(tableName, compositeIndexName)) {
      await queryInterface.removeIndex(tableName, compositeIndexName);
      console.log(`Removed composite index: ${compositeIndexName}`);
    }

    if (await indexExists(tableName, warehouseIndexName)) {
      await queryInterface.removeIndex(tableName, warehouseIndexName);
      console.log(`Removed index: ${warehouseIndexName}`);
    }

    if (await columnExists(tableName, columnName)) {
      await queryInterface.removeColumn(tableName, columnName);
      console.log(`Removed column: ${columnName}`);
    } else {
      console.log(`Column ${columnName} does not exist on ${tableName}`);
    }

    const indexExistsPostRemoval = await indexExists(
      tableName,
      compositeIndexName
    );

    if (!indexExistsPostRemoval) {
      await queryInterface.addIndex(
        tableName,
        [
          "distributor_id",
          "manufacturer_id",
          "program_id",
          "program_detail_id",
          "participant_type"
        ],
        {
          name: compositeIndexName,
          unique: true
        }
      );
      console.log(`Restored original composite index: ${compositeIndexName}`);
    }
  }
};
