"use client";

// Import Core functionality/component
import React, { useEffect, useRef, useState } from "react";

// Import Types
import { TabProps, TabsProps } from "./TabsTypes";

import { useRouter, useSearchParams } from "next/navigation";

// Import Icons

const Tab: React.FC<TabProps> = ({ children }) => {
  return <>{children}</>;
};

const Tabs: React.FC<TabsProps> = ({
  children,
  className = "",
  labelClass = "",
  contentClass = "",
  activeClass = "",
  labelContainerClass = "",
  autoAdjustHeight = true,
  defaultTab = 0,
  selectedTab,
  tabSearchParamKey = "tab",
  resetTabs = null,
  disableRouterPush = false,
  showPurchasedProductsButton = false,
  showPurchasedProducts = false,
  handleShowPurchasedProducts,
  paddingY = "py-6",
  displayLabels = true,
  customTabElementInEnd = null,
  headerClass = ""
}) => {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<number | null>(defaultTab);
  const [tabHeight, setTabHeight] = useState<number | null>(0);

  // Correctly typing useRef for HTMLDivElement and handling null
  const tableRef = useRef<HTMLDivElement | null>(null);

  // Set initial height of the active tab content
  useEffect(() => {
    if (tableRef.current && autoAdjustHeight) {
      setTabHeight(tableRef.current.clientHeight);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (selectedTab != undefined && activeTab != selectedTab) {
      setActiveTab(selectedTab);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTab]);

  const handleResetTabs = () => {
    // Create a new URLSearchParams instance to modify the current query params
    const params = new URLSearchParams(searchParams.toString());
    // Remove the storeDetailProductTab query parameter
    params.delete(tabSearchParamKey);
    // Update the URL without refreshing the page
    router.replace(`?${params.toString()}`, {
      scroll: false
    });
  };

  useEffect(() => {
    if (resetTabs && !disableRouterPush) {
      handleResetTabs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetTabs]);

  useEffect(() => {
    setActiveTab(
      Number(searchParams.get(tabSearchParamKey) ?? defaultTab) || 0
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTabClick = (index: number) => {
    if (!disableRouterPush) {
      const currentParams = new URLSearchParams(searchParams.toString());

      // Update or set the tabSearchParamKey with the new tab index
      currentParams.set(tabSearchParamKey, index.toString());

      // Update the URL with the new query parameters
      router.push(`?${currentParams.toString()}`, { scroll: false });
    }

    setActiveTab(index);
  };

  const tabLabels = React.Children.map(children, (child, index) => {
    if (React.isValidElement(child)) {
      const { label } = child.props as TabProps;

      return (
        <div className="relative">
          <button
            key={index}
            className={`pb-3 font-medium text-sm sm:text-base ${labelClass} ${
              activeTab === index ? activeClass || "text-green" : ""
            }`}
            onClick={() => handleTabClick(index)}
          >
            {label}
          </button>
          {activeTab === index && (
            <div className="absolute border-b-2 border-green bottom-0 w-full" />
          )}
        </div>
      );
    }
  });

  // Render all tabs with conditional visibility to prevent unmount/mount flicker
  const allTabsContent = React.Children.map(children, (child, index) => {
    if (React.isValidElement(child)) {
      return (
        <div
          key={index}
          style={{
            display: activeTab === index ? "block" : "none",
            // Use content-visibility for performance optimization on hidden tabs
            contentVisibility: activeTab === index ? "visible" : "auto"
          }}
          className="tab-panel"
        >
          {child}
        </div>
      );
    }
  });

  return (
    <div
      style={{ minHeight: tabHeight + "px" }}
      ref={tableRef}
      className={`customTabs py-5 px-3.5 ${className}`}
    >
      {displayLabels && (
        <div
          className={`product-list-header flex justify-between flex-wrap gap-4 ${headerClass}`}
        >
          <div
            className={`tab-label-container min-h-9 tab-labels flex gap-8 text-base ${labelContainerClass}`}
          >
            {tabLabels}

            {customTabElementInEnd}
          </div>
          {showPurchasedProductsButton && (
            <div className="relative display-products-only-container flex items-center gap-4 mb-2">
              <div className="flex items-center">
                <label className="flex items-center cursor-pointer select-none">
                  <span className="text-xs sm:text-sm font-medium text-filter-light mr-3">
                    {showPurchasedProducts ? "Hide" : "Show"} Purchased
                  </span>
                  <input
                    type="checkbox"
                    id="showPurchasedOnly"
                    checked={showPurchasedProducts}
                    onChange={handleShowPurchasedProducts}
                    className="sr-only"
                  />
                  <span
                    className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ${showPurchasedProducts ? "bg-green" : "bg-gray-300"}`}
                  >
                    <span
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${showPurchasedProducts ? "translate-x-4" : ""}`}
                    ></span>
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>
      )}
      <div className={`tab-content border-t ${paddingY} ${contentClass}`}>
        {allTabsContent}
      </div>
    </div>
  );
};

export { Tab, Tabs };
