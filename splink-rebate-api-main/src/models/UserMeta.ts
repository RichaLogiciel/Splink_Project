import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class UserMeta extends Model {
  public id!: number;
  public entityId!: number;
  public type!: string;
  public key!: string;
  public value!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

UserMeta.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    entityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "entity_id"
    },
    type: {
      type: DataTypes.STRING(50),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    key: {
      type: DataTypes.STRING(100),
      allowNull: false,
      validate: {
        notEmpty: true
      }
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false
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
    tableName: "user_meta",
    paranoid: true,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at",
    indexes: [
      {
        unique: true,
        fields: ["entity_id", "type", "key"],
        name: "idx_user_meta_entity_type_key_unique"
      },
      {
        fields: ["entity_id"],
        name: "idx_user_meta_entity_id"
      },
      {
        fields: ["type", "key"],
        name: "idx_user_meta_type_key"
      }
    ]
  }
);

export default UserMeta;
