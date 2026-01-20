import { WishlistProducts } from "./ProductTypes";

// Enrollment status type
export type StoreEnrollmentStatusValue = "processing" | "succeeded" | "failed";

// Define the type for StoreDetails Page
export type StoreProfileDetails = {
  id?: number;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  phone?: string | null;
  secondaryPhone?: string | null;
  isActive?: string | null;
  status?: string | null;
  address?: string | null;
  storeName?: string | null;
};

export type StoreProps = {
  searchParams?: {
    currentPage?: number;
    page?: number;
    s?: string;
    srId?: string;
    sort?: string;
    dtId?: string;
    chainId?: string;
    sortKey?: string;
    warehouseId?: string;
    programTimeline?: string;
  };
  manufacturerId?: never;
  distributorId?: string;
  salesRepUserId?: string;
  showAnnualPurchaseVolume?: boolean;
};

// Define the type for StoreDetails Page
export type StoreDetails = {
  params: {
    id: string;
  };
  searchParams: {
    programTimeline: string;
    chainId?: string;
    isInternal?: boolean;
    store_tab_options?: string;
  };
  IsSalesRepStoreSpecificDetails?: boolean;
};

// Define the type for the individual Rep object
export interface Representative {
  avatar?: string;
  name?: string;
  logo?: string;
  firstName?: string;
  lastName?: string;
  bgColor?: string;
  associatedUserId?: number;
}

export interface Distributor {
  id: number;
  avatar: string;
  name: string;
  bgColor?: string;
}

// Define types for StoreInfo, SalesData, and nested objects within them
export interface StoreInfo {
  name: string;
  location: string;
  rep: Representative;
  distributor?: Distributor;
}

export interface PurchaseVolume {
  amount: number;
  yoy?: number; // Optional, since some data might not include YoY
}

export interface TotalSavings {
  amount: number;
  yoy?: number;
}
export interface TotalOppSavings {
  amount: number;
}

export interface SalesData {
  purchaseVolume: PurchaseVolume;
  purchasedSkus?: string[];
  totalSavings: TotalSavings;
  totalOppSavings: TotalOppSavings;
  annualPurchaseVolume?: PurchaseVolume;
}

// Define ProgramCompliance type and EnrolledProgram structure
export interface ProgramCompliance {
  total: number;
  completed: number;
}

export interface Manufacturer {
  id: number;
  avatar: string;
  authorized?: boolean;
  storeId?: number;
  name: string;
  additionalInfo?: {
    note: string;
    products: ManufacturerProduct[];
    recommendedProducts?: ManufacturerProduct[];
    purchasedProducts?: ManufacturerProduct[];
  };
  tierDetails?: ManufacturerTierDetail[];
  purchaseVolume?: number;
  earnedRebate?: number;
}

export interface CategorizedProducts {
  [label: string]: {
    note?: string;
    requiredProducts: ManufacturerProduct[];
    purchasedProducts: ManufacturerProduct[];
  };
}

export interface ManufacturerTierDetail {
  title: string;
  description?: string;
  SKU: {
    chartColor?: string;
    completed: number;
    total: number;
  };
  graph?: {
    [label: string]:
      | {
          chartColor?: string;
          completed: number;
          total: number;
        }
      | undefined;
  };
  categorizedProducts?: CategorizedProducts;
  progressAchieved?: string[];
  isProgramComplianceQualified?: boolean;
  isRebateBasedOnListPrice?: boolean;
  totalPotentialSavings?: number;
  overview?: string;
  rebate_type?: string;
  rebate_amount?: string;
  rebateAmount?: string;
  rebateType?: string;
  rebate_percentage?: string;
  fixed_rebate_amount?: string;
  programDetailId?: number;
  programId?: number;
  tier?: number;
  dependency_program_id?: number;
  totalOppSavings?: TotalOppSavings;
}

export interface ManufacturerProduct {
  id?: number;
  image?: string;
  name: string;
  size?: string;
  extraInfo?: string;
  wishlist?: boolean;
  caseSkusId?: string;
  unitSkusId?: string;
  boxSkusId?: string;
  isPurchased?: boolean;
  internalCode?: string | boolean;
}

export interface EnrolledProgram {
  manufacturer?: Manufacturer;
  programCompliance?: ProgramCompliance;
  purchaseVolume?: PurchaseVolume;
  totalSavings?: TotalSavings;
  totalOppSavings?: TotalOppSavings;
  categorizedProducts?: CategorizedProducts;
  isEnrolled?: boolean;
  allCompliances?: any;
  nearComplianceData?: {
    manufacturerId: number;
    manufacturerName: string;
    highestCompliancePercentage: number;
    programId: number;
    programName: string;
    tier: number;
    requiredCount: number;
    purchasedCount: number;
  };
}

