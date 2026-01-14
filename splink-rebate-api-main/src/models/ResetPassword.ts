import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class ResetPassword extends Model {
  public id!: number;
  public userId!: number;
  public email!: string;
  public token!: string;
  public expireAt!: Date;
  public createdAt!: Date;
  public updatedAt!: Date;
}

ResetPassword.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "user_id"
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "email"
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "token"
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "status",
      defaultValue: "pending"
    },
    expireAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expire_at"
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "created_at",
      defaultValue: DataTypes.NOW
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "deleted_at"
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "updated_at"
    }
  },
  {
    sequelize,
    tableName: "reset_password",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

export default ResetPassword;
