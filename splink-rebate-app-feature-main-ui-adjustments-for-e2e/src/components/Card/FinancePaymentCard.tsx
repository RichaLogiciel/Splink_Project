import React from "react";

// Import Utils
import { formatNumber } from "@/utils/numberFormatter";

// Import Types
import { FinancePaymentCardProps } from "@/types/FinanceTypes";

const FinancePaymentCard: React.FC<FinancePaymentCardProps> = ({
  options,
  buttonTitle = "Pay now"
}) => {
  return (
    <div className="card p-4 rounded-lg bg-white overflow-hidden">
      <h4 className="title text-base font-semibold pb-5 border-b border-border-gray text-highlighted-color">
        Next Payment
      </h4>
      <div className="content mt-4 rounded-lg text-sm">
        {options.map((option, index) => (
          <div
            key={`financepaymentcard-${index}`}
            className="border-b border-border-gray"
          >
            <div className="option-item p-3 flex justify-between items-center">
              <div className="option-title text-filter-light">
                Next pay date
              </div>
              <div className="option-content font-medium text-highlighted-color">
                {option.date}
              </div>
            </div>
            <div className="option-item p-3 flex justify-between items-center">
              <div className="option-title text-filter-light">
                Payment amount
              </div>
              <div className="option-content font-medium text-highlighted-color">
                ${formatNumber(option.amount)}
              </div>
            </div>
          </div>
        ))}

        <div className="option-footer pt-4 flex justify-end items-center gap-3">
          <button className="bg-[#ADAEB3] rounded py-2 px-3 text-white hover:opacity-90">
            {buttonTitle}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FinancePaymentCard;
