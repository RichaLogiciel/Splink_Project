import { ORDER_STATUS } from "../config/appConstants";
import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class Order extends Model {
  public id!: number;
  public creatorId!: number;
  public creatorType!: string;
  public entityId!: number;
  public entityType!: string;
  public approverId!: number | null;
  public approverType!: string | null;
  public status!: string;
  public totalAmount!: number;
  public quantity!: number;
  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
  public readonly deletedAt!: Date | null;
}

Order.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: "id"
    },
    creatorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "creator_id"
    },
    creatorType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "creator_type"
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "entity_id"
    },
    entityType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "entity_type"
    },
    approverId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "approver_id"
    },
    approverType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "approver_type"
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ORDER_STATUS.PLACED,
      field: "status"
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "total_amount"
    },
    quantity: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "quantity"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
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
    tableName: "orders",
    paranoid: true,
    timestamps: true,
    underscored: true
  }
);

export default Order;
