import React from "react";

// Import Utils
import { formatNumber } from "@/utils/numberFormatter";

// Import Types
import { FinancePaymentHistoryCardProps } from "@/types/FinanceTypes";

const FinancePaymentHistoryCard: React.FC<FinancePaymentHistoryCardProps> = ({
  history
}) => {
  return (
    <div className="card p-4 rounded-lg bg-white overflow-hidden">
      <h4 className="title text-base font-semibold pb-5 border-b border-border-gray text-highlighted-color">
        Payment History
      </h4>
      <div className="content mt-4 rounded-lg text-sm">
        {history.map((item, index) => (
          <div
            key={index}
            className="option-item p-3 flex justify-between items-center border-b border-border-gray"
          >
            <div className="option-title text-filter-light">{item.date}</div>
            <div className="option-content font-medium text-highlighted-color">
              ${formatNumber(item.amount)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FinancePaymentHistoryCard;
