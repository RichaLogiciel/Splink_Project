"use client";

import Checkbox from "@/core-ui/Checkbox";
import { apiClient } from "@/lib/axiosClient";
import { formatYAxisValueChart } from "@/utils/helper";
import { useEffect, useMemo, useState } from "react";
import Card from ".";
import BarChartCustom from "../BarChartCustom";
import Divider from "../Divider";
import Row from "../Row";
import LegendIcon from "../icons/LegendIcon/LegendIcon";

// Define the Category type
interface Category {
  id: string;
  name: string;
}

// Define default data
const defaultData = [
  {
    skuCount: 0,
    storeCount: 0
  },
  {
    skuCount: 1,
    storeCount: 0
  },
  {
    skuCount: 2,
    storeCount: 0
  },
  {
    skuCount: 3,
    storeCount: 0
  },
  {
    skuCount: 4,
    storeCount: 0
  }
];

const SkusPerStoreCard = ({
  distributorId,
  showCategories = true,
  selectedMonthRange,
  selectedYear,
  isLoading = false,
  manufacturerId = 0,
  showGrowthBtn = false,
  warehouseId,
  distributorIds
}: any) => {
  const [skusPerStoreData, setSkusPerStoreData] = useState([]);
  const [categories, setCategories] = useState<Category[]>([]); // Explicitly define type as Category[]
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [showGrowth, setShowGrowth] = useState<boolean>(false);
  const [skuCountMean, setSkuCountMean] = useState<{
    currentYear: number;
    lastYear: number;
  }>({
    currentYear: 0,
    lastYear: 0
  });
  const [skuCountMedian, setSkuCountMedian] = useState<{
    currentYear: number;
    lastYear: number;
  }>({
    currentYear: 0,
    lastYear: 0
  });

  const formatYAxisSku = (tickItem: number) => {
    return formatYAxisValueChart(tickItem);
  };

  const yAxisLabelFormatter = (label: string | number) => {
    if (label) {
      return `Sku Count: ${String(label)}`;
    } else {
      return "";
    }
  };
  const xAxisLabelFormatter = (
    label: string | number,
    labelPostfix: string = ""
  ) => {
    let updatedLabel = "";
    if (label) {
      if (labelPostfix) {
        updatedLabel += `${labelPostfix} `;
      }
      updatedLabel += "Store Count";

      updatedLabel += `: ${String(label)}`;
    }
    return updatedLabel;
  };

  const customBarShape = (props: any) => {
    const { x, y, width, height, fill } = props;

    return (
      <path
        d={`M ${x} ${y} H ${x + width} V ${y + height} H ${x} Z M ${x} ${y} H ${
          x + width
        } V ${y + height} H ${x} Z M ${x} ${y} C ${x} ${y - 5}, ${x + width} ${
          y - 5
        }, ${x + width} ${y}`}
        fill={fill}
      />
    );
  };

  const handleCategoryChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setActiveCategory(event.target.value);
  };

  const calculateWeightedMean = (skuCounts: any, storeCountKey: string) => {
    let totalSkuCount = 0;
    let totalStores = 0;

    skuCounts.forEach((item: any) => {
      const storeCount = item[storeCountKey] ?? 0;
      if (!isNaN(storeCount)) {
        totalSkuCount += item.skuCount * storeCount;
        totalStores += storeCount;
      }
    });
    return totalStores === 0
      ? 0
      : Number((totalSkuCount / totalStores).toFixed(1));
  };

  const calculateWeightedMedian = (skuCounts: any, storeCountKey: string) => {
    // Sort the data by skuCount
    const sortedData = [...skuCounts].sort((a, b) => a.skuCount - b.skuCount);

    // Calculate total weight
    const totalWeight = sortedData.reduce(
      (sum: number, item: any) => sum + (item[storeCountKey] || 0),
      0
    );

    // Find the median
    let cumulativeWeight = 0;
    for (const item of sortedData) {
      if (item[storeCountKey] && !isNaN(item[storeCountKey])) {
        cumulativeWeight += item[storeCountKey];
        if (cumulativeWeight >= totalWeight / 2) {
          return Math.round(item.skuCount);
        }
      }
    }

    return 0;
  };

  // Fetch the SKU data and categories when the component mounts or whenever distributor or category changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch categories first

        let url = `/manufacturer/skus-per-store-optimized?`;

        if (distributorId && distributorId !== "0") {
          url += `&distributorId=${distributorId}`;
        }

        if (manufacturerId) {
          url += `&manufacturerId=${manufacturerId}`;
        }

        if (activeCategory) {
          url += `&categoryId=${activeCategory}`;
        }

        if (selectedMonthRange) {
          url += `&monthRange=${selectedMonthRange}`;
        }

        if (selectedYear) {
          url += `&year=${selectedYear}`;
        }

        if (warehouseId) {
          url += `&warehouseId=${warehouseId}`;
        }

        if (distributorId === "0" && distributorIds) {
          url += `&distributorIds=${distributorIds.join(",")}`;
        }

        const { data }: any = await apiClient.get(url);

        const mean = {
          currentYear: calculateWeightedMean(data.skuCounts, "storeCount"),
          lastYear: calculateWeightedMean(data.skuCounts, "storeCountLastYear")
        };
        setSkuCountMean(mean);

        const median = {
          currentYear: calculateWeightedMedian(data.skuCounts, "storeCount"),
          lastYear: calculateWeightedMedian(
            data.skuCounts,
            "storeCountLastYear"
          )
        };
        setSkuCountMedian(median);

        // Assuming the API returns data in the following format
        setSkusPerStoreData(
          data.skuCounts?.length > 0
            ? data.skuCounts?.map((el: any) => {
                el.lineSkuCount = Math.round(Math.random() * 3);
                el.lineStoreCount = Math.round(Math.random() * 3);
                return el;
              })
            : defaultData
        ); // Set SKU counts data

        // Set categories data (assuming response.data.categories contains categories)
        setCategories(data.categories); // Set categories dynamically
      } catch (error) {
        console.error("Error fetching SKU data:", error);
      }
    };

    // Only fetch data if distributorId is available

    fetchData();
  }, [
    distributorId,
    manufacturerId,
    activeCategory,
    selectedMonthRange,
    selectedYear,
    warehouseId
  ]); // Re-run the effect when either of these values change

  const customeTicks = useMemo(() => {
    const maxStoreCount = Math.max(
      ...(skusPerStoreData || [0]).map((dt: any) => dt.storeCount ?? 0)
    );
    return maxStoreCount < 4
      ? [1, 2, 3, 4]
      : maxStoreCount % 2 !== 0
        ? Array.from({ length: 4 }, (_, i) =>
            Math.round((i + 1) * (maxStoreCount / 4))
          )
        : undefined;
  }, [skusPerStoreData]);

  return (
    <div className="w-full lg:w-1/2 xl:w-full flex-1 h-full">
      <Card className="sku-distribution-bar-chart">
        <Row className="justify-between" marginBottom="mb-2">
          <div className="flex flex-col">
            <div className="text-xs font-normal text-heading-very-light">
              Sku Distribution
            </div>
            <div className="text-base font-semibold">Skus Per Store</div>
          </div>
          {showGrowthBtn && (
            <div className="items-center">
              <Checkbox
                className="cursor-pointer select-none"
                size="w-4 h-4"
                lableStyle="ms-2 text-sm font-medium cursor-pointer text-filter-light select-none"
                label="YoY Growth"
                id="showGrowth"
                onChange={() => setShowGrowth(!showGrowth)}
                checked={showGrowth}
              ></Checkbox>
            </div>
          )}

          {showCategories && (
            <div className="flex items-center ml-auto">
              <select
                value={activeCategory}
                onChange={handleCategoryChange}
                className="text-xs outline-none rounded p-2 border border-border-gray"
              >
                <option value="">Categories</option>
                {/* Render categories dynamically */}
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </Row>

        <Divider marginY="my-3" />
        {showGrowthBtn && (
          <Row
            className={`text-sm justify-self-end relative`}
            marginBottom={"mb-2"}
          >
            <div
              className={`absolute bottom-[-20px] transform -translate-x-full left-0`}
            >
              <Row
                className={`text-sm w-max`}
                marginBottom={"mb-0"}
                gap="gap-4"
              >
                {showGrowth && (
                  <div className="last-year flex gap-3 text-danger">
                    <div className="flex items-center gap-1">
                      <LegendIcon color="#dc2626" />
                      <span>Mean: {skuCountMean.lastYear}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <LegendIcon color="#dc2626" />
                      <span>Median: {skuCountMedian.lastYear}</span>
                    </div>
                  </div>
                )}

                <div className="current-year flex gap-3 text-heading-blue">
                  <div className="flex items-center gap-1">
                    <LegendIcon color="#0071B3" />
                    <span>Mean: {skuCountMean.currentYear}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <LegendIcon color="#0071B3" />
                    <span>Median: {skuCountMedian.currentYear}</span>
                  </div>
                </div>
              </Row>
            </div>
          </Row>
        )}
        <BarChartCustom
          fillMissingXValues
          data={skusPerStoreData} // Pass the fetched data to the chart
          barColor="#0071B3"
          barSize={20}
          padding={30}
          xAxisKey="skuCount"
          yAxisKey="storeCount"
          yAxisTickFormatter={formatYAxisSku}
          yAxisLabelFormatter={yAxisLabelFormatter}
          xAxisLabelFormatter={xAxisLabelFormatter}
          height="h-[300px]"
          customBarShape={customBarShape}
          showLegend={true}
          customTicks={customeTicks}
          top={10}
          right={0}
          bottom={5}
          left={-15}
          loading={isLoading}
          showAllxAxisTicks
          showGrowth={showGrowth}
        />
      </Card>
    </div>
  );
};

export default SkusPerStoreCard;
