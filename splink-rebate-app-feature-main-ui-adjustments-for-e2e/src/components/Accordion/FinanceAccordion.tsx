"use client";

import React from "react";
import Image from "next/image";

// Import Component
import Accordion from "@/components/Accordion/BaseAccordion";

// Import Utils
import { formatNumber } from "@/utils/numberFormatter";

// Import Images
import greyDownloadIcon from "@/assets/icons/greyDownloadIcon.svg";

interface AccordionItemProps {
  title: {
    date: string;
    amount: number;
  };
  content: {
    totalReimbursementAmount: number;
    distributorsRebates: number;
    storeRebates: number;
  };
}

interface FinanceAccordionProps {
  items: AccordionItemProps[];
}

const FinanceAccordion: React.FC<FinanceAccordionProps> = ({ items }) => {
  return (
    <>
      <div className="statement-table grid gap-3">
        <div className="columns flex bg-white rounded-lg px-2 text-filter-light text-sm font-medium">
          <div className="w-7 h-7 sm:w-9 sm:h-9"></div>
          <div className="px-4 py-2 w-[50%]">Date</div>
          <div className="px-4 py-2 w-[30%]">Amount</div>
          <div className="px-4 py-2 w-[20%]">Action</div>
        </div>
        {items.map((accordion, index) => (
          <Accordion
            key={index}
            title={
              <div className="flex flex-1 items-center text-sm sm:text-base">
                <div className="px-2 sm:px-4 py-3 w-[50%] text-highlighted-color">
                  {accordion.title.date}
                </div>
                <div className="px-2 sm:px-4 py-3 w-[40%] sm:w-[30%]">
                  ${formatNumber(accordion.title.amount)}
                </div>
                <div className="w-[10%] sm:w-[20%] sm:min-w-52 sm:px-4 sm:py-3">
                  <button
                    onClick={(e) => e.stopPropagation()}
                    className="sm:flex gap-2 items-center sm:py-3 sm:px-4 text-sm sm:border border-border-gray rounded hover:bg-border-gray"
                  >
                    <Image
                      src={greyDownloadIcon.src}
                      width={15}
                      height={13}
                      alt="Info Icon"
                    />{" "}
                    <span className="hidden sm:inline">Download Invoice</span>
                  </button>
                </div>
              </div>
            }
            content={
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="item">
                  <span className="text-xs font-medium text-filter-light">
                    Total Reimbursement Amount
                  </span>
                  <p className="mt-2 text-highlighted-color text-sm font-semibold">
                    ${formatNumber(accordion.content.totalReimbursementAmount)}
                  </p>
                </div>
                <div className="item">
                  <span className="text-xs font-medium text-filter-light">
                    Distributors Rebates
                  </span>
                  <p className="mt-2 text-highlighted-color text-sm font-semibold">
                    ${formatNumber(accordion.content.distributorsRebates)}
                  </p>
                </div>
                <div className="item">
                  <span className="text-xs font-medium text-filter-light">
                    Store Rebates
                  </span>
                  <p className="mt-2 text-highlighted-color text-sm font-semibold">
                    ${formatNumber(accordion.content.storeRebates)}
                  </p>
                </div>
              </div>
            }
          />
        ))}
      </div>
    </>
  );
};

export default FinanceAccordion;
