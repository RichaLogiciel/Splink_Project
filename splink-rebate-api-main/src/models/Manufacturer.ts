import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class Manufacturer extends Model {
  public id!: number;
  public name!: string;
  public logo!: string;
  public authorized!: boolean;
  public external_id!: string;
  public organizationName!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

Manufacturer.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    logo: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    organizationName: {
      type: DataTypes.STRING,
      field: "organization_name",
      allowNull: true
    },
    externalId: {
      type: DataTypes.STRING,
      field: "external_id",
      allowNull: true
    },
    authorized: {
      type: DataTypes.STRING,
      field: "authorized",
      allowNull: false
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
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at"
    }
  },
  {
    sequelize,
    tableName: "manufacturers",
    paranoid: false,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);

export default Manufacturer;
