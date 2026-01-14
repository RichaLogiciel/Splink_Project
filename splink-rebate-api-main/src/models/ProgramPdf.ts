import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ProgramPdf extends Model {
  public id!: number;
  public manufacturerId!: number;
  public distributorId!: number | null;
  public timeline!: "Current" | "Upcoming";
  public filename!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

ProgramPdf.init(
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
      field: "manufacturer_id",
      references: {
        model: "manufacturers",
        key: "id"
      }
    },
    distributorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "distributor_id",
      references: {
        model: "distributors",
        key: "id"
      }
    },
    timeline: {
      type: DataTypes.ENUM("Current", "Upcoming"),
      allowNull: false,
      field: "timeline"
    },
    filename: {
      type: DataTypes.STRING(500),
      allowNull: false,
      field: "filename"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
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
    tableName: "program_pdf",
    timestamps: true,
    paranoid: true, // Enable soft deletes
    underscored: true
  }
);

export default ProgramPdf;
