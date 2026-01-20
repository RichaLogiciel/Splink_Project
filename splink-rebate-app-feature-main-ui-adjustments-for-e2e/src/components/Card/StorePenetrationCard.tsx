"use client";

import { formatNumber } from "@/utils/numberFormatter";
import { useMemo, useState } from "react";
import StackedLineChartCustom from "../StackedLineChartCustom";

interface StorePenetrationCardProps {
  xAxisLabelFormatter?: (label: string | number) => string;
  chartData: any[];
  chartGrowthData?: any[];
  hideDateRange?: boolean;
  multiLineChartKey?: string;
  selectedMonthRange?: number;
  totalValue?: string;
  isLoading?: boolean;
  maxPercentage?: number;
  showYoyGrowthOption?: boolean;
}

const StorePenetrationCard = ({
  chartData,
  chartGrowthData,
  hideDateRange,
  selectedMonthRange,
  multiLineChartKey,
  totalValue,
  isLoading = false,
  maxPercentage = 100,
  showYoyGrowthOption
}: StorePenetrationCardProps) => {
  const [showStorePenetrationGrowth, setShowStorePenetrationGrowth] =
    useState(false);

  const chartLines = useMemo(() => {
    let filteredKeys = [];
    if (showStorePenetrationGrowth) {
      filteredKeys =
        chartGrowthData?.length && multiLineChartKey
          ? Object.keys(chartGrowthData[0]).filter((key) =>
              key.startsWith(multiLineChartKey)
            )
          : [];
    } else {
      filteredKeys =
        chartData?.length && multiLineChartKey
          ? Object.keys(chartData[0]).filter((key) =>
              key.startsWith(multiLineChartKey)
            )
          : [];
    }
    if (filteredKeys.length <= 2) {
      filteredKeys.sort((a, b) => {
        const yearA = a.match(/\d+/)?.[0];
        const yearB = b.match(/\d+/)?.[0];
        return Number(yearA) - Number(yearB);
      });
    }

    return filteredKeys;
  }, [multiLineChartKey, chartData, showStorePenetrationGrowth]);

  const growthKeys = useMemo(() => {
    if (
      !chartGrowthData?.length ||
      (chartGrowthData.length && !showStorePenetrationGrowth)
    )
      return [];

    const keys = Object.keys(chartGrowthData[0])
      .filter((key) => key.endsWith("_key"))
      .map((key) => chartGrowthData[0][key])
      .sort((a, b) => a - b)
      .map((key) => "_" + key);

    return showStorePenetrationGrowth ? keys : [];
  }, [chartGrowthData, showStorePenetrationGrowth]);

  const xAxisLabelFormatter = (label: string | number) => {
    if (label || label == 0) {
      return `% of Stores: ${formatNumber(Number(label))}%`;
    } else {
      return "";
    }
  };

  const yAxisLabelFormatter = (value: string | number): string => {
    let label = `${value}`;

    if (value && typeof value == "string") {
      const [month, day] = value.split(" ");
      label = `${month} ${day ? parseInt(day, 10) : ""}`.trim(); // Convert "01" to 1
    }

    return label;
  };

  const customTicks = useMemo(() => {
    const defaultMaxTicksWithCeilInterval = 100;
    const defaultTicksInverval = 10;
    // If no product is selected from product rankings list then display 0-100 on y-axis
    const defaultTicks = Array.from(
      { length: defaultMaxTicksWithCeilInterval / defaultTicksInverval + 1 },
      (_, i) => i * defaultTicksInverval
    );
    if (!totalValue) {
      return defaultTicks;
    }

    const minTicksWithCeilInterval = 25;
    const ticksInverval = 5;
    // Minimum 5 ticks with interval of ${ticksInverval}
    const minimumTicks = Array.from(
      { length: minTicksWithCeilInterval / ticksInverval + 1 },
      (_, i) => i * ticksInverval
    );
    if (maxPercentage < minTicksWithCeilInterval) {
      return minimumTicks;
    }

    // Calculate the ceiling value that's greater than maxPercentage
    const ceiling = Math.ceil(maxPercentage / ticksInverval) * ticksInverval;
    // Generate ticks from 0 to ceiling with step of ${ticksInverval}
    return Array.from(
      { length: ceiling / ticksInverval + 1 },
      (_, i) => i * ticksInverval
    );
  }, [maxPercentage]);

  return (
    <StackedLineChartCustom
      chartLabel={"Store Penetration"}
      xAxisKey="date"
      yAxisKey="value"
      lineColor="#FF9900"
      chartData={showStorePenetrationGrowth ? chartGrowthData : chartData}
      tooltipTotalValue={totalValue}
      distributorId={""}
      xAxisLabelFormatter={xAxisLabelFormatter}
      showCategories={false}
      yAxisLabelFormatter={yAxisLabelFormatter}
      hideDateRange={hideDateRange}
      selectedMonthRange={selectedMonthRange}
      customTicks={customTicks}
      disableAPICall={true}
      chartLines={chartLines}
      yAxisKeyPrefix={multiLineChartKey}
      isLoading={isLoading}
      showGrowthOption={showYoyGrowthOption}
      isShowGrowth={showStorePenetrationGrowth}
      stackedLineKeys={growthKeys}
      handleShowGrowthChange={() => {
        setShowStorePenetrationGrowth((prev) => !prev);
      }}
      yAxisTickSuffix="%"
    />
  );
};
export default StorePenetrationCard;
