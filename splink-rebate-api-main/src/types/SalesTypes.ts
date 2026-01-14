export interface BarChartData {
  date: string;
  sales: number;
}

export interface MySalesResponseItem {
  barChartData: BarChartData[];
}

export interface MySalesResult {
  totalSale: number;
  barChartData?: BarChartData[];
}

export interface MySalesResponse {
  [key: string]: MySalesResult;
}

export interface SalesResponseWithCategories {
  result: MySalesResponse;
  categories: Array<{ id: number; name: string }>;
  latestTransactionDate?: Date | null;
}

export interface SalesDataAttributes {
  day?: Date;
  month?: Date;
  total_sales: string;
}

export interface SalesDataItem {
  date: Date;
  get: () => SalesDataAttributes;
  day?: Date;
  month?: Date;
  total_sales: string;
}
