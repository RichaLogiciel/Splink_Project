import AuthorizedManufacturerDistributor from "./AuthorizedManufacturerDistributor";
import CartItem from "./CartItem";
import Chain from "./Chain";
import ChainStore from "./ChainStore";
import Distributor from "./Distributor";
import EnrollmentRequest from "./EnrollmentRequest";
import LineItem from "./LineItem";
import ManagerSalesRepMapping from "./ManagerSalesRepMapping";
import Manufacturer from "./Manufacturer";
import Order from "./Order";
import OrderItem from "./OrderItem";
import Product from "./Product";
import ProductCategory from "./ProductCategory";
import ProductCodeMapping from "./ProductCodeMapping";
import Program from "./Program";
import ProgramAgreement from "./ProgramAgreement";
import ProgramApproval from "./ProgramApproval";
import ProgramCompliance from "./ProgramCompliance";
import ProgramDetail from "./ProgramDetail";
import ProgramDetailPeriod from "./ProgramDetailPeriod";
import ProgramParticipant from "./ProgramParticipant";
import ProgramStoreIneligibility from "./ProgramStoreIneligibility";
import ProgramVisibility from "./ProgramVisibility";
import SpiffProgramEligibleStore from "./SpiffProgramEligibleStore";
import Store from "./Store";
import StoreSalesRep from "./StoreSalesRep";
import User from "./User";
import UserRole from "./UserRole";
import Warehouse from "./Warehouse";
import WarehouseReportEmailRecipient from "./WarehouseReportEmailRecipient";
import Wishlist from "./Wishlists";

UserRole.hasMany(Distributor, {
  foreignKey: "id",
  sourceKey: "associatedUserId",
  as: "distributor"
});

ProgramCompliance.hasMany(StoreSalesRep, {
  foreignKey: "sales_rep_id",
  sourceKey: "entityId"
});
StoreSalesRep.belongsTo(ProgramCompliance, {
  foreignKey: "sales_rep_id",
  targetKey: "entityId"
});

// Define the parent-child relationship StoreSalesRep ProgramCompliance
StoreSalesRep.hasMany(ProgramCompliance, {
  foreignKey: "entity_id", // foreign key in the child model
  sourceKey: "storeId", // source key in the parent model
  as: "SalesRepStoreProgramCompliance" // Alias for the child association
});

ProgramCompliance.belongsTo(UserRole, {
  foreignKey: "entity_id",
  targetKey: "associatedUserId",
  as: "userRole"
});

// Associate with distributor
StoreSalesRep.belongsTo(Distributor, {
  foreignKey: "sales_rep_id",
  as: "salesRep"
});

StoreSalesRep.hasMany(ProgramParticipant, {
  as: "storeProgramParticipant",
  foreignKey: "entity_id",
  sourceKey: "storeId"
});

ProgramParticipant.belongsTo(StoreSalesRep, {
  as: "storeSalesRep",
  foreignKey: "entity_id"
});

// User.hasMany(UserRole, { foreignKey: "user_id" });
User.hasOne(UserRole, { foreignKey: "user_id" });

UserRole.belongsTo(User, { foreignKey: "user_id", as: "user" });
UserRole.belongsTo(ProgramCompliance, {
  foreignKey: "associated_user_id",
  targetKey: "entityId"
});

// Associate storeId with Store
StoreSalesRep.belongsTo(Store, { foreignKey: "store_id" });
Store.hasMany(StoreSalesRep, { foreignKey: "store_id", as: "storeSalesReps" });

StoreSalesRep.hasMany(Wishlist, { foreignKey: "store_id", as: "wishlists" });

// Wishlist belongs to Store (a wishlist is linked to a specific store)
Wishlist.belongsTo(Store, { foreignKey: "store_id", as: "store" });

// Wishlist belongs to Product (a wishlist can contain a product)
Wishlist.belongsTo(Product, { foreignKey: "product_id", as: "product" });
Product.hasMany(Wishlist, { foreignKey: "product_id", as: "wishlists" });

// Associate UserRole with StoreSalesRep
StoreSalesRep.hasOne(UserRole, {
  foreignKey: "associated_user_id",
  sourceKey: "sales_rep_id",
  as: "store_sales_reps"
});
UserRole.belongsTo(StoreSalesRep, {
  foreignKey: "associated_user_id",
  targetKey: "sales_rep_id",
  as: "store_sales_reps"
});

