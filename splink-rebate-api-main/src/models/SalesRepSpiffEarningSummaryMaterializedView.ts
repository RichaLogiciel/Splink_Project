import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class SalesRepSpiffEarningSummary extends Model {}

SalesRepSpiffEarningSummary.init(
  {
    store_id: {
      type: DataTypes.INTEGER
    },
    manufacturer_id: {
      type: DataTypes.INTEGER
    },
    distributor_id: {
      type: DataTypes.INTEGER
    },
    program_detail_id: {
      type: DataTypes.INTEGER
    },
    program_id: {
      type: DataTypes.INTEGER
    },
    rebate_calculation: {
      type: DataTypes.STRING
    },
    unique_products: {
      type: DataTypes.INTEGER // Assuming this is the count of unique products
    },
    total_quantity: {
      type: DataTypes.BIGINT // If this is a large number, use BIGINT
    },
    total_purchase: {
      type: DataTypes.DECIMAL(10, 2) // Assuming this is a monetary value
    },
    earning: {
      type: DataTypes.DECIMAL(10, 2) // Assuming this is the calculated earnings
    }
  },
  {
    sequelize,
    modelName: "SalesRepSpiffEarningSummary",
    tableName: "sales_rep_spiff_earning_summary",
    timestamps: false,
    freezeTableName: true,
    createdAt: false,
    updatedAt: false
  }
);

SalesRepSpiffEarningSummary.removeAttribute("id");

export default SalesRepSpiffEarningSummary;
