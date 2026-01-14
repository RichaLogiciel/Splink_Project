"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tables = ["line_items", "compliance_transactions_history"];
    const columnToRemove = "transaction_id";

    for (const table of tables) {
      const tableDescription = await queryInterface.describeTable(table);
      if (tableDescription[columnToRemove]) {
        await queryInterface.removeColumn(table, columnToRemove);
        await queryInterface.removeIndex(table, [columnToRemove]);
      }
    }
  },

  async down(queryInterface, Sequelize) {
    const tables = ["line_items", "compliance_transactions_history"];
    const columnToAdd = "transaction_id";

    for (const table of tables) {
      const tableDescription = await queryInterface.describeTable(table);
      if (!tableDescription[columnToAdd]) {
        await queryInterface.addColumn(table, columnToAdd, {
          type: Sequelize.INTEGER,
          allowNull: true
        });
        if (table === "compliance_transactions_history") {
          await queryInterface.addIndex(table, [columnToAdd], {
            name: "idx_compliance_transactions_transaction_id"
          });
        } else {
          await queryInterface.addIndex(table, [columnToAdd]);
        }
      }
    }
  }
};
