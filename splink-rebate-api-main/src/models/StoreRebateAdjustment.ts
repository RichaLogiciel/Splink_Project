import { CreationOptional, DataTypes, Model } from "sequelize";
import sequelize from "../db";

class StoreRebateAdjustment extends Model {
  // Required Fields
  declare id: number;
  declare distributorId: number;
  declare storeId: number;
  declare adjustmentFactor: number;
  declare adjustmentType: string;
  declare description: string | null;
  declare isActive: boolean;
  declare createdBy: number | null;
  declare updatedBy: number | null;

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

StoreRebateAdjustment.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    distributorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "distributors",
        key: "id"
      },
      field: "distributor_id"
    },
    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "stores",
        key: "id"
      },
      field: "store_id"
    },
    adjustmentFactor: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: false,
      validate: {
        min: 0.0001,
        max: 1.0
      },
      field: "adjustment_factor"
    },
    adjustmentType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "SPIFF",
      field: "adjustment_type"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "description"
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active"
    },
    createdBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "created_by"
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "updated_by"
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
    tableName: "store_rebate_adjustments",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

export default StoreRebateAdjustment;
