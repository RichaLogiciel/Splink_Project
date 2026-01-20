"use client";

import React, { useState } from "react";

// Import Components
import Card from "@/components/Card";
import Row from "@/components/Row";

// Import Utils
import { MESSAGES } from "@/configs/messages";
import { formatNumber } from "@/utils/numberFormatter";
import { useRouter } from "next/navigation";

interface StoreProgramOverviewCardProps {
  topPerformingPrograms: any[];
  bottomPerformingPrograms: any[];
  fullWidth?: boolean;
}

const StoreProgramOverviewCard: React.FC<StoreProgramOverviewCardProps> = ({
  topPerformingPrograms,
  bottomPerformingPrograms,
  fullWidth = false
}) => {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("top-performing-programs");
  const handleActiveTabClick = (selectedTab: string) => {
    setActiveTab(selectedTab);
  };

  return (
    <Card className={fullWidth ? "w-full" : "w-1/2"}>
      <Row className="justify-between">
        <div className="text-s font-normal text-heading-very-light">
          Store Program Overview
        </div>
      </Row>
      <Row marginBottom="mb-0" className="text-xs">
        <button
          className={`relative pb-3 font-medium ${
            activeTab == "top-performing-programs"
              ? "text-green border-green"
              : "text-heading-light"
          } `}
          type="button"
          onClick={() => {
            handleActiveTabClick("top-performing-programs");
          }}
        >
          Top Performing Programs
          {activeTab == "top-performing-programs" && (
            <span className="block border-green border-b-2 absolute w-full bottom-0"></span>
          )}
        </button>
        <button
          className={`relative pb-3 font-medium text-heading-light ${
            activeTab == "bottom-performing-programs"
              ? "text-green border-green"
              : "text-heading-light"
          } `}
          type="button"
          onClick={() => {
            handleActiveTabClick("bottom-performing-programs");
          }}
        >
          Bottom Performing Programs
          {activeTab == "bottom-performing-programs" && (
            <span className="block border-green border-b-2 absolute w-full bottom-0"></span>
          )}
        </button>
      </Row>
      {activeTab == "top-performing-programs" && (
        <div className="storeTable overflow-x-auto text-left text-sm text-filter-light font-medium font-inter border-t">
          <table className="w-full border-collapse">
            <thead className="h-11 border-b text-heading-very-light text-xs">
              <tr>
                <th className="w-1/2 font-medium pr-4 cursor-pointer">
                  Manufacturers
                </th>
                <th className="w-1/4 font-medium pr-4">Sales Volume</th>
                <th className="w-1/4 font-medium pr-4 text-right">
                  Estimated Earnings
                </th>
              </tr>
            </thead>
            <tbody>
              {topPerformingPrograms && topPerformingPrograms?.length > 0 ? (
                topPerformingPrograms.map(
                  (salesRepData, index) =>
                    (salesRepData.manufacturername ||
                      salesRepData.totalSavings ||
                      salesRepData.salesVolume) && (
                      <tr
                        key={`${index}-${salesRepData.manufacturerId}`}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          router.push(
                            `/app/programs/store/${salesRepData.manufacturerId}?id=${salesRepData.manufacturerId}&manufacturerName=${encodeURIComponent(
                              salesRepData.manufacturerName
                            )}`
                          )
                        }
                      >
                        <td className="pr-4 py-3 flex items-center gap-3.5">
                          {salesRepData.logo && (
                            <div className="avatar h-8 w-8 overflow-hidden flex justify-center items-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={salesRepData.logo} alt="Logo" />
                            </div>
                          )}
                          <p className="font-medium">
                            {salesRepData.manufacturerName}
                          </p>
                        </td>
                        <td className="pr-4 py-3 font-medium">
                          {salesRepData.salesVolume == undefined
                            ? "-"
                            : "$" +
                              formatNumber(Number(salesRepData.salesVolume))}
                        </td>
                        <td className="pr-4 py-3 text-base text-green text-right">
                          ${formatNumber(Number(salesRepData.totalSavings))}
                        </td>
                      </tr>
                    )
                )
              ) : (
                <tr className="text-heading-very-light">
                  <td className="text-center pt-3 text-sm" colSpan={3}>
                    {MESSAGES.NO_RECORDS_FOUND}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {activeTab == "bottom-performing-programs" && (
        <div className="storeTable overflow-x-auto text-left text-sm text-filter-light font-medium font-inter border-t">
          <table className="w-full border-collapse">
            <thead className="h-11 border-b text-heading-very-light text-xs">
              <tr>
                <th className="w-1/2 font-medium pr-4 cursor-pointer">
                  Manufacturers
                </th>
                <th className="w-1/4 font-medium pr-4">Sales Volume</th>
                <th className="w-1/4 font-medium pr-4 text-right">
                  Estimated Earnings
                </th>
              </tr>
            </thead>
            <tbody>
              {bottomPerformingPrograms &&
              bottomPerformingPrograms?.length > 0 ? (
                bottomPerformingPrograms.map(
                  (salesRepData, index) =>
                    (salesRepData.manufacturername ||
                      salesRepData.totalSavings ||
                      salesRepData.salesVolume) && (
                      <tr
                        key={`${index}-${salesRepData.manufacturerId}`}
                        className="border-b hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          router.push(
                            `/app/programs/store/${salesRepData.manufacturerId}?id=${salesRepData.manufacturerId}&manufacturerName=${encodeURIComponent(
                              salesRepData.manufacturerName
                            )}`
                          )
                        }
                      >
                        <td className="pr-4 py-3 flex items-center gap-3.5">
                          {salesRepData.logo && (
                            <div className="avatar h-8 w-8 overflow-hidden flex justify-center items-center">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={salesRepData.logo} alt="Logo" />
                            </div>
                          )}
                          <p className="font-medium">
                            {salesRepData.manufacturerName}
                          </p>
                        </td>
                        <td className="pr-4 py-3 font-medium">
                          {salesRepData.salesVolume == undefined
                            ? "-"
                            : "$" +
                              formatNumber(Number(salesRepData.salesVolume))}
                        </td>
                        <td className="pr-4 py-3 text-base text-green text-right">
                          ${formatNumber(Number(salesRepData.totalSavings))}
                        </td>
                      </tr>
                    )
                )
              ) : (
                <tr className="text-heading-very-light">
                  <td className="text-center pt-3 text-sm" colSpan={3}>
                    {MESSAGES.NO_RECORDS_FOUND}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
};

export default StoreProgramOverviewCard;
