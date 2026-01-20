import {
  Manufacturer,
  ManufacturerProduct,
  PurchaseVolume
} from "@/types/StoreTypes";
import { DistributorProgram, Product } from "./ProgramTypes";

export interface ProgramComplianceDetails {
  programId?: number;
  programName: string;
  compliancePercentage: number;
  totalRebate: number;
  programStartDate?: string;
  programEndDate?: string;
  overview?: string;
  rebate_percentage?: string;
  rebate_type?: string;
  rebate_amount?: string;
  isRebateBasedOnListPrice?: boolean;
}

export interface DistributorDetails {
  id: number;
  name: string;
  totalStores: number;
  totalSales: number;
  location: string;
  details: ProgramComplianceDetails[];
}

export interface ProgramsComplianceDetailsResponse {
  distributorList: DistributorDetails[];
  allComplianceDetails: ProgramComplianceDetails[];
}

export interface DistributorProgramDetailsModalData {
  manufacturer?: Manufacturer;
  purchasedVolume?: PurchaseVolume;
  additionalInfo?: string;
  requiredProducts?: Product[];
  purchasedProducts?: Product[];
}

export interface DistributorProgramDetailsModalProps {
  isOpen: boolean;
  showEstimatedWarning?: boolean;
  showEstimatedEarning?: boolean;
  setIsOpen: (val: boolean) => void;
  criteriaType: string;
  programData: DistributorProgram;
  totalPurchaseVolume?: number;
  allPurchasedProducts?: ManufacturerProduct[];
  showSavingsNotApplicable?: boolean;
  warehouseId?: string;
  warehouses?: any[];
}

// ROI Types
export interface ManufacturerROIData {
  id: number;
  manufacturerId: number;
  programId: number;
  distributorId: number | null;
  rebateType: "STORE" | "SALES_REP";
  costOfProgram: string;
  currentYearProgramProductSales: string;
  previousYearProgramProductSales: string;
  salesToCostRatio: number;
  incrementalSalesLift: number;
  newDoorsCount: number;
  lastYearDoorsCount: number;
  newDoorsPercentage: number;
  newPodCount: number;
  totalPodCount: number;
  newPodPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface ManufacturerROIResponse {
  status: "success" | "error";
  data?: ManufacturerROIData[];
  message?: string;
}
