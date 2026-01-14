"use strict";

const { DataTypes } = require("sequelize");

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const tableName = "enrollment_requests";

    // Check if table exists
    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isExist = await tableExists(tableName);

    if (!isExist) {
      // Create table
      await queryInterface.createTable(tableName, {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
          field: "id"
        },
        request_id: {
          type: DataTypes.STRING(255),
          allowNull: false,
          unique: true,
          field: "request_id"
        },
        sqs_message_id: {
          type: DataTypes.STRING(255),
          allowNull: true,
          field: "sqs_message_id"
        },
        action: {
          type: DataTypes.STRING(20),
          allowNull: false,
          field: "action"
        },
        agreement_ids: {
          type: DataTypes.ARRAY(DataTypes.INTEGER),
          allowNull: false,
          field: "agreement_ids"
        },
        store_ids: {
          type: DataTypes.ARRAY(DataTypes.INTEGER),
          allowNull: false,
          field: "store_ids"
        },
        program_ids: {
          type: DataTypes.ARRAY(DataTypes.INTEGER),
          allowNull: true,
          field: "program_ids"
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          field: "user_id",
          references: {
            model: "users",
            key: "id"
          },
          onUpdate: "CASCADE",
          onDelete: "RESTRICT"
        },
        reason: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "reason"
        },
        status: {
          type: DataTypes.STRING(50),
          allowNull: false,
          field: "status"
        },
        api_request_at: {
          type: DataTypes.DATE,
          allowNull: false,
          defaultValue: DataTypes.NOW,
          field: "api_request_at"
        },
        sqs_sent_at: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "sqs_sent_at"
        },
        worker_received_at: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "worker_received_at"
        },
        db_operation_started_at: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "db_operation_started_at"
        },
        db_operation_completed_at: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "db_operation_completed_at"
        },
        cache_clear_started_at: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "cache_clear_started_at"
        },
        cache_clear_completed_at: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "cache_clear_completed_at"
        },
        completed_at: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "completed_at"
        },
        failed_at: {
          type: DataTypes.DATE,
          allowNull: true,
          field: "failed_at"
        },
        program_participants_affected: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: "program_participants_affected"
        },
        store_listing_aggregates_affected: {
          type: DataTypes.INTEGER,
          allowNull: true,
          field: "store_listing_aggregates_affected"
        },
        materialized_views_refreshed: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: "materialized_views_refreshed"
        },
        caches_invalidated: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          field: "caches_invalidated"
        },
        error_message: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "error_message"
        },
        error_stack: {
          type: DataTypes.TEXT,
          allowNull: true,
          field: "error_stack"
        },
        error_stage: {
          type: DataTypes.STRING(50),
          allowNull: true,
          field: "error_stage"
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

      // Add constraint for action enum
      await queryInterface.sequelize.query(`
        ALTER TABLE ${tableName}
        ADD CONSTRAINT chk_enrollment_requests_action
        CHECK (action IN ('enroll', 'unenroll'));
      `);

      // Create indexes
      await queryInterface.addIndex(tableName, ["request_id"], {
        name: "idx_enrollment_requests_request_id"
      });

      // Partial index for sqs_message_id (only where not null)
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_enrollment_requests_sqs_message_id
        ON ${tableName}(sqs_message_id)
        WHERE sqs_message_id IS NOT NULL;
      `);

      await queryInterface.addIndex(tableName, ["status"], {
        name: "idx_enrollment_requests_status"
      });

      await queryInterface.addIndex(tableName, ["user_id"], {
        name: "idx_enrollment_requests_user_id"
      });

      await queryInterface.addIndex(tableName, ["action"], {
        name: "idx_enrollment_requests_action"
      });

      await queryInterface.addIndex(
        tableName,
        [{ attribute: "created_at", order: "DESC" }],
        {
          name: "idx_enrollment_requests_created_at"
        }
      );

      // Composite index for failed requests
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_enrollment_requests_status_created
        ON ${tableName}(status, created_at DESC)
        WHERE status IN ('FAILED', 'SQS_SEND_FAILED', 'DB_OPERATION_FAILED', 'CACHE_CLEAR_FAILED');
      `);

      // GIN indexes for array queries
      await queryInterface.sequelize.query(`
        CREATE INDEX idx_enrollment_requests_store_ids
        ON ${tableName} USING GIN(store_ids);
      `);

      await queryInterface.sequelize.query(`
        CREATE INDEX idx_enrollment_requests_program_ids
        ON ${tableName} USING GIN(program_ids);
      `);

      await queryInterface.sequelize.query(`
        CREATE INDEX idx_enrollment_requests_agreement_ids
        ON ${tableName} USING GIN(agreement_ids);
      `);

      console.log(
        `Table ${tableName} created successfully with comprehensive indexing`
      );
    } else {
      console.log(`Table ${tableName} already exists, skipping creation`);
    }
  },

  async down(queryInterface) {
    const tableName = "enrollment_requests";

    const tableExists = async (tableName) => {
      try {
        await queryInterface.describeTable(tableName);
        return true;
      } catch {
        return false;
      }
    };

    const isExist = await tableExists(tableName);

    if (isExist) {
      // Drop indexes
      const indexes = [
        "idx_enrollment_requests_agreement_ids",
        "idx_enrollment_requests_program_ids",
        "idx_enrollment_requests_store_ids",
        "idx_enrollment_requests_status_created",
        "idx_enrollment_requests_created_at",
        "idx_enrollment_requests_action",
        "idx_enrollment_requests_user_id",
        "idx_enrollment_requests_status",
        "idx_enrollment_requests_sqs_message_id",
        "idx_enrollment_requests_request_id"
      ];

      for (const index of indexes) {
        try {
          await queryInterface.removeIndex(tableName, index);
        } catch (error) {
          console.log(`Index ${index} may not exist, continuing...`);
        }
      }

      // Drop constraint
      try {
        await queryInterface.sequelize.query(`
          ALTER TABLE ${tableName}
          DROP CONSTRAINT IF EXISTS chk_enrollment_requests_action;
        `);
      } catch (error) {
        console.log("Constraint may not exist, continuing...");
      }

      // Drop table
      await queryInterface.dropTable(tableName);
      console.log(`Table ${tableName} dropped successfully`);
    } else {
      console.log(`Table ${tableName} does not exist, nothing to drop`);
    }
  }
};
