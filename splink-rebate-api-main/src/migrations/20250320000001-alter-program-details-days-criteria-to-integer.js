"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "program_details";
    const columnName = "days_criteria";

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
        const tableInfo = await queryInterface.describeTable(tableName);
        return Object.prototype.hasOwnProperty.call(tableInfo, columnName);
      } catch {
        return false;
      }
    };

    const isTableExist = await tableExists(tableName);
    if (!isTableExist) {
      console.log(`Table ${tableName} does not exist, skipping migration`);
      return;
    }

    const isColumnExist = await columnExists(tableName, columnName);
    if (!isColumnExist) {
      console.log(
        `Column ${columnName} does not exist in table ${tableName}, skipping migration`
      );
      return;
    }

    // Check current column type
    const tableInfo = await queryInterface.describeTable(tableName);
    const currentType = tableInfo[columnName].type;

    if (currentType === "INTEGER") {
      console.log(
        `Column ${columnName} is already INTEGER type, skipping migration`
      );
      return;
    }

    // Alter the column type from interval to integer
    // Convert interval values to integer (days) using EXTRACT(EPOCH FROM days_criteria)::INTEGER
    await queryInterface.sequelize.query(`
      ALTER TABLE ${tableName}
      ALTER COLUMN ${columnName} TYPE INTEGER
      USING EXTRACT(EPOCH FROM ${columnName})::INTEGER;
    `);

    console.log(
      `Successfully altered column ${columnName} in table ${tableName} from ${currentType} to INTEGER`
    );
  },

  async down(queryInterface) {
    const tableName = "program_details";
    const columnName = "days_criteria";

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
        const tableInfo = await queryInterface.describeTable(tableName);
        return Object.prototype.hasOwnProperty.call(tableInfo, columnName);
      } catch {
        return false;
      }
    };

    const isTableExist = await tableExists(tableName);
    if (!isTableExist) {
      console.log(`Table ${tableName} does not exist, skipping rollback`);
      return;
    }

    const isColumnExist = await columnExists(tableName, columnName);
    if (!isColumnExist) {
      console.log(
        `Column ${columnName} does not exist in table ${tableName}, skipping rollback`
      );
      return;
    }

    // Check current column type
    const tableInfo = await queryInterface.describeTable(tableName);
    const currentType = tableInfo[columnName].type;

    if (currentType === "INTERVAL") {
      console.log(
        `Column ${columnName} is already INTERVAL type, skipping rollback`
      );
      return;
    }

    // Rollback: Convert integer back to interval
    // Convert integer days back to interval using INTERVAL '1 day' * days_criteria
    await queryInterface.sequelize.query(`
      ALTER TABLE ${tableName}
      ALTER COLUMN ${columnName} TYPE INTERVAL
      USING INTERVAL '1 day' * ${columnName};
    `);

    console.log(
      `Successfully rolled back column ${columnName} in table ${tableName} from ${currentType} to INTERVAL`
    );
  }
};
