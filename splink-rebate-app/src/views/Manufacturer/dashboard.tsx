"use client";

import MySalesCard from "@/components/Card/MySalesCard";
import DashboardCard from "@/components/Elements/DashboardCard";
import ManufacturerDashboardHead from "@/components/ManufacturerDashboardHead";
import Row from "@/components/Row";
import { MESSAGES } from "@/configs/messages";
import { USER_ROLES } from "@/configs/roles";

// Import Images
import pinkStoreIcon from "@/assets/icons/pinkStoreIcon.svg";
import TotalPurchaseVolumeIcon from "@/assets/icons/total-purchase-volume.svg";
import TotalSalesIcon from "@/assets/logo/total-sales.svg";
import Card from "@/components/Card";
import SkusPerStoreCard from "@/components/Card/SkusPerStoreCard";
import StorePenetrationCard from "@/components/Card/StorePenetrationCard";
import ColorBox from "@/components/ColorBox";
import TopInsightsLoader from "@/components/skeletons/manufacturer/dashboard/TopInsights";
import TopSellingProductsLoader from "@/components/skeletons/manufacturer/dashboard/TopSellingProducts";
import {
  formatDateToDayMonthYear,
  getProductNameWithSizeAndCaseSku,
  toLowerOrEmpty
} from "@/utils/helper";
import { formatNumber } from "@/utils/numberFormatter";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  fetchManufacturerKeyMetrics,
  fetchManufacturerTopProducts,
  fetchManufacturerDistributorSales,
  fetchManufacturerStorePenetration
} from "./productInsightsDashboardClientAPIs";

import Image from "next/image";

import { NA_UNITS_MANUFACTURER_IDS } from "@/configs/manufacturerConfig";
import { getUserClient } from "@/utils/getUserClient";
/* Sort icons */
import CustomDropdown from "@/components/Form/CustomDropdown";
import SearchField from "@/components/SearchField";
import { ManufacturerProductInsights } from "@/types/Dashboard";
import {
  ENABLE_PROGRAM_EXPIRATION_NOTICE,
  SHOW_GROWTH_IN_MANUFACTURE_DASHBOARD
} from "@/utils/constants";
import sortIcon from "../../assets/icons/sortIcon.svg";
import sortIconDefault from "../../assets/icons/sortIconDefault.svg";
import sortIconDesc from "../../assets/icons/sortIconDesc.svg";
import yoyArrowRedIcon from "../../assets/icons/yoyArrowDownRedIcon.svg";
import YoyArrowIcon from "../../assets/icons/yoyArrowIcon.svg";
import yoyNoGrowthArrowIcon from "../../assets/icons/yoyNoGrowthArrowIcon.svg";
import ProgramExpirationNotice from "@/components/ProgramExpirationNotice/ProgramExpirationNotice";
import { ROIViewProvider } from "@/contexts/ROIViewContext";

interface DashboardProps {
  distributors: {
    name: string;
    userId: number;
    associatedUserId: number;
  }[];
  products: {
    name: string;
    id: number;
  }[];
  distributorId?: string;
}

