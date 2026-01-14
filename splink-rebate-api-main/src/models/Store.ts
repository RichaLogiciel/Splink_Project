import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class Store extends Model {
  public storeId!: number;
  public name!: string;
  public logo!: string;
  public storeName!: string;
  public warehouseId!: number | null;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

Store.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    externalStoreId: {
      type: DataTypes.INTEGER,
      field: "external_store_id"
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    storeName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "store_name"
    },
    logo: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    warehouseId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "warehouse_id"
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
    tableName: "stores",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);
Object.defineProperty(Store.prototype, "storeId", {
  get() {
    return this.id;
  }
});
export default Store;