export interface GroupedPrograms {
  manufacturer: Manufacturer;
  chainDetail: any;
  programs: EnrolledProgram[];
}

// Define ProgramData, including types for enrolled and remaining programs
export interface ProgramData {
  completedPrograms: number;
  totalEnrolled: number;
  // For chain details view, these can be GroupedPrograms[]
  enrolledProgram: EnrolledProgram[] | GroupedPrograms[];
  remainingProgram: EnrolledProgram[] | GroupedPrograms[];
  isEnrolled?: boolean;
}

// Define the main data type that combines all sections
export interface StoreTableData {
  id: string;
  externalStoreId?: string | number;
  enrollmentStatus?: StoreEnrollmentStatusValue;
  userInfo: {
    id: number;
    status: string;
  };
  storeInfo: StoreInfo;
  salesData: SalesData;
  programData: ProgramData;
  salesRepSpiffData?: {
    totalSpiffEarning?: number;
    totalSpiffPrograms?: number;
  };
  chainId: number;
  chainNames: string;
  totalStores?: number;
  nearComplianceData?: {
    manufacturerId: number;
    manufacturerName: string;
    highestCompliancePercentage: number;
    programId: number;
    programName: string;
    tier: number;
    requiredCount: number;
    purchasedCount: number;
  };
}

// Define the main data type that combines all sections
export interface StoreTableProps {
  storeData: StoreTableData[];
}

export interface AgreementInfo {
  manufacturer_id: number;
  agreementInfo: {
    status: "enrolled" | "available";
    id: number;
    name: string;
    endDate: string;
  }[];
}

export interface StoreDetailTableProps {
  programData: ProgramData;
  storeId: string;
  wishlist?: WishlistProducts[];
  orders?: any[];
  programTimeline?: string;
  chainData?: any; // Original chain data with storeCompliance arrays
  chainStoresData?: any; // Chain stores data from chain details API
  isChainStoreProgram?: boolean;
  storeTabOptions?: string;
  agreementInfo?: AgreementInfo[];
}

export interface ProgramEnrollTableProps {
  id?: string;
  programs: EnrolledProgram[];
  displaySavingsColumn?: boolean;
  savingsOpp?: boolean;
  storeId: string;
  programTimeline?: string;
  chainData?: any; // Original chain data with storeCompliance arrays
  chainStoresData?: any; // Chain stores data from chain details API
  isChainStoreProgram?: boolean;
  isEnrolled?: boolean;
  showEnrollButton?: boolean;
  selectedProgramIds?: Set<number>;
  onProgramSelectionChange?: (programId: number, isSelected: boolean) => void;
  showCheckboxes?: boolean;
  /** Manufacturer IDs that should show a pending spinner instead of a checkbox */
  processingManufacturerIds?: number[];
  onAgreementSelection?: (programId: number, agreementIds: number[]) => void;
  onEllipsisClick?: (
    manufacturerId: number,
    action: "enroll" | "unenroll"
  ) => void;
  agreementInfo?: AgreementInfo[];
  manufacturerAgreementSelections?: Map<number, Set<number>>;
  onManufacturerAgreementChange?: (
    manufacturerId: number,
    agreementIds: Set<number>
  ) => void;
  onSelectAll?: () => void;
  isSelectAllChecked?: boolean;
}

export interface StoreDetailsModalProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  data: EnrolledProgram;
  avtarCenter?: boolean;
  setIsDetailOpen?: (index: any, title: any) => void;
  storeId?: string;
  isStoreEnrolled?: boolean;
  tierIndex?: number;
  setTierIndex?: (val: number | undefined) => void;
  modalDetailAPICallDisable?: boolean;
  addStoreIntialToTitle?: boolean;
  hideIncrementalEarnings?: boolean;
  id?: string;
  selectedWarehouseId?: string;
  programTimeline?: string;
  isChainPrograms?: boolean;
  onStoreInfoUpdate?: (storeName?: string, externalStoreId?: string) => void;
  agreementId?: string | number | string[]; // Single agreement ID or comma-separated string of IDs
}

export interface ProgramStoresListingDataProps {
  programTitle: string;
  programId: number;
  programDetailId: number;
  manufacturerId: number;
  programIndex: number;
  completedComplianceEntityIds?: number[];
  storeId?: number;
}
export interface ProgramStoresListingModalProps {
  data: ProgramStoresListingDataProps | null;
  stores?: { name: string; id: number }[];
  onClose: () => void;
  viewDetails: (data: ProgramStoresListingDataProps) => void;
}

export interface ManufacturerStoreDetailsModal {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  data: StoreTableData | null;
  storeId?: string;
}

