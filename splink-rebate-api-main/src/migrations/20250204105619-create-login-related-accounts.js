"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("user_linked_accounts", {
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      related_user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "users",
          key: "id"
        },
        onDelete: "CASCADE"
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW")
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn("NOW")
      }
    });

    // Add a composite primary key
    await queryInterface.sequelize.query(`
      ALTER TABLE user_linked_accounts ADD CONSTRAINT login_related_accounts_pkey PRIMARY KEY (user_id, related_user_id);
    `);

    // Add a check constraint to prevent self-linking
    await queryInterface.sequelize.query(`
      ALTER TABLE user_linked_accounts ADD CONSTRAINT check_user_not_self CHECK (user_id != related_user_id);
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("user_linked_accounts");
  }
};
