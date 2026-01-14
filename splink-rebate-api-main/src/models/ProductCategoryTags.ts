import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ProductCategoryTag extends Model {
  public id!: number;
  public tagKey!: string;
  public tagName!: string;
  public isActive!: boolean;
  public createdAt!: Date;
  public updatedAt!: Date;
}

ProductCategoryTag.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    tagKey: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "tag_key"
    },
    tagName: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      field: "tag_name"
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false,
      field: "is_active"
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
    tableName: "product_category_tags",
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: true
  }
);

export default ProductCategoryTag;
