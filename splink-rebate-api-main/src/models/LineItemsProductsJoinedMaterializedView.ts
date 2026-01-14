import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class LineItemsProductsJoinedMaterializedView extends Model {}

LineItemsProductsJoinedMaterializedView.init(
  {
    manufacturer_id: {
      type: DataTypes.INTEGER
    },
    internal_product_id: {
      type: DataTypes.INTEGER
    },
    product_id: {
      type: DataTypes.INTEGER
    },
    seller_id: {
      type: DataTypes.INTEGER
    },
    buyer_id: {
      type: DataTypes.INTEGER
    },
    transaction_date: {
      type: DataTypes.DATEONLY
    },
    total_units: {
      type: DataTypes.BIGINT // if large numbers possible
    },
    quantity: {
      type: DataTypes.BIGINT // if large numbers possible
    },
    total_price: {
      type: DataTypes.DECIMAL(10, 2) // monetary value
    },
    buyer_type: {
      type: DataTypes.STRING
    },
    seller_type: {
      type: DataTypes.STRING
    },
    internal_code: {
      type: DataTypes.STRING
    },
    unit_skus_id: {
      type: DataTypes.INTEGER
    },
    case_skus_id: {
      type: DataTypes.INTEGER
    },
    box_skus_id: {
      type: DataTypes.INTEGER
    }
  },
  {
    sequelize,
    modelName: "LineItemsProductsJoinedMaterializedView",
    tableName: "line_items_products_joined_materialized_view",
    timestamps: false,
    freezeTableName: true,
    createdAt: false,
    updatedAt: false
  }
);

LineItemsProductsJoinedMaterializedView.removeAttribute("id");

export default LineItemsProductsJoinedMaterializedView;
