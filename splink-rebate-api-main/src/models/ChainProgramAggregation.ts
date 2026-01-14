import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ChainProgramAggregation extends Model {
  public programId!: number;
  public programName!: string;
  public programType!: string;
  public programHeader!: string;
  public participantType!: string;
  public paymentTerm!: string;
  public manufacturerId!: number;
  public manufacturerName!: string;
  public manufacturerLogo!: string;
  public manufacturerAuthorized!: boolean;
  public chainId!: number;
  public chainName!: string;
  public totalStores!: number;
  public enrolledStores!: number;
  public compliantStores!: number;
  public totalPurchaseVolume!: number;
  public totalEarnedRebate!: number;
  public compliancePercentage!: number;
  public isChainEnrolled!: boolean;
  public lastUpdated!: Date;
}

ChainProgramAggregation.init(
  {
    programId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      field: "program_id"
    },
    programName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "program_name"
    },
    programType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "program_type"
    },
    programHeader: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "program_header"
    },
    participantType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "participant_type"
    },
    paymentTerm: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "payment_term"
    },
    manufacturerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "manufacturer_id"
    },
    manufacturerName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "manufacturer_name"
    },
    manufacturerLogo: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "manufacturer_logo"
    },
    manufacturerAuthorized: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "manufacturer_authorized"
    },
    chainId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      field: "chain_id"
    },
    chainName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "chain_name"
    },
    totalStores: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "total_stores"
    },
    enrolledStores: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "enrolled_stores"
    },
    compliantStores: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "compliant_stores"
    },
    totalPurchaseVolume: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "total_purchase_volume"
    },
    totalEarnedRebate: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: "total_earned_rebate"
    },
    compliancePercentage: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      defaultValue: 0,
      field: "compliance_percentage"
    },
    isChainEnrolled: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_chain_enrolled"
    },
    lastUpdated: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "last_updated"
    }
  },
  {
    sequelize,
    modelName: "ChainProgramAggregation",
    tableName: "chain_program_aggregations",
    timestamps: false,
    freezeTableName: true
  }
);

export default ChainProgramAggregation;
