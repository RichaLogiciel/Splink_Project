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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  fetchDistributorProductInsightKeyMetrics,
  fetchDistributorProductInsights
} from "./productInsightsDashboardClientAPIs";

import Image from "next/image";

/* Sort icons */
import SearchField from "@/components/SearchField";
import {
  ManufacturerProductInsights,
  ManufacturerProductInsightsKeyMetric
} from "@/types/Dashboard";
import sortIcon from "../../assets/icons/sortIcon.svg";
import sortIconDefault from "../../assets/icons/sortIconDefault.svg";
import sortIconDesc from "../../assets/icons/sortIconDesc.svg";
import { ROIViewProvider } from "@/contexts/ROIViewContext";

interface ProductInsightsDashboardProps {
  selectableEntities: {
    name: string;
    userId: number;
    associatedUserId: number;
  }[];
  products: {
    name: string;
    id: number;
  }[];
  manufacturerId?: string;
  warehouseId?: string;
  warehouses?: any[];
}

const ProductInsightsDashboard = ({
  selectableEntities,
  products,
  manufacturerId,
  warehouseId,
  warehouses
}: ProductInsightsDashboardProps) => {
  const customFilterOptions = [
    { label: "Dollars", value: "1" },
    { label: "Units", value: "2" }
  ];
  const dateRangeMonths = [1, 3, 6, 12];
  const [productInsightsData, setProductInsightsData] =
    useState<ManufacturerProductInsights>();
  const [keyMetricsData, setKeyMetricsData] =
    useState<ManufacturerProductInsightsKeyMetric>();
  const [activeMonth, setActiveMonth] = useState(dateRangeMonths[3]);
  const [showSalesByUnits, setShowSalesByUnits] = useState<boolean>(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>();
  const [isLoadingMetrics, setIsLoadingMetrics] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [selectedTopSellingProducts, setSelectedTopSellingProducts] = useState(
    new Set()
  );
  const [topSellingProducts, setTopSellingProducts] = useState<any>([]);
  const [searchText, setSearchText] = useState<string>("");

  /* maintain Product Rankings scroll position */
  const divTableBodyRef = useRef<HTMLTableSectionElement | null>(null);
  const scrollPositionRef = useRef<number>(0);

  /* Product Ranking Sorting */
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<string>("DESC");
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

  const handleSortChange = (key: string) => {
    let selectedSortOrder = "DESC";
    if (key === sortKey) {
      selectedSortOrder = sortOrder === "ASC" ? "DESC" : "ASC";
      setSortOrder(selectedSortOrder);
    } else {
      setSortKey(key);
      setSortOrder(selectedSortOrder);
    }
    const sortedProducts = [...topSellingProducts];
    sortedProducts.sort((a, b) => {
      if (key === "units") {
        return selectedSortOrder === "ASC"
          ? a.units - b.units
          : b.units - a.units;
      } else if (key === "salesVolume") {
        return selectedSortOrder === "ASC"
          ? a.sales - b.sales
          : b.sales - a.sales;
      } else if (key === "penetration") {
        return selectedSortOrder === "ASC"
          ? a.storePenetration - b.storePenetration
          : b.storePenetration - a.storePenetration;
      }
      return 0;
    });
    setTopSellingProducts(sortedProducts);
  };

  // Function to handle row click
  const handleRowClick = (event: any) => {
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
    const fetchSalesData = async () => {
      setIsLoading(true);
      try {
        const res = await fetchDistributorProductInsights(
          manufacturerId,
          activeMonth,
          selectedProducts,
          warehouseId
        );
        setProductInsightsData(res);
        if (selectedTopSellingProducts.size == 0) {
          const productsWithNames = addNameAndSizeWithProduct(
            res?.topProducts,
            products
          );
          setTopSellingProducts(productsWithNames);
        } else {
          // add colors in selected Product Rankings
          const resetProducts = topSellingProducts.map((product: any) => ({
            ...product,
            color: ""
          }));
          const mergedProducts = resetProducts.map((product: any) => {
            const updatedProduct = res?.topProducts.find(
              (p: any) => p.id === product.id
            );
            return updatedProduct ? { ...product, ...updatedProduct } : product;
          });
          const productsWithNames = addNameAndSizeWithProduct(
            mergedProducts,
            products
          );
          setTopSellingProducts(productsWithNames);
        }

        // setLatestTransactionDate(res.latestTransactionDate);
      } catch (error) {
        console.error("Error fetching Product Insights:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSalesData();
  }, [manufacturerId, activeMonth, selectedProducts, warehouseId]);

  useEffect(() => {
    const fetchKeyMetricsData = async () => {
      setIsLoadingMetrics(true);
      try {
        const res = await fetchDistributorProductInsightKeyMetrics(
          manufacturerId,
          activeMonth,
          selectedProducts,
          warehouseId
        );
        setKeyMetricsData(res);

        setLatestTransactionDate(res.latestTransactionDate);
      } catch (error) {
        console.error("Error fetching Product Insights Key Metrics:", error);
      } finally {
        setIsLoadingMetrics(false);
      }
    };

    fetchKeyMetricsData();
  }, [manufacturerId, activeMonth, selectedProducts, warehouseId]);

  // Restore scroll position after the DOM updates
  useLayoutEffect(() => {
    if (divTableBodyRef.current) {
      divTableBodyRef.current.scrollTop = scrollPositionRef.current;
    }
  });

  const resetSelectedTopSellingProducts = () => {
    setSelectedTopSellingProducts(new Set());
  };

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

  return (
    <ROIViewProvider>
      <div
        id="product-insights-dashboard"
        className="product-insights-dashboard"
      >
        <ManufacturerDashboardHead
          title="Product Insights"
          subtitle={
            latestTransactionDate
              ? `Last Synced on ${formatDateToDayMonthYear(latestTransactionDate)}`
              : ""
          }
          selectableEntities={selectableEntities}
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
          role={USER_ROLES.DISTRIBUTOR_ADMIN}
          warehouses={warehouses}
        />
        {isLoadingMetrics ? (
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
                  ? `(${formatNumber(keyMetricsData?.relativeShare?.totalSales)}% of Total)`
                  : undefined
              }
              id="sales-volume-card"
            />
            <DashboardCard
              fullWidth
              icon={TotalPurchaseVolumeIcon.src}
              label="Units"
              value={`${formatNumber(keyMetricsData?.units?.value ?? 0)}`}
              valueInfoText={
                keyMetricsData?.relativeShare &&
                keyMetricsData?.relativeShare?.units != undefined
                  ? `(${formatNumber(keyMetricsData?.relativeShare?.units)}% of Total)`
                  : undefined
              }
              id="units-card"
            />
            <DashboardCard
              fullWidth
              icon={pinkStoreIcon.src}
              label="Store Customers"
              value={`${formatNumber(keyMetricsData?.activeStores?.value ?? 0)}`}
              valueInfoText={
                keyMetricsData?.relativeShare &&
                keyMetricsData?.relativeShare?.activeStores != undefined
                  ? `(${formatNumber(keyMetricsData?.relativeShare?.activeStores)}% of Total)`
                  : undefined
              }
              // link={{
              //   href: "/app/store",
              //   label: "View All Stores"
              // }}
            />
          </div>
        )}

        <div className="charts-container grid grid-cols-1 sm:grid-col-fit-[380px] gap-6 mb-6">
          {/* Product Rankings */}
          {isLoading ? (
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
                  <SearchField
                    className="w-full"
                    containerclass="min-[991px]:w-auto"
                    onInputChange={(val: any) => {
                      setSearchText(val);
                    }}
                  />
                </div>
                <div
                  className="overflow-y-auto flex-1 min-h-0 max-h-80"
                  ref={divTableBodyRef}
                >
                  <table className="w-full border-collapse">
                    <thead className="h-11 border-b text-heading-very-light text-xs sticky top-0  bg-white">
                      <tr>
                        <th className="w-[45%] font-medium pr-4">
                          &nbsp;&nbsp;&nbsp;&nbsp;Name
                        </th>
                        <th
                          className="w-1/6 font-medium pr-4 text-right cursor-pointer"
                          onClick={() => handleSortChange("salesVolume")}
                        >
                          Sales {""}
                          <Image
                            className="storeSortIcon inline"
                            src={getSortIconSrc(
                              sortKey === "salesVolume" ? sortOrder : ""
                            )}
                            alt="sort icon"
                            width={7}
                            height={10}
                          />
                        </th>
                        <th
                          className="w-1/6 font-medium pr-4 text-end cursor-pointer"
                          onClick={() => handleSortChange("units")}
                        >
                          Units{" "}
                          <Image
                            className="storeSortIcon inline"
                            src={getSortIconSrc(
                              sortKey === "units" ? sortOrder : ""
                            )}
                            alt="sort icon"
                            width={7}
                            height={10}
                          />
                        </th>
                        <th
                          className="w-1/6 font-medium pr-4 text-right cursor-pointer"
                          onClick={() => handleSortChange("penetration")}
                        >
                          %&nbsp;of&nbsp;Stores{" "}
                          <Image
                            className="storeSortIcon inline"
                            src={getSortIconSrc(
                              sortKey === "penetration" ? sortOrder : ""
                            )}
                            alt="sort icon"
                            width={7}
                            height={10}
                          />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" onClick={handleRowClick}>
                      {filteredProductsRanking &&
                      filteredProductsRanking?.length > 0 ? (
                        filteredProductsRanking.map(
                          (product: any, index: number) => {
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
                                <td className="pr-4 py-3 font-medium">
                                  <p className="font-medium flex items-center">
                                    {!!selectedProducts?.length &&
                                      product?.color && (
                                        <>
                                          &nbsp;
                                          <ColorBox color={product?.color} />
                                          &nbsp;
                                        </>
                                      )}
                                    {index + 1}.{" "}
                                    {getProductNameWithSizeAndCaseSku(
                                      product?.name,
                                      product?.size,
                                      undefined
                                    )}
                                  </p>
                                </td>
                                <td className="pr-4 py-3 font-medium text-end">
                                  <p className="font-medium">
                                    {product.sales == undefined
                                      ? "-"
                                      : "$" +
                                        formatNumber(Number(product.sales))}
                                  </p>
                                </td>
                                <td className="pr-4 py-3 font-medium text-end">
                                  <p className="font-medium">
                                    {formatNumber(
                                      Number(product?.units ?? "0")
                                    )}
                                  </p>
                                </td>

                                <td className="pr-4 py-3 font-medium text-end">
                                  <p className="font-medium">
                                    {product.storePenetration == undefined
                                      ? "-"
                                      : Number(
                                          parseFloat(
                                            product.storePenetration || 0
                                          ).toFixed(1)
                                        ) + "%"}
                                  </p>
                                </td>
                              </tr>
                            );
                          }
                        )
                      ) : (
                        <tr className="text-heading-very-light">
                          <td className="text-center pt-3 text-sm" colSpan={3}>
                            {MESSAGES.NO_RECORDS_FOUND}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Total Sales */}
          <MySalesCard
            role={USER_ROLES.MANUFACTURER}
            showCategories={false}
            barChartData={productInsightsData?.chartData}
            selectedMonthRange={activeMonth}
            totalSales={keyMetricsData?.totalSales?.value}
            totalUnits={
              showSalesByUnits
                ? Number(keyMetricsData?.units?.value ?? "0")
                : undefined
            }
            customFilterOptions={customFilterOptions}
            handleCustomFilterChange={(val: string) => {
              setShowSalesByUnits(val == customFilterOptions[1].value);
            }}
            removeAxisCurrencySign={showSalesByUnits}
            hideDateRange
            disableAPICall
            multiLineChartKey={showSalesByUnits ? "units_" : "sales_"}
            isLoading={isLoading}
            useDynamicBarSize={true}
          />
        </div>

        {/* Third row: SKU per Store and Distributor Overview (same size) */}
        <Row
          className="charts-container flex-col md:flex-row"
          marginBottom="mb-6"
        >
          <StorePenetrationCard
            chartData={productInsightsData?.storePenetrationChartData ?? []}
            selectedMonthRange={activeMonth}
            multiLineChartKey={"value_"}
            totalValue={
              selectedProducts?.length &&
              keyMetricsData?.relativeShare?.activeStores != undefined
                ? `${formatNumber(keyMetricsData?.relativeShare?.activeStores)}% (${keyMetricsData?.activeStores})`
                : undefined
            }
            hideDateRange
            isLoading={isLoading}
          />

          {!selectedProducts?.length ? (
            <SkusPerStoreCard
              selectedMonthRange={activeMonth}
              showCategories={false}
              isLoading={isLoading}
              manufacturerId={manufacturerId}
              warehouseId={warehouseId}
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

export default ProductInsightsDashboard;
