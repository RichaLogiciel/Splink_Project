export interface SalesRepData {
  userId?: number;
  name: string;
  earnedRebate: number;
  entityId: number | null;
  storesCount: number;
}

export interface SalesRepEarnings {
  name: string;
  storesCount: number;
  totalEarnedRebate: number;
  salesRepId?: number;
  storeIds?: number[];
  salesManagerIds?: number[];
  salesManagerNames?: string[];
  salesManagerTitles?: string[];
}

export interface DistSalesRepEarningsResponse {
  salesRepData: SalesRepEarnings[];
  totalEarnings: string;
  totalSalesReps: number;
}

export interface StoresListingData {
  storename: string;
  totalamount: string;
  name: string;
  role: string;
  userid: number;
  distributorid: number;
  storeid: number;
  store_city: string | null;
  store_state: string | null;
  total_enrolled_programs: number;
  enrolled_programs_ids: number[];
  store_user_id: number;
  store_user_status: string;
  chain_names?: string;
  externalStoreId?: string | number;
  earned_rebate?: number;
  completed_programs?: number;
  earning_opportunity?: number;
  totalSpiffEarning?: number;
  availableSpiffPrograms?: number;
  nearComplianceData?: Array<{
    manufacturerId: number;
    manufacturerName: string;
    highestCompliancePercentage: number;
    programId: number;
    programName: string;
    tier: number;
    requiredCount: number;
    purchasedCount: number;
  }>;
}

export interface CategorizedProducts {
  [label: string]: {
    sortOrder?: number;
    note?: string;
    requiredProducts: ManufacturerProduct[];
    purchasedProducts: ManufacturerProduct[];
    graph?: {
      SKUs?: {
        completed: number;
        total: number;
      };
    };
  };
}

export interface ManufacturerTierDetail {
  title: string;
  tier?: number;
  SKU?: {
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
  overview?: string;
  rebate_calculation?: string;
  rebate_amount?: string;
  fixed_rebate_amount?: string;
  rebate_percentage?: string;
  rebate_type?: string;
  programDetailId?: number;
  programId?: number;
  purchaseVolume?: number;
  estimatedEarnings?: number;
  rebate_opportunity?: number | string;
}

export interface ManufacturerProduct {
  id?: number;
  image?: string;
  name: string;
  is_warehouse_specific_product?: boolean;
  caseSkusId?: string | null;
  size?: string;
  extraInfo?: string;
  wishlist?: boolean;
  internalCode?: string | null;
  oldInternalCode?: string | null;
  lastTransactionDate?: Date | string | null;
}

export interface Manufacturer {
  id: number;
  avatar: string;
  name: string;
  tierDetails?: ManufacturerTierDetail[];
  additionalInfo?: {
    note: string;
    products: ManufacturerProduct[];
    recommendedProducts?: ManufacturerProduct[];
    purchasedProducts?: ManufacturerProduct[];
  };
}

export interface ProgramCompliance {
  total: number;
  completed: number;
}

export interface PurchaseVolume {
  amount: number;
}

export interface TotalSavings {
  amount: number;
  yoy?: number;
}

export interface StoreProgramData {
  totalEnrolledPrograms: number;
  completedPrograms: number;
  programId: number;
  manufacturerId: number;
  earnedRebate: string;
  isQualified: boolean;
  isEnrolled: boolean;
  manufacturer: Manufacturer;
  programCompliance: ProgramCompliance;
  purchaseVolume: PurchaseVolume;
  totalSavings: TotalSavings;
}

export interface SalesRepEaring {
  manufacturerId: number;
  logo: string;
  manufacturerName: string;
  totalEarnedRebate: string;
}

export interface SPIFFOpportunityTierDetails {
  programId: number;
  programDetailId: number;
  rebateAmount: number;
  overview: string;
}

export interface SPIFFOpportunityModalData {
  totalSpiffEarning?: number;
  totalSpiffEarningOpp?: number;
  tierDetails?: SPIFFOpportunityTierDetails[];
  quantitySold?: number;
  quantityType?: string;

  maxValue?: number;
  achivedValue?: number;
  achivedValueType?: string;

  storeTierDetails?: ManufacturerTierDetail[];

  categorizedProducts?: CategorizedProducts;

  graph?: {
    SKUs?: {
      completed: number;
      total: number;
    };
  };

  progressText?: string;
}
