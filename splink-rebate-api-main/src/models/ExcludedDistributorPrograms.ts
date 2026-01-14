import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ExcludedDistributorPrograms extends Model {
  public id!: number;
  public manufacturerId!: number;
  public distributorId!: number;
  public programId!: number;
  public programDetailId!: number;
  public createdAt!: Date;
  public deletedAt!: Date | null;
}

ExcludedDistributorPrograms.init(
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
    programId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "programs",
        key: "id"
      },
      field: "program_id"
    },
    programDetailId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "program_details",
        key: "id"
      },
      field: "program_detail_id"
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
    tableName: "excluded_distributor_programs",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    deletedAt: "deleted_at"
  }
);

export default ExcludedDistributorPrograms;
