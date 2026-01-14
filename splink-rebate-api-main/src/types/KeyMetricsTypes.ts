export interface KeyMetrics {
  totalSavings: number;
  totalPurchaseVolume: number;
  relevantPurchaseVolume?: number;
  storesCount: number;
  activeStoresCount?: number;
  manufacturersCount: number;
  /** Total number of stores enrolled in at least one program. */
  enrolledStoreCount?: number;
  activeStoresProgramsEnrolled?: number;
  /** Total earnings for all sales representatives under the distributor. */
  salesRepTotalEarnings?: number;
  /** Total earnings for sales rep managers under the distributor (hardcoded to 0 for now). */
  salesRepManagerTotalEarnings?: number;
}

export interface ManufacturerKeyMetrics {
  totalSales: any;
  totalDistributors: number;
  totalStores: {
    storesCount: number;
    activeStores: number;
  };
  storesEnrolledInProgramsCount: number;
}

export interface ManufacturerTopSellingProduct {
  id: number;
  color?: string;
  units?: number;
  unitsYoy?: number;
  sales?: number;
  salesYoy?: number;
  storePenetration?: string;
  storePenetrationYoy?: string;
}

export interface ManufacturerProductInsightsGrowth {
  chartData?: any[];
  storePenetrationChartData?: any[];
}
export interface ManufacturerProductInsightsKeyMetrics {
  totalSales?: {
    value: number;
    yoy?: number;
  };
  activeStores?: {
    value: number;
    yoy?: number;
  };
  units?: {
    value: number;
    yoy?: number;
  };
  relativeShare?:
    | {
        totalSales?: number;
        activeStores?: number;
        units?: number;
      }
    | undefined;
  latestTransactionDate?: Date | null;
}

export interface ManufacturerTopProductsOptimized {
  topProducts?: ManufacturerTopSellingProduct[];
}

export interface ManufacturerDistributorSales {
  chartData?: any[];
  growth?: {
    chartData?: any[];
  };
}

export interface ManufacturerStorePenetration {
  storePenetrationChartData?: any[];
  growth?: {
    storePenetrationChartData?: any[];
  };
}

export interface ManufacturerProductInsights
  extends ManufacturerProductInsightsKeyMetrics {
  topProducts?: ManufacturerTopSellingProduct[];
  chartData?: any[];
  storePenetrationChartData?: any[];
  growth?: ManufacturerProductInsightsGrowth;
  latestTransactionDate?: Date | null;
}

export interface SalesRepKeyMetrics {
  totalEarning: number;
  totalStores: number;
  totalStoreProgram: number;
  totalActiveStores: number;
  pendingPayoutEarning?: number;
}

export interface CustomBarChartDataItem {
  date: string;
  purchase: number;
}
