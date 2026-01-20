import React from "react";
import Image from "next/image";

// Import Utils
import { formatNumber } from "@/utils/numberFormatter";

// Import Types
import { FinanceSummaryCardProps } from "@/types/FinanceTypes";

// Import Images
import InfoIcon from "@/assets/icons/greyInfoIcon.svg";

const FinanceSummaryCard: React.FC<FinanceSummaryCardProps> = ({
  title,
  options,
  total
}) => {
  return (
    <div className="card p-4 rounded-lg bg-white overflow-hidden">
      <h4 className="title text-base font-semibold pb-5 border-b border-border-gray text-highlighted-color">
        {title}
      </h4>
      <div className="content mt-4 rounded-lg bg-common-bg text-sm">
        {options.map((option, index) => (
          <div
            key={index}
            className="option-item p-3 flex justify-between items-center border-b border-border-gray"
          >
            <div className="option-title flex text-filter-light gap-2 items-center">
              {option.title}{" "}
              <Image
                title={option.title}
                src={InfoIcon.src}
                width={13}
                height={13}
                alt="Info Icon"
              />
            </div>
            <div className="option-content font-medium text-highlighted-color">
              ${formatNumber(option.amount)}
            </div>
          </div>
        ))}
        <div className="option-total p-3 flex justify-end items-center gap-3">
          <div className="option-title text-filter-light">Total Amount:</div>
          <div className="option-content font-medium text-highlighted-color">
            ${formatNumber(total)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinanceSummaryCard;
