export interface MySalesBarChartData {
  date: string;
  sales: number;
  totalSale?: undefined | number;
}
export interface MySalesRecord {
  totalSale: number;
  barChartData: MySalesBarChartData[];
}
export interface MySales {
  [key: string]: MySalesRecord;
}
export interface SalesRepData {
  user_id: number;
  name: string;
  earnedRebate: string;
  storesCount: number;
}
export interface SalesRepEarnings {
  totalSalesReps: number;
  totalEarnings: string;
  salesRepData: SalesRepData[];
}
export interface ProgramData {
  totalSavings: string;
  manufacturerId: number;
  manufacturerName: string;
  logo: string;
  salesVolume: string;
}
export interface StoreProgramOverview {
  topPerformingPrograms: ProgramData[];
  bottomPerformingPrograms: ProgramData[];
}
export interface TopSavings {
  totalSavings: string;
  salesVolume: string;
  manufacturerId: number;
  manufacturerName: string;
}
export interface KeyMetrics {
  totalSavings: number;
  totalPurchaseVolume: number;
  storesCount: number;
  manufacturersCount: number;
}
export interface DashboardAPIsState {
  loading: boolean;
  data: {
    keyMetrics: KeyMetrics;
    topSavings: TopSavings[];
    storeProgramOverview: StoreProgramOverview;
    salesRepEarnings: SalesRepEarnings;
    mySales: MySales;
  };
  errorShown: {
    keyMetrics: boolean;
    topSavings: boolean;
    storeProgramOverview: boolean;
    salesRepEarnings: boolean;
    mySales: boolean;
  };
}
export interface BarChartCustomConfig {
  barSize: number;
  padding: number;
}

export interface DistributorBarSizeByMonth {
  [key: number]: BarChartCustomConfig;
}

export interface BarChartDataItem {
  date: string;
  sales: number;
}
export interface DistributorSalesData {
  totalSale: number;
  barChartData: BarChartDataItem[];
}
export interface MonthlyDistributorSalesData {
  [key: string]: DistributorSalesData;
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

export interface ManufacturerProductInsightsKeyMetric {
  totalSales: {
    value: number;
    yoy?: number;
  };
  activeStores: {
    value: number;
    yoy?: number;
  };
  units: {
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
}

export interface ManufacturerProductInsights
  extends ManufacturerProductInsightsKeyMetric {
  topProducts?: ManufacturerTopSellingProduct[];
  chartData?: any[];
  storePenetrationChartData?: any[];
  growth?: ManufacturerProductInsightsGrowth;
}
