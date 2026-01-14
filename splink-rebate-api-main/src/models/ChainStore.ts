import { DataTypes, Model } from "sequelize";
import sequelize from "../db";
import Chain from "./Chain";
import Store from "./Store";
import UserRole from "./UserRole";

class ChainStore extends Model {
  public chainId!: number;
  public storeId!: number;
  public createdAt!: Date;
  public updatedAt!: Date;
  public UserRole!: UserRole[];
}

ChainStore.init(
  {
    chainId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Chain, // Reference to the Chain model
        key: "id"
      },
      field: "chain_id"
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
    tableName: "chain_stores",
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      {
        unique: true,
        fields: ["chain_id", "store_id"] // Prevents duplicate records
      }
    ]
  }
);

export default ChainStore;
