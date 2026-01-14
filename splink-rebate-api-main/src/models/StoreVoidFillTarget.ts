import { CreationOptional, DataTypes, Model } from "sequelize";
import sequelize from "../db";

export class StoreVoidFillTarget extends Model {
  // Fields
  declare id: number;
  declare storeId: number;
  declare programId: number;
  declare programDetailId: number;
  declare totalRequiredProducts: number;
  declare productsPurchasedLookback: number;
  declare remainingTarget: number;
  declare earningOpportunity: number;
  declare categoryPurchases: any; // JSONB
  declare lookbackStartDate: Date;
  declare lookbackEndDate: Date;
  declare lastCalculated: Date;
  declare isActive: boolean;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

StoreVoidFillTarget.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
      field: "id"
    },
    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "store_id"
    },
    programId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "program_id"
    },
    programDetailId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "program_detail_id"
    },
    totalRequiredProducts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "total_required_products"
    },
    productsPurchasedLookback: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "products_purchased_lookback"
    },
    remainingTarget: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "remaining_target"
    },
    earningOpportunity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "earning_opportunity"
    },
    categoryPurchases: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: "category_purchases"
    },
    lookbackStartDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "lookback_start_date"
    },
    lookbackEndDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "lookback_end_date"
    },
    lastCalculated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "last_calculated"
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active"
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
    }
  },
  {
    sequelize,
    tableName: "store_void_fill_targets",
    timestamps: true,
    underscored: true
  }
);

export default StoreVoidFillTarget;
