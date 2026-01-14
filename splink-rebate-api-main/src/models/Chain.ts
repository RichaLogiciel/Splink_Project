import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class Chain extends Model {
  public id!: number;
  public name!: string;
  public distributorId!: number | null;
  public createdAt!: Date;
  public updatedAt!: Date;
}

Chain.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      field: "name"
    },
    distributorId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "distributor_id"
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
    }
  },
  {
    sequelize,
    tableName: "chains",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["name"]
      },
      {
        fields: ["distributor_id"]
      }
    ]
  }
);

export default Chain;
