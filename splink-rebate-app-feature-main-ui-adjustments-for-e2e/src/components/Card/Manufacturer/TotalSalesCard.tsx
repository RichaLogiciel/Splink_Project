"use client";

import React, { useState } from "react";

// Import Components
import Card from "@/components/Card";
import DateRangeButton from "@/components/DateRangeButton";
import Row from "@/components/Row";

// Import Icons
import TotalSalesIcon from "@/assets/logo/total-sales.svg";

// Import Utils
import { formatNumber } from "@/utils/numberFormatter";

interface TotalSalesCardProps {
  totalSales: {
    [month: number]: {
      totalSale: number;
    };
  };
}

const TotalSalesCard: React.FC<TotalSalesCardProps> = ({ totalSales }) => {
  const defaultMonth: number = 1;

  const [activeMonthTotalSale, setActiveMonthTotalSale] =
    useState(defaultMonth);
  const dateRangeMonths = [1, 3, 6, 12];

  const handleDateRangeClickTotalSales = (month: number) => {
    setActiveMonthTotalSale(month);
  };
  return (
    <Card>
      <Row className="justify-between" marginBottom="mb-4" gap="gap-0">
        <div className="flex gap-1.5 items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={TotalSalesIcon.src} alt="Total Sales Icon" />
          <div className="text-sm font-medium text-heading-light">My Sales</div>
        </div>
        <div className="flex items-center gap-2 text-xs font-medium text-filter-light">
          {dateRangeMonths.map((dateRangeMonth, index) => (
            <DateRangeButton
              key={index}
              months={dateRangeMonth}
              activeMonth={activeMonthTotalSale}
              onClick={() => {
                handleDateRangeClickTotalSales(dateRangeMonth);
              }}
            ></DateRangeButton>
          ))}
        </div>
      </Row>
      <Row className="justify-between" marginBottom="mb-0">
        <div className="text-xl font-semibold">
          {totalSales && totalSales[activeMonthTotalSale]?.totalSale
            ? `$${formatNumber(totalSales[activeMonthTotalSale].totalSale)}`
            : 0}
        </div>
        {/* <div className="flex items-center bg-profit-bg p-1 rounded-sm text-xs font-normal text-profit">
        <img src={YoyArrowIcon.src} alt="YoY Arrow Icon"></img>
        <div className="text-center">12% YoY</div>
      </div> */}
      </Row>
    </Card>
  );
};

export default TotalSalesCard;
