import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class WarehouseReportEmailRecipient extends Model {
  public id!: number;
  public distributorId!: number;
  public warehouseId!: number;
  public email!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

WarehouseReportEmailRecipient.init(
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
      field: "distributor_id",
      references: {
        model: "distributors",
        key: "id"
      }
    },
    warehouseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "warehouse_id",
      references: {
        model: "warehouses",
        key: "id"
      }
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: "email"
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
    tableName: "warehouse_report_email_recipients",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);

export default WarehouseReportEmailRecipient;
