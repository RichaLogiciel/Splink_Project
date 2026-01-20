import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class StoreSalesRep extends Model {
  public id!: number;
  public salesRepId!: number;
  public storeId!: number;
  public assignmentType!: "PRIMARY" | "SECONDARY" | null;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
  sale_month: any;
  total_sales: any;
  category_id: any;
  category_name: any;
}

StoreSalesRep.init(
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
      references: {
        model: "distributors",
        key: "id"
      },
      field: "sales_rep_id"
    },
    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "stores",
        key: "id"
      },
      field: "store_id"
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
    tableName: "store_sales_reps",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);

export default StoreSalesRep;
