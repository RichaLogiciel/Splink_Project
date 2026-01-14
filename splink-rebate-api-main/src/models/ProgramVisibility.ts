import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ProgramVisibility extends Model {
  public id!: number;
  public program_id!: number;
  public entity_type!: string;
  public entity_id!: number;
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
  public readonly deleted_at?: Date;
}

ProgramVisibility.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    program_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "programs",
        key: "id"
      }
    },
    program_detail_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "programs",
        key: "id"
      }
    },
    entity_type: {
      type: DataTypes.STRING(20),
      allowNull: false,
      validate: {
        isIn: [["DISTRIBUTOR", "STORE", "SALES_REP"]]
      }
    },
    entity_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    tableName: "program_visibility",
    timestamps: true,
    underscored: true,
    paranoid: true,
    deletedAt: "deleted_at"
  }
);

export default ProgramVisibility;
