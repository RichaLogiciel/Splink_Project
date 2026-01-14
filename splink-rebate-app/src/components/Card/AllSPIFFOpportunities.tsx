"use client";

import React, { useState } from "react";

// Import Components
import Card from "@/components/Card";
import Row from "@/components/Row";

// Import Utils
import { MESSAGES } from "@/configs/messages";
import { getNumericDateString } from "@/utils/dateHelper";
import { formatNumber } from "@/utils/numberFormatter";
import SpiffProgramOverviewModal from "../Dialog/SpiffProgramOverviewModal";
import SortableHeader from "../SortableHeader";

import Avatar from "../Avatar/ManufacturerAvatar";

interface SPIFFOpportunity {
  manufacturer: string;
  logo: string;
  id: number;
  My_earnings: string;
  Start_Date: string;
  End_Date: string;
  eligibleStores?: number;
}
interface AllSPIFFOpportunitiesProps {
  data: SPIFFOpportunity[];
  embedded?: boolean;
  id?: string;
}

const AllSPIFFOpportunities: React.FC<AllSPIFFOpportunitiesProps> = ({
  data: unSortedData,
  embedded = false,
  id = "spiff-program-overview"
}) => {
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<string>("ASC");
  const [sortKey, setSortKey] = useState<string>("myEarnings");
  const [data, setData] = useState<SPIFFOpportunity[]>(unSortedData);

  const [selectedOpportunity, setSelectedOpportunity] =
    useState<SPIFFOpportunity | null>(null);
  const openSpiffProgramModal = (opportunity: SPIFFOpportunity) => {
    setSelectedOpportunity(opportunity);
    setIsModalOpen(true);
  };

  const handleSort = (sortKey: string) => {
    setIsLoading(true);
    try {
      switch (sortKey) {
        case "manufacturer":
          setData(
            unSortedData.sort((a, b) =>
              sortOrder === "DESC"
                ? a.manufacturer.localeCompare(b.manufacturer)
                : b.manufacturer.localeCompare(a.manufacturer)
            )
          );
          setSortKey("manufacturer");
          setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
          break;
        case "myEarnings":
          setData(
            unSortedData.sort((a, b) =>
              sortOrder === "DESC"
                ? Number(a.My_earnings) - Number(b.My_earnings)
                : Number(b.My_earnings) - Number(a.My_earnings)
            )
          );
          setSortKey("myEarnings");
          setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
          break;
        case "startDate":
          setData(
            unSortedData.sort((a, b) =>
              sortOrder === "DESC"
                ? new Date(a.Start_Date).getTime() -
                  new Date(b.Start_Date).getTime()
                : new Date(b.Start_Date).getTime() -
                  new Date(a.Start_Date).getTime()
            )
          );
          setSortKey("startDate");
          setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
          break;
        case "endDate":
          setData(
            unSortedData.sort((a, b) =>
              sortOrder === "DESC"
                ? new Date(a.End_Date).getTime() -
                  new Date(b.End_Date).getTime()
                : new Date(b.End_Date).getTime() -
                  new Date(a.End_Date).getTime()
            )
          );
          setSortKey("endDate");
          setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
          break;
      }
    } catch (error) {
      console.error("error in handleSort AllSPIFFOpportunities", error);
    } finally {
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  };

  return (
    <>
      <Card className={`w-full mb-6 ${embedded ? "mb-0 p-[0px]" : ""}`}>
        {!embedded && (
          <Row className="justify-between" marginBottom="mb-2">
            <div className="text-s font-normal text-heading-very-light">
              SPIFF Program Overview
            </div>
          </Row>
        )}

        {/* Desktop Table View */}
        <div
          className="storeTable hidden md:block overflow-x-auto text-left text-sm text-filter-light font-medium font-inter max-h-[50vh] overflow-y-auto -mr-2 pr-2"
          id={id}
        >
          <table
            className={`w-full border-collapse table-fixed ${
              isLoading ? "opacity-50" : ""
            }`}
          >
            <thead className="h-11 border-b text-heading-very-light text-xs sticky top-0 bg-white">
              <tr>
                <SortableHeader
                  label="Manufacturer"
                  sortKey="manufacturer"
                  customSortFunction={handleSort}
                  className="w-56 font-medium pr-4"
                  activeSortKey={sortKey}
                  sort={sortOrder}
                />
                <SortableHeader
                  label="My Earnings"
                  sortKey="myEarnings"
                  className="text-right font-medium pr-4 w-28"
                  customSortFunction={handleSort}
                  activeSortKey={sortKey}
                  sort={sortOrder}
                />
                <SortableHeader
                  label="Start Date"
                  sortKey="startDate"
                  className="text-right font-medium pr-4 w-24"
                  customSortFunction={handleSort}
                  activeSortKey={sortKey}
                  sort={sortOrder}
                />
                <SortableHeader
                  label="End Date"
                  sortKey="endDate"
                  className="text-right font-medium pr-4 w-24"
                  customSortFunction={handleSort}
                  activeSortKey={sortKey}
                  sort={sortOrder}
                />
              </tr>
            </thead>
            <tbody>
              {data?.length > 0 ? (
                data.map((opportunity, index) => (
                  <tr
                    key={index}
                    className="border-b cursor-pointer hover:bg-gray-50"
                    onClick={() => openSpiffProgramModal(opportunity)}
                  >
                    <td className="pr-4 py-3 flex items-center gap-3.5">
                      <Avatar
                        user={{
                          name: opportunity.manufacturer,
                          avatar: opportunity.logo
                        }}
                      />
                    </td>

                    <td className="pr-4 py-3 text-base text-green text-right">
                      ${formatNumber(Number(opportunity.My_earnings))}
                    </td>
                    <td className="pr-4 py-3 text-right">
                      {opportunity.Start_Date
                        ? getNumericDateString(opportunity.Start_Date)
                        : "-"}
                    </td>
                    <td className="pr-4 py-3 text-right">
                      {opportunity.End_Date
                        ? getNumericDateString(opportunity.End_Date)
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="text-heading-very-light">
                  <td className="text-center pt-3 text-sm" colSpan={4}>
                    {MESSAGES.NO_RECORDS_FOUND}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3">
          {data?.length > 0 ? (
            data.map((opportunity, index) => (
              <div
                key={index}
                className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => openSpiffProgramModal(opportunity)}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar
                      user={{
                        name: opportunity.manufacturer,
                        avatar: opportunity.logo
                      }}
                    />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-green">
                      ${formatNumber(Number(opportunity.My_earnings))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-heading-very-light">
                      Start Date
                    </span>
                    <span className="text-sm font-medium">
                      {opportunity.Start_Date
                        ? getNumericDateString(opportunity.Start_Date)
                        : "-"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-heading-very-light">
                      End Date
                    </span>
                    <span className="text-sm font-medium">
                      {opportunity.End_Date
                        ? getNumericDateString(opportunity.End_Date)
                        : "-"}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-sm text-heading-very-light">
              {MESSAGES.NO_RECORDS_FOUND}
            </div>
          )}
        </div>
      </Card>

      <SpiffProgramOverviewModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        data={
          selectedOpportunity
            ? {
                manufacturer: {
                  id: selectedOpportunity.id,
                  avatar: selectedOpportunity.logo,
                  name: selectedOpportunity.manufacturer
                },
                totalSavings: {
                  amount: Number(selectedOpportunity.My_earnings) ?? 0
                }
              }
            : {}
        }
        programDates={{
          startDate: selectedOpportunity?.Start_Date ?? "",
          endDate: selectedOpportunity?.End_Date ?? ""
        }}
        hideIncrementalEarnings
      />
    </>
  );
};

export default AllSPIFFOpportunities;
