import { DataTypes, Model, Op } from "sequelize";
import sequelize from "../db";
import Product from "./Product";

class LineItem extends Model {
  public id!: number;
  public transactionId!: number;
  public productId!: number;
  public product_id!: number;
  public splinkProductId!: number | null;
  public quantity!: number;
  public unitPrice!: number;
  public totalPrice!: number;
  public skusId!: string;
  public currency!: string;
  public distInternalProductId!: string;
  public productDesc!: string;
  public transactionDate!: Date;
  public sellerId!: number;
  public sellerType!: string;
  public buyerId!: number;
  public buyer_id!: number;
  public buyerType!: string;
  public salesRepId!: number | null;
  public createdAt!: Date;
  public updatedAt!: Date;
  public product?: Product;

  static getDateRangeFilter(programsTerm?: {
    startDate: string;
    endDate: string;
  }) {
    let where = {};

    if (programsTerm)
      where = {
        transaction_date: {
          [Op.between]: [
            new Date(programsTerm.startDate),
            new Date(programsTerm.endDate)
          ]
        }
      };

    return where;
  }
}

LineItem.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
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
    splinkProductId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: "products",
        key: "id"
      },
      field: "splink_product_id"
    },
    quantity: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "quantity"
    },
    unitPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "unit_price"
    },
    totalPrice: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "total_price"
    },
    skusId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "skus_id"
    },
    currency: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "currency"
    },
    distInternalProductId: {
      type: DataTypes.STRING(60),
      allowNull: true,
      field: "dist_internal_product_id"
    },
    productDesc: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "product_desc"
    },
    transactionDate: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      field: "transaction_date"
    },
    sellerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "seller_id"
    },
    sellerType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "seller_type"
    },
    buyerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "buyer_id"
    },
    buyerType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "buyer_type"
    },
    salesRepId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "sales_rep_id"
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
    tableName: "line_items",
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: true,
    defaultScope: {
      where: {
        transaction_date: {
          [Op.gte]: new Date(new Date().getFullYear(), 0, 1),
          [Op.lte]: new Date(new Date().getFullYear(), 11, 31)
        }
      }
    },
    scopes: {
      allData: {
        where: {} // This will remove the default filter
      }
    }
  }
);

export default LineItem;
