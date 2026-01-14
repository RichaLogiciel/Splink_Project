import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ProgramAgreement extends Model {
  public id!: number;
  public agreementId!: number | null;
  public programId!: number;
  public manufacturerId!: number;
  public agreementName!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

ProgramAgreement.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    agreementId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "agreement_id"
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
    manufacturerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "manufacturer_id",
      references: {
        model: "manufacturers",
        key: "id"
      }
    },
    agreementName: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "agreement_name"
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
    tableName: "program_agreements",
    timestamps: true,
    paranoid: true,
    underscored: true
  }
);

export default ProgramAgreement;
