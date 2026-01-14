import { CreationOptional, DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ProductCodeMapping extends Model {
  declare id: CreationOptional<number>;
  declare distributorId: number;
  declare warehouseId: number;
  declare productId: number;
  declare code: string;
  declare productName: CreationOptional<string | null>;
  declare lastTransactionDate: CreationOptional<Date | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}

ProductCodeMapping.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    distributorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "distributor_id"
    },
    warehouseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "warehouse_id"
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "product_id"
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "code"
    },
    productName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "product_name"
    },
    lastTransactionDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_transaction_date"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
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
    tableName: "product_code_mappings",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

export default ProductCodeMapping;
