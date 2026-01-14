import { DataTypes, Model } from "sequelize";
import sequelize from "../db";
import Wishlist from "./Wishlists";

// Define category_tags_json interface
interface CategoryTagsJson {
  isEssential: boolean;
  isFlex: boolean;
  isCoreRetail: boolean;
  isCoreWholesale: boolean;
  isInnovation: boolean;
  isCoreProduct: boolean;
  isCoreDisplay: boolean;
  isCarousel: boolean;
  isBakeshop: boolean;
  isTicTacDisplay: boolean;
  isKinderDisplay: boolean;
  isBfDisplay: boolean;
  is10oz: boolean;
  is4oz: boolean;
  is15oz: boolean;
  is80ct: boolean;
  isColdCrafted: boolean;
  isSaltySnacks: boolean;
  isTakeHome: boolean;
  isPrepackDisplay: boolean;
  isShipper: boolean;
  isEngbTier1: boolean;
  isEngbTier2Plus: boolean;
  isStpPwrstr: boolean;
  isStpBrkfl: boolean;
  isFoAdd: boolean;
  isTireFix: boolean;
  isArmorAll: boolean;
  isAirFresh: boolean;
  isSkinCare: boolean;
  isFeminineCare: boolean;
  isShavePrep: boolean;
  isSunCare: boolean;
}

class Product extends Model {
  public id!: number;
  public manufacturerId!: number;
  public categoryId!: number;
  public skusId!: string;
  public unitSkusId!: string;
  public boxSkusId!: string;
  public caseSkusId!: string;
  public name!: string;
  public brand!: string;
  public price!: number;
  public parentProductId!: number | null;
  public ranking!: string;
  public CategoryTagsJson!: CategoryTagsJson;
  public primaryVariant!: number;
  public category_flags?: {
    [key: string]: boolean;
  };

  public createdAt!: Date;
  public updatedAt!: Date;
}

Product.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      field: "id"
    },
    manufacturerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "manufacturers",
        key: "id"
      },
      field: "manufacturer_id"
    },
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "product_categories",
        key: "id"
      },
      field: "category_id"
    },
    skusId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      field: "skus_id"
    },
    unitSkusId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      field: "unit_skus_id"
    },
    boxSkusId: {
      type: DataTypes.STRING,
      allowNull: true,
      unique: false,
      field: "box_skus_id"
    },
    caseSkusId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
      field: "case_skus_id"
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: false
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      field: "price"
    },
    parentProductId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: "products",
        key: "id"
      },
      field: "parent_product_id"
    },
    ranking: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "ranking"
    },
    primaryVariant: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "primary_variant"
    },
    sandstromInternalCode: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "sandstrom_internal_code"
    },
    pitcoInternalCode: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "pitco_internal_code"
    },
    demoInternalCode: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "demo_internal_code"
    },
    merrillInternalCode: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "merrill_internal_code"
    },
    CategoryTagsJson: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: null,
      field: "category_tags_json"
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
    tableName: "products",
    createdAt: "created_at",
    updatedAt: "updated_at",
    paranoid: true
  }
);

Product.belongsTo(Product, {
  as: "parentProduct",
  foreignKey: "parentProductId"
});
Product.hasMany(Product, {
  as: "childProducts",
  foreignKey: "parentProductId"
});

Product.hasMany(Wishlist, { foreignKey: "productId" });
Wishlist.belongsTo(Product, { foreignKey: "productId" });

export default Product;
