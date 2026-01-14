import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class Warehouse extends Model {
  public id!: number;
  public name!: string;
  public distributorId!: number;
  public isDefault!: boolean;
}

Warehouse.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "name"
    },
    distributorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "distributor_id"
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: "is_default"
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
    tableName: "warehouses",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);

export default Warehouse;
