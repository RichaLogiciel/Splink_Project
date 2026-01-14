import { StoreProgramData } from "./SalesRepTypes";
import type { StoreEnrollmentStatusValue } from "../models/StoreEnrollmentStatus";

export interface Store {
  id: number;
  externalStoreId?: string | number;
  enrollmentStatus?: StoreEnrollmentStatusValue;
  userInfo: {
    id: number;
    status: string;
  };
  storeInfo: {
    name: string;
    location: string;
    rep: {
      name: string;
      associatedUserId?: number;
    };
    distributor?: {
      id: number;
      name: string;
    };
  };
  salesData: {
    purchaseVolume: {
      amount: number;
    };
    totalSavings: {
      amount: number | null;
    };
    totalOppSavings?:
      | {
          amount: number | null;
        }
      | undefined;
    annualPurchaseVolume?: {
      amount: number;
    };
    purchasedSkus?: string[];
  };
  programData?: {
    completedPrograms?: number;
    totalEnrolled?: number;
    enrolledProgram?: StoreProgramData[];
    remainingProgram?: StoreProgramData[];
    enrolledProgramIds?: number[];
    isEnrolled?: boolean;
  };
  salesRepSpiffData?: {
    totalSpiffEarning?: number;
    totalSpiffPrograms?: number;
  };
  chainId?: number;
  chainNames: string;
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
export interface FormattedStoredData {
  stores: Store[];
  totalStores: number;
  currentPage: number;
  totalPages: number;
}

export interface GetManufacturerProductsParams {
  manufacturerId: number;
  distributorId?: number;
  categoriesId?: number;
  storeId?: number;
  selectedWarehouseId?: number;
  categoryTagsJSON?: string[];
  excludeCategoryFlags?: boolean;
}

export interface SpiffEarningManufacturerProgramDetail {
  id: number;
  name: string;
  overview: string;
  startDate: Date;
  endDate: Date;
  spiffEarning: number;
  // spiffOpportunityAmount?: number;
  rebate?: {
    rebateAmount: number;
    rebatePercentage: number;
    rebateType: string;
    criteria: null | string;
  };
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
