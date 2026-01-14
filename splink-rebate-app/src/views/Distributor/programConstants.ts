export const CREATE_PROGRAM_TYPES = [
  { label: "Select Program Type", value: "" },
  { label: "No Payment", value: "NA" },
  { label: "Rebate", value: "REBATE" },
  { label: "SPIFF", value: "SPIFF" }
];

export const PROGRAM_TYPES = {
  TIER: "tier"
};

export const REBATE_TYPES = {
  PER_CASE: "per_case",
  PERCENTAGE: "percentage",
  FIXED: "fixed",
  FLAT: "flat",
  POINT: "point"
};

export const ENTITY_TYPES = {
  STORE: "store",
  MANUFACTURER: "manufacturer",
  DISTRIBUTOR: "distributor",
  SALES_REP: "salesRep"
};

export const ENTITY_TYPES_RESPONSE = {
  STORE: "STORE",
  MANUFACTURER: "MANUFACTURER",
  DISTRIBUTOR: "DISTRIBUTOR",
  SALES_REP: "SALES_REP",
  CHAIN: "CHAIN"
};

export const PROGRAM_CALCULATION_TYPE = {
  FIXED_AMOUNT: "Fixed $ amount",
  FIXED_PER_ITEM: "Fixed $ Amount per Item",
  LANDED_VALUE: "% of Total Landed Value",
  LIST_VALUE: "% of Total List Value",
  FIXED_AMOUNT_PER_QUANTITY: "Per Item",
  FIXED_AMOUNT_PER_ITEM_PER_STORE: "Per Item Per Store (Per POD)",
  FIXED_AMOUNT_PER_ITEM_PER_STORE_VOID_FILL: "Per Item Per Store (Void Fill)",
  FIXED_AMOUNT_PER_CATEGORY_ITEM_PER_STORE: "Per Category Item Per Store",
  FIXED_AMOUNT_PER_STORE_COMPLIANCE: "Per Store Compliance"
};

export const PROGRAM_CALCULATION_TYPE_VALUES = {
  FIXED_AMOUNT: "Fixed $ amount",
  FIXED_PER_ITEM: "fixed_per_item",
  LANDED_VALUE: "% of Total Landed Value",
  LIST_VALUE: "% of Total List Value",
  FIXED_AMOUNT_PER_STORE_COMPLIANCE: "Fixed $ amount Per Store Compliance",
  FIXED_AMOUNT_PER_QUANTITY: "Fixed $ amount Per Quantity",
  FIXED_AMOUNT_PER_ITEM_PER_STORE:
    "Fixed $ amount Per Item Per Store (Per POD)",
  FIXED_AMOUNT_PER_ITEM_PER_STORE_VOID_FILL:
    "Fixed $ amount Per Item Per Store (Void Fill)",
  FIXED_AMOUNT_PER_CATEGORY_ITEM_PER_STORE:
    "Fixed $ amount Per Category Item Per Store"
};

export const VISIBILITY_SCOPE = {
  ALL_DISTRIBUTORS: "ALL_DISTRIBUTORS",
  SPECIFIC_DISTRIBUTORS: "SPECIFIC_DISTRIBUTORS",
  SPECIFIC_STORES: "SPECIFIC_STORES",
  ALL_STORES_UNDER_DISTRIBUTOR: "ALL_STORES_UNDER_DISTRIBUTOR",
  SPECIFIC_SALES_REPS: "SPECIFIC_SALES_REPS",
  ALL_SALES_REPS: "ALL_SALES_REPS"
};

export const PROGRAM_CRITERIA = {
  BASE: "Base",
  BASE_SPIFF: "Base - SPIFF",
  CATEGORY_SKUS: "Category SKUs",
  ITEM_DISTRIBUTION: "Item Distribution",
  POD: "POD",
  GROWTH: "Growth",
  OUTREACH: "OUTREACH",
  PURCHASE_VALUE: "Purchase Value",
  PURCHASE_QUANTITY: "Purchase Quantity",
  PER_ITEM: "Per Item",
  VOID_FILL: "Void Fill"
};

export const PROGRAM_CRITERIA_VALUES = {
  BASE: "Base",
  BASE_SPIFF: "Base - SPIFF",
  CATEGORY_SKUS: "Category SKUs",
  ITEM_DISTRIBUTION: "Category SKUs",
  POD: "POD",
  GROWTH: "Growth",
  OUTREACH: "OUTREACH",
  PURCHASE_VALUE: "Purchase Value",
  PURCHASE_QUANTITY: "Purchase Quantity",
  PER_ITEM: "Per Item",
  VOID_FILL: "VOID_FILL"
};
