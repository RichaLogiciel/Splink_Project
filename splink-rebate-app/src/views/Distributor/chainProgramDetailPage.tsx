/* eslint-disable prettier/prettier */
"use client";

// Import core functionality
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";

// Import Components
import ManufacturerAvatar from "@/components/Avatar/ManufacturerAvatar";
import Card from "@/components/Card";
import DashboardCard from "@/components/Elements/DashboardCard";
import RetailerProgramTable from "@/components/Table/RetailerProgramTable";
import { Tab, Tabs } from "@/components/Tabs/Tabs";

// Import Utils
import { formatNumber } from "@/utils/numberFormatter";
import { getUserClient } from "@/utils/getUserClient";
import { isDistributorSalesRepManager } from "@/utils/rolesConditions";

// Import Images
import cartIcon from "@/assets/icons/cartIcon.svg";
import greenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import leftArrowIcon from "@/assets/icons/leftArrowIcon.svg";
import DownloadCSVButton from "@/components/Buttons/DownloadCSVButton";
import CategorizedTabProductList from "@/components/Elements/CategorizedTabProductList";
import SearchField from "@/components/SearchField";
import RecommendedProducts from "@/components/skeletons/RecommendedProducts";
import StoreProgramDetailTabs from "@/components/skeletons/StoreProgramDetailTabs";
import StoreProgramDetailTopInsights from "@/components/skeletons/StoreProgramDetailTopInsights";
import StoreTable from "@/components/Table/StoreTable";
import WarehouseSelectFilter from "@/components/WarehouseSelectFilter";
import { APP_ROUTES } from "@/configs/routes";
import { PAGINATION_PAGE_QUERY_PARAMS } from "@/utils/constants";
import {
  getProgramTimelineQueryParam,
  getRangeFromCommaString,
  getUrlWithQueryParam
} from "@/utils/helper";
import { getChainProgramDetails } from "@/views/Distributor/chainProgramDetailAPIsClient";
import { useCallback, useEffect, useState } from "react";

interface ChainProgramDetailProps {
  userId: number;
  params: { id: string }; // Capture dynamic route parameter
  searchParams: { [key: string]: string }; // Capture query parameters,
  isSalesRep?: boolean;
  warehouses?: any[];
}

