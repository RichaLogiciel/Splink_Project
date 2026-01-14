import { DataTypes, Model, Optional } from "sequelize";
import sequelize from "../db";

interface SignupInvitationAttributes {
  id: number;
  email: string;
  token: string;
  status: string;
  role: string;
  invited_user?: number;
  expires_at: Date;
  invited_by: number;
  completed_at?: Date | null;
  replace_email?: string | null;
  created_at: Date;
  deleted_at?: Date | null;
  updated_at?: Date | null;
}

// Optional fields when creating a new instance

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface SignupInvitationCreationAttributes
  extends Optional<
    SignupInvitationAttributes,
    | "id"
    | "status"
    | "completed_at"
    | "created_at"
    | "deleted_at"
    | "updated_at"
  > {}

class SignupInvitation
  extends Model<SignupInvitationAttributes, SignupInvitationCreationAttributes>
  implements SignupInvitationAttributes
{
  public id!: number;
  public email!: string;
  public token!: string;
  public status!: string;
  public role!: string;
  public expires_at!: Date;
  public invited_by!: number;
  public invited_user!: number;
  public completed_at!: Date | null;
  public replace_email!: string | null;
  public created_at!: Date;
  public deleted_at!: Date | null;
  public updated_at!: Date | null;
}

SignupInvitation.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: "uniqueEmailStatus"
    },
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "pending"
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "DISTRIBUTOR_SALES_REP" // Set a default role if needed
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    invited_by: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "users",
        key: "id"
      }
    },
    invited_user: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    completed_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    replace_email: {
      type: DataTypes.STRING,
      allowNull: true
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    deleted_at: {
      type: DataTypes.DATE,
      allowNull: true
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: "SignupInvitation",
    tableName: "signup_invitations",
    underscored: true,
    timestamps: true,
    paranoid: true, // Enables `deletedAt` for soft deletes
    createdAt: "created_at",
    updatedAt: false,
    deletedAt: "deleted_at"
  }
);

export default SignupInvitation;
