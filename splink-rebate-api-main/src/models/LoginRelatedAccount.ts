import { DataTypes, Model } from "sequelize";
import sequelize from "../db";
import User from "./User";

class LoginRelatedAccount extends Model {
  public userId!: number;
  public relatedUserId!: number;
  public createdAt!: Date;
  public updatedAt!: Date;

  // Declare associations
  declare user?: User;
  declare relatedUser?: User;
}

LoginRelatedAccount.init(
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: "user_id",
      references: {
        model: "users",
        key: "id"
      },
      onDelete: "CASCADE"
    },
    relatedUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      field: "related_user_id",
      references: {
        model: "users",
        key: "id"
      },
      onDelete: "CASCADE"
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
    }
  },
  {
    sequelize,
    tableName: "user_linked_accounts",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at"
  }
);

// Define associations
LoginRelatedAccount.belongsTo(User, { as: "user", foreignKey: "userId" });
LoginRelatedAccount.belongsTo(User, {
  as: "relatedUser",
  foreignKey: "relatedUserId"
});

export default LoginRelatedAccount;
