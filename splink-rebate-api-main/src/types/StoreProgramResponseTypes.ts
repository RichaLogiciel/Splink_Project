export interface ProgramListingCard {
  id: string;
  manufacturer: ProgramManufacturer;
  salesData: SalesData;
  programs: DistributorProgram[];
  products?: ProgramProduct[];
  additionalInfo: AdditionalInfoForCard;
  tierDetails: TierDetail[];
}

export interface ManufacturerProgramCard {
  storeId?: number;
  id: string;
  manufacturer: ProgramManufacturer;
  salesData: SalesData;
  programs: DistributorProgram[];
}
export interface StoreDashboardData {
  TotalSavingsCardData: TotalSavingsCardData;
  SavingsOppCardData: SavingsOppCardData[];
  TotalSalesData: TotalSavingsCardData;
  TierAchievedData: TierAchievedData;
  programList: ProgramListingCards[];
}

export interface SalesData {
  purchaseVolume: PurchaseVolume;
  totalSavings: TotalSavings;
  totalOppSavings: TotalOppSavings;
  totalSalesRepSpiff: TotalSalesRepSpiff;
}

export interface DistributorProgram {
  programId: number;
  programTier: number;
  type: string;
  rebate: string;
  rebateType: string; // Allows for percentages or fixed values
  overview: string;
  paymentTerms: string;
  complianceStatus: boolean;
  additionalInfo: AdditionalInfo;
  complianceid: number;
  programdetailId: number;
}

export interface ProgramProduct {
  image: string;
  name: string;
  extraInfo: string;
}

export interface ProgramManufacturer {
  avatar: string;
  name: string;
}

export interface AdditionalInfo {
  title: string;
  info: string;
  distributionTarget: DistributionTarget;
  totalSavings: TotalSavings;
}

export interface DistributionTarget {
  total: number;
  completed: number;
}

export interface PurchaseVolume {
  amount: number;
  yoy: number; // Year-over-year growth
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
export interface TierDetail {
  title: string;
  description: string;
  SKU: SKU;
  totalPotenialSavings: number;
}

export interface SKU {
  completed: number;
  total: number;
  chartColor: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ProgramListingCards extends ProgramListingCard {}

export interface AdditionalInfoForCard {
  note: string;
  products: AdditionalInfoProduct[];
}

export interface AdditionalInfoProduct {
  name: string;
  image: string;
  extraInfo: string;
  wishlist: boolean;
}

export interface TierAchievedData {
  total?: number;
  completed?: number;
}

export interface TotalSavingsCardData {
  value: number;
  yoyValue?: number;
  info?: string;
  footerInfo?: string;
  link?: {
    label?: string;
    href?: string;
  };
}

export interface SavingsOppCardData {
  label: string;
  value: number;
  info: string;
}
