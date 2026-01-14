import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class EnrollmentRequest extends Model {
  public id!: number;
  public requestId!: string;
  public sqsMessageId!: string | null;

  // Request payload
  public action!: string;
  public agreementIds!: number[];
  public storeIds!: number[];
  public programIds!: number[] | null;
  public userId!: number;
  public reason!: string | null;

  // Lifecycle tracking
  public status!: string;

  // Stage timestamps
  public apiRequestAt!: Date;
  public sqsSentAt!: Date | null;
  public workerReceivedAt!: Date | null;
  public dbOperationStartedAt!: Date | null;
  public dbOperationCompletedAt!: Date | null;
  public cacheClearStartedAt!: Date | null;
  public cacheClearCompletedAt!: Date | null;
  public completedAt!: Date | null;
  public failedAt!: Date | null;

  // Result metrics
  public programParticipantsAffected!: number | null;
  public storeListingAggregatesAffected!: number | null;
  public materializedViewsRefreshed!: boolean;
  public cachesInvalidated!: boolean;

  // Error tracking
  public errorMessage!: string | null;
  public errorStack!: string | null;
  public errorStage!: string | null;

  // Metadata
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

EnrollmentRequest.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    requestId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      field: "request_id"
    },
    sqsMessageId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "sqs_message_id"
    },
    action: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "action",
      validate: {
        isIn: [["enroll", "unenroll"]]
      }
    },
    agreementIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false,
      field: "agreement_ids"
    },
    storeIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false,
      field: "store_ids"
    },
    programIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true,
      field: "program_ids"
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id"
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
    apiRequestAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "api_request_at"
    },
    sqsSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "sqs_sent_at"
    },
    workerReceivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "worker_received_at"
    },
    dbOperationStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "db_operation_started_at"
    },
    dbOperationCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "db_operation_completed_at"
    },
    cacheClearStartedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "cache_clear_started_at"
    },
    cacheClearCompletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "cache_clear_completed_at"
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "completed_at"
    },
    failedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "failed_at"
    },
    programParticipantsAffected: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "program_participants_affected"
    },
    storeListingAggregatesAffected: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "store_listing_aggregates_affected"
    },
    materializedViewsRefreshed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "materialized_views_refreshed"
    },
    cachesInvalidated: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "caches_invalidated"
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_message"
    },
    errorStack: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_stack"
    },
    errorStage: {
      type: DataTypes.STRING(50),
      allowNull: true,
      field: "error_stage"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at"
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at"
    }
  },
  {
    sequelize,
    tableName: "enrollment_requests",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    underscored: true
  }
);

export default EnrollmentRequest;
