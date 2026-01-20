"use client";

import { USER_ROLES } from "@/configs/roles";
import { APP_ROUTES } from "@/configs/routes";
import {
  SPIFF_OPPORTUNITIES_FEATURE,
  STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS,
  SPIFFS_ENABLED_FOR_DISTRIBUTOR_IDS,
  INTERNAL_INITIATIVE_ENABLED_FOR_DISTRIBUTOR_IDS
} from "@/utils/constants";
import { getUserClient } from "@/utils/getUserClient";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isDistributorFeatureEnabled } from "@/utils/helper";

interface StoreNavigationTabsProps {
  className?: string;
  showTabsForSalesRep?: boolean;
}

const StoreNavigationTabs: React.FC<StoreNavigationTabsProps> = ({
  className = "",
  showTabsForSalesRep = false
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("store_tab_options") || "0";

  // Don't render if feature is disabled
  if (!SPIFF_OPPORTUNITIES_FEATURE) {
    return null;
  }

  const user = getUserClient();
  const isSalesRepRole = user?.role === USER_ROLES.DISTRIBUTOR_SALES_REP;
  const isStoreProgrammingEnabled = isDistributorFeatureEnabled(
    user?.parentEntityId ?? user?.associatedUserId ?? null,
    STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
  );
  const isSpiffsEnabled = isDistributorFeatureEnabled(
    user?.parentEntityId ?? user?.associatedUserId ?? null,
    SPIFFS_ENABLED_FOR_DISTRIBUTOR_IDS
  );
  const isInternalInitiativesEnabled = isDistributorFeatureEnabled(
    user?.parentEntityId ?? user?.associatedUserId ?? null,
    INTERNAL_INITIATIVE_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  // Check if user should see "Store Opportunities" instead of "Store Rebates"
  const shouldShowStoreOpportunities =
    user?.associatedUserId === 55 || user?.parentEntityId === 55;

  // Check if user should see custom tab labels (FTG and NCDI) for distributor 327
  const distributorId = user?.parentEntityId ?? user?.associatedUserId ?? null;
  const shouldShowCustomLabels = distributorId === 327;

  // If we're on the store details page (with [id]), use tab-based navigation
  const isStoreDetailsPage =
    pathname.includes("/app/store/") && pathname.split("/").length > 3;

  const handleTabClick = (tab: string) => {
    if (isStoreDetailsPage) {
      // Store details page: Update query params
      const params = new URLSearchParams(searchParams.toString());
      params.set("store_tab_options", tab);
      // Remove the 'tab' parameter since it's not used in store details pages
      params.delete("tab");
      if (tab === "2") {
        params.set("isInternal", "true");
      } else {
        params.delete("isInternal");
      }
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    } else {
      // Main store page: Navigate to different routes
      switch (tab) {
        case "0":
          router.push(APP_ROUTES.store);
          break;
        case "1":
          router.push(APP_ROUTES.storeSpiff);
          break;
        case "2":
          router.push(APP_ROUTES.storeInternal);
          break;
      }
    }
  };

  // Determine active state based on context
  const getIsActive = (tab: string) => {
    if (isStoreDetailsPage) {
      return currentTab === tab;
    } else {
      switch (tab) {
        case "0":
          return pathname === APP_ROUTES.store;
        case "1":
          return (
            pathname.includes("/store/spiff") && !pathname.includes("internal")
          );
        case "2":
          return pathname.includes("/store/internal");
        default:
          return false;
      }
    }
  };

  // Only show SPIFF and Internal tabs if SPIFF feature is enabled
  // For Sales Rep users, tabs appear only when explicitly requested
  const canShowTabsForRole =
    !isSalesRepRole || (isSalesRepRole && showTabsForSalesRep);

  return (
    <div className={`py-5 mb-1 ${className}`}>
      <div className="min-h-9 flex gap-8 text-base border-b">
        {isStoreProgrammingEnabled && (
          <div className="relative">
            <button
              className={`pb-3 font-medium ${
                getIsActive("0") ? "text-green" : "text-filter-light"
              }`}
              onClick={() => handleTabClick("0")}
            >
              {shouldShowStoreOpportunities
                ? "Store Opportunities"
                : "Store Rebates"}
            </button>
            {getIsActive("0") && (
              <div className="absolute border-b-2 border-green bottom-0 w-full"></div>
            )}
          </div>
        )}
        {SPIFF_OPPORTUNITIES_FEATURE && canShowTabsForRole && (
          <>
            {isSpiffsEnabled && (
              <div className="relative">
                <button
                  className={`pb-3 font-medium ${
                    getIsActive("1") ? "text-green" : "text-filter-light"
                  }`}
                  onClick={() => handleTabClick("1")}
                >
                  {shouldShowCustomLabels ? "FTG" : "SPIFFs"}
                </button>
                {getIsActive("1") && (
                  <div className="absolute border-b-2 border-green bottom-0 w-full"></div>
                )}
              </div>
            )}
            {isInternalInitiativesEnabled && (
              <div className="relative">
                <button
                  className={`pb-3 font-medium ${
                    getIsActive("2") ? "text-green" : "text-filter-light"
                  }`}
                  onClick={() => handleTabClick("2")}
                >
                  {shouldShowCustomLabels ? "NCDI" : "Internal Initiatives"}
                </button>
                {getIsActive("2") && (
                  <div className="absolute border-b-2 border-green bottom-0 w-full"></div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StoreNavigationTabs;
