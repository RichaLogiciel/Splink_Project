import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class AuthorizedManufacturerDistributor extends Model {
  public id!: number;
  public manufacturerId!: string;
  public distributorId!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

AuthorizedManufacturerDistributor.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    manufacturerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "manufacturer_id"
    },
    distributorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "distributor_id"
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
      field: "created_at"
    },
    updatedAt: {
      allowNull: false,
      defaultValue: DataTypes.NOW,
      type: DataTypes.DATE,
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
    tableName: "authorized_distributor_manufacturers",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);

export default AuthorizedManufacturerDistributor;
