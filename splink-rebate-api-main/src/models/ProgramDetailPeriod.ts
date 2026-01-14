import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

export class ProgramDetailPeriod extends Model {
  // Fields
  declare id: number;
  declare programDetailId: number;
  declare startDate: Date;
  declare endDate: Date;

  // Timestamps
  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt: Date | null;
}
ProgramDetailPeriod.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
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
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "start_date"
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "end_date"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "updated_at",
      defaultValue: DataTypes.NOW
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at"
    }
  },
  {
    sequelize,
    tableName: "program_detail_periods",
    paranoid: false,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

export default ProgramDetailPeriod;
