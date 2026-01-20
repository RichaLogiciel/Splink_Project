"use client";
import { apiClient } from "@/lib/axiosClient";
import { formatChartData } from "@/utils/formatSalesData";
import { formatYAxisValueChart } from "@/utils/helper";
import { formatNumber } from "@/utils/numberFormatter";
import { TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import Card from "./Card";
import ColorBox from "./ColorBox";
import DateRangeButton from "./DateRangeButton";
import Divider from "./Divider";
import Loader from "./Loader";
import Row from "./Row";

interface StackedLineChartCustomProps {
  xAxisKey: string;
  yAxisKey: string | string[];
  lineColor: string;
  chartData?: any[];
  yAxisLabelFormatter?: (label: string | number) => string;
  xAxisLabelFormatter?: (label: string | number) => string;
  distributorId: string; // Distributor ID for fetching data
  showCategories?: boolean;
  hideDateRange?: boolean;
  selectedMonthRange?: number;
  chartLabel?: string;
  customTicks?: number[];
  disableAPICall?: boolean;
  chartLines?: string[];
  yAxisKeyPrefix?: string;
  tooltipTotalValue?: string;
  isLoading?: boolean;
  stackedLineKeys?: string[];
  showGrowthOption?: boolean;
  isShowGrowth?: boolean;
  yAxisTickSuffix?: string;
  handleShowGrowthChange?: () => void;
  isYAxisOrientationToRight?: boolean;
  isShowGrowthDistributorData?: boolean;
  legendFormatter?: (value: string) => string;
  yAxisTickFormatter?: (tickItem: number) => string;
  hideDollarSign?: boolean;
}

const defaultData = [
  {
    date: "Jan",
    value: 0,
    saleGrowth: ""
  },
  {
    date: "Feb",
    value: 0,
    saleGrowth: ""
  },
  {
    date: "Mar",
    value: 0,
    saleGrowth: ""
  },
  {
    date: "Apr",
    value: 0,
    saleGrowth: ""
  },
  {
    date: "May",
    value: 0,
    saleGrowth: ""
  },
  {
    date: "Jun",
    value: 0,
    saleGrowth: ""
  },
  {
    date: "Jul",
    value: 0,
    saleGrowth: ""
  },
  {
    date: "Aug",
    value: 0,
    saleGrowth: ""
  },
  {
    date: "Sep",
    value: 0,
    saleGrowth: ""
  },
  {
    date: "Oct",
    value: 0,
    saleGrowth: ""
  },
  {
    date: "Nov",
    value: 0,
    saleGrowth: ""
  },
  {
    date: "Dec",
    value: 0,
    saleGrowth: ""
  }
];

const StackedLineChartCustom = ({
  chartData,
  xAxisKey,
  yAxisKey,
  lineColor,
  yAxisLabelFormatter,
  xAxisLabelFormatter,
  distributorId,
  showCategories = true,
  hideDateRange,
  selectedMonthRange,
  chartLabel,
  customTicks,
  disableAPICall,
  chartLines,
  yAxisKeyPrefix,
  tooltipTotalValue,
  isLoading = false,
  stackedLineKeys,
  showGrowthOption = false,
  isShowGrowth = false,
  yAxisTickSuffix,
  isYAxisOrientationToRight = false,
  isShowGrowthDistributorData = false,
  legendFormatter,
  handleShowGrowthChange = () => {},
  yAxisTickFormatter,
  hideDollarSign = false
}: StackedLineChartCustomProps) => {
  const dateRangeMonths = [1, 3, 6, 12];
  const defaultMonth: number = 1;
  const [data, setData] = useState<any[]>(chartData ?? defaultData); // State for the data
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  ); // State for categories with categoryId and categoryName

  const [loading, setLoading] = useState(isLoading);

  const fetchData = async (month: number) => {
    try {
      setLoading(true);
      let url = `/manufacturer/distributor-program-overview?`;

      if (distributorId) {
        url += `&distributorId=${distributorId}`;
      }

      if (month) {
        url += `&month=${month}`;
      }

      if (activeCategory) {
        url += `&category=${activeCategory}`;
      }

      const { data: response }: any = await apiClient.get(url);

      if (response && response.salesData) {
        // Check if salesData exists in the response
        const salesData = response.salesData;

        if (salesData && Array.isArray(salesData)) {
          // Format the data and set it in state
          const formattedData = formatChartData(salesData, true);
          setData(formattedData);
        } else {
          console.log("salesData is missing or not an array");
        }
      } else {
        console.log("Invalid response structure", response);
      }

      // Set categories if available (if applicable in your API)
      setCategories(response.categories || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [activeMonth, setActiveMonth] = useState(
    selectedMonthRange ?? defaultMonth
  );

  const handleDateRangeClick = async (month: number) => {
    setActiveMonth(month);
    await fetchData(month);
  };
  // Update data when chartData prop changes
  useEffect(() => {
    if (chartData && Array.isArray(chartData)) {
      setData(chartData);
    }
  }, [chartData]);

  // Fetch categories and data when distributorId changes
  useEffect(() => {
    setLoading(isLoading);
    if (!chartData && selectedMonthRange) {
      if (disableAPICall) return;

      setActiveMonth(selectedMonthRange);
      fetchData(selectedMonthRange);
      return;
    }

    if (chartData && selectedMonthRange) {
      setData(chartData);
      setActiveMonth(selectedMonthRange);
      return;
    }

    if (disableAPICall) return;
    fetchData(defaultMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chartData, selectedMonthRange, isLoading]);

  const formatYAxis = (tickItem: number) => {
    if (yAxisTickFormatter) return yAxisTickFormatter(tickItem);
    return formatYAxisValueChart(tickItem, undefined, yAxisTickSuffix);
  };

  const formatXAxis = (tickItem: string) => {
    if (tickItem && typeof tickItem == "string") {
      const [month, day] = tickItem.split(" ");

      if (isNaN(Number(day))) return tickItem;

      if (Number(day) && Number(day) % 2 === 0) {
        return `${month} ${day ? parseInt(day, 10) : ""}`.trim(); // Convert "01" to 1
      }
      return "";
    }

    return tickItem; // Show abbreviated month name (e.g., "Jan", "Feb")
  };

  // Handle the category change
  const handleCategoryChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setActiveCategory(event.target.value);
  };

  const CustomTooltip: any = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const xAxisValue = payload[0].value;

      let totalSumPercentage = -1;
      let totalSumStores = -1;
      if (chartLines?.length && payload) {
        totalSumPercentage = 0;
        totalSumStores = 0;

        chartLines.map((key: string) => {
          if (payload?.[0]?.payload?.[key])
            totalSumPercentage += parseInt(
              formatNumber(payload?.[0]?.payload?.[key])
            );
          if (payload?.[0]?.payload?.["storesCount_" + key])
            totalSumStores += payload?.[0]?.payload?.["storesCount_" + key];
        });
      }

      return (
        <div className="custom-tooltip min-w-[120px]  min-h-[80px] p-2 bg-white border border-border-gray">
          <div className="w-full flex flew-row justify-between gap-3">
            <p className="label">
              {yAxisLabelFormatter ? yAxisLabelFormatter(label ?? "") : label}
            </p>
            {tooltipTotalValue != undefined ? (
              <p>{`Total: ${tooltipTotalValue}`}</p>
            ) : null}
          </div>

          {!chartLines?.length ? (
            <div className="">
              {xAxisLabelFormatter ? (
                <p className="label">{xAxisLabelFormatter(xAxisValue)}</p>
              ) : (
                <div className="">
                  <span>{`value: ${xAxisValue}`}</span>
                </div>
              )}
            </div>
          ) : null}
          {!chartLines?.length &&
          !isShowGrowthDistributorData &&
          payload[0]?.payload?.storesCount >= 0 ? (
            <p className="label">{`No of stores: ${formatNumber(Number(payload[0].payload.storesCount))}`}</p>
          ) : null}

          {!chartLines?.length &&
          isShowGrowthDistributorData &&
          payload[0]?.payload?.storesCount >= 0 ? (
            <p className="label">{`% of stores: ${formatNumber(Number(payload[0].payload.value))}%`}</p>
          ) : null}

          {payload[0]?.payload?.saleGrowth ? (
            <p className="label">{`Monthly Growth: ${payload[0].payload.saleGrowth}`}</p>
          ) : null}

          {chartLines?.length && yAxisKeyPrefix ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {chartLines.map((key: string, index: number) => (
                <div
                  className="flex flex-row items-center gap-1"
                  key={`stacked-line-${index}`}
                >
                  <ColorBox
                    color={(() => {
                      // Extract year from key for color access with fallbacks
                      const keyWithoutPrefix = key?.replace(yAxisKeyPrefix, "");
                      const yearMatch = keyWithoutPrefix?.match(/(\d{4})/);
                      const year = yearMatch ? yearMatch[1] : keyWithoutPrefix;

                      // Try multiple fallback approaches for color
                      return (
                        payload?.[0]?.payload[`color_${year}`] ||
                        payload?.[0]?.payload[`color_${keyWithoutPrefix}`] ||
                        payload?.[0]?.payload[`color_${key}`] ||
                        payload?.[0]?.payload[
                          `color_${key?.replace(yAxisKeyPrefix, "")}`
                        ] ||
                        "#6B7280" // Default gray color
                      );
                    })()}
                  />

                  {isShowGrowthDistributorData ? (
                    <>
                      {isShowGrowth && stackedLineKeys?.length ? (
                        <p className="label text-sm">
                          {stackedLineKeys
                            .find((Linekey: string) => key.includes(Linekey))
                            ?.replaceAll("_", "")}
                          :
                        </p>
                      ) : (
                        ""
                      )}
                      <p className="label text-sm">{`(${hideDollarSign ? "" : "$"}${formatNumber(
                        (() => {
                          const keyWithoutPrefix = key?.replaceAll(
                            yAxisKeyPrefix,
                            ""
                          );

                          // Try multiple fallback approaches for data access
                          return (
                            payload?.[0]?.payload[keyWithoutPrefix] ??
                            payload?.[0]?.payload[
                              `cumulativeSales_${keyWithoutPrefix}`
                            ] ??
                            payload?.[0]?.payload[
                              `sales_${keyWithoutPrefix}`
                            ] ??
                            payload?.[0]?.payload[key] ??
                            0
                          );
                        })()
                      )})`}</p>
                    </>
                  ) : (
                    <>
                      {isShowGrowth && stackedLineKeys?.length ? (
                        <p className="label text-sm">
                          {stackedLineKeys
                            .find((Linekey: string) => key.includes(Linekey))
                            ?.replaceAll("_", "")}
                          :
                        </p>
                      ) : (
                        ""
                      )}

                      <p className="label text-sm">{`${formatNumber(payload?.[0]?.payload[key ?? 0])}% (${payload?.[0]?.payload["storesCount_" + key]})`}</p>
                    </>
                  )}
                </div>
              ))}
            </div>
          ) : null}

          {isShowGrowth && payload?.[0]?.payload?.growth != undefined && (
            <span className="flex items-center gap-1 text-sm mt-1">
              <TrendingUp width={14} height={14} color="#18B368" />
              <p>
                Growth: {formatNumber(payload?.[0]?.payload?.growth, true)}%
              </p>
            </span>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="w-full lg:w-1/2 xl:w-full flex-1 p-0">
      <Card className="sku-distribution-bar-chart relative h-full">
        {/* Category Filter Dropdown */}
        <Row className="justify-between">
          {chartLabel ? (
            <div className="flex flex-col">
              <div className="text-base font-semibold">{chartLabel}</div>
            </div>
          ) : (
            !isShowGrowthDistributorData && (
              <div className="flex flex-col">
                <div className="text-xs font-normal text-heading-very-light">
                  Distributor Program Overview
                </div>
                <div className="text-base font-semibold">
                  Points of Distribution
                </div>
              </div>
            )
          )}
          <div className="flex items-center gap-4 text-sm font-medium text-filter-light">
            {showGrowthOption && (
              <div className="relative display-products-only-container flex items-center gap-2">
                <div className="flex items-center">
                  <input
                    onChange={() => {
                      handleShowGrowthChange();
                    }}
                    id="showStorePenetrationGrowth"
                    type="checkbox"
                    checked={isShowGrowth}
                    className="cursor-pointer w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                  />
                  <label
                    htmlFor="showStorePenetrationGrowth"
                    className="ms-2 text-sm font-medium cursor-pointer text-filter-light select-none"
                  >
                    YoY Growth
                  </label>
                </div>
              </div>
            )}
            {!hideDateRange &&
              dateRangeMonths.map((dateRangeMonth, index) => (
                <DateRangeButton
                  key={`${dateRangeMonth}-${index}`}
                  months={dateRangeMonth}
                  activeMonth={activeMonth}
                  onClick={() => handleDateRangeClick(dateRangeMonth)}
                />
              ))}
            {showCategories && (
              <div className="flex items-center ml-auto">
                <select
                  value={activeCategory}
                  onChange={handleCategoryChange}
                  className="text-xs outline-none rounded p-2 border border-border-gray"
                >
                  <option value="">Categories</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                      {/* Display category name in the dropdown */}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {isShowGrowthDistributorData && legendFormatter && (
              <div className="flex gap-3">
                <Legend
                  verticalAlign="top"
                  align="right"
                  payload={[
                    {
                      value: "pastYear",
                      type: "line",
                      color: data?.[0]?.["color" + stackedLineKeys?.[0]]
                    },
                    {
                      value: "currentYear",
                      type: "line",
                      color: data?.[0]?.["color" + stackedLineKeys?.[1]]
                    }
                  ]}
                  wrapperStyle={{
                    fontSize: "14px",
                    position: "absolute",
                    opacity: 1,
                    width: "max-content",
                    top: 12,
                    right: 8
                  }}
                  formatter={legendFormatter}
                />
              </div>
            )}
          </div>
        </Row>
        {!isShowGrowthDistributorData && <Divider />}
        {/* Line Chart */}

        {loading ? (
          <Loader
            show={loading}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-transparent"
          />
        ) : (
          <ResponsiveContainer
            width="100%" // Ensure full width
            height={300}
            style={{ cursor: "inherit", margin: "0 auto", padding: 0 }} // Ensure no padding or margin
          >
            <LineChart
              data={data} // Use fetched data
              margin={{ top: 10, right: 20, bottom: 10, left: -20 }}
            >
              <CartesianGrid
                stroke="#e5e7eb"
                strokeDasharray="3 3"
                horizontal={true}
                vertical={false}
              />
              <XAxis
                dataKey={xAxisKey}
                tickFormatter={formatXAxis}
                tick={{ fill: "#666", fontSize: 12 }}
                padding={{ left: isShowGrowthDistributorData ? 40 : 30 }} // Adjust padding if necessary
                interval={activeMonth == 1 ? 2 : undefined}
                axisLine={false}
              />
              <YAxis
                {...(customTicks
                  ? {
                      domain: [
                        Math.min(...customTicks),
                        Math.max(...customTicks)
                      ]
                    }
                  : {})}
                tickFormatter={formatYAxis}
                tick={{ fill: "#666", fontSize: 12 }}
                ticks={customTicks}
                axisLine={false}
                orientation={isYAxisOrientationToRight ? "right" : "left"}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#FFF",
                  border: "1px solid #DDD",
                  fontSize: 12
                }}
                content={<CustomTooltip />}
              />

              {chartLines?.length ? (
                [...(stackedLineKeys?.length ? stackedLineKeys : ["a"])].map(
                  (stackedLine: string, i: number) =>
                    chartLines
                      .filter((line: string) =>
                        stackedLineKeys?.length
                          ? line.includes(stackedLine)
                          : true
                      )
                      .map((line: string, index: number) => (
                        <Line
                          key={`${line}-${index}`}
                          type="linear"
                          strokeDasharray={
                            !isShowGrowthDistributorData &&
                            i == 0 &&
                            stackedLineKeys?.length
                              ? "5 5"
                              : undefined
                          }
                          dataKey={line}
                          stroke={(() => {
                            // Extract year from line name for color access with fallbacks
                            const lineWithoutPrefix = line?.replace(
                              yAxisKeyPrefix ?? "",
                              ""
                            );
                            const yearMatch =
                              lineWithoutPrefix?.match(/(\d{4})/);
                            const year = yearMatch
                              ? yearMatch[1]
                              : lineWithoutPrefix;

                            // Try multiple fallback approaches for stroke color
                            return (
                              data?.[0]?.[`color_${year}`] ||
                              data?.[0]?.[`color_${lineWithoutPrefix}`] ||
                              data?.[0]?.[`color_${line}`] ||
                              data?.[0]?.[
                                `color_${line?.replace(yAxisKeyPrefix ?? "", "")}`
                              ] ||
                              "#3B82F6" // Default blue color
                            );
                          })()}
                          strokeWidth={2}
                          activeDot={{ r: 8 }}
                        />
                      ))
                )
              ) : (
                <Line
                  type="linear"
                  dataKey={yAxisKey as string}
                  stroke={lineColor || "#333"}
                  strokeWidth={2}
                  activeDot={{ r: 8 }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>
    </div>
  );
};

export default StackedLineChartCustom;