// Associate UserRole with StoreSalesRep
StoreSalesRep.hasOne(ChainStore, {
  foreignKey: "store_id",
  sourceKey: "store_id",
  as: "SalesRepChainStore"
});

Store.hasOne(UserRole, {
  foreignKey: "associated_user_id",
  sourceKey: "id",
  as: "StoreUserRole"
});

UserRole.belongsTo(Store, {
  foreignKey: "associated_user_id",
  targetKey: "id",
  as: "StoreUserRole"
});

StoreSalesRep.hasMany(LineItem, {
  foreignKey: "buyer_id", // seller_id in LineItem model corresponds to sales_rep_id in StoreSalesRep
  sourceKey: "store_id", // sales_rep_id in StoreSalesRep corresponds to seller_id in LineItem
  as: "SalesRepLineItem"
});

// Programs and Manufacturer
Program.belongsTo(Manufacturer, { foreignKey: "manufacturer_id" });

// ProgramAgreement and Program
Program.hasMany(ProgramAgreement, {
  foreignKey: "program_id",
  as: "programAgreements"
});

ProgramAgreement.belongsTo(Program, {
  foreignKey: "program_id",
  as: "program"
});

// ProgramCompliance and Program
ProgramCompliance.belongsTo(Program, { foreignKey: "program_id" });
Program.hasMany(ProgramCompliance, { foreignKey: "program_id" });

// Programs and Manufacturer
Program.belongsTo(Manufacturer, {
  foreignKey: "creator_id",
  as: "ProgramCreator"
});

Program.hasMany(ProgramApproval, {
  foreignKey: "program_id",
  as: "ProgramApproval"
});

// Define associations
ProgramApproval.belongsTo(Program, {
  foreignKey: "program_id",
  as: "program"
});

ProgramApproval.belongsTo(ProgramDetail, {
  foreignKey: "program_detail_id",
  as: "programDetail"
});

// ProgramCompliance and Program Detail
ProgramCompliance.belongsTo(ProgramDetail, {
  foreignKey: "program_id",
  targetKey: "program_id"
});
ProgramDetail.hasMany(ProgramCompliance, {
  foreignKey: "program_id",
  sourceKey: "program_id"
});

// LineItem and Product
LineItem.belongsTo(Product, {
  foreignKey: "product_id",
  as: "product",
  constraints: false // Disable automatic constraints
});

// ProductCategory has many Products
ProductCategory.hasMany(Product, { foreignKey: "category_id", as: "products" });

// Product belongs to ProductCategory with an alias of 'category'
Product.belongsTo(ProductCategory, {
  foreignKey: "category_id",
  as: "category"
});

// Product has many LineItems
Product.hasMany(LineItem, { foreignKey: "product_id", as: "line_items" });

// Store has many LineItems (when buyer_type is 'STORE')
Store.hasMany(LineItem, {
  foreignKey: "buyer_id",
  as: "LineItems",
  constraints: false
});
LineItem.belongsTo(Store, {
  foreignKey: "buyer_id",
  as: "Store",
  constraints: false
});

// Product and Manufacturer
Product.belongsTo(Manufacturer, {
  foreignKey: "manufacturer_id",
  as: "manufacturer"
});
Manufacturer.hasMany(Product, {
  foreignKey: "manufacturer_id",
  as: "products"
});

// ProgramParticipant and Program
Program.hasMany(ProgramParticipant, {
  foreignKey: "program_id",
  as: "ProgramParticipants"
});
ProgramParticipant.belongsTo(Program, { foreignKey: "program_id" });

// Define association between ProgramCompliance and ProgramParticipant
ProgramCompliance.hasMany(ProgramParticipant, {
  foreignKey: "entity_id",
  sourceKey: "entity_id",
  as: "ProgramComplianceParticipant" // Alias for the association
});
ProgramParticipant.belongsTo(ProgramCompliance, {
  foreignKey: "entity_id",
  targetKey: "entity_id",
  as: "ParticipantProgramCompliance" // Alias for the association
});

// ProgramParticipant and Store
Store.hasMany(ProgramParticipant, {
  foreignKey: "entity_id",
  as: "ProgramParticipants"
});
ProgramParticipant.belongsTo(Store, {
  foreignKey: "entity_id",
  as: "store"
});

