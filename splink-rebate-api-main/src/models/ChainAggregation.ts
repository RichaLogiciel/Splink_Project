import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ChainAggregation extends Model {
  public chainId!: number;
  public chainName!: string;
  public distributorId?: number;
  public totalStores!: number;
  public enrolledStores!: number;
  public compliantStores!: number;
  public totalPurchaseVolume!: number;
  public totalEarnedRebate!: number;
  public compliancePercentage!: number;
  public lastUpdated!: Date;
}

ChainAggregation.init(
  {
    chainId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      field: "chain_id"
    },
    chainName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "chain_name"
    },
    distributorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "distributor_id"
    },
    totalStores: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "total_stores"
    },
    enrolledStores: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "enrolled_stores"
    },
    compliantStores: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "compliant_stores"
    },
    totalPurchaseVolume: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "total_purchase_volume"
    },
    totalEarnedRebate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "total_earned_rebate"
    },
    compliancePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      field: "compliance_percentage"
    },
    lastUpdated: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "last_updated"
    }
  },
  {
    sequelize,
    tableName: "chain_aggregations",
    timestamps: false, // Materialized views don't have timestamps
    freezeTableName: true
  }
);

export default ChainAggregation;
