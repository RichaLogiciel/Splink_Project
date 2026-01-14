import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class SpiffStoreProgramCompliance extends Model {}

SpiffStoreProgramCompliance.init(
  {
    buyer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "buyer_id"
    },
    seller_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "seller_id"
    },
    manufacturer_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "manufacturer_id"
    },
    program_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "program_id"
    },
    program_detail_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "program_detail_id"
    },
    products_tags: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "products_tags"
    },
    required_count_by_tag: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "required_count_by_tag"
    },
    purchased_distinct_product_ids: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "purchased_distinct_product_ids"
    },
    total_product_tags: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "total_product_tags"
    },
    total_purchased_distinct_product_ids: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "total_purchased_distinct_product_ids"
    },
    compliance_percentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: true,
      field: "compliance_percentage"
    },
    total_units: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "total_units"
    },
    total_spend: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "total_spend"
    },
    earning_opportunity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "earning_opportunity"
    },
    latest_transaction_date: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "latest_transaction_date"
    },
    last_refreshed_at: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_refreshed_at"
    }
  },
  {
    sequelize,
    modelName: "SpiffStoreProgramCompliance",
    tableName: "spiff_store_program_compliance",
    timestamps: false,
    freezeTableName: true,
    createdAt: false,
    updatedAt: false
  }
);

// Remove the default id attribute since this table doesn't have primary keys
SpiffStoreProgramCompliance.removeAttribute("id");

export default SpiffStoreProgramCompliance;
