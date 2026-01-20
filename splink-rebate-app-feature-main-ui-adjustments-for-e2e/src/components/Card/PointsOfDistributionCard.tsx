"use client";

import LineChartCustom from "../LineChartCustom";

import { formatNumber } from "@/utils/numberFormatter";

interface PointsOfDistributionCardProps {
  xAxisLabelFormatter?: (label: string | number) => string;
  distributorId: string;
  showCategories?: boolean;
  selectedMonthRange?: number;
  hideDateRange?: boolean;
}

const PointsOfDistributionCard = ({
  distributorId,
  showCategories = true,
  hideDateRange,
  selectedMonthRange
}: PointsOfDistributionCardProps) => {
  const xAxisLabelFormatter = (label: string | number) => {
    if (label || label == 0) {
      return `POD: ${formatNumber(Number(label))}`;
    } else {
      return "";
    }
  };

  const yAxisLabelFormatter = (value: string | number): string => {
    if (value && typeof value == "string") {
      const [month, day] = value.split(" ");
      return `${month} ${day ? parseInt(day, 10) : ""}`.trim(); // Convert "01" to 1
    }

    return `${value}`;
  };

  return (
    <LineChartCustom
      xAxisKey="date"
      yAxisKey="value"
      lineColor="#106210"
      distributorId={distributorId}
      xAxisLabelFormatter={xAxisLabelFormatter}
      showCategories={showCategories}
      yAxisLabelFormatter={yAxisLabelFormatter}
      hideDateRange={hideDateRange}
      selectedMonthRange={selectedMonthRange}
    />
  );
};
export default PointsOfDistributionCard;
