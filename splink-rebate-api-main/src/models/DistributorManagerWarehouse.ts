import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class DistributorManagerWarehouse extends Model {
  public id!: number;
  public warehouseId!: number;
  public distributorId!: number;
}

DistributorManagerWarehouse.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    warehouseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "warehouse_id"
    },
    distributorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "distributor_id"
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "role"
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
    tableName: "distributor_manager_warehouses",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);

export default DistributorManagerWarehouse;
