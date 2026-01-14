"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "store_enrollment_statuses";

    // Check if table exists
    const tableExists = async (name) => {
      try {
        await queryInterface.describeTable(name);
        return true;
      } catch {
        return false;
      }
    };

    const isExist = await tableExists(tableName);

    if (!isExist) {
      await queryInterface.createTable(tableName, {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
          field: "id"
        },
        store_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "store_id",
          references: {
            model: "stores",
            key: "id"
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },
        request_id: {
          type: DataTypes.STRING(255),
          allowNull: false,
          field: "request_id"
        },
        action: {
          type: DataTypes.STRING(20),
          allowNull: false,
          field: "action"
        },
        agreement_id: {
          // NOTE: The codebase does not define an Agreement model/FK, so we keep this as an integer.
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "agreement_id"
        },
        manufacturer_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "manufacturer_id",
          references: {
            model: "manufacturers",
            key: "id"
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },
        status: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: "status"
        },
        created_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "created_at"
        },
        updated_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "updated_at"
        },
        deleted_at: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "deleted_at"
        }
      });

      // Add constraints
      await queryInterface.sequelize.query(`
        ALTER TABLE ${tableName}
        ADD CONSTRAINT chk_store_enrollment_statuses_action
        CHECK (action IN ('enroll', 'unenroll'));
      `);

      await queryInterface.sequelize.query(`
        ALTER TABLE ${tableName}
        ADD CONSTRAINT chk_store_enrollment_statuses_status
        CHECK (status IN ('processing', 'succeeded', 'failed'));
      `);

      // Indexes for query patterns
      await queryInterface.addIndex(tableName, ["request_id"], {
        name: "idx_store_enrollment_statuses_request_id"
      });

      await queryInterface.addIndex(tableName, ["store_id", "agreement_id"], {
        name: "idx_store_enrollment_statuses_store_agreement"
      });

      // DESC index for retrieving most recent updates by store+agreement
      await queryInterface.addIndex(
        tableName,
        [
          "store_id",
          "agreement_id",
          { attribute: "updated_at", order: "DESC" }
        ],
        {
          name: "idx_store_enrollment_statuses_store_agreement_updated_at"
        }
      );

      // Operational index for stuck processing detection
      await queryInterface.addIndex(
        tableName,
        [{ attribute: "status" }, { attribute: "updated_at", order: "DESC" }],
        { name: "idx_store_enrollment_statuses_status_updated_at" }
      );

      // Partial unique index for idempotent upserts (ignores soft-deleted rows)
      await queryInterface.sequelize.query(`
        CREATE UNIQUE INDEX idx_store_enrollment_statuses_request_store_agreement_action_unique
        ON ${tableName}(request_id, store_id, agreement_id, action)
        WHERE deleted_at IS NULL;
      `);

      console.log(`Table ${tableName} created successfully`);
    } else {
      console.log(`Table ${tableName} already exists, skipping creation`);
    }
  },

  async down(queryInterface) {
    const tableName = "store_enrollment_statuses";

    const tableExists = async (name) => {
      try {
        await queryInterface.describeTable(name);
        return true;
      } catch {
        return false;
      }
    };

    const isExist = await tableExists(tableName);

    if (isExist) {
      // Drop indexes
      const indexes = [
        "idx_store_enrollment_statuses_request_store_agreement_action_unique",
        "idx_store_enrollment_statuses_status_updated_at",
        "idx_store_enrollment_statuses_store_agreement_updated_at",
        "idx_store_enrollment_statuses_store_agreement",
        "idx_store_enrollment_statuses_request_id"
      ];

      for (const index of indexes) {
        try {
          await queryInterface.removeIndex(tableName, index);
        } catch (error) {
          console.log(`Index ${index} may not exist, continuing...`);
        }
      }

      // Drop constraints
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE ${tableName}
          DROP CONSTRAINT IF EXISTS chk_store_enrollment_statuses_action;
        `);
      } catch {
        console.log("Action constraint may not exist, continuing...");
      }

      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE ${tableName}
          DROP CONSTRAINT IF EXISTS chk_store_enrollment_statuses_status;
        `);
      } catch {
        console.log("Status constraint may not exist, continuing...");
      }

      await queryInterface.dropTable(tableName);
      console.log(`Table ${tableName} dropped successfully`);
    } else {
      console.log(`Table ${tableName} does not exist, nothing to drop`);
    }
  }
};
