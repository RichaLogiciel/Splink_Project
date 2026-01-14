import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class SalesSummary extends Model {}

SalesSummary.init(
  {
    transaction_date: {
      type: DataTypes.DATEONLY
    },
    product_id: {
      type: DataTypes.INTEGER
    },
    manufacturer_id: {
      type: DataTypes.INTEGER
    },
    distributor_id: {
      type: DataTypes.INTEGER
    },
    store_id: {
      type: DataTypes.INTEGER
    },
    sales: {
      type: DataTypes.DECIMAL(10, 2)
    },
    total_units: {
      type: DataTypes.BIGINT
    },
    warehouse_id: {
      type: DataTypes.INTEGER
    }
  },
  {
    sequelize,
    modelName: "SalesSummary",
    tableName: "sales_summary_materialized_view",
    timestamps: false,
    freezeTableName: true,
    createdAt: false,
    updatedAt: false
  }
);

SalesSummary.removeAttribute("id");

export default SalesSummary;
