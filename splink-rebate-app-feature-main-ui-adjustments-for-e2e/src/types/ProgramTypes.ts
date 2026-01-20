import { CategorizedProducts, ManufacturerProduct } from "./StoreTypes";

export interface Manufacturer {
  id?: number;
  avatar: string;
  name: string;
  authorized?: boolean;
  nameValue?: string;
}

export interface PurchaseVolume {
  amount: number;
  yoy: number;
}

export interface TotalSavings {
  amount: number;
  yoy: number;
}

export interface TotalOppSavings {
  amount: number;
}

export interface TotalSalesRepSpiff {
  amount: number;
}

export interface TotalStoreEnrolled {
  total: number;
  enrolled: number;
}

export interface SalesData {
  purchaseVolume: PurchaseVolume;
  totalSavings: TotalSavings;
  totalOppSavings: TotalOppSavings;
  totalSalesRepSpiff: TotalSalesRepSpiff;
}
export interface StoreDetailsSalesData {
  purchaseVolume: PurchaseVolume;
  totalSavings: TotalSavings;
  totalStoreEnrolled: TotalStoreEnrolled;
}

export interface TotalEarnings {
  amount: number;
}

export interface SalesRepProgram {
  type: string;
  rebate: number;
  rebateType?: string;
  overview: string;
  paymentTerms: string;
  storesCompliant: number;
  totalEarnings: TotalEarnings;
  startDate?: string;
  endDate?: string;
  programType?: string;
  programLine?: string;
  programName?: string;
}

export interface StoreCompliance {
  total: number;
  completed: number;
}
export interface RetailerProgram {
  type: string;
  rebate: number;
  rebateType?: string;
  overview: string;
  description?: string;
  storeCompliance: StoreCompliance;
  totalSaving: TotalSavings;
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
  totalCategoriesQuantity?: { required: number; purchased: number };
  rebateRange?: string;
}

export interface ChainStore {
  storeId: number;
  storeName: string;
  distributorId: number;
  totalAvailablePrograms: number;
  totalEnrolledPrograms: number;
  totalCompliantPrograms: number;
  overallComplianceStatus: string;
  programEnrollment: ChainProgramEnrollment[];
  enrolledProgramIds: number[];
}

export interface ChainProgramEnrollment {
  programId: number;
  programName: string;
  programType: string;
  programHeader: string;
  isEnrolled: boolean;
  isCompliant: boolean;
  totalPurchaseVolume: string | number;
  earnedRebate: string | number;
  complianceStatus: string;
}

export interface ChainAvailableProgram {
  programId: number;
  programName: string;
  programType: string;
  programHeader: string;
  participantType: string;
  paymentTerm: string;
  programDetails: any[];
}

export interface ChainStoreComplianceBreakdown {
  fullyCompliant: number;
  partiallyCompliant: number;
  nonCompliant: number;
  notEnrolled: number;
}

export interface ChainProgramSummary {
  programName: string;
  programType: string;
  totalStores: number;
  enrolledStores: number;
  compliantStores: number;
  totalPurchaseVolume: string | number;
  totalEarnedRebate: string | number;
}

export interface ChainInformation {
  chainId: number;
  chainName: string;
  stores: ChainStore[];
  totalStores: number;
  totalAvailablePrograms: number;
  availablePrograms: ChainAvailableProgram[];
  storeComplianceBreakdown: ChainStoreComplianceBreakdown;
  programEnrollmentSummary: { [key: string]: ChainProgramSummary };
}

export interface DistributionTarget {
  total: number;
  completed: number;
}

export interface AdditionalInfo {
  title: string;
  info: string;
  distributionTarget: DistributionTarget;
  totalSavings: TotalSavings;
  description: string;
}

export interface DistributorDetailedProgram {
  salesRep: SalesRepProgram[];
  distributor: DistributorProgram[];
  retailer?: RetailerProgram[];
}

export interface StoreDetailProgram {
  retailer: RetailerProgram[];
  chain: ChainInformation[];
}

export interface Product {
  id?: number;
  image?: string;
  name: string;
  extraInfo?: string;
  size?: string;
  caseSkusId?: string;
}

export interface DistributorProgram {
  overview: string;
  paymentTerms: string;
  id: number;
  programDetailId: number;
  type: string;
  rebateType?: string;
  criteria?: string;
  complianceStatus: boolean;
  rebate: string;
  rebateValue?: string;
  earnedRebate?: number;
  additionalInfo: AdditionalInfo;
  complianceTotalPurchased?: string;
  product_tags?: {
    key: string;
    value: number;
  }[];
  graph?: {
    [label: string]:
      | {
          chartColor?: string;
          completed: number;
          total: number;
        }
      | undefined;
  };
  progressText?: {
    sku: {
      completed: number;
      total: number;
    };
    label: string;
  }[];
  programEntityType?: string;
  qualifiedComliances?: number;
  categorizedProducts?: CategorizedProducts;
  completedComplianceEntityIds?: number[];
  isRebateBasedOnListPrice?: boolean;
  startDate?: string;
  endDate?: string;
  rebateRange?: string;
  programType?: string;
  programLine?: string;
  programName?: string;
  // SPIFF V2 specific void fill fields
  total_void?: number;
  void_filled?: number;
}

export interface DistributorProgramDetail {
  id: string;
  manufacturer: Manufacturer;
  salesData: SalesData;
  programs: DistributorDetailedProgram;
  products: Product[];
  purchasedProducts: ManufacturerProduct[];
  categorizedProducts?: CategorizedProducts;
}

export interface StoreProgramDetail {
  id: string;
  manufacturer: Manufacturer;
  salesData: StoreDetailsSalesData;
  programs: StoreDetailProgram;
  products: Product[];
  categorizedProducts?: CategorizedProducts;
}

export interface ProgramListingCard {
  id: string;
  manufacturer: Manufacturer;
  salesData: SalesData;
  programs: DistributorProgram[];
  products?: Product[];
  programPaymentTerm?: string;
  isEnrolled?: boolean;
  startDate?: string;
  endDate?: string;
}

// Additional types for program tables
export interface DistributorProgramTableType {
  id?: string;
  showEstimatedWarning?: boolean;
  manufacturerId: number;
  programs: DistributorProgram[];
  totalPurchaseVolume?: number;
  allPurchasedProducts?: ManufacturerProduct[];
  showEstimatedEarning?: boolean;
  showSavingsNotApplicable?: boolean;
  warehouseId?: string;
  warehouses?: any[];
}

export interface SalesRepProgramTableType {
  id?: string;
  programs: (SalesRepProgram | DistributorProgram)[];
}

export interface RetailerProgramTableType {
  id?: string;
  programs: RetailerProgram[];
  manufacturerData?: Manufacturer;
  storeComplianceTotal?: number;
  showPurchasedProductsButton?: boolean;
  showStoreCompliance?: boolean;
  showProductsUpcCode?: boolean;
  hideProductsUpcCodeOnPurchasedShow?: boolean;
  allPurchasedProducts?: ManufacturerProduct[];
  complianceLabel?: string;
  hideCompianceColumn?: boolean;
  showProgramSpecificEnrollments?: boolean;
  isComplianceDetailLoading?: boolean;
}
