import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class Distributor extends Model {
  public id!: number;
  public name!: string;
  public logo!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
  public associatedUserId!: number;
  public title!: string;
  public organizationName!: string;
  public primaryWarehouseId!: number | null;
}

Distributor.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    title: {
      type: DataTypes.STRING,
      allowNull: true
    },
    organizationName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "organization_name"
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    logo: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    isDisabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // New column to track disabled distributors
      field: "is_disabled"
    },
    primaryWarehouseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "primary_warehouse_id",
      references: {
        model: "warehouses",
        key: "id"
      }
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
    tableName: "distributors",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    defaultScope: {
      where: {
        isDisabled: false // Automatically exclude disabled distributors
      }
    },
    scopes: {
      withDisabled: {
        where: {} // This will remove the default `isDisabled: false` filter
      }
    }
  }
);

export default Distributor;