const ChainProgramDetailPage = ({
  params,
  searchParams,
  isSalesRep = false,
  warehouses
}: ChainProgramDetailProps) => {
  const { id } = params;
  const {
    manufacturerName,
    s: searchQuery,
    enrolledPage,
    notEnrolledPage,
    sort,
    sortKey,
    warehouseId,
    isInternal
  } = searchParams;
  const programTimeline = getProgramTimelineQueryParam(
    searchParams?.programTimeline
  );
  const internalInitiative = searchParams?.isInternal === "true";
  const manufacturerId = Number(id);

  const [apiData, setApiData] = useState<any>();
  const [categorizedProducts, setCategorizedProducts] = useState({});
  const [loadingCategorizedProducts, setLoadingCategorizedProducts] =
    useState(true);
  const [loadingChainProgramDetails, setLoadingChainProgramDetails] =
    useState(false);

  // Get user to check if sales rep manager
  const user = getUserClient();
  const isSalesRepManager = isDistributorSalesRepManager(user?.role || "");

  // Enhanced chain program details API fetch function
  const fetchChainProgramDetails = useCallback(async () => {
    try {
      setLoadingChainProgramDetails(true);

      // Use the dedicated chain program details API
      const data = await getChainProgramDetails(
        manufacturerId,
        warehouseId,
        programTimeline,
        internalInitiative
      );

      setApiData(data || {});
    } catch (error) {
      console.error("Error fetching chain program details:", error);
      setApiData({});
    } finally {
      setLoadingChainProgramDetails(false);
    }
  }, [manufacturerId, warehouseId, programTimeline, internalInitiative]);

  // Note: Removed fetchChainsListing and fetchCategorizedProducts functions
  // as this data now comes from the main fetchChainProgramDetails call

  // Extract data from enhanced API response
  const {
    manufacturerName: apiManufacturerName,
    manufacturerLogo,
    authManufacturer,
    totalChains = 0,
    totalStores = 0,
    totalPurchaseVolume = 0, // Fixed field name from API
    totalEarnings = 0, // Fixed field name from API
    totalSaving = 0, // Fixed field name from API
    chainProgramOverview = [], // Enhanced endpoint includes this
    enrolledChains: apiEnrolledChains = [], // Enhanced endpoint includes this
    unenrolledChains: apiUnenrolledChains = [], // Enhanced endpoint includes this
    categorizedProducts: apiCategorizedProducts = {}, // Enhanced endpoint includes this
    manufacturerDetails = {},
    manufacturer = {}
  } = apiData || {};

  // Extract enrolled and unenrolled chains from chainProgramOverview
  const extractedEnrolledChains = new Map();
  const extractedUnenrolledChains = new Map();

  chainProgramOverview.forEach((program: any) => {
    if (program.chains && Array.isArray(program.chains)) {
      program.chains.forEach((chain: any) => {
        const chainKey = chain.chainId.toString();
        if (chain.isChainEnrolled) {
          if (!extractedEnrolledChains.has(chainKey)) {
            extractedEnrolledChains.set(chainKey, {
              id: chain.chainId,
              chainId: chain.chainId,
              name: chain.chainName,
              chainName: chain.chainName,
              totalStores: chain.totalStores,
              enrolledStores: chain.enrolledStores,
              compliantStores: chain.compliantStores,
              totalPurchaseVolume: chain.totalPurchaseVolume,
              totalEarnedRebate: chain.totalEarnedRebate,
              compliancePercentage:
                chain.totalStores > 0
                  ? (chain.compliantStores / chain.totalStores) * 100
                  : 0
            });
          } else {
            const existing = extractedEnrolledChains.get(chainKey);
            const updated = {
              ...existing,
              enrolledStores: existing.enrolledStores + chain.enrolledStores,
              compliantStores: existing.compliantStores + chain.compliantStores,
              totalEarnedRebate:
                existing.totalEarnedRebate + chain.totalEarnedRebate
            };

            updated.compliancePercentage =
              updated.totalStores > 0
                ? (updated.compliantStores / updated.totalStores) * 100
                : 0;

            extractedEnrolledChains.set(chainKey, updated);
          }
        } else {
          if (!extractedUnenrolledChains.has(chainKey)) {
            extractedUnenrolledChains.set(chainKey, {
              id: chain.chainId,
              chainId: chain.chainId,
              name: chain.chainName,
              chainName: chain.chainName,
              totalStores: chain.totalStores,
              enrolledStores: chain.enrolledStores,
              compliantStores: chain.compliantStores,
              totalPurchaseVolume: chain.totalPurchaseVolume,
              totalEarnedRebate: chain.totalEarnedRebate,
              compliancePercentage:
                chain.totalStores > 0
                  ? (chain.compliantStores / chain.totalStores) * 100
                  : 0
            });
          } else {
            const existing = extractedUnenrolledChains.get(chainKey);
            const updated = {
              ...existing,
              enrolledStores: existing.enrolledStores + chain.enrolledStores,
              compliantStores: existing.compliantStores + chain.compliantStores,
              totalEarnedRebate:
                existing.totalEarnedRebate + chain.totalEarnedRebate
            };

            updated.compliancePercentage =
              updated.totalStores > 0
                ? (updated.compliantStores / updated.totalStores) * 100
                : 0;

            extractedUnenrolledChains.set(chainKey, updated);
          }
        }
      });
    }
  });

  // Convert Maps to arrays
  const finalEnrolledChains = Array.from(extractedEnrolledChains.values());
  const finalUnenrolledChains = Array.from(extractedUnenrolledChains.values());

  // Transform chain data to match StoreTable expected format
  const transformChainToStoreFormat = (chains: any[]) => {
    return chains.map((chain) => ({
      id: chain.id.toString(),
      externalStoreId: chain.id.toString(),
      userInfo: {
        id: chain.id,
        status: "ACTIVE"
      },
      storeInfo: {
        name: chain.name || chain.chainName || "Unknown Chain",
        location: `${chain.totalStores || 0} stores`,
        rep: {
          id: 0,
          name: "",
          email: "",
          avatar: ""
        }
      },
      salesData: {
        purchaseVolume: {
          amount: chain.totalPurchaseVolume || 0
        },
        totalSavings: {
          amount: chain.totalEarnedRebate || 0
        },
        totalOppSavings: {
          amount: chain.totalRebateOpportunity || 0
        },
        purchasedSkus: []
      },
      programData: {
        enrolledProgram: [],
        remainingProgram: [],
        completedPrograms: chain.compliantStores || 0,
        totalEnrolled: chain.enrolledStores || 0,
        isEnrolled: chain.enrolledStores > 0
      },
      chainId: chain.id,
      chainNames: chain.name || chain.chainName || "",
      totalStores: chain.totalStores || 0,
      enrolledStores: chain.enrolledStores || 0,
      compliantStores: chain.compliantStores || 0,
      compliancePercentage: chain.compliancePercentage || 0
    }));
  };

  const enrolledChainsForTable =
    transformChainToStoreFormat(finalEnrolledChains);
  const unenrolledChainsForTable = transformChainToStoreFormat(
    finalUnenrolledChains
  );

  // Transform chain program data for RetailerProgramTable
  const transformChainDataForTable = (chainData: any[]) => {
    if (!Array.isArray(chainData) || chainData.length === 0) {
      return [];
    }

    // Flatten programs to show each tier as a separate row
    const flattened: any[] = [];

    chainData.forEach((program) => {
      // If program has tiers, create a row for each tier
      if (program.programDetails && program.programDetails.length > 0) {
        // Sort program details by tier number before processing
        const sortedTiers = [...program.programDetails].sort(
          (a, b) => a.tier - b.tier
        );

        sortedTiers.forEach((tierDetail: any) => {
          // Get rebate from tier details
          const rebatePercentage = tierDetail.rebatePercentage;
          const rebateAmount = tierDetail.rebateAmount;
          const rebateType = tierDetail.rebateType;

          let rebateDisplay = "N/A";
          if (rebateType === "percentage" && rebatePercentage) {
            rebateDisplay = `${rebatePercentage}%`;
          } else if (rebateType === "fixed" && rebateAmount) {
            rebateDisplay = `$${rebateAmount}`;
          } else if (rebateType === "per_category_item" && rebateAmount) {
            rebateDisplay = `$${rebateAmount}`;
          }

          if (tierDetail?.fixedRebateAmount) {
            rebateDisplay = getRangeFromCommaString(
              tierDetail.fixedRebateAmount
            );
          }

          // Handle different possible property names for chain compliance
          const compliantChains = program.compliantChains || 0;

          const totalChains =
            program.enrolledChains ||
            program.totalChains ||
            program.chains?.length ||
            1; // Avoid division by zero

          flattened.push({
            ...program,
            // Use tier-specific data
            id: tierDetail.id,
            programDetailId: tierDetail.id,
            tier: tierDetail.tier,
            type: `${program.programHeader} - Tier ${tierDetail.tier}`,
            rebate: rebateDisplay,
            overview:
              tierDetail.overview ||
              program.programHeader ||
              program.name ||
              "No description available",
            criteria: tierDetail.criteria,
            // Use actual chain compliance data
            storeCompliance: {
              completed: compliantChains,
              total: totalChains
            },
            totalCategoriesQuantity: {
              required: totalChains,
              purchased: 0 // This might need to be calculated differently
            },
            // Add tier-specific fields
            tierDetail: tierDetail,
            // Add sorting keys
            programHeader: program.programHeader,
            sortTier: tierDetail.tier
          });
        });
      } else {
        // Fallback for programs without tiers (shouldn't happen with your new structure)
        const rebatePercentage = program.rebatePercentage;
        const rebateAmount = program.rebateAmount;
        const rebateType = program.rebateType;

        let rebateDisplay = "N/A";
        if (rebateType === "percentage" && rebatePercentage) {
          rebateDisplay = `${rebatePercentage}%`;
        } else if (rebateType === "fixed" && rebateAmount) {
          rebateDisplay = `$${rebateAmount}`;
        } else if (rebateType === "per_category_item" && rebateAmount) {
          rebateDisplay = `$${rebateAmount}`;
        }
        const compliantChains = program.compliantChains || 0;
        const totalChains = program.enrolledChains || program.totalChains || 1;

        flattened.push({
          ...program,
          type: program.programHeader || program.programType,
          rebate: rebateDisplay,
          overview:
            program.programHeader || program.name || "No description available",
          storeCompliance: {
            completed: compliantChains,
            total: totalChains
          },
          totalCategoriesQuantity: {
            required: totalChains,
            purchased: 0
          },
          // Add sorting keys
          programHeader: program.programHeader,
          sortTier: 0
        });
      }
    });

    // Sort the flattened array: first by program header, then by tier
    return flattened.sort((a, b) => {
      // First sort by program header (alphabetically)
      const programCompare = (a.programHeader || "").localeCompare(
        b.programHeader || ""
      );
      if (programCompare !== 0) {
        return programCompare;
      }
      // Then sort by tier number (numerically)
      return (a.sortTier || 0) - (b.sortTier || 0);
    });
  };

  // Enhanced data extraction with better fallbacks
  const programsData = useMemo(() => {
    // Use chainProgramOverview from the enhanced API
    const sourceData = chainProgramOverview;

    const transformedData = transformChainDataForTable(sourceData);

    return transformedData;
  }, [chainProgramOverview]);

  // Calculate aggregated totals from all programs
  const aggregatedTotals = useMemo(() => {
    const sourceData = chainProgramOverview;
    const totals = sourceData.reduce(
      (acc: any, program: any) => {
        return {
          totalChains: acc.totalChains + (program.totalChains || 0),
          compliantChains: acc.compliantChains + (program.compliantChains || 0), // Use actual data
          totalPurchaseVolume:
            acc.totalPurchaseVolume + (program.totalPurchaseVolume || 0),
          totalEarnedRebate:
            acc.totalEarnedRebate + (program.totalEarnedRebate || 0),
          totalStores: acc.totalStores + (program.totalStores || 0),
          compliantStores: acc.compliantStores + (program.compliantStores || 0)
        };
      },
      {
        totalChains: 0, // Start from 0 and sum up
        compliantChains: 0, // Start from 0 and sum up
        totalPurchaseVolume: 0,
        totalEarnedRebate: 0,
        totalStores: 0,
        compliantStores: 0
      }
    );
    return totals;
  }, [chainProgramOverview]);

  // Enhanced dashboard card data with better fallbacks
  const dashboardCardData = useMemo(() => {
    // Use the actual count of enrolled + unenrolled chains instead of aggregated totals
    const actualTotalChains =
      enrolledChainsForTable.length + unenrolledChainsForTable.length;

    // Use data.totalPurchasedVolume directly instead of aggregating from programs
    const actualTotalPurchaseVolume = totalPurchaseVolume;
    const actualTotalEarnings = totalSaving || totalEarnings;

    return {
      totalChains: actualTotalChains,
      totalPurchaseVolume: actualTotalPurchaseVolume,
      totalEarnings: actualTotalEarnings
    };
  }, [
    totalPurchaseVolume,
    totalEarnings,
    enrolledChainsForTable,
    unenrolledChainsForTable,
    totalSaving
  ]);

  // Call fetchChainProgramDetails when component mounts or when any dependencies change
  useEffect(() => {
    // Prevent API call during SSR - only call on client side
    if (typeof window !== "undefined") {
      fetchChainProgramDetails();
    }
  }, [
    manufacturerId,
    enrolledPage,
    notEnrolledPage,
    searchQuery,
    sort,
    sortKey,
    warehouseId,
    programTimeline,
    internalInitiative,
    fetchChainProgramDetails
  ]);

  // Add debugging to see what data is being returned
  useEffect(() => {
    if (apiData) {
      console.log("Full API Data:", apiData);
    }
  }, [
    apiData,
    chainProgramOverview,
    finalEnrolledChains,
    finalUnenrolledChains,
    apiCategorizedProducts
  ]);

  // Render loading state
  if (loadingChainProgramDetails) {
    return (
      <main className="loader">
        <StoreProgramDetailTopInsights />
        <StoreProgramDetailTabs />
      </main>
    );
  }

  const displayManufacturerName =
    manufacturerName || apiManufacturerName || "Unknown Manufacturer";

  return (
    <div id="chain-program-detail" data-testid="chain-program-detail">
      <div className="mb-4 flex sm:items-center justify-between flex-col sm:flex-row gap-4">
        <div className="flex sm:items-center justify-between flex-col sm:flex-row gap-4 w-full">
          <div className="flex items-center">
            <div className="icons flex">
              <Link
                prefetch
                className="w-6 items-center p-1.5"
                href={getUrlWithQueryParam(
                  APP_ROUTES.chainPrograms,
                  "programTimeline",
                  programTimeline
                )}
              >
                <Image
                  src={leftArrowIcon.src}
                  alt="leftArrowIcon"
                  width={8}
                  height={14}
                />
              </Link>
              <div className="seperater min-h-7 border ml-3 mr-4 border-border-gray"></div>
            </div>
            <ManufacturerAvatar
              large
              bold
              user={{
                name: displayManufacturerName,
                avatar: manufacturerLogo
              }}
              imageClass="w-[48px] h-[48px]"
            />
          </div>
          {!isSalesRepManager && (
            <WarehouseSelectFilter
              isManager={warehouses ? true : false}
              warehouses={warehouses ?? []}
            />
          )}
        </div>
      </div>

      {/* Top Insights Cards */}
      {loadingChainProgramDetails ? (
        <StoreProgramDetailTopInsights />
      ) : (
        // The "Chains Enrolled" card is being removed as requested.
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[1rem] sm:gap-[1.5rem]">
          <DashboardCard
            id="chain-sales-volume-card"
            fullWidth
            label="Sales Volume"
            icon={cartIcon.src}
            value={`$${formatNumber(dashboardCardData.totalPurchaseVolume)}`}
          />
          <DashboardCard
            id="estimated-chain-earnings-card"
            fullWidth
            label="Estimated Chain Earnings"
            icon={greenDollarIcon.src}
            value={`$${formatNumber(dashboardCardData.totalEarnings)}`}
          />
        </div>
      )}

      {/* Tabs Section */}
      {loadingChainProgramDetails ? (
        <StoreProgramDetailTabs />
      ) : (
        <div className="mt-4 sm:mt-7">
          <Tabs
            autoAdjustHeight={false}
            className="px-[0px] py-[0px] font-medium text-heading-light"
            labelClass="store-detail-tabs"
          >
            <Tab label="Overview">
              <Card className="w-full p-6">
                <h3 className="text-filter-light text-base font-medium tracking-[0.15rem] uppercase">
                  Chain Programs
                </h3>
                {programsData && programsData.length > 0 ? (
                  <RetailerProgramTable
                    id="chain-program-table"
                    programs={programsData}
                    manufacturerData={{
                      ...manufacturerDetails,
                      name: displayManufacturerName
                    }}
                    storeComplianceTotal={
                      6 // Hardcoded to 6
                    }
                    showStoreCompliance={false}
                    hideCompianceColumn
                  />
                ) : (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      No chain programs found for this manufacturer.
                    </p>
                  </div>
                )}
              </Card>

              {/* Products Section */}
              <Card className="w-full p-6 mt-6">
                <h3 className="text-filter-light text-base font-medium tracking-[0.15rem] uppercase mb-4">
                  Products
                </h3>
                {!apiCategorizedProducts ? (
                  <RecommendedProducts />
                ) : (
                  <CategorizedTabProductList
                    categorizedProducts={apiCategorizedProducts}
                    tabSearchParamKey="products"
                  />
                )}
              </Card>
            </Tab>

            <Tab label="Enrolled Chains">
              <Card className="w-full p-6">
                <div className="flex justify-between items-center flex-col sm:flex-row gap-3 mb-3">
                  <h3 className="text-filter-light text-base font-medium tracking-[0.15rem] uppercase">
                    Enrolled Chains
                  </h3>
                  <div className="flex items-center gap-3">
                    <SearchField
                      className="text-xs"
                      pageVariable={PAGINATION_PAGE_QUERY_PARAMS.ENROLLEDPAGE}
                    />
                    <DownloadCSVButton
                      stores={enrolledChainsForTable || []}
                      filename={`enrolled-chains-${displayManufacturerName?.replace(/[^a-zA-Z0-9]/g, "-") || "manufacturer"}`}
                      fieldPreset="enrolledStores"
                    />
                  </div>
                </div>
                <StoreTable
                  stores={enrolledChainsForTable}
                  totalStores={enrolledChainsForTable.length}
                  currentPage={1}
                  totalPages={1}
                  pageVariable={PAGINATION_PAGE_QUERY_PARAMS.ENROLLEDPAGE}
                  manufacturerName={displayManufacturerName}
                  manufacturerId={manufacturerId}
                  manufacturerLogo={apiData?.manufacturer?.avatar}
                  isStoreEnrolled
                  isPrograms
                  enablePurchaseSorting
                  isSalesRep={false}
                  isAuthorizedManufacturer={apiData?.manufacturer?.authorized}
                  showEarningOpportunity
                  showEnrollButton
                  isChainsView={true}
                  isChainProgramsView={true}
                  programTimeline={programTimeline}
                />
              </Card>
            </Tab>

            {/*
            <Tab label="Unenrolled Chains">
              <Card className="w-full p-6">
                <div className="flex justify-between flex-col sm:flex-row gap-3 mb-3">
                  <h3 className="text-filter-light text-base font-medium tracking-[0.15rem] uppercase">
                    Unenrolled Chains
                  </h3>
                  <div className="flex items-center gap-3">
                    <SearchField
                      className="text-xs"
                      pageVariable={
                        PAGINATION_PAGE_QUERY_PARAMS.NOTENROLLEDPAGE
                      }
                    />
                    <DownloadCSVButton
                      stores={unenrolledChainsForTable || []}
                      filename={`unenrolled-chains-${displayManufacturerName?.replace(/[^a-zA-Z0-9]/g, "-") || "manufacturer"}`}
                      fieldPreset="unenrolledStores"
                    />
                  </div>
                </div>
                <StoreTable
                  stores={unenrolledChainsForTable}
                  totalStores={unenrolledChainsForTable.length}
                  currentPage={1}
                  totalPages={1}
                  pageVariable={PAGINATION_PAGE_QUERY_PARAMS.NOTENROLLEDPAGE}
                  manufacturerName={displayManufacturerName}
                  manufacturerId={manufacturerId}
                  manufacturerLogo={apiData?.manufacturer?.avatar}
                  isAuthorizedManufacturer={apiData?.manufacturer?.authorized}
                  isStoreEnrolled={false}
                  isStoresPrograms
                  isPrograms
                  enablePurchaseSorting
                  isSalesRep={false}
                  showEarningOpportunity
                  showEnrollButton
                  isChainsView={true}
                  selectedWarehouseId={warehouseId}
                  programTimeline={programTimeline}
                />
              </Card>
            </Tab>
            */}
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default ChainProgramDetailPage;
