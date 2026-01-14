import { DataTypes, Model } from "sequelize";
import sequelize from "../db";
import Product from "./Product";

class CartItem extends Model {
  declare id: number;
  declare entityId: number;
  declare entityType: string;
  declare creatorId: number;
  declare creatorType: string;
  declare productId: number;
  declare manufacturerId: number;
  declare distProductId: string | null;
  declare warehouseId: number | null;
  declare splinkProductId: number | null;
  declare quantity: number;
  declare quantityType: string;
  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt: Date | null;
  declare Product?: Product;
}

CartItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "id"
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "entity_id"
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "entity_type"
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "creator_id"
    },
    creatorType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "creator_type"
    },
    productId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      field: "product_id"
    },
    manufacturerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "manufacturer_id"
    },
    distProductId: {
      type: DataTypes.STRING(60),
      allowNull: true,
      field: "dist_product_id"
    },
    warehouseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "warehouse_id"
    },
    splinkProductId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: "products",
        key: "id"
      },
      field: "splink_product_id"
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "quantity"
    },
    quantityType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "quantity_type"
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
    modelName: "CartItem",
    tableName: "cart_items",
    timestamps: true,
    paranoid: true,
    underscored: true
  }
);

export default CartItem;
