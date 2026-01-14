import { DataTypes, Model } from "sequelize";
import sequelize from "../db";
import Product from "./Product";
import Program from "./Program";

class ProgramRebate extends Model {
  public id!: number;
  public program_id!: number;
  public product_id!: number;
  public rebate_amount!: number;
  public rebate_type!: string;
  public rebate_period!: string;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ProgramRebate.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    program_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "programs",
        key: "id"
      }
    },
    product_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "products",
        key: "id"
      }
    },
    rebate_amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    rebate_type: {
      type: DataTypes.STRING,
      allowNull: false
    },
    rebate_period: {
      type: DataTypes.STRING,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  },
  {
    sequelize,
    tableName: "program_rebates",
    timestamps: true,
    underscored: true
  }
);

// Define associations
ProgramRebate.belongsTo(Program, {
  foreignKey: "program_id",
  as: "program"
});

ProgramRebate.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product"
});

export default ProgramRebate;
