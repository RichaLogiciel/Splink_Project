"use client";

import React from "react";
import Card from "@/components/Card/";
import { formatNumber } from "@/utils/numberFormatter";

interface StatisticItem {
  label: string;
  value: number | string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface DistributorAdminStatsCardProps {
  statistics: StatisticItem[];
  isLoading?: boolean;
}

const DistributorAdminStatsCard: React.FC<DistributorAdminStatsCardProps> = ({
  statistics,
  isLoading = false
}) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {[...Array(4)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-20"></div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
      {statistics.map((stat, index) => (
        <Card key={index} className="relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-600">
              {stat.label}
            </div>
            {stat.icon && <div className="text-gray-400">{stat.icon}</div>}
          </div>

          <div className="text-2xl font-bold text-gray-900 mb-1">
            {typeof stat.value === "number"
              ? formatNumber(stat.value)
              : stat.value}
          </div>

          {stat.trend && (
            <div
              className={`text-sm flex items-center ${
                stat.trend.isPositive ? "text-green-600" : "text-red-600"
              }`}
            >
              <span className="mr-1">
                {stat.trend.isPositive ? "↗" : "↘"}
              </span>
              {Math.abs(stat.trend.value)}%
              <span className="text-gray-500 ml-1">vs last month</span>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
};

export default DistributorAdminStatsCard;
