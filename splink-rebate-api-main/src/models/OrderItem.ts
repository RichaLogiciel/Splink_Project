import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class OrderItem extends Model {
  public id!: number;
  public orderId!: number;
  public productId!: number;
  public manufacturerId!: number;
  public distProductId!: string | null;
  public warehouseId!: number | null;
  public splinkProductId!: number | null;
  public price!: number;
  public quantity!: number;
  public quantityType!: string;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

OrderItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "id"
    },
    orderId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "order_id"
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
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "price"
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
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
    tableName: "order_items",
    paranoid: true,
    timestamps: true,
    underscored: true
  }
);

export default OrderItem;
