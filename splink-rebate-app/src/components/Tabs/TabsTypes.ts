import { ReactNode } from "react";

export interface TabProps {
  label: string;
  children: ReactNode;
}

export interface TabsProps {
  children: ReactNode;
  className?: string;
  labelClass?: string;
  labelContainerClass?: string;
  contentClass?: string;
  activeClass?: string;
  autoAdjustHeight?: boolean;
  defaultTab?: number;
  selectedTab?: number;
  tabSearchParamKey?: string;
  resetTabs?: boolean | null;
  disableRouterPush?: boolean;
  showPurchasedProductsButton?: boolean;
  showPurchasedProducts?: boolean;
  handleShowPurchasedProducts?: () => void;
  paddingY?: string;
  displayLabels?: boolean;
  customTabElementInEnd?: ReactNode;
  headerClass?: string;
}
