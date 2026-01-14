import { CreationOptional, DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ProgramProduct extends Model {
  declare id: CreationOptional<number>;
  declare programId: number;
  declare programDetailId: number;
  declare productId: number;
  declare qty: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}

ProgramProduct.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    programId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "program_id"
    },
    programDetailId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "program_detail_id"
    },
    productId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "product_id"
    },
    qty: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null
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
    tableName: "program_products",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

export default ProgramProduct;
