import Product from "../models/Product";
import { getEnvironment } from "./../utils/helpers";

export const parseEnvCsvValues = (csv?: string | null): any[] => {
  if (!csv) return [];
  return csv
    .split(",")
    .map((value) => value.trim())
    .filter((n) => n && n !== null && n !== undefined);
};

export const PRODUCTS_INSIGHT_MAX_PRODUCTS: number = 1000;

// Export CSV Report Type
export const REPORT_TYPE = {
  SALES_REP_EARNINGS: "SALES_REP_EARNINGS",
  STORE_EARNINGS: "STORE_EARNINGS",
  PROGRAM_SUMMARY: "PROGRAM_SUMMARY",
  ALL: "ALL"
};

export enum TARGET_AUDIENCE {
  DISTRIBUTOR = "DISTRIBUTOR",
  STORES = "STORES",
  BOTH = "BOTH"
}

export enum VISIBILITY_SCOPE {
  ALL_DISTRIBUTORS = "ALL_DISTRIBUTORS",
  SPECIFIC_DISTRIBUTORS = "SPECIFIC_DISTRIBUTORS",
  SPECIFIC_STORES = "SPECIFIC_STORES",
  ALL_STORES_UNDER_DISTRIBUTOR = "ALL_STORES_UNDER_DISTRIBUTOR",
  ALL_SALES_REPS = "ALL_SALES_REPS",
  SPECIFIC_SALES_REPS = "SPECIFIC_SALES_REPS",
  SPECIFIC_SALES_MANUFACTURERS = "SPECIFIC_SALES_MANUFACTURERS",
  ALL_DISTRIBUTOR_SALES_MANAGER = "ALL_DISTRIBUTOR_SALES_MANAGER",
  SPECIFIC_DISTRIBUTOR_SALES_MANAGER = "SPECIFIC_DISTRIBUTOR_SALES_MANAGER"
}

export enum PROGRAM_APPROVAL_STATUS {
  DRAFT = "DRAFT",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED"
}

export enum ENTITY_TYPE {
  DISTRIBUTOR = "DISTRIBUTOR",
  MANUFACTURER = "MANUFACTURER",
  STORE = "STORE",
  SALES_REP = "SALES_REP",
  SALES_MANAGER = "SALES_MANAGER",
  DISTRIBUTOR_ADMIN = "DISTRIBUTOR_ADMIN",
  DISTRIBUTOR_EXECUTIVE = "DISTRIBUTOR_EXECUTIVE",
  DISTRIBUTOR_SALES_REP = "DISTRIBUTOR_SALES_REP",
  DISTRIBUTOR_GENERAL_MANAGER = "DISTRIBUTOR_GENERAL_MANAGER",
  DISTRIBUTOR_SALES_MANAGER = "DISTRIBUTOR_SALES_MANAGER",
  MANUFACTURER_ADMIN = "MANUFACTURER_ADMIN",
  MANUFACTURER_EXECUTIVE = "MANUFACTURER_EXECUTIVE",
  MANUFACTURER_SALES_REP = "MANUFACTURER_SALES_REP",
  MANUFACTURER_ACCOUNT_MANAGER = "MANUFACTURER_ACCOUNT_MANAGER",
  SUPER_ADMIN = "SUPER_ADMIN",
  CHAIN = "CHAIN",
  CHAIN_ADMIN = "CHAIN_ADMIN"
}

export const ENTITY_TYPE_SHORT = {
  DISTRIBUTOR_SALES_REP: "SALES_REP",
  DISTRIBUTOR_SALES_MANAGER: "SALES_MANAGER"
};

export const ENTITY_TYPE_LONG_MISC = {
  DISTRIBUTOR_SALES_REP: "SALES_REP",
  DISTRIBUTOR_SALES_MANAGER: "DISTRIBUTOR_SALES_MANAGER"
};

export type EntityType = (typeof ENTITY_TYPE)[keyof typeof ENTITY_TYPE];

