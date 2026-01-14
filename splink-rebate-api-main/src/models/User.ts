import { DataTypes, Model } from "sequelize";
import sequelize from "../db";
import UserRole from "./UserRole";

class User extends Model {
  public id!: number;
  public email!: string;
  public passwordHash!: string;
  public firstName!: string;
  public lastName!: string;
  public city!: string;
  public state!: string;
  public phone!: string;
  public refreshToken!: string;
  public secondaryPhone!: string;
  public isActive!: boolean;
  public status!: string;
  public lastLogin!: Date | null;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
  public address!: string;
  public zip!: string;
  declare UserRole?: UserRole;
}

User.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      },
      field: "email"
    },
    passwordHash: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "password_hash"
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true
    },
    state: {
      type: DataTypes.STRING,
      allowNull: true
    },
    zip: {
      type: DataTypes.STRING,
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true
    },
    refreshToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "refresh_token"
    },
    secondaryPhone: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "secondary_phone"
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_active"
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_login"
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
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "address"
    }
  },
  {
    sequelize,
    tableName: "users",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);

User.hasOne(UserRole, { as: "userRole", foreignKey: "userId" });

export default User;
