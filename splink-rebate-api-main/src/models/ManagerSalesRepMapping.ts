import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ManagerSalesRepMapping extends Model {
  public id!: number;
  public salesRepId!: number;
  public salesManagerId!: number;
  public assignmentType!: "PRIMARY" | "SECONDARY" | null;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

ManagerSalesRepMapping.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    salesRepId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "sales_rep_id"
    },
    salesManagerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "sales_manager_id"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
      defaultValue: DataTypes.NOW
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at"
    },
    assignmentType: {
      type: DataTypes.ENUM("PRIMARY", "SECONDARY"),
      allowNull: true,
      defaultValue: null,
      field: "assignment_type"
    }
  },
  {
    sequelize,
    tableName: "manager_sales_rep_mapping",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);

export default ManagerSalesRepMapping;
