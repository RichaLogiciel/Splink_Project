"use client";
import { apiClient } from "@/lib/axiosClient";
import { formatChartData } from "@/utils/formatSalesData";
import { formatYAxisValueChart } from "@/utils/helper";
import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import Card from "./Card";
import DateRangeButton from "./DateRangeButton";
import Divider from "./Divider";
import Loader from "./Loader";
import Row from "./Row";

interface LineChartCustomProps {
  xAxisKey: string;
  yAxisKey: string;
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

const LineChartCustom = ({
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
  disableAPICall
}: LineChartCustomProps) => {
  const dateRangeMonths = [1, 3, 6, 12];
  const defaultMonth: number = 1;
  const [data, setData] = useState<any[]>(chartData ?? defaultData); // State for the data
  const [categories, setCategories] = useState<{ id: string; name: string }[]>(
    []
  ); // State for categories with categoryId and categoryName

  const [loading, setLoading] = useState(false);

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
  // Fetch categories and data when distributorId changes
  useEffect(() => {
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
  }, [chartData, selectedMonthRange]);

  const formatYAxis = (tickItem: number) => {
    return formatYAxisValueChart(tickItem);
  };

  const formatXAxis = (tickItem: string) => {
    if (tickItem && typeof tickItem == "string") {
      const [month, day] = tickItem.split(" ");
      return `${month} ${day ? parseInt(day, 10) : ""}`.trim(); // Convert "01" to 1
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
      return (
        <div className="custom-tooltip min-w-[120px]  min-h-[80px] p-2 bg-white border border-border-gray">
          <p className="label">
            {yAxisLabelFormatter ? yAxisLabelFormatter(label ?? "") : label}
          </p>
          <p className="label">
            {xAxisLabelFormatter
              ? xAxisLabelFormatter(xAxisValue)
              : `value: ${xAxisValue}`}
          </p>
          {!!payload[0]?.payload?.saleGrowth && (
            <p className="label">{`Monthly Growth: ${payload[0].payload.saleGrowth}`}</p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="sku-distribution-bar-chart w-full lg:w-1/2 xl:w-full flex-1 p-0 relative">
      {/* Category Filter Dropdown */}
      <Row className="justify-between">
        {chartLabel ? (
          <div className="flex flex-col">
            <div className="text-base font-semibold">{chartLabel}</div>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="text-xs font-normal text-heading-very-light">
              Distributor Program Overview
            </div>
            <div className="text-base font-semibold">
              Points of Distribution
            </div>
          </div>
        )}
        <div className="flex items-center gap-4 text-sm font-medium text-filter-light">
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
        </div>
      </Row>
      <Divider />
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
              padding={{ left: 30 }} // Adjust padding if necessary
              interval={activeMonth == 1 ? 3 : undefined}
              axisLine={false}
            />
            <YAxis
              tickFormatter={formatYAxis}
              tick={{ fill: "#666", fontSize: 12 }}
              ticks={customTicks}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#FFF",
                border: "1px solid #DDD",
                fontSize: 12
              }}
              content={<CustomTooltip />}
            />
            <Line
              type="linear"
              dataKey={yAxisKey}
              stroke={lineColor || "#333"}
              strokeWidth={2}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
};

export default LineChartCustom;
