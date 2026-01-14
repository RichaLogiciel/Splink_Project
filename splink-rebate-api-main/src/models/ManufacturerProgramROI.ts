import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ManufacturerProgramROI extends Model {
  public id!: number;
  public manufacturerId!: number;
  public programId!: number;
  public distributorId!: number | null;
  public rebateType!: "STORE" | "SALES_REP";
  public costOfProgram!: number | null;
  public currentYearProgramProductSales!: number | null;
  public previousYearProgramProductSales!: number | null;
  public newDoorsCount!: number;
  public lastYearsDoorsCount!: number;
  public newPodCount!: number;
  public totalPodCount!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

ManufacturerProgramROI.init(
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
    programId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "program_id",
      references: {
        model: "programs",
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
    rebateType: {
      type: DataTypes.ENUM("STORE", "SALES_REP"),
      allowNull: false,
      field: "rebate_type"
    },
    costOfProgram: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "cost_of_program"
    },
    currentYearProgramProductSales: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "current_year_program_product_sales"
    },
    previousYearProgramProductSales: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "previous_year_program_product_sales"
    },
    newDoorsCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: "new_doors_count"
    },
    lastYearsDoorsCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: "last_year_doors_count"
    },
    newPodCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: "new_pod_count"
    },
    totalPodCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      field: "total_pod_count"
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
    tableName: "manufacturer_program_roi",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);

export default ManufacturerProgramROI;
