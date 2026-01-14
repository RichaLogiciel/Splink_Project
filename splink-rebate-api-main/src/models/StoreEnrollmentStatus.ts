import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

export type StoreEnrollmentAction = "enroll" | "unenroll";
export type StoreEnrollmentStatusValue = "processing" | "succeeded" | "failed";

class StoreEnrollmentStatus extends Model {
  public id!: number;
  public storeId!: number;
  public requestId!: string;
  public action!: StoreEnrollmentAction;
  public agreementId!: number;
  public manufacturerId!: number;
  public status!: StoreEnrollmentStatusValue;

  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

StoreEnrollmentStatus.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "store_id"
    },
    requestId: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "request_id"
    },
    action: {
      type: DataTypes.STRING(20),
      allowNull: false,
      field: "action",
      validate: {
        isIn: [["enroll", "unenroll"]]
      }
    },
    agreementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "agreement_id"
    },
    manufacturerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "manufacturer_id"
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      field: "status",
      validate: {
        isIn: [["processing", "succeeded", "failed"]]
      }
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
    tableName: "store_enrollment_statuses",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    underscored: true
  }
);

export default StoreEnrollmentStatus;
