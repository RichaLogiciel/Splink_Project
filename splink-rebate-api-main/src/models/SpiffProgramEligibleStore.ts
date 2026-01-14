import { CreationOptional, DataTypes, Model } from "sequelize";
import sequelize from "../db";

class SpiffProgramEligibleStore extends Model {
  declare id: CreationOptional<number>;
  declare programId: number;
  declare storeId: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}

SpiffProgramEligibleStore.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    programId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "program_id"
    },
    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "store_id"
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
    tableName: "spiff_program_eligible_store",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

export default SpiffProgramEligibleStore;
