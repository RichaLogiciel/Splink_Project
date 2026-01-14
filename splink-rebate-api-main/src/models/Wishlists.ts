import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class Wishlist extends Model {
  public id!: number;
  public storeId!: number;
  public manufacturerId!: number;
  public distributorId!: number;
  public productId!: number;
  public status!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Wishlist.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
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
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "products",
        key: "id"
      },
      field: "product_id"
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
    }
  },
  {
    sequelize,
    tableName: "wishlists",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["store_id", "product_id"]
      }
    ]
  }
);

export default Wishlist;
