import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ExcludedDistributorManufacturerData extends Model {
  public id!: number;
  public distributorId!: number;
  public manufacturerId!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

ExcludedDistributorManufacturerData.init(
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
      field: "distributor_id"
    },
    manufacturerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "manufacturer_id"
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "created_at"
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: "updated_at"
    },
    deletedAt: {
      allowNull: true,
      type: DataTypes.DATE,
      field: "deleted_at"
    }
  },
  {
    sequelize,
    tableName: "excluded_distributor_manufacturer_data",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);

export default ExcludedDistributorManufacturerData;
