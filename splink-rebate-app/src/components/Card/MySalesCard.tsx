"use client";

import React, {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";

// Import Components
import Card from "@/components/Card";
import DateRangeButton from "@/components/DateRangeButton";
import Divider from "@/components/Divider";
import Row from "@/components/Row";

// Import Types
import { USER_ROLES } from "@/configs/roles";
import { apiClient } from "@/lib/axiosClient";
import { DistributorBarSizeByMonth, MySales } from "@/types/Dashboard";
import { getMonth, getShortMonth } from "@/utils/dateHelper";
import {
  formatDateToDayMonthYear,
  formatYAxisValueChart
} from "@/utils/helper";
import { formatNumber } from "@/utils/numberFormatter";
import { toast } from "react-toastify";
import CustomDropdown from "../Form/CustomDropdown";
import StackedBarChartCustom from "../StackedBarChartCustom";

interface MySalesCardProps {
  role: string;
  distributorId?: string;
  showCategories?: boolean;
  barChartData?: any;
  hideDateRange?: boolean;
  selectedMonthRange?: number;
  totalSales?: number;
  disableAPICall?: boolean;
  totalUnits?: number;
  customFilterOptions?: {
    label: string;
    value: string;
  }[];
  handleCustomFilterChange?: (val: string) => void;
  removeAxisCurrencySign?: boolean;
  multiLineChartKey?: string;
  isLoading?: boolean;
  useDynamicBarSize?: boolean;
  showSalesGrowthOption?: boolean;
  isShowGrowth?: boolean;
  handleShowGrowthChange?: () => void;
  isWeekView?: boolean;
  warehouseId?: string;
}

const defaultData: MySales = {
  "1": {
    totalSale: 0,
    barChartData: [{ date: getMonth(new Date().getMonth()), sales: 0 }]
  },
  "3": {
    totalSale: 0,
    barChartData: [
      { date: getMonth((new Date().getMonth() - 2 + 12) % 12), sales: 0 },
      { date: getMonth((new Date().getMonth() - 1 + 12) % 12), sales: 0 },
      { date: getMonth(new Date().getMonth()), sales: 0 }
    ]
  },
  "6": {
    totalSale: 0,
    barChartData: [
      {
        date: getShortMonth((new Date().getMonth() - 5 + 12) % 12),
        sales: 0
      },
      {
        date: getShortMonth((new Date().getMonth() - 4 + 12) % 12),
        sales: 0
      },
      {
        date: getShortMonth((new Date().getMonth() - 3 + 12) % 12),
        sales: 0
      },
      {
        date: getShortMonth((new Date().getMonth() - 2 + 12) % 12),
        sales: 0
      },
      {
        date: getShortMonth((new Date().getMonth() - 1 + 12) % 12),
        sales: 0
      },
      { date: getShortMonth(new Date().getMonth()), sales: 0 }
    ]
  },
  "12": {
    totalSale: 0,
    barChartData: [
      {
        date: getShortMonth((new Date().getMonth() - 11 + 12) % 12),
        sales: 0
      },
      {
        date: getShortMonth((new Date().getMonth() - 10 + 12) % 12),
        sales: 0
      },
      {
        date: getShortMonth((new Date().getMonth() - 9 + 12) % 12),
        sales: 0
      },
      {
        date: getShortMonth((new Date().getMonth() - 8 + 12) % 12),
        sales: 0
      },
      {
        date: getShortMonth((new Date().getMonth() - 7 + 12) % 12),
        sales: 0
      },
      {
        date: getShortMonth((new Date().getMonth() - 6 + 12) % 12),
        sales: 0
      },
      {
        date: getShortMonth((new Date().getMonth() - 5 + 12) % 12),
        sales: 0
      },
      {
        date: getShortMonth((new Date().getMonth() - 4 + 12) % 12),
        sales: 0
      },
      {
        date: getShortMonth((new Date().getMonth() - 3 + 12) % 12),
        sales: 0
      },
      {
        date: getShortMonth((new Date().getMonth() - 2 + 12) % 12),
        sales: 0
      },
      {
        date: getShortMonth((new Date().getMonth() - 1 + 12) % 12),
        sales: 0
      },
      { date: getShortMonth(new Date().getMonth()), sales: 0 }
    ]
  }
};

const MySalesCard: React.FC<MySalesCardProps> = ({
  role,
  distributorId,
  showCategories = true,
  barChartData,
  hideDateRange,
  selectedMonthRange,
  totalSales,
  disableAPICall,
  totalUnits,
  customFilterOptions,
  handleCustomFilterChange,
  removeAxisCurrencySign,
  multiLineChartKey,
  isLoading = false,
  useDynamicBarSize = true,
  showSalesGrowthOption = false,
  isShowGrowth = false,
  isWeekView = true,
  handleShowGrowthChange = () => {},
  warehouseId
}) => {
  const [loading, setLoading] = useState(isLoading);

  const totalSalesRef = useRef<HTMLDivElement>(null);
  const dateRangeMonths = [1, 3, 6, 12];
  const defaultMonth: number = 12;

  const [barChartHeight, setBarChartHeight] = useState(200);
  const [activeMonth, setActiveMonth] = useState(
    selectedMonthRange ?? defaultMonth
  );
  const [activeCategory, setActiveCategory] = useState(0);
  const [chartData, setChartData] = useState(
    barChartData ?? defaultData[defaultMonth].barChartData
  );
  const [totalSale, setTotalSale] = useState(totalSales ?? 0);
  const [categories, setCategories] = useState<{ id: number; name: string }[]>(
    []
  );
  const [isTotalSales, setIsTotalSales] = useState<boolean>(false);
  const [dataSyncedDate, setDataSyncedDate] = useState<string>("");

  const { barSize, barPadding } = useMemo(() => {
    let key = activeMonth;
    const distributorBarSizeByMonth: DistributorBarSizeByMonth = {
      0: { barSize: 130, padding: 250 },
      1: { barSize: 6, padding: 25 },
      2: { barSize: 120, padding: 170 },
      3: { barSize: 90, padding: 90 },
      4: { barSize: 75, padding: 75 },
      5: { barSize: 60, padding: 64 },
      6: { barSize: 50, padding: 50 },
      7: { barSize: 45, padding: 45 },
      8: { barSize: 40, padding: 45 },
      9: { barSize: 35, padding: 40 },
      10: { barSize: 30, padding: 35 },
      11: { barSize: 25, padding: 30 },
      12: { barSize: 20, padding: 30 }
    };
    if (useDynamicBarSize && (activeMonth != 1 || isWeekView)) {
      key = chartData?.length != 1 ? chartData?.length : 0;
    }

    return {
      barSize: distributorBarSizeByMonth[key]?.barSize,
      barPadding: distributorBarSizeByMonth[key]?.padding
    };
  }, [activeMonth, chartData, isWeekView]);

  const yAxisBarKeys = useMemo(() => {
    const filteredKeys =
      chartData?.length && multiLineChartKey
        ? Object.keys(chartData[0]).filter((key) =>
            key.startsWith(multiLineChartKey)
          )
        : [];

    if (filteredKeys.length <= 2) {
      return filteredKeys.sort((a, b) => {
        const yearA = a.match(/\d+/)?.[0];
        const yearB = b.match(/\d+/)?.[0];
        return Number(yearA) - Number(yearB);
      });
    }
    return filteredKeys;
  }, [multiLineChartKey, chartData]);

  const growthKeys = useMemo(() => {
    if (!chartData?.length || (chartData.length && !showSalesGrowthOption))
      return [];

    const keys = Object.keys(chartData[0])
      .filter((key) => key.endsWith("_key"))
      .map((key) => chartData[0][key])
      .sort((a, b) => a - b)
      .map((key) => "_" + key);

    return isShowGrowth ? keys : [];
  }, [chartData, isShowGrowth]);

  const fetchData = async (
    categoryId: number,
    month: number,
    distributorId?: string,
    warehouseId?: string
  ) => {
    try {
      setLoading(true);
      setChartData([]);
      setTotalSale(0);

      const queryParams = new URLSearchParams();

      if (categoryId) queryParams.append("categoryId", categoryId.toString());
      if (distributorId) queryParams.append("distributorId", distributorId);
      if (month) queryParams.append("month", month.toString());
      if (warehouseId)
        queryParams.append("warehouseId", warehouseId.toString());

      if (role != USER_ROLES.MANUFACTURER)
        queryParams.append("isTotalSales", isTotalSales.toString());

      const queryString = queryParams.toString();

      const url = `/dashboard/my-sales${queryString ? `?${queryString}` : ""}`;

      const { data: response }: any = await apiClient.get(url);

      const result = response.result;
      const categoriesData = response.categories;
      const latestTransactionDate = response.latestTransactionDate;

      setChartData(
        result[month]?.barChartData?.length > 0
          ? result[month]?.barChartData
          : defaultData[month].barChartData
      );
      setTotalSale(result[month]?.totalSale || defaultData[month].totalSale);
      setCategories(categoriesData);
      setDataSyncedDate(latestTransactionDate);
    } catch (err: any) {
      toast.error("Failed to fetch my sales data.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeClick = async (month: number) => {
    setActiveMonth(month);
    // await fetchData(activeCategory, month, distributorId);
  };

  const adjustBarChartHeight = useCallback(() => {
    const totalSalesHeight = totalSalesRef.current?.offsetHeight;

    if (window.innerWidth > 768 && totalSalesHeight) {
      setBarChartHeight(totalSalesHeight - 130);
    }
  }, [totalSalesRef, setBarChartHeight]);

  useEffect(() => {
    // Adjust bar chart height after a delay
    const timeout = setTimeout(adjustBarChartHeight, 220);
    setLoading(isLoading);

    return () => clearTimeout(timeout); // Clean up timeout on unmount
  }, [adjustBarChartHeight, isLoading]);

  useEffect(() => {
    // Adjust height immediately and fetch initial data when dependencies change
    adjustBarChartHeight();

    if (
      barChartData &&
      selectedMonthRange &&
      totalSales != undefined &&
      totalSales >= 0
    ) {
      setActiveMonth(selectedMonthRange);
      setChartData(barChartData);
      setTotalSale(totalSales);
      return;
    }

    if (disableAPICall) return;
    // Fetch initial data
    fetchData(activeCategory, activeMonth, distributorId, warehouseId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeMonth,
    activeCategory,
    distributorId,
    role,
    isTotalSales,
    barChartData,
    totalUnits,
    totalSales,
    warehouseId
  ]);

  const handleCategoryChange = async (e: ChangeEvent<HTMLSelectElement>) => {
    const selectedCategoryId = parseInt(e.target.value);
    setActiveCategory(selectedCategoryId);
    // await fetchData(selectedCategoryId, activeMonth, distributorId);
  };

  const formatYAxisSales = (tickItem: number) => {
    return formatYAxisValueChart(tickItem, removeAxisCurrencySign ? "" : "$"); // Display values below 1000 as the actual value with "$"
  };

  const yAxisLabelFormatter = (value: string | number): string => {
    if (value && typeof value == "string") {
      const [month, day] = value.split(" ");
      return `${month} ${day ? parseInt(day, 10) : ""}`.trim(); // Convert "01" to 1
    }

    return `${value}`;
  };

  return (
    <div
      className="total-distributor-sales-bar-chart w-full h-full"
      ref={totalSalesRef}
    >
      <Card className="h-full">
        <Row className="justify-between max-sm:flex-col min-x max-sm:gap-[8px]">
          <div className="flex flex-col">
            <div className="text-xs font-normal text-heading-very-light">
              Distributor Sales
            </div>
            {totalUnits != undefined ? (
              <div className="text-base font-semibold">
                {`${formatNumber(totalUnits)} Units`}
              </div>
            ) : (
              <div className="text-base font-semibold">
                {totalSale !== undefined ? `$${formatNumber(totalSale)}` : "$0"}
              </div>
            )}
            {dataSyncedDate ? (
              <div className="text-xs font-medium text-heading-light">
                {`Last Synced on ${formatDateToDayMonthYear(dataSyncedDate)}`}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-4 text-sm font-medium text-filter-light">
            {!customFilterOptions?.length &&
              !hideDateRange &&
              dateRangeMonths.map((dateRangeMonth, index) => (
                <DateRangeButton
                  key={`${dateRangeMonth}-${index}`}
                  months={dateRangeMonth}
                  activeMonth={activeMonth}
                  onClick={() => handleDateRangeClick(dateRangeMonth)}
                />
              ))}

            {showSalesGrowthOption && (
              <div className="relative display-products-only-container flex items-center gap-2">
                <div className="flex items-center">
                  <input
                    onChange={() => {
                      handleShowGrowthChange();
                    }}
                    id="showGrowth"
                    type="checkbox"
                    checked={isShowGrowth}
                    className="cursor-pointer w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label
                    htmlFor="showGrowth"
                    className="ms-2 text-sm font-medium cursor-pointer text-filter-light select-none"
                  >
                    YoY Growth
                  </label>
                </div>
              </div>
            )}

            {customFilterOptions?.length && (
              <CustomDropdown
                queryParamKey=""
                excludePageParam={true}
                options={customFilterOptions}
                onOptionChange={handleCustomFilterChange}
                minWidth=""
              />
            )}
            {showCategories && (
              <select
                value={activeCategory}
                onChange={handleCategoryChange}
                className="text-xs outline-none rounded p-2 border border-border-gray max-w-36"
              >
                <option value="">All</option>
                {categories.map((category) => (
                  <option key={`cat-key-${category.id}`} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </Row>
        <Divider marginY="mt-4" />
        <StackedBarChartCustom
          data={chartData}
          barColor="#FF9900"
          barSize={barSize}
          padding={barPadding}
          xAxisKey="date"
          yAxisKey={totalUnits != undefined ? "units" : "sales"}
          yAxisTickFormatter={formatYAxisSales}
          top={20}
          yAxisLabelFormatter={yAxisLabelFormatter}
          showAllxAxisTicks={activeMonth !== 1}
          height="h-full min-h-[200px]"
          maxHeight={barChartHeight}
          xAxisInterval={activeMonth === 1 && !isWeekView ? 2 : undefined}
          loading={loading}
          removeAxisCurrencySign={removeAxisCurrencySign}
          yAxisBarKeys={yAxisBarKeys}
          yAxisKeyPrefix={multiLineChartKey}
          stackedBarKeys={growthKeys}
        />
      </Card>
    </div>
  );
};

export default MySalesCard;
