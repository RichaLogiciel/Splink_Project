import { DataTypes, Model } from "sequelize";
import sequelize from "../db";
import Distributor from "./Distributor";
import Manufacturer from "./Manufacturer";
import ProgramCompliance from "./ProgramCompliance";
import Store from "./Store";
import User from "./User";

class UserRole extends Model {
  public id!: number;
  public userId!: number;
  public role!: string;
  public parentEntityId!: number; // Fixed typo: 'parenEntitytId' to 'parentEntityId'
  public parentEntityType!: string; // Changed type from number to string (as it’s an ENUM)
  public associatedUserId!: number;
  public associatedEntityType!: string;
  public createdAt!: Date;
  public updatedAt!: Date;
  public deletedAt!: Date | null;
  public User!: User;
  public ProgramCompliance!: ProgramCompliance;
  public salesRepIds!: number[];
}

UserRole.init(
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
      references: {
        model: "users",
        key: "id"
      },
      field: "user_id"
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
      field: "role"
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
    associatedUserId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "program_compliances",
        key: "entity_id"
      },
      field: "associated_user_id"
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
    tableName: "user_roles",
    paranoid: false,
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    deletedAt: "deleted_at"
  }
);

// Define the parent-child relationship
UserRole.hasMany(UserRole, {
  foreignKey: "parentEntityId", // foreign key in the child model
  sourceKey: "associatedUserId", // source key in the parent model
  as: "UserRolesSelfRel" // Alias for the child association
});

// Define the reverse relationship (belongsTo)
UserRole.belongsTo(UserRole, {
  foreignKey: "associatedUserId", // foreign key in the child model
  targetKey: "parentEntityId", // target key in the parent model
  as: "UserRolesSelfRelParent" // Alias for the parent association
});

// Associations
UserRole.belongsTo(Manufacturer, {
  foreignKey: "associatedUserId",
  constraints: false,
  as: "AssociatedManufacturer"
});

UserRole.belongsTo(Store, {
  foreignKey: "associatedUserId",
  constraints: false,
  as: "AssociatedStore"
});

UserRole.belongsTo(Distributor, {
  foreignKey: "associatedUserId",
  constraints: false,
  as: "AssociatedDistributor"
});

UserRole.belongsTo(Distributor, {
  foreignKey: "parentEntityId",
  constraints: false,
  as: "ParentDistributor"
});

UserRole.belongsTo(Store, { as: "store", foreignKey: "associatedUserId" });

export default UserRole;
