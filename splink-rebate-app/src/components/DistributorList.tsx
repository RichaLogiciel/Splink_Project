"use client";

import { DistributorDetails } from "@/types/DistributorTypes";
import { formatCompliancePercentage } from "@/utils/helper";
import { formatNumber } from "@/utils/numberFormatter";
import { useState } from "react";
import Card from "./Card";
import Divider from "./Divider";
import HorizontalProgressBar from "./Progress/HorizontalProgressBar";
import Row from "./Row";

interface DistributorListProps {
  distributorList: DistributorDetails[];
}
const DistributorList = ({ distributorList }: DistributorListProps) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const toggleDistributorDetailsCard = (index: number) => {
    setExpandedIndex((prevIndex) => (prevIndex === index ? null : index));
  };

  return (
    <Row className="flex-col">
      <div className="text-highlighted-color text-lg font-semibold">
        Distributor List
      </div>
      <Card className="flex w-full" padding="p-2.5">
        <div className="w-[3%]"></div>
        <div className="flex w-[97%] text-left">
          <div className="font-medium text-sm text-filter-light w-1/4">
            Distributor Name
          </div>
          <div className="font-medium text-sm text-filter-light w-1/4">
            Stores
          </div>
          <div className="font-medium text-sm text-filter-light w-1/4">
            Sales
          </div>
          <div className="font-medium text-sm text-filter-light w-1/4">
            Location
          </div>
        </div>
      </Card>

      {distributorList.map((distributor, index) => {
        return (
          <Card key={`${distributor?.name}-${index}`}>
            <button
              onClick={() => toggleDistributorDetailsCard(index)}
              className="flex items-center w-full focus:outline-none"
            >
              <div className="arrow-container w-[3%]">
                <svg
                  className={`w-4 h-4 transform transition-transform duration-200 stroke-[#4C4D52] ${
                    expandedIndex === index ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
              <div className="flex w-[97%] text-left">
                <div className="w-1/4 text-highlighted-color font-medium text-base">
                  {distributor?.name}
                </div>
                <div className="w-1/4 text-filter-light font-medium text-base">
                  {formatNumber(distributor.totalStores)}
                </div>
                <div className="w-1/4 text-filter-light font-medium text-base">
                  ${formatNumber(distributor.totalSales)}
                </div>
                <div className="w-1/4 text-filter-light font-medium text-base">
                  {distributor.location}
                </div>
              </div>
            </button>
            {expandedIndex === index && (
              <>
                <Divider marginY="my-5" />
                <div className="flex text-gray-700 bg-white">
                  <div className="flex w-[3%]"></div>
                  <div className="flex w-[97%]">
                    <div className="flex flex-col w-full">
                      {distributor.details.map((detail, index) => {
                        return (
                          <>
                            {index > 0 && <Divider marginY="my-5" />}
                            <div
                              key={index}
                              className="program-tier-details gap-4 flex w-full"
                            >
                              <div className="flex flex-col gap-2.5 w-1/3 font-medium text-xs text-filter-light">
                                <div>Program Name</div>
                                <div className="text-sm font-semibold text-highlighted-color">
                                  {detail.programName}
                                </div>
                              </div>
                              <div className="flex flex-col gap-2.5 w-1/3 font-medium text-xs text-filter-light">
                                <div>Store Compliance</div>
                                <div className="flex gap-3 items-center">
                                  <HorizontalProgressBar
                                    percentage={
                                      detail.compliancePercentage || 0
                                    }
                                  />
                                  <div className="text-sm font-medium text-[#344054]">
                                    {formatCompliancePercentage(
                                      detail.compliancePercentage || 0,
                                      1
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col gap-2.5 w-1/3 font-medium text-xs text-filter-light">
                                <div>Estimated Rebate</div>
                                <div className="text-sm font-semibold text-highlighted-color">
                                  ${formatNumber(detail.totalRebate)}
                                </div>
                              </div>
                            </div>
                          </>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </Card>
        );
      })}
    </Row>
  );
};

export default DistributorList;