// ProgramCompliance and Store
Store.hasMany(ProgramCompliance, {
  foreignKey: "entity_id",
  as: "storeCompliances"
});
ProgramCompliance.belongsTo(Store, {
  foreignKey: "entity_id",
  as: "store"
});

// ProgramParticipant and Chain
Chain.hasMany(ProgramParticipant, {
  foreignKey: "entity_id",
  as: "chainEnrollments"
});
ProgramParticipant.belongsTo(Chain, {
  foreignKey: "entity_id",
  as: "chain"
});

// ProgramDetailPeriod and ProgramDetail
ProgramDetailPeriod.belongsTo(ProgramDetail, {
  foreignKey: "program_detail_id"
});

// Define associations between Chain and Store
Store.belongsToMany(Chain, {
  through: ChainStore,
  foreignKey: "store_id",
  otherKey: "chain_id",
  as: "ChainsForStore"
});
Chain.belongsToMany(Store, {
  through: ChainStore,
  foreignKey: "chain_id",
  otherKey: "store_id",
  as: "StoresForChain"
});

ChainStore.belongsTo(Chain, {
  foreignKey: "chain_id"
});

Chain.hasMany(ChainStore, {
  foreignKey: "chain_id",
  as: "ChainStores"
});

ChainStore.belongsTo(UserRole, {
  foreignKey: "chain_id",
  targetKey: "associated_user_id",
  as: "ChainStoreChainIdUserRole"
});

ChainStore.belongsTo(UserRole, {
  foreignKey: "store_id",
  targetKey: "associated_user_id",
  as: "ChainStoreStoreIdUserRole"
});

UserRole.belongsTo(ChainStore, {
  foreignKey: "associated_user_id",
  targetKey: "store_id",
  as: "UserRoleChainStoreStoreId"
});

UserRole.belongsTo(Chain, {
  foreignKey: "associated_user_id",
  as: "ChainUserRole"
});

ChainStore.belongsTo(Store, {
  foreignKey: "store_id",
  as: "StoreUserRole"
});

Store.hasMany(ChainStore, {
  foreignKey: "store_id",
  as: "ChainStores"
});

AuthorizedManufacturerDistributor.belongsTo(Manufacturer, {
  foreignKey: "manufacturer_id"
});

// Program and ProgramVisibility
Program.hasMany(ProgramVisibility, {
  foreignKey: "program_id",
  as: "ProgramVisibility"
});

ProgramVisibility.belongsTo(Program, {
  foreignKey: "program_id",
  as: "ProgramDetails"
});

UserRole.belongsTo(UserRole, {
  foreignKey: "parentEntityId",
  targetKey: "associatedUserId",
  as: "ParentUserRole"
});

CartItem.belongsTo(Product, {
  foreignKey: "product_id", // just a placeholder; we’ll override with literal later
  constraints: false, // disable FK constraints so Sequelize won’t complain
  as: "Product"
});

Product.hasMany(CartItem, {
  foreignKey: "product_id", // same placeholder
  constraints: false,
  as: "CartItems"
});

OrderItem.belongsTo(Product, {
  foreignKey: "product_id", // just a placeholder; we’ll override with literal later
  constraints: false, // disable FK constraints so Sequelize won’t complain
  as: "Product"
});

Product.hasMany(OrderItem, {
  foreignKey: "product_id", // same placeholder
  constraints: false,
  as: "OrderItems"
});

CartItem.belongsTo(Store, {
  foreignKey: "entity_id", // just a placeholder; we’ll override with literal later
  constraints: false, // disable FK constraints so Sequelize won’t complain
  as: "Store"
});

Store.hasMany(CartItem, {
  foreignKey: "entity_id", // same placeholder
  constraints: false,
  as: "CartItems"
});

OrderItem.belongsTo(Order, {
  foreignKey: "order_id", // just a placeholder; we’ll override with literal later
  constraints: false, // disable FK constraints so Sequelize won’t complain
  as: "Order"
});

Order.hasMany(OrderItem, {
  foreignKey: "order_id",
  as: "OrderItems"
});

OrderItem.belongsTo(Manufacturer, {
  foreignKey: "manufacturer_id", // just a placeholder; we’ll override with literal later
  constraints: false, // disable FK constraints so Sequelize won’t complain
  as: "Manufacturer"
});

Manufacturer.hasMany(OrderItem, {
  foreignKey: "manufacturer_id",
  as: "OrderItems"
});

