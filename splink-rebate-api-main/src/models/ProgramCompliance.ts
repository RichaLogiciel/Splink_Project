import { DataTypes, Model, Op } from "sequelize";
import sequelize from "../db";
import { SalesRepData } from "../types/SalesRepTypes";
import ProgramDetail from "./ProgramDetail";

class ProgramCompliance extends Model {
  public id!: number;
  public programId!: number;
  public programDetailId!: number;
  public entityId!: number;
  public entityType!: string;
  public status!: string;
  public isQualified!: boolean;
  public totalPurchaseVolume!: number;
  public totalCasePurchases!: number;
  public earnedRebate!: number;
  public unadjustedEarnedRebate!: number;
  public complianceDate!: Date;
  public createdAt!: Date;
  public updatedAt!: Date;
  // Associated ProgramDetail
  public programDetail?: ProgramDetail;
  public deletedAt!: Date | null;
  public userId!: number;
  public name!: string;
  public salesRepData!: SalesRepData[];
  public storesCount!: number;
}

ProgramCompliance.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    programId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "programs",
        key: "id"
      },
      field: "program_id"
    },
    programDetailId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "program_detail_id"
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "entity_id"
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "entity_type"
    },
    isQualified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      field: "is_qualified"
    },
    totalPurchaseVolume: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "total_purchase_volume"
    },
    totalCasePurchases: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "total_case_purchases"
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "status"
    },
    earnedRebate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "earned_rebate"
    },
    unadjustedEarnedRebate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "unadjusted_earned_rebate"
    },
    complianceDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "compliance_date"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at"
    }
  },
  {
    sequelize,
    tableName: "program_compliances",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

export default ProgramCompliance;
