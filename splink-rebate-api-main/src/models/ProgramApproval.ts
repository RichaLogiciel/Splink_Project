import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ProgramApproval extends Model {
  public id!: number;
  public program_id!: number;
  public program_detail_id!: number;
  public approver_type!: string;
  public approver_id!: number;
  public status!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at?: Date;
}

ProgramApproval.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
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
    approver_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [["DISTRIBUTOR", "STORE"]]
      }
    },
    approver_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [["PENDING", "APPROVED", "REJECTED"]]
      }
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
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
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: "program_approvals",
    timestamps: true,
    underscored: true,
    paranoid: true,
    deletedAt: "deleted_at"
  }
);

export default ProgramApproval;