export interface TierDetailsModalData {
  totalPotentialSavings: string;
  additionalInfo: string;
  title: string;
  skus?: {
    total: number;
    completed: number;
  };
  overview: string;
  products: ManufacturerProduct[];
  purchasedProducts?: ManufacturerProduct[];
  progressAchieved?: string[];
  graph?: {
    [label: string]:
      | {
          chartColor?: string;
          completed: number;
          total: number;
        }
      | undefined;
  };
  totalRebate?: string;
  rebate_type?: string;
  rebate_amount?: string;
  rebate_percentage?: string;
  isRebateBasedOnListPrice?: boolean;
  categorizedProducts?: CategorizedProducts;
  fixed_rebate_amount?: string;
  earnedRebate?: number;
  totalOppSavings?: TotalOppSavings;
  rebateRange?: string;
}

export interface TierDetailsModalProps {
  isOpen: boolean;
  setIsOpen: (val: boolean, openParentModal?: boolean) => void;
  data: TierDetailsModalData | null;
  showBackArror?: boolean;
  isLoading?: boolean;
  manfData?: any;
  skuLabel?: string;
  skuTitleLabel?: string;
  totalRebate?: string;
  showPurchasedProductsButton?: boolean;
  showCategorizedProducts?: boolean;
  isStoreEnrolled?: boolean;
  formatEarnedRebate?: boolean;
  addStoreIntialToTitle?: boolean;
  canAddToWishlist?: boolean;
  customEarningLabel?: string;
  showDistributorCode?: boolean;
  showStoreCompliance?: boolean;
  showProductsUpcCode?: boolean;
  hideProductsUpcCodeOnPurchasedShow?: boolean;
  allPurchasedProducts?: ManufacturerProduct[];
  id?: string;
  storeId?: string;
  externalStoreId?: string;
  manufacturerId?: string;
  showRebateRange?: boolean;
  storeName?: string;
}

// Test Type
export interface StoreListingApiResType {
  stores: StoreTableData[];
  totalStores: number;
  currentPage: number;
  totalPages: number;
  pageVariable?: string;
  manufacturerId?: number;
  manufacturerName?: string;
  manufacturerLogo?: string;
  isDistributorStores?: boolean;
  isStoresPrograms?: boolean;
  isStoreEnrolled?: boolean;
  isPrograms?: boolean;
  isSalesRep?: boolean;
  canInvite?: boolean;
  enablePurchaseSorting?: boolean;
  isAuthorizedManufacturer?: boolean;
  showEarningOpportunity?: boolean;
  salesReps?: any[];
  id?: string;
  showEnrollButton?: boolean;
  selectedWarehouseId?: string;
  programTimeline?: string;
  isChainsView?: boolean;
  chainStoresData?: any;
  disableChainExpansion?: boolean;
  isChainProgramsView?: boolean;
  isInternal?: boolean;
  isIndependentStores?: boolean;
  showNearToCompliancePercentage?: boolean;
  programIds?: number[];
  onDataRefresh?: () => void;
  isLoadingTable?: boolean;
  showAnnualPurchaseVolume?: boolean;
  showCheckbox?: boolean;
  selectedStores?: string[];
  setSelectedStores?: (storeIds: string[]) => void;
  onSingleStoreEnroll?: (
    storeId: string,
    action: "enroll" | "unenroll"
  ) => void;
  /**
   * Store IDs that should show a pending spinner (persisted by parent).
   * Use a string[] so it can be passed via props without Set identity issues.
   */
  processingStoreIds?: string[];
  agreementId?: string | number | string[]; // Single agreement ID or comma-separated string of IDs
}

export interface DistributorSalesRepsListingApiResType {
  salesReps: { id: string; name: string }[];
}

export interface StoreListingApiResType {
  stores: StoreTableData[];
  totalStores: number;
  currentPage: number;
  totalPages: number;
  pageVariable?: string;
  showAnnualPurchaseVolume?: boolean;
}

export interface StoreWishlistProps {}

export interface NearComplianceProgramData {
  manufacturer_id: number;
  manufacturer_name: string;
  program_id: number;
  program_name: string;
  compliance_percentage: number;
  missing_products: any[];
  earning_opportunity: number;
}

export interface NearComplianceStoreData {
  store_id: number;
  store_name: string;
  programs: NearComplianceProgramData[];
}

export interface SpiffEarningManufacturerProgramDetail {
  id: number;
  name: string;
  overview: string;
  startDate: Date;
  endDate: Date;
  spiffEarning: number;
}

export interface SpiffEarningStoreManufacturerDetail {
  id: number;
  name: string;
  logo: string;
  spiffEarning: number;
  programs?: SpiffEarningManufacturerProgramDetail[];
}

export interface SpiffEarningStoreDetail {
  name: string;
  storeId: number;
  totalSpiffEarning?: number;
  manufacturers?: SpiffEarningStoreManufacturerDetail[];
  totalAvailablePrograms: number;
}
