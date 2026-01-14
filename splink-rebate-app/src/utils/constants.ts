export const DEFAULT_PAGE_SIZE: number = 10;

export const MAINTENANCE_NOTICE_MESSAGE =
  "The website is currently under maintenance due to a system update. We'll be back up October 20th";

export const REPORT_TYPE = {
  ALL: "ALL",
  SALES_REP_EARNINGS: "SALES_REP_EARNINGS",
  STORE_EARNINGS: "STORE_EARNINGS",
  PROGRAM_SUMMARY: "PROGRAM_SUMMARY"
};

export const SORT_KEYS = {
  SORT: "sort",
  PURCHASE_VOLUME_SORT: "purchaseSort",
  ESTIMATED_SAVINGS: "estimatedSavings",
  SAVINGS_Opp: "savingsOpp",
  CHAIN: "chain",
  SALES_REP: "sales_rep",
  DISTRIBUTOR: "distributor",
  SKUS: "skus",
  POTENTIAL_SAVINGS: "potentialSavings",
  PROGRAM_COMPLIANCE: "programCompliance",
  NEAR_COMPLIANCE_PERCENTAGE: "nearCompliancePercentage",
  // Chain-specific sort keys
  TOTAL_SAVINGS_SORT: "totalSavingsSort",
  STORE_COUNT_SORT: "storeCountSort",
  PR_AVAILABLE: "prAvailable",
  ANNUAL_PURCHASE_VOLUME_SORT: "annualPurchaseVolSort"
};

export const PROGRESS_COLORS = {
  PENDING: "#FF9900",
  COMPLETED: "#106210"
};

export const PAGINATION_PAGE_QUERY_PARAMS = {
  PAGE: "page",
  CURRENTPAGE: "currentPage",
  ENROLLEDPAGE: "enrolledPage",
  NOTENROLLEDPAGE: "notEnrolledPage"
};

export const PROGRAMS_COMPLIANCE_STATUS = {
  Active: "active",
  Superseded: "superseded",
  InProgress: "in_progress"
};

export const CART_ITEM_QUANTITY_TYPE = {
  BOX: "Box",
  UNIT: "Unit",
  CASE: "Case"
};

export const ORDER_STATUS = {
  PLACED: "PLACED",
  COMPLETED: "COMPLETED"
} as const;

export const PROGRAM_TIMELINE = {
  CURRENT: "Current",
  UPCOMING: "Upcoming",
  HISTORICAL: "Historical"
};

export const SHOW_GROWTH_IN_MANUFACTURE_DASHBOARD =
  (process.env.NEXT_PUBLIC_SHOW_GROWTH_IN_MANUFACTURE_DASHBOARD ?? "")
    .toLowerCase()
    .trim() === "true";

export const MANUFACTURER_CAN_CREATE_PROGRAM_IDS =
  process.env.NEXT_PUBLIC_MANUFACTURER_CAN_CREATE_PROGRAM_IDS ?? "";

export const DISTRIBUTOR_CAN_CREATE_PROGRAM_IDS =
  process.env.NEXT_PUBLIC_DISTRIBUTOR_CAN_CREATE_PROGRAM_IDS ?? "";

export const SHOW_MAINTENANCE_NOTICE =
  (process.env.NEXT_PUBLIC_SHOW_MAINTENANCE_NOTICE ?? "")
    .toLowerCase()
    .trim() === "true";

export const MANUFACTURER_AM_INVITE_ENABLED =
  (process.env.NEXT_PUBLIC_MANUFACTURER_AM_INVITE_ENABLED ?? "")
    .toLowerCase()
    .trim() === "true";

export const DISTRIBUTOR_SALESREP_UPDATE =
  (process.env.NEXT_PUBLIC_DISTRIBUTOR_SALESREP_UPDATE ?? "")
    .toLowerCase()
    .trim() === "true";

export const SHOW_WAREHOUSES_FOR_DISTRIBUTOR_IDS =
  process.env.NEXT_PUBLIC_SHOW_WAREHOUSES_FOR_DISTRIBUTOR_IDS ?? "";

export const SPIFF_OPPORTUNITIES_FEATURE =
  (process.env.NEXT_PUBLIC_SPIFF_OPPORTUNITIES_FEATURE ?? "")
    .toLowerCase()
    .trim() === "true";

export const ORDER_FUNCTIONALITY_ENABLED_FOR_DISTRIBUTOR_IDS =
  process.env.NEXT_PUBLIC_ORDER_FUNCTIONALITY_ENABLED_FOR_DISTRIBUTOR_IDS ?? "";

export const HIDE_ORDER_UNIT_TYPE_FOR_DISTRIBUTOR_IDS =
  process.env.NEXT_PUBLIC_HIDE_ORDER_UNIT_TYPE_FOR_DISTRIBUTOR_IDS ?? "";

