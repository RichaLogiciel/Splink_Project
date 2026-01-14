import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class SalesRepStoreEarnings extends Model {}

SalesRepStoreEarnings.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false
    },
    store_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    manufacturer_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    distributor_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    sales_rep_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    program_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    program_detail_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    unique_products: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    },
    total_purchase: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0
    },
    earning: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.0
    },
    compliance_date: {
      type: DataTypes.DATEONLY,
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
    modelName: "SalesRepStoreEarnings",
    tableName: "sales_rep_store_earnings",
    timestamps: true,
    freezeTableName: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

export default SalesRepStoreEarnings;
