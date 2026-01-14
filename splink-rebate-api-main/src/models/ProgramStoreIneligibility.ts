import { DataTypes, Model } from "sequelize";
import sequelize from "../db";
import Distributor from "./Distributor";
import Program from "./Program";
import Store from "./Store";

class ProgramStoreIneligibility extends Model {
  public id!: number;
  public programId!: number;
  public storeId!: number;
  public distributorId!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date;
}

ProgramStoreIneligibility.init(
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
        model: Program,
        key: "id"
      },
      field: "program_id"
    },
    storeId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Store, // Reference to the Store model
        key: "id"
      },
      field: "store_id"
    },
    distributorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Distributor,
        key: "id"
      },
      field: "distributor_id"
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
    tableName: "program_store_ineligibility",
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: true
  }
);

export default ProgramStoreIneligibility;
