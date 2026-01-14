import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class DistributorProgramAggregation extends Model {
  public id!: number;
  public distributorId!: number;
  public manufacturerId!: number;
  public warehouseId!: number | null;
  public programId!: number;
  public programDetailId!: number;
  public participantType!: string;
  public storesSalesVolume!: number;
  public chainsStoresSalesVolume!: number;
  public storesEarnings!: number;
  public chainsStoresEarnings!: number;
  public storesEnrolled!: number;
  public chainsStoresEnrolled!: number;
  public totalStores!: number;
  public totalChainStores!: number;
  public storesCompliant!: number;
  public chainsStoresCompliant!: number;
  public totalPrograms!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

DistributorProgramAggregation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
      field: "id"
    },
    distributorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "distributor_id"
    },
    manufacturerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "manufacturer_id"
    },
    warehouseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "warehouse_id"
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
    participantType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "participant_type"
    },
    storesSalesVolume: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: "stores_sales_volume"
    },
    chainsStoresSalesVolume: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: "chains_stores_sales_volume"
    },
    storesEarnings: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: "stores_earnings"
    },
    chainsStoresEarnings: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0.0,
      field: "chains_stores_earnings"
    },
    storesEnrolled: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "stores_enrolled"
    },
    chainsStoresEnrolled: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "chains_stores_enrolled"
    },
    totalStores: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "total_stores"
    },
    totalChainStores: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "total_chain_stores"
    },
    storesCompliant: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "stores_compliant"
    },
    chainsStoresCompliant: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "chains_stores_compliant"
    },
    totalPrograms: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "total_programs"
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
    tableName: "distributor_program_aggregations",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);

export default DistributorProgramAggregation;
