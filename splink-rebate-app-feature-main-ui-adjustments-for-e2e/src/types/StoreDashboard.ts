export interface StoreDashboardPageProps {
  programTimeline: string;
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

export interface TierAchievedData {
  value: number;
}

export interface StoreDashboardCardsProps {
  data: {
    TotalSavingsCardData: TotalSavingsCardData;
    SavingsOppCardData: SavingsOppCardData[];
    TotalSalesData: TotalSavingsCardData;
    TierAchievedData: TierAchievedData;
  };
}