export const PROGRAM_TYPE = {
  BASE: "BASE",
  POD: "POD",
  INNOVATION: "INNOVATION",
  SPIFF: "SPIFF",
  TIER: "TIER",
  NA: "NA"
} as const;

export type ProgramType = (typeof PROGRAM_TYPE)[keyof typeof PROGRAM_TYPE];

export const DEFAULT_PAGE_SIZE: number = 10;

export enum PROGRAM_TIER_MODAL {
  MAX_PRODUCTS = 50
}

export const MONTH_NAMES: string[] = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];

export const PROGRAM_CALCULATION_TYPE_VALUES = {
  FIXED_AMOUNT: "Fixed $ amount",
  FIXED_PER_ITEM: "fixed_per_item",
  LANDED_VALUE: "% of Total Landed Value",
  LIST_VALUE: "% of Total List Value",
  FIXED_AMOUNT_PER_STORE_COMPLIANCE: "Fixed $ amount Per Store Compliance",
  FIXED_AMOUNT_PER_QUANTITY: "Fixed $ amount Per Quantity",
  FIXED_AMOUNT_PER_ITEM_PER_STORE:
    "Fixed $ amount Per Item Per Store (Per POD)",
  FIXED_AMOUNT_PER_CATEGORY_ITEM_PER_STORE:
    "Fixed $ amount Per Category Item Per Store"
};

export enum ProgramsDetailCriteria {
  Base = "Base",
  BaseSPIFF = "Base - SPIFF",
  PurchaseValue = "Purchase Value",
  PurchaseQuantity = "Purchase Quantity",
  CategorySKUs = "Category SKUs",
  Growth = "Growth",
  POD = "POD",
  PerItem = "Per Item",
  Outreach = "OUTREACH",
  VOID_FILL = "VOID_FILL"
}

export enum SalesRepSpiffProgramsDetailCriteria {
  StoreCompliance = "Fixed $ amount Per Store Compliance",
  POD = "Fixed $ amount Per Item Per Store (Per POD)",
  PODPerCategory = "Fixed $ amount Per Category Item Per Store",
  PerQuantity = "Fixed $ amount Per Quantity",
  VOID_FILL = "VOID_FILL",
  SPIFF_CATEGORY_SKUS = "SPIFF Category SKUs"
}

export enum ProgramsComplianceStatus {
  Active = "active",
  Superseded = "superseded",
  InProgress = "in_progress"
}

export const SORT_KEYS = {
  SORT: "sort",
  PURCHASE_VOLUME_SORT: "purchaseSort",
  ANNUAL_PURCHASE_VOLUME_SORT: "annualPurchaseVolSort",
  POTENTIAL_SAVINGS: "potentialSavings",
  ESTIMATED_SAVINGS: "estimatedSavings",
  SAVINGS_Opp: "savingsOpp",
  CHAIN: "chain",
  SALES_REP: "sales_rep",
  DISTRIBUTOR: "distributor",
  SKUS: "skus",
  PROGRAM_COMPLIANCE: "programCompliance",
  PR_AVAILABLE: "prAvailable",
  NEAR_COMPLIANCE_PERCENTAGE: "nearCompliancePercentage"
};

export enum GROUP_PERIOD {
  DAY = "DAY",
  MONTH = "MONTH"
}

export const DATE_STRING_LOCALE = "sv-SE";

export const USER_STATUS = {
  INVITATION_PENDING: "INVITATION_PENDING",
  INVITATION_SENT: "INVITATION_SENT",
  CHAIN_INVITATION_SENT: "CHAIN_INVITATION_SENT",
  CHAIN_ACTIVE: "CHAIN_ACTIVE",
  ACTIVE: "ACTIVE",
  DEACTIVE: "DEACTIVE"
};

export const SIGNUP_INVITATION_STATUS = {
  CANCELED: "canceled",
  PENDING: "pending",
  COMPLETED: "completed"
};