export const SHOW_PROGRAM_ON_TIMELINE_BASE =
  (process.env.NEXT_PUBLIC_SHOW_PROGRAM_ON_TIMELINE_BASE ?? "")
    .toLowerCase()
    .trim() === "true";

export const ENABLE_PROGRAM_EXPIRATION_NOTICE =
  (process.env.NEXT_PUBLIC_ENABLE_PROGRAM_EXPIRATION_NOTICE ?? "")
    ?.toLowerCase()
    .trim() === "true";

export const ENABLE_SALES_MANAGER_PROGRAMS_FOR_DISTRIBUTOR_IDS =
  (
    process.env.NEXT_PUBLIC_ENABLE_SALES_MANAGER_PROGRAMS_FOR_DISTRIBUTOR_IDS ??
    ""
  )
    .toLowerCase()
    .trim() === "true";

export const SHOW_ROI_TO_MANUFACTURERS_IDS =
  process.env.NEXT_PUBLIC_SHOW_ROI_TO_MANUFACTURERS_IDS ?? "";

export const DISTRIBUTOR_SHOW_ENROLLED_STORES_TILE =
  (process.env.NEXT_PUBLIC_DISTRIBUTOR_SHOW_ENROLLED_STORES_TILE ?? "")
    .toLowerCase()
    .trim() === "true";

export const STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS =
  process.env.NEXT_PUBLIC_STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS ?? "";

export const DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS =
  process.env.NEXT_PUBLIC_DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS ?? "";

export const CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS =
  process.env.NEXT_PUBLIC_CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS ?? "";

export const SPIFFS_ENABLED_FOR_DISTRIBUTOR_IDS =
  process.env.NEXT_PUBLIC_SPIFFS_ENABLED_FOR_DISTRIBUTOR_IDS ?? "";

export const INTERNAL_INITIATIVE_ENABLED_FOR_DISTRIBUTOR_IDS =
  process.env.NEXT_PUBLIC_INTERNAL_INITIATIVE_ENABLED_FOR_DISTRIBUTOR_IDS ?? "";

export const HIDE_INTERNAL_TAB_FOR_DISTRIBUTOR_ADMIN_IDS =
  process.env.NEXT_PUBLIC_HIDE_INTERNAL_TAB_FOR_DISTRIBUTOR_ADMIN_IDS ?? "327";

export const ADVANCED_INSIGHTS_ENABLED_FOR_DISTRIBUTOR_IDS =
  process.env.NEXT_PUBLIC_ADVANCED_INSIGHTS_ENABLED_FOR_DISTRIBUTOR_IDS ?? "";

export const HIDE_PURCHASE_VOLUME_AND_ACTIVE_SIGNUPS_CARDS_FOR_DISTRIBUTOR_IDS =
  process.env
    .NEXT_PUBLIC_HIDE_PURCHASE_VOLUME_AND_ACTIVE_SIGNUPS_CARDS_FOR_DISTRIBUTOR_IDS ??
  "";

export const SALES_MANAGER_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS =
  process.env.NEXT_PUBLIC_SALES_MANAGER_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS ??
  "";

export const ORDERING_FEATURE_ENABLED =
  (process.env.NEXT_PUBLIC_ORDERING_FEATURE_ENABLED ?? "")
    .toLowerCase()
    .trim() === "true";

export const MINIMAL_FEATURE_FOR_SALES_REP_MANAGER_IDS =
  process.env.NEXT_PUBLIC_MINIMAL_FEATURE_FOR_SALES_REP_MANAGER_IDS ?? "";

export const SHOW_ENABLED_DSD_DISTRIBUTOR_IDS =
  process.env.NEXT_PUBLIC_ENABLED_DSD_DISTRIBUTOR_IDS ?? "";

// TEMPORARY EXLCUDED SALES REP IDS FOR ORDERING FEATURE
// Colonial Warehouse Sales Reps
// NOTE: This is being replaced by ORDERING_FEATURE_EXCLUDED_WAREHOUSE_IDS
// Kept for backward compatibility during transition
export const ORDERING_FEATURE_EXCLUDED_SALES_REP_IDS = [
  365, 370, 426, 446, 451, 454, 455, 456, 457, 458, 460, 483, 485, 491, 499,
  500, 520, 614, 615, 600, 603, 380, 383, 522, 530, 589, 590, 534
];

// EXCLUDED WAREHOUSE IDS FOR ORDERING FEATURE
// Replaces sales rep ID exclusion - feature will be disabled if user's warehouse_id is in this list
export const ORDERING_FEATURE_EXCLUDED_WAREHOUSE_IDS: number[] = [148];

export const DEPRECATE_STORE_INVITE_FEATURE = true;
