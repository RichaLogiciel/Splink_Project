import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class TransactionsImportRecord extends Model {
  public id!: number;
  public manufacturerId!: number;
  public distributorId!: number;
  public latestTransactionDate!: Date;
  public createdAt!: Date;
  public deletedAt!: Date | null;
}

TransactionsImportRecord.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    manufacturerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "manufacturers",
        key: "id"
      },
      field: "manufacturer_id"
    },
    distributorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "distributors",
        key: "id"
      },
      field: "distributor_id"
    },
    latestTransactionDate: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "latest_transaction_date"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at"
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at"
    }
  },
  {
    sequelize,
    tableName: "transactions_import_records",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    deletedAt: "deleted_at"
  }
);

export default TransactionsImportRecord;