export const ENROLLMENT_REQUEST_STATUS = {
  PENDING: "PENDING",
  SQS_SEND_FAILED: "SQS_SEND_FAILED",
  QUEUED: "QUEUED",
  WORKER_PROCESSING: "WORKER_PROCESSING",
  DB_OPERATION_IN_PROGRESS: "DB_OPERATION_IN_PROGRESS",
  DB_OPERATION_FAILED: "DB_OPERATION_FAILED",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED"
};

export const skuFieldMapping: { [key: string]: keyof Product } = {
  unit: "unitSkusId",
  case: "caseSkusId",
  box: "boxSkusId",
  id: "id"
};

export const SALES_REP = {
  REDUCE_REBATE_PERCENTAGE: 1,
  REDUCE_REBATE_PERCENTAGE_SANDSTROM: 0.7,
  HIDE_MANUFACTURER_PROGRAMS: [8, 9]
};

export const CACHE_TTL_TIME = 604800; // 7 days in seconds (7 * 24 * 60 * 60 = 604800)

export const useApiCaching = process.env.USE_API_CACHING === "true";

// export const CHARTCOLORS = [
//   "#1F77B4",
//   "#FF9900",
//   "#117d49",
//   "#BC0909",
//   "#0071B3",
//   "#9d620a",
//   "#338dc2",
//   "#e6a33e",
//   "#002d48",
//   "#5a3806"
// ];

export const CHARTDEFAULTCOLOR = "#FF9900";

export const CHARTCOLORS = [
  "#FFB3BA",
  "#FFDFBA",
  "#FFFFBA",
  "#77DD77",
  "#AEC6CF",
  "#D0BAFF",
  "#FFBAE5",
  "#FF9A8B",
  "#C9E4CA",
  "#836953"
];

export const PAYMENT_TERMS = {
  ANNUAL: "ANNUAL",
  SEMI_ANNUAL: "SEMI-ANNUAL",
  QUARTERLY: "QUARTERLY"
};

export const PROGRAM_PAYMENT_TERMS: Record<string, string> = {
  ANNUAL: "annually",
  "SEMI-ANNUAL": "semi-annually",
  QUARTERLY: "quarterly"
};

//=== For Showing Distributor Internal Code in UI ===
// Distributor names as constants to avoid typos
export const DISTRIBUTORS = {
  SANDSTROM: "SANDSTROM",
  PITCO: "PITCO",
  MERRILL: "MERRILL",
  DEMO: "DEMO",
  NCD: "NCD",
  NORMAN: "NORMAN"
} as const;

// Environment-specific distributor IDs - one ID per distributor per environment
export const DISTRIBUTOR_IDS = {
  development: {
    [DISTRIBUTORS.SANDSTROM]: 1, // dev ID
    [DISTRIBUTORS.PITCO]: 51, // dev ID
    [DISTRIBUTORS.MERRILL]: 39, // dev ID
    [DISTRIBUTORS.DEMO]: 134, // dev ID
    [DISTRIBUTORS.NCD]: 327, // dev ID
    [DISTRIBUTORS.NORMAN]: 241 // dev ID
  },
  demo: {
    [DISTRIBUTORS.SANDSTROM]: 107, // demo ID
    [DISTRIBUTORS.PITCO]: 121, // demo ID
    [DISTRIBUTORS.MERRILL]: 120, // demo ID
    [DISTRIBUTORS.DEMO]: 134, // demo ID
    [DISTRIBUTORS.NCD]: 327, // demo ID
    [DISTRIBUTORS.NORMAN]: 241 // demo ID
  },
  production: {
    [DISTRIBUTORS.SANDSTROM]: 1, // prod ID
    [DISTRIBUTORS.PITCO]: 51, // prod ID
    [DISTRIBUTORS.MERRILL]: 39, // prod ID
    [DISTRIBUTORS.DEMO]: 134, // prod ID
    [DISTRIBUTORS.NCD]: 327, // prod ID
    [DISTRIBUTORS.NORMAN]: 241 // prod ID
  },
  staging: {
    [DISTRIBUTORS.SANDSTROM]: 1, // Staging ID
    [DISTRIBUTORS.PITCO]: 51, // Staging ID
    [DISTRIBUTORS.MERRILL]: 39, // Staging ID
    [DISTRIBUTORS.DEMO]: 134, // Staging ID
    [DISTRIBUTORS.NCD]: 327, // Staging ID
    [DISTRIBUTORS.NORMAN]: 241 // Staging ID
  }
} as const;

