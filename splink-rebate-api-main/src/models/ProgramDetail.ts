import { DataTypes, Model } from "sequelize";
import sequelize from "../db";
import Program from "./Program";

export class ProgramDetail extends Model {
  // Fields
  declare growthNeeded: number | null;
  declare baselinePeriodStart: Date | null;
  declare baselinePeriodEnd: Date | null;
  declare id: number;
  declare programId: number;
  declare tier: number;
  declare minQty: number;
  declare maxQty: number | null;
  declare rebateAmount: number;
  declare rebatePercentage: number | null;
  declare rebateType: string;
  declare rebateCalculation: string;
  declare requiredEssentialSkus: number | null;
  declare requiredFlexSkus: number | null;
  declare requiredCoreSkus: number | null;
  declare daysCriteria: number | null;
  declare programLine: string | null;
  declare programType: string | null;
  declare description: string | null;
  declare rebateCalculationType: string;
  declare overview: string;
  declare rebatableProducts: string | null;
  declare dependency: string | null;
  declare minSpend: number;
  declare maxRebate: number;
  declare productsTags: string | null;
  declare productsTagsQty: string | null;
  declare productsTagsQtyMax: string | null;
  declare criteria: string | null;
  declare points: number | null;
  declare quantityType: string | null;
  declare isOther: boolean;
  declare pointsPerSku: string | null;
  declare percentagePerPoint: string | null;
  declare maxPoints: string | null;
  declare targetQualifyingEntities: number | null;
  declare fixedRebateCategory: string | null;
  declare fixedRebateAmount: string | null;

  // Timestamps
  declare createdAt: Date;
  declare updatedAt: Date;
  declare deletedAt: Date | null;
}

ProgramDetail.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
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
    tier: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "tier",
      comment: "e.g., 1, 2, 3"
    },
    minQty: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "min_qty",
      comment: "e.g., 0, 251, 751"
    },
    maxQty: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "max_qty",
      comment: "e.g., 250, 750, NULL for highest tier"
    },
    rebateAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "rebate_amount",
      comment: "e.g., 0.25, 1.00, 1.50"
    },
    rebatePercentage: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "rebate_percentage",
      comment: "e.g., 2.00, 3.00, NULL if fixed amount"
    },
    rebateType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "rebate_type",
      comment: "eg., flat, percentage, per_unit"
    },
    rebateCalculation: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "rebate_calculation"
    },
    requiredEssentialSkus: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "required_essential_skus"
    },
    rebateCalculationType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "rebate_calculation_type"
    },
    requiredFlexSkus: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "required_flex_skus"
    },
    requiredCoreSkus: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "required_core_skus"
    },
    daysCriteria: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "days_criteria"
    },
    programLine: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "program_line"
    },
    programType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "program_type"
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    overview: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    rebatableProducts: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "rebatable_products"
    },
    dependency: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "dependecy"
    },
    minSpend: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "min_spend"
    },
    maxRebate: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      field: "max_rebate"
    },
    productsTags: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "products_tags"
    },
    productsTagsQty: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "products_tags_qty"
    },
    productsTagsQtyMax: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "products_tags_qty_max"
    },
    criteria: {
      type: DataTypes.STRING,
      allowNull: true
    },
    points: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    quantityType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "quantity_type"
    },
    isOther: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_other"
    },
    pointsPerSku: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "points_per_sku"
    },
    percentagePerPoint: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "percentage_per_point"
    },
    maxPoints: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "max_points"
    },
    targetQualifyingEntities: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "target_qualifying_entities"
    },
    fixedRebateCategory: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "fixed_rebate_category"
    },
    fixedRebateAmount: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "fixed_rebate_amount"
    },
    growthNeeded: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      field: "growth_needed",
      comment: "Required growth percentage or amount for the program tier"
    },
    baselinePeriodStart: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "baseline_period_start",
      comment: "Start date of the baseline period for growth calculation"
    },
    baselinePeriodEnd: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "baseline_period_end",
      comment: "End date of the baseline period for growth calculation"
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
    tableName: "program_details",
    paranoid: false,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

// Program model
Program.hasMany(ProgramDetail, { foreignKey: "program_id" });
ProgramDetail.belongsTo(Program, { foreignKey: "program_id" });

export default ProgramDetail;
