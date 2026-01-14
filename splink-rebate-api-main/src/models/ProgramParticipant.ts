import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ProgramParticipant extends Model {
  public id!: number;
  public programId!: number;
  public entityId!: number;
  public entityType!: string;
  public createdAt!: Date;
  public deletedAt!: Date | null;

  // program
  public manufacturerId!: number;
}

ProgramParticipant.init(
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
    tableName: "program_participants",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);

export default ProgramParticipant;