//=== For Product Code Grey-Out Logic Based on Last Transaction Date ===
// Maps distributor IDs to the number of days after which a product code should be greyed out
// If last_transaction_date is older than this threshold, internalCode will be set to null
export const DISTRIBUTOR_INACTIVE_THRESHOLD_DAYS: Record<number, number> = {
  327: 28, // NCD: 28 days
  1: 56, // Sandstrom: 56 days
  39: 56, // Merrill: 56 days
  51: 56, // Pitco: 56 days
  65: 56 // Other distributor: 56 days
};

// Default threshold for distributors not explicitly configured
export const DEFAULT_INACTIVE_THRESHOLD_DAYS = 56;

export const ORDER_STATUS = {
  PLACED: "PLACED",
  COMPLETED: "COMPLETED"
};

export const CART_ITEM_QUANTITY_TYPE = {
  BOX: "Box",
  UNIT: "Unit",
  CASE: "Case"
};

export const PROGRAM_TIMELINE = {
  CURRENT: "Current",
  UPCOMING: "Upcoming",
  HISTORICAL: "Historical"
};

export const CHAIN_PROGRAMS_ENABLED =
  process.env.CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS ?? "";

// Distributor IDs enabled for UPC type filtering in per_category_item PurchaseQuantity programs
// Format: comma-separated distributor IDs (e.g., "327,123,456")
export const PURCHASE_QUANTITY_WITH_PER_CATEGORY_ITEM_TRACKER_DISTRIBUTOR_IDS: number[] =
  parseEnvCsvValues(
    process.env.PURCHASE_QUANTITY_WITH_PER_CATEGORY_ITEM_TRACKER_DISTRIBUTOR_IDS
  )
    .map((id) => parseInt(id, 10))
    .filter((id) => !isNaN(id));

export const SKU_COUNT_KEYS = {
  CURRENT: "skuCount",
  PREVIOUS: "skuCountLastYear"
};

export const STORE_COUNT_KEYS = {
  CURRENT: "storeCount",
  PREVIOUS: "storeCountLastYear"
};

// Get the environment and return the appropriate adjustment factor
const environment = getEnvironment();
// Get Rebate Adjustment Factors based on the environments
export const REBATE_ADJUSTMENT_FACTORS: { [distributorId: number]: number } = {
  [DISTRIBUTOR_IDS[environment].SANDSTROM]: 0.7, // 70% adjustment factor
  [DISTRIBUTOR_IDS[environment].NORMAN]: 0.9
  // Default fallback elsewhere: 1 (100%)
};

// HLA Report Constants
export const HLA_WAREHOUSE_ID: number = process.env.HLA_REPORT_WAREHOUSE_ID
  ? parseInt(process.env.HLA_REPORT_WAREHOUSE_ID, 10)
  : 149;

// Default allowed IPs for HLA report endpoint (can be overridden via HLA_REPORT_ALLOWED_IPS env var)
// Empty array means no IP restriction (for development)
// Use "*" to allow all IPs (use with caution)
export const HLA_REPORT_DEFAULT_ALLOWED_IPS: string[] = process.env
  .HLA_REPORT_ALLOWED_IPS
  ? parseEnvCsvValues(process.env.HLA_REPORT_ALLOWED_IPS).map((ip) =>
      ip.toString()
    )
  : [""];

// J-Polep Report Constants
export const JPOLEP_WAREHOUSE_ID: number = process.env
  .JPOLEP_REPORT_WAREHOUSE_ID
  ? parseInt(process.env.JPOLEP_REPORT_WAREHOUSE_ID) || 150
  : 150;