const Dashboard = ({
  distributors,
  products,
  distributorId
}: DashboardProps) => {
  // Check if units should be hidden for associated_user_id = 11
  const user = getUserClient();
  const shouldHideUnits =
    Number(user?.associatedUserId) === 4 || Number(user?.parentEntityId) === 4;

  const customFilterOptions = useMemo(() => {
    const options = [{ label: "Dollars", value: "1" }];
    if (!shouldHideUnits) {
      options.push({ label: "Units", value: "2" });
    }
    return options;
  }, [shouldHideUnits]);
  const dateRangeMonths = [1, 3, 6, 12];
  const [growthSort, setGrowthSort] = useState(false);
  const [productInsightsData, setProductInsightsData] =
    useState<ManufacturerProductInsights>();
  const [keyMetricsData, setKeyMetricsData] = useState<any>();
  const [topProductsData, setTopProductsData] = useState<any>();
  const [distributorSalesData, setDistributorSalesData] = useState<any>();
  const [storePenetrationData, setStorePenetrationData] = useState<any>();
  const [activeMonth, setActiveMonth] = useState(dateRangeMonths[3]);
  const [showSalesByUnits, setShowSalesByUnits] = useState<boolean>(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isKeyMetricsLoading, setIsKeyMetricsLoading] =
    useState<boolean>(false);
  const [isTopProductsLoading, setIsTopProductsLoading] =
    useState<boolean>(false);
  const [isDistributorSalesLoading, setIsDistributorSalesLoading] =
    useState<boolean>(false);
  const [isStorePenetrationLoading, setIsStorePenetrationLoading] =
    useState<boolean>(false);
  const [selectedTopSellingProducts, setSelectedTopSellingProducts] = useState(
    new Set()
  );
  const [topSellingProducts, setTopSellingProducts] = useState<any>([]);
  const [searchText, setSearchText] = useState<string>("");
  const [preservedTopProductsData, setPreservedTopProductsData] = useState<any>(
    []
  );

  /* maintain Product Rankings scroll position */
  const divTableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const scrollPositionRef = useRef<number>(0);

  // update top metrics->stores text when product(s) selected
  const isProductsSelected = useMemo(() => {
    return (
      selectedTopSellingProducts.size > 0 ||
      (selectedProducts && selectedProducts.length > 0)
    );
  }, [selectedTopSellingProducts, selectedProducts]);

  /* Product Ranking Sorting */
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<string>("DESC");
  const [showSalesGrowth, setShowSalesGrowth] = useState(false);
  const [showProductSalesGrowth, setShowProductsSalesGrowth] = useState(false);
  const [latestTransactionDate, setLatestTransactionDate] = useState<
    string | null
  >(null);

  const getSortIconSrc = (sort: string) => {
    let src = sortIconDefault.src;

    if (sort === "ASC") {
      src = sortIcon.src;
    } else if (sort === "DESC") {
      src = sortIconDesc.src;
    }
    return src;
  };

  const handleGrowthSortSwitch = (customState: boolean | null = null) => {
    setGrowthSort((prev) => {
      if (customState !== null) {
        return customState;
      }
      return !prev;
    });
    if (sortKey) {
      const updatedSortKey =
        !growthSort &&
        customState /* state updates late so used inverse here */ &&
        !sortKey.includes("Yoy")
          ? `${sortKey}Yoy`
          : sortKey.replace("Yoy", "");
      setSortKey(updatedSortKey);
      handleSortChange(updatedSortKey, sortOrder);
    }
  };

  const handleSortChange = (key: string, customSortOrder: string = "") => {
    let selectedSortOrder = "DESC";
    if (key === sortKey) {
      selectedSortOrder = sortOrder === "ASC" ? "DESC" : "ASC";
      setSortOrder(selectedSortOrder);
    } else {
      setSortKey(key);
      setSortOrder(selectedSortOrder);
    }

    // use custom sort order if passed
    if (customSortOrder) {
      selectedSortOrder = customSortOrder;
      setSortOrder(customSortOrder);
    }

    const sortedProducts = [...topSellingProducts];
    sortedProducts.sort((a, b) => {
      return selectedSortOrder === "ASC" ? a[key] - b[key] : b[key] - a[key];
    });
    setTopSellingProducts(sortedProducts);
  };

  const handleSortTypeChange = (selectedSortType: string) => {
    if (selectedSortType == "growth") {
      handleGrowthSortSwitch(true);
    } else if (selectedSortType == "value") {
      handleGrowthSortSwitch(false);
    }
  };

  // Function to handle row click
  const handleRowClick = (event: any) => {
    if (filteredProductsRanking?.length == 0) {
      return;
    }
    const row = event.target.closest("tr"); // The clicked <tr>
    const productId = row.dataset.productId; // Get product ID from data attribute

    // Toggle selection
    const newSelectedIds = new Set(selectedTopSellingProducts);
    if (newSelectedIds.has(productId)) {
      newSelectedIds.delete(productId); // Deselect if already selected
    } else {
      newSelectedIds.add(productId); // Select if not already selected
    }

    const selectedIdsArray: number[] = [];
    newSelectedIds.forEach((item: any) => selectedIdsArray.push(Number(item)));

    setSelectedTopSellingProducts(newSelectedIds);

    setSelectedProducts(selectedIdsArray);

    // Store top selling scroll position
    if (divTableBodyRef.current) {
      scrollPositionRef.current = divTableBodyRef.current.scrollTop;
    }
  };

  const addNameAndSizeWithProduct = (
    filteredProducts: any,
    allProductsWithNames: any
  ) => {
    if (!filteredProducts || !allProductsWithNames) return [];
    return filteredProducts.map((filteredProduct: any) => {
      const productDetails: any = allProductsWithNames?.find(
        (pro: any) => pro.id == filteredProduct.id
      );
      return {
        ...filteredProduct,
        ...{ name: productDetails.name, size: productDetails.size }
      };
    });
  };

  useEffect(() => {
    const fetchKeyMetrics = async () => {
      setIsKeyMetricsLoading(true);
      try {
        const distributorIds = distributorId
          ? [Number(distributorId)]
          : distributors.map((distributor) => distributor.associatedUserId);

        const res = await fetchManufacturerKeyMetrics(
          distributorIds,
          selectedProducts || [],
          activeMonth
        );

        setKeyMetricsData(res);
        setLatestTransactionDate(res.latestTransactionDate);
      } catch (error) {
        console.error("Error fetching Key Metrics:", error);
      } finally {
        setIsKeyMetricsLoading(false);
      }
    };

    const fetchTopProducts = async () => {
      setIsTopProductsLoading(true);
      try {
        const distributorIds = distributorId
          ? [Number(distributorId)]
          : distributors.map((distributor) => distributor.userId);

        const res = await fetchManufacturerTopProducts(
          distributorIds,
          selectedProducts || [],
          activeMonth
        );

        if (res?.topProducts.length === 0) {
          setTopProductsData([]);
          setTopSellingProducts([]);
          // Don't clear selected products state - preserve for when data returns
          setIsTopProductsLoading(false);
          return;
        }

        setTopProductsData(res);

        // Process top products data
        if (res?.topProducts) {
          if (selectedTopSellingProducts.size == 0) {
            // No products selected, show all products from API and preserve them
            const productsWithNames = addNameAndSizeWithProduct(
              res.topProducts,
              products
            );
            setTopSellingProducts(productsWithNames);
            setPreservedTopProductsData(productsWithNames); // Preserve complete data
          } else {
            // Products are selected
            if (preservedTopProductsData.length > 0) {
              // Use preserved data and merge with new selected product data
              const resetProducts = preservedTopProductsData.map(
                (product: any) => ({
                  ...product,
                  color: ""
                })
              );
              const mergedProducts = resetProducts.map((product: any) => {
                const updatedProduct = res.topProducts.find(
                  (p: any) => p.id === product.id
                );
                return updatedProduct
                  ? { ...product, ...updatedProduct }
                  : product;
              });

              const productsWithNames = addNameAndSizeWithProduct(
                mergedProducts,
                products
              );
              setTopSellingProducts(productsWithNames);
            } else {
              // No preserved data, use new data
              const productsWithNames = addNameAndSizeWithProduct(
                res.topProducts,
                products
              );
              setTopSellingProducts(productsWithNames);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching Top Products:", error);
      } finally {
        setIsTopProductsLoading(false);
      }
    };

    const fetchDistributorSales = async () => {
      setIsDistributorSalesLoading(true);
      try {
        const distributorIds = distributorId
          ? [Number(distributorId)]
          : distributors.map((distributor) => distributor.userId);

        const res = await fetchManufacturerDistributorSales(
          distributorIds,
          selectedProducts || [],
          activeMonth
        );

        setDistributorSalesData(res);
      } catch (error) {
        console.error("Error fetching Distributor Sales:", error);
      } finally {
        setIsDistributorSalesLoading(false);
      }
    };

    const fetchStorePenetration = async () => {
      setIsStorePenetrationLoading(true);
      try {
        const distributorIds = distributorId
          ? [Number(distributorId)]
          : distributors.map((distributor) => distributor.userId);

        const res = await fetchManufacturerStorePenetration(
          distributorIds,
          selectedProducts || [],
          activeMonth
        );

        setStorePenetrationData(res);
      } catch (error) {
        console.error("Error fetching Store Penetration:", error);
      } finally {
        setIsStorePenetrationLoading(false);
      }
    };

    // Make independent API calls
    fetchKeyMetrics();
    fetchTopProducts();
    fetchDistributorSales();
    fetchStorePenetration();
  }, [distributorId, activeMonth, selectedProducts]);

  // Ensure showSalesByUnits is false when units are hidden
  useEffect(() => {
    if (shouldHideUnits && showSalesByUnits) {
      setShowSalesByUnits(false);
    }
  }, [shouldHideUnits, showSalesByUnits]);

  // Restore scroll position after the DOM updates
  useLayoutEffect(() => {
    if (divTableBodyRef.current) {
      divTableBodyRef.current.scrollTop = scrollPositionRef.current;
    }
  });

  const resetSelectedTopSellingProducts = () => {
    setSelectedTopSellingProducts(new Set());
  };

  const userIsNaManufacturer = NA_UNITS_MANUFACTURER_IDS.includes(
    Number(user?.associatedUserId)
  );
  const units = keyMetricsData?.units?.value ?? 0;

  const unitsValue = units
    ? formatNumber(units)
    : userIsNaManufacturer
      ? "NA"
      : formatNumber(units);

  // Products Ranking search
  const filteredProductsRanking = useMemo<
    { id: number; name: string }[]
  >(() => {
    // Return all options if no search text
    if (!searchText) {
      return topSellingProducts;
    }

    const searchLower = toLowerOrEmpty(searchText);

    // Filter options based on search text
    return topSellingProducts.filter((product: any) => {
      const fullProductName = getProductNameWithSizeAndCaseSku(
        toLowerOrEmpty(product.name),
        toLowerOrEmpty(product.size),
        undefined
      );

      return fullProductName?.includes(searchLower);
    });
  }, [searchText, topSellingProducts]);
  const storePenetrationArr: number[] =
    topProductsData?.topProducts
      ?.map((topProduct: any) => parseFloat(topProduct.storePenetration ?? "0"))
      .filter((num: any) => !isNaN(num)) || [];

  const getYoyValueBasedOnFlag = useCallback(
    (yoy: number | undefined): number | undefined => {
      if (!SHOW_GROWTH_IN_MANUFACTURE_DASHBOARD) return undefined;
      return yoy;
    },
    [SHOW_GROWTH_IN_MANUFACTURE_DASHBOARD]
  );

  const getBGColor = useCallback((value: any): string => {
    if (!value || isNaN(value) || Number(value) == 0)
      return "bg-orange-bg text-orange";
    return Number(value) > 0
      ? "bg-profit-bg text-profit"
      : "bg-red-300 text-red-700";
  }, []);

  const getYoyIcon = useCallback((value: any): string => {
    if (!value || isNaN(value) || Number(value) == 0)
      return yoyNoGrowthArrowIcon.src;
    return Number(value) > 0 ? YoyArrowIcon.src : yoyArrowRedIcon.src;
  }, []);

  return (
    <ROIViewProvider>
      <div id="manufacturer-dashboard" className="manufacturer-dashboard">
        {ENABLE_PROGRAM_EXPIRATION_NOTICE && (
          <ProgramExpirationNotice messageType="WARNING" />
        )}

        <ManufacturerDashboardHead
          title="Dashboard"
          subtitle={
            latestTransactionDate
              ? `Last Synced on ${formatDateToDayMonthYear(latestTransactionDate)}`
              : ""
          }
          selectableEntities={distributors}
          products={products}
          dateRangeMonths={dateRangeMonths}
          activeMonth={activeMonth}
          onDateRangeClick={(selectedMonth: number) => {
            setActiveMonth(selectedMonth);
          }}
          onProductsFilterApply={(ids: number[]) => {
            setSelectedProducts(ids);
            resetSelectedTopSellingProducts();
          }}
          onProductsFilterReset={() => {
            setSelectedProducts([]);
            resetSelectedTopSellingProducts();
          }}
          selectedProductIds={selectedProducts}
        />
        {isKeyMetricsLoading ? (
          <TopInsightsLoader />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            <DashboardCard
              fullWidth
              icon={TotalSalesIcon.src}
              label="Sales Volume"
              value={`$${formatNumber(keyMetricsData?.totalSales?.value ?? 0)}`}
              valueInfoText={
                keyMetricsData?.relativeShare &&
                keyMetricsData?.relativeShare?.totalSales != undefined
                  ? `(${formatNumber(keyMetricsData?.relativeShare?.totalSales, false, 1)}% of Total)`
                  : undefined
              }
              yoyValue={getYoyValueBasedOnFlag(keyMetricsData?.totalSales?.yoy)}
              id="sales-volume-card"
            />
            {!shouldHideUnits && (
              <DashboardCard
                fullWidth
                icon={TotalPurchaseVolumeIcon.src}
                label="Units"
                value={unitsValue}
                valueInfoText={
                  keyMetricsData?.relativeShare &&
                  keyMetricsData?.relativeShare?.units != undefined
                    ? `(${formatNumber(keyMetricsData?.relativeShare?.units, false, 1)}% of Total)`
                    : undefined
                }
                yoyValue={getYoyValueBasedOnFlag(keyMetricsData?.units?.yoy)}
                id="units-card"
              />
            )}
            <DashboardCard
              fullWidth
              icon={pinkStoreIcon.src}
              label={"Store Customers"}
              value={`${formatNumber(keyMetricsData?.activeStores?.value ?? 0)}`}
              valueInfoText={
                keyMetricsData?.relativeShare &&
                keyMetricsData?.relativeShare?.activeStores != undefined
                  ? `(${formatNumber(keyMetricsData?.relativeShare?.activeStores, false, 1)}% of Total)`
                  : undefined
              }
              yoyValue={getYoyValueBasedOnFlag(
                keyMetricsData?.activeStores?.yoy
              )}
              id="store-customers-card"
            />
          </div>
        )}

        <div className="charts-container grid grid-cols-1 sm:grid-col-fit-[380px] gap-6 mb-6">
          {/* Product Rankings */}
          {isTopProductsLoading ? (
            <TopSellingProductsLoader
              selectedProductsCount={
                Array.isArray(selectedProducts) &&
                selectedProducts.length > 0 &&
                selectedProducts.length <= 6
                  ? selectedProducts.length
                  : 6
              }
            />
          ) : (
            <div className="storeTable overflow-x-auto text-left text-sm text-filter-light font-medium font-inter">
              <div className="rounded-lg p-4 bg-white h-full">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-base font-semibold">
                    Product Rankings
                  </div>
                  <div className="flex justify-end items-center gap-3">
                    {SHOW_GROWTH_IN_MANUFACTURE_DASHBOARD && (
                      <div className="displayYoYGrowth flex items-center">
                        <div className="relative display-products-only-container flex items-center gap-2">
                          <div className="flex items-center">
                            <input
                              onChange={() => {
                                setShowProductsSalesGrowth((prev) => !prev);
                                handleGrowthSortSwitch(false);
                              }}
                              id="showProductGrowth"
                              type="checkbox"
                              checked={showProductSalesGrowth}
                              className="cursor-pointer w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <label
                              htmlFor="showProductGrowth"
                              className="ms-2 text-sm font-medium cursor-pointer text-filter-light select-none"
                            >
                              YoY Growth
                            </label>
                          </div>
                        </div>
                      </div>
                    )}
                    <SearchField
                      className="w-full"
                      containerclass="min-[991px]:w-auto"
                      onInputChange={(val: any) => {
                        setSearchText(val);
                      }}
                    />
                  </div>
                </div>

                <div className="growth-toggles flex gap-5 justify-self-end text-xs">
                  {showProductSalesGrowth && (
                    <CustomDropdown
                      options={[
                        { value: "value", label: "Value" },
                        { value: "growth", label: "Growth" }
                      ]}
                      queryParamKey="type"
                      labelPrefix="Sort by:"
                      excludePageParam={false}
                      onOptionChange={(selectedSortType) => {
                        handleSortTypeChange(selectedSortType);
                      }}
                      classes="h-full w-full text-left bg-white outline-none"
                      optionsContainerClasses="absolute left-[32px] z-10 flex flex-col items-center mt-1 w-20 bg-white shadow-lg max-h-60 rounded-md py-1 overflow-auto focus:outline-none text-xs"
                      optionsClasses="w-full text-center cursor-pointer select-none px-1 py-1 relative hover:bg-heading-blue hover:text-white"
                    />
                  )}
                </div>

                <div className="flex-1 min-h-0 max-h-80 flex flex-col">
                  <div className="flex-shrink-0">
                    <table className="w-full border-collapse">
                      <thead className="h-8 border-b text-heading-very-light text-xs bg-white">
                        <tr>
                          <th className="w-[45%] font-medium pr-4">
                            &nbsp;&nbsp;&nbsp;&nbsp;Name
                          </th>
                          <th
                            className={`w-1/6 font-medium pr-4 text-right cursor-pointer`}
                            onClick={() =>
                              handleSortChange(
                                growthSort ? "salesYoy" : "sales"
                              )
                            }
                          >
                            Sales {""}
                            <Image
                              className="storeSortIcon inline"
                              src={getSortIconSrc(
                                ["salesYoy", "sales"].includes(sortKey ?? "")
                                  ? sortOrder
                                  : ""
                              )}
                              alt="sort icon"
                              width={7}
                              height={10}
                            />
                          </th>
                          {!shouldHideUnits && (
                            <th
                              className={`w-1/6 font-medium pr-4 text-right cursor-pointer`}
                              onClick={() =>
                                handleSortChange(
                                  growthSort ? "unitsYoy" : "units"
                                )
                              }
                            >
                              Units{" "}
                              <Image
                                className="storeSortIcon inline"
                                src={getSortIconSrc(
                                  ["unitsYoy", "units"].includes(sortKey ?? "")
                                    ? sortOrder
                                    : ""
                                )}
                                alt="sort icon"
                                width={7}
                                height={10}
                              />
                            </th>
                          )}
                          <th
                            className={`w-1/6 font-medium pr-4 text-right cursor-pointer`}
                            onClick={() =>
                              handleSortChange(
                                growthSort
                                  ? "storePenetrationYoy"
                                  : "storePenetration"
                              )
                            }
                          >
                            %&nbsp;of&nbsp;Stores{" "}
                            <Image
                              className="storeSortIcon inline"
                              src={getSortIconSrc(
                                [
                                  "storePenetrationYoy",
                                  "storePenetration"
                                ].includes(sortKey ?? "")
                                  ? sortOrder
                                  : ""
                              )}
                              alt="sort icon"
                              width={7}
                              height={10}
                            />
                          </th>
                        </tr>
                      </thead>
                    </table>
                  </div>
                  <div className="overflow-y-auto flex-1" ref={divTableBodyRef}>
                    <table className="w-full border-collapse">
                      <tbody className="divide-y" onClick={handleRowClick}>
                        {filteredProductsRanking &&
                        filteredProductsRanking?.length > 0 ? (
                          filteredProductsRanking.map(
                            (product: any, index: number) => {
                              const formattedUnits = formatNumber(
                                Number(product?.units ?? "0")
                              );

                              const formattedSales =
                                product.sales == undefined
                                  ? "-"
                                  : "$" + formatNumber(Number(product.sales));

                              const formattedStorePenetration =
                                product.storePenetration == undefined
                                  ? "-"
                                  : Number(
                                      parseFloat(product.storePenetration || 0)
                                    ).toFixed(1) + "%";
                              return (
                                <tr
                                  key={`${index}-${product.name}`}
                                  className={`border-b cursor-pointer ${
                                    selectedTopSellingProducts.has(
                                      String(product.id)
                                    )
                                      ? "bg-blue-100 hover:bg-blue-200" // Selected state
                                      : "hover:bg-gray-50" // Hover effect for non-selected rows again
                                  }`}
                                  data-product-id={product.id}
                                >
                                  <td
                                    className={`w-[45%] pr-4 font-medium ${showProductSalesGrowth ? "py-1" : "py-3"}`}
                                  >
                                    <p className="font-medium flex items-center">
                                      {!!selectedProducts?.length &&
                                        product?.color && (
                                          <>
                                            &nbsp;
                                            <ColorBox color={product?.color} />
                                            &nbsp;
                                          </>
                                        )}
                                      <div className="flex gap-1">
                                        <span>{index + 1}.</span>
                                        <span>
                                          {getProductNameWithSizeAndCaseSku(
                                            product?.name,
                                            product?.size,
                                            undefined
                                          )}
                                        </span>
                                      </div>
                                    </p>
                                  </td>
                                  <td
                                    className={`pr-4 font-medium text-end w-1/6 ${showProductSalesGrowth ? "py-1" : "py-3"}`}
                                  >
                                    <p className="font-medium">
                                      {formattedSales}
                                    </p>

                                    {showProductSalesGrowth && (
                                      <div className="font-medium text-end flex items-center justify-end">
                                        {product.salesYoy != undefined &&
                                        !isNaN(product.salesYoy) ? (
                                          <div
                                            className={`px-1 flex gap-1 items-center rounded-sm text-xs font-normal  ${getBGColor(
                                              product.salesYoy
                                            )}`}
                                          >
                                            <Image
                                              src={getYoyIcon(product.salesYoy)}
                                              alt="YoY Arrow Icon"
                                              width={
                                                Number(product.salesYoy) == 0
                                                  ? 16
                                                  : 8
                                              }
                                              height={8}
                                            />
                                            <div className="text-center">
                                              {formatNumber(
                                                product.salesYoy,
                                                false,
                                                1
                                              )}
                                              {"%"}
                                            </div>
                                          </div>
                                        ) : null}
                                      </div>
                                    )}
                                  </td>
                                  {!shouldHideUnits && (
                                    <td
                                      className={`pr-4 font-medium text-end w-1/6 ${showProductSalesGrowth ? "py-1" : "py-3"}`}
                                    >
                                      <p className="font-medium">
                                        {formattedUnits}
                                      </p>

                                      {showProductSalesGrowth && (
                                        <div className="font-medium text-end flex items-center justify-end">
                                          {product.unitsYoy != undefined &&
                                          !isNaN(product.unitsYoy) ? (
                                            <div
                                              className={`px-1 flex gap-1 items-center rounded-sm text-xs font-normal  ${getBGColor(
                                                product.unitsYoy
                                              )}`}
                                            >
                                              <Image
                                                src={getYoyIcon(
                                                  product.unitsYoy
                                                )}
                                                alt="YoY Arrow Icon"
                                                width={
                                                  Number(product.unitsYoy) == 0
                                                    ? 16
                                                    : 8
                                                }
                                                height={8}
                                              />
                                              <div className="text-center">
                                                {formatNumber(
                                                  product.unitsYoy,
                                                  false,
                                                  1
                                                )}
                                                {"%"}
                                              </div>
                                            </div>
                                          ) : null}
                                        </div>
                                      )}
                                    </td>
                                  )}

                                  <td
                                    className={`pr-4 font-medium text-end w-1/6 ${showProductSalesGrowth ? "py-1" : "py-3"}`}
                                  >
                                    <p className="font-medium">
                                      {formattedStorePenetration}
                                    </p>

                                    {showProductSalesGrowth && (
                                      <div className="font-medium text-end flex items-center justify-end">
                                        {product.storePenetrationYoy !=
                                          undefined &&
                                        !isNaN(product.storePenetrationYoy) ? (
                                          <div
                                            className={`px-1 flex gap-1 items-center rounded-sm text-xs font-normal  ${getBGColor(
                                              product.storePenetrationYoy
                                            )}`}
                                          >
                                            <Image
                                              src={getYoyIcon(
                                                product.storePenetrationYoy
                                              )}
                                              alt="YoY Arrow Icon"
                                              width={
                                                Number(
                                                  product.storePenetrationYoy
                                                ) == 0
                                                  ? 16
                                                  : 8
                                              }
                                              height={8}
                                            />
                                            <div className="text-center">
                                              {formatNumber(
                                                Number(
                                                  product.storePenetrationYoy
                                                ) || 0,
                                                false,
                                                1
                                              ) + "%"}
                                            </div>
                                          </div>
                                        ) : null}
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              );
                            }
                          )
                        ) : (
                          <tr className="text-heading-very-light">
                            <td
                              className="text-center pt-3 text-sm"
                              colSpan={shouldHideUnits ? 3 : 4}
                            >
                              {MESSAGES.NO_RECORDS_FOUND}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Total Sales */}
          <MySalesCard
            role={USER_ROLES.MANUFACTURER}
            distributorId={distributorId}
            showCategories={false}
            barChartData={
              showSalesGrowth
                ? distributorSalesData?.growth?.chartData
                : distributorSalesData?.chartData
            }
            selectedMonthRange={activeMonth}
            totalSales={keyMetricsData?.totalSales?.value}
            totalUnits={
              !shouldHideUnits && showSalesByUnits
                ? Number(keyMetricsData?.units?.value ?? "0")
                : undefined
            }
            customFilterOptions={customFilterOptions}
            handleCustomFilterChange={(val: string) => {
              if (!shouldHideUnits) {
                setShowSalesByUnits(val == customFilterOptions[1]?.value);
              }
            }}
            removeAxisCurrencySign={showSalesByUnits}
            hideDateRange
            disableAPICall
            multiLineChartKey={showSalesByUnits ? "units_" : "sales_"}
            isLoading={isDistributorSalesLoading}
            useDynamicBarSize={true}
            showSalesGrowthOption={SHOW_GROWTH_IN_MANUFACTURE_DASHBOARD}
            isShowGrowth={showSalesGrowth}
            handleShowGrowthChange={() => {
              setShowSalesGrowth((prev) => !prev);
            }}
            isWeekView
          />
        </div>

        {/* Third row: SKU per Store and Distributor Overview (same size) */}
        <Row
          className="charts-container flex-col md:flex-row"
          marginBottom="mb-6"
        >
          <StorePenetrationCard
            chartData={storePenetrationData?.storePenetrationChartData ?? []}
            chartGrowthData={
              storePenetrationData?.growth?.storePenetrationChartData ?? []
            }
            selectedMonthRange={activeMonth}
            multiLineChartKey={"value_"}
            hideDateRange
            totalValue={
              selectedProducts?.length
                ? `${formatNumber(keyMetricsData?.relativeShare?.activeStores ?? 0)}% (${keyMetricsData?.activeStores?.value})`
                : undefined
            }
            isLoading={isStorePenetrationLoading}
            maxPercentage={
              selectedTopSellingProducts.size > 1
                ? Math.max(...storePenetrationArr)
                : keyMetricsData?.relativeShare?.activeStores
            }
            showYoyGrowthOption={SHOW_GROWTH_IN_MANUFACTURE_DASHBOARD}
          />

          {!selectedProducts?.length ? (
            <SkusPerStoreCard
              distributorId={distributorId ? distributorId : "0"}
              selectedMonthRange={activeMonth}
              showCategories={false}
              isLoading={isLoading}
              showGrowthBtn={SHOW_GROWTH_IN_MANUFACTURE_DASHBOARD}
              distributorIds={distributors.map(
                (distributor) => distributor.associatedUserId
              )}
            />
          ) : (
            <Card
              className="sku-distribution-bar-chart w-full h-0 lg:w-1/2 xl:w-full flex-1"
              padding="0"
            >
              <></>
            </Card>
          )}
        </Row>
      </div>
    </ROIViewProvider>
  );
};

export default Dashboard;
