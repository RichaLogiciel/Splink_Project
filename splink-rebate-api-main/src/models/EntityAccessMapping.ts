import { DataTypes, Model } from "sequelize";
import sequelize from "../db";

class EntityAccessMapping extends Model {
  public id!: number;
  public parentEntityId!: number; // Fixed typo: 'parenEntitytId' to 'parentEntityId'
  public parentEntityType!: string; // Changed type from number to string (as it’s an ENUM)
  public associatedEntityId!: number;
  public associatedEntityType!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
}

EntityAccessMapping.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    parentEntityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: "parent_entity_id"
    },
    parentEntityType: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "parent_entity_type"
    },
    associatedEntityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: "associated_entity_id"
    },
    associatedEntityType: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "associated_entity_type"
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
    tableName: "entity_access_mappings",
    paranoid: false,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);

export default EntityAccessMapping;