CartItem.belongsTo(Manufacturer, {
  foreignKey: "manufacturer_id", // just a placeholder; we’ll override with literal later
  constraints: false, // disable FK constraints so Sequelize won’t complain
  as: "Manufacturer"
});

Manufacturer.hasMany(CartItem, {
  foreignKey: "manufacturer_id", // same placeholder
  constraints: false,
  as: "CartItems"
});

// SpiffProgramEligibleStore and Program relation
Program.hasMany(SpiffProgramEligibleStore, { foreignKey: "program_id" });
SpiffProgramEligibleStore.belongsTo(Program, { foreignKey: "program_id" });

// SpiffProgramEligibleStore and Store relation
Store.hasMany(SpiffProgramEligibleStore, { foreignKey: "store_id" });
SpiffProgramEligibleStore.belongsTo(Store, { foreignKey: "store_id" });

Product.hasMany(ProductCodeMapping, {
  foreignKey: "product_id",
  as: "ProductCodeMapping"
});
ProductCodeMapping.belongsTo(Product, { foreignKey: "product_id" });

ManagerSalesRepMapping.belongsTo(Distributor, {
  foreignKey: "sales_manager_id",
  targetKey: "id",
  as: "SalesManagerDistributor"
});

ManagerSalesRepMapping.belongsTo(Distributor, {
  foreignKey: "sales_rep_id",
  targetKey: "id",
  as: "SalesRepDistributor"
});

Distributor.hasMany(ManagerSalesRepMapping, {
  foreignKey: "sales_rep_id",
  sourceKey: "id",
  as: "managerSalesRepMappings"
});

UserRole.hasMany(ManagerSalesRepMapping, {
  foreignKey: "sales_rep_id",
  sourceKey: "associated_user_id",
  as: "ManagerSalesRepMappings"
});

// ProgramStoreIneligibility and Program Detail
ProgramStoreIneligibility.belongsTo(ProgramDetail, {
  foreignKey: "program_id",
  targetKey: "program_id",
  as: "StoreIneligibilityProgramDetail"
});
ProgramDetail.hasOne(ProgramStoreIneligibility, {
  foreignKey: "program_id",
  sourceKey: "program_id",
  as: "ProgramDetailStoreIneligibilities"
});

ProgramStoreIneligibility.belongsTo(ProgramCompliance, {
  foreignKey: "program_id",
  targetKey: "program_id",
  as: "StoreIneligibilityProgramCompliance"
});
ProgramCompliance.hasOne(ProgramStoreIneligibility, {
  foreignKey: "program_id",
  sourceKey: "program_id",
  as: "ProgramComplianceStoreIneligibilities"
});

ProgramParticipant.hasOne(ProgramStoreIneligibility, {
  foreignKey: "program_id",
  sourceKey: "program_id",
  as: "ProgramParticipantStoreIneligibilities"
});

ProgramStoreIneligibility.belongsTo(Program, {
  foreignKey: "program_id",
  targetKey: "id",
  as: "StoreIneligibilityProgram"
});
Program.hasMany(ProgramStoreIneligibility, {
  foreignKey: "program_id",
  sourceKey: "id",
  as: "ProgramStoreIneligibilities"
});

// Distributor and Warehouse associations
Distributor.belongsTo(Warehouse, {
  foreignKey: "primaryWarehouseId",
  as: "primaryWarehouse"
});

Warehouse.hasMany(Distributor, {
  foreignKey: "primaryWarehouseId",
  as: "distributors"
});

// EnrollmentRequest and User
EnrollmentRequest.belongsTo(User, {
  foreignKey: "user_id",
  as: "user"
});

User.hasMany(EnrollmentRequest, {
  foreignKey: "user_id",
  as: "enrollmentRequests"
});

// WarehouseReportEmailRecipient associations
WarehouseReportEmailRecipient.belongsTo(Distributor, {
  foreignKey: "distributor_id",
  as: "distributor"
});

WarehouseReportEmailRecipient.belongsTo(Warehouse, {
  foreignKey: "warehouse_id",
  as: "warehouse"
});

Distributor.hasMany(WarehouseReportEmailRecipient, {
  foreignKey: "distributor_id",
  as: "warehouseReportEmailRecipients"
});

Warehouse.hasMany(WarehouseReportEmailRecipient, {
  foreignKey: "warehouse_id",
  as: "warehouseReportEmailRecipients"
});

export { LineItem, Manufacturer, Product };
