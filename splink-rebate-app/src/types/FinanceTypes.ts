export interface FinancePageProps {}

export interface FinanceSummaryCardProps {
  title: string;
  options: { title: string; amount: number }[];
  total: number;
}

export interface FinancePaymentCardProps {
  options: { date: string; amount: number }[];
  buttonTitle?: string;
}

export interface FinancePaymentHistoryCardProps {
  history: { date: string; amount: number }[];
}

export interface AccordionItemProps {
  title: React.ReactNode;
  content: React.ReactNode;
}
