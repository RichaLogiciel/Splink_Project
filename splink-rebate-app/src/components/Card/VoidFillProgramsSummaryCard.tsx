"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";

// Import Components
import Card from "@/components/Card";
import CardBlue from "@/components/CardBlue";
import Divider from "@/components/Divider";
import Row from "@/components/Row";

// Import Utils
import GenerateCsvBtn from "@/components/Elements/GenerateCsvBtn";
import SelectFilter from "@/components/SelectFilter";
import { MESSAGES } from "@/configs/messages";
import { useWindowWidth } from "@/utils/clientHelper";
import { getUserClient } from "@/utils/getUserClient";
import { formatNumber } from "@/utils/numberFormatter";
import { isDistributorAdmin } from "@/utils/rolesConditions";
import Link from "next/link";
import Avatar from "../Avatar/ManufacturerAvatar";

interface VoidFillProgram {
  programId: number;
  programName: string;
  programHeader: string;
  programType: string;
  startDate: string;
  endDate: string;
  participantType: string;
}

interface VoidFillManufacturer {
  manId: number;
  manName: string;
  manLogo: string;
  earnings: number;
  voidsFilled: number;
  totalVoids: number;
  voidFilledPercentage: number;
  earningOpportunity: number;
  programs: VoidFillProgram[];
}

interface VoidFillProgramsSummaryCardProps {
  data: VoidFillManufacturer[];
  salesRepOptions?: Array<{ value: string; label: string }>;
  programOptions?: Array<{ value: string; label: string }>;
  onFilterChange?: (filterType: string, value: string) => void;
  onApplyFilters?: () => void;
  isLoading?: boolean;
  hasError?: boolean;
  isFilterButtonEnabled?: boolean;
  currentWarehouse?: string;
  handleGenerateCSV: any;
  hideSalesRepFilter?: boolean;
  hideMetadataFilter?: boolean;
  salesRepId?: string;
  programTimeline?: string;
}

const VoidFillProgramsSummaryCard: React.FC<
  VoidFillProgramsSummaryCardProps
> = ({
  data = [],
  salesRepOptions = [],
  programOptions = [],
  onFilterChange,
  onApplyFilters,
  isLoading = false,
  hasError = false,
  isFilterButtonEnabled = false,
  currentWarehouse = "",
  handleGenerateCSV,
  hideSalesRepFilter = false,
  hideMetadataFilter = false,
  salesRepId,
  programTimeline
}) => {
  const router = useRouter();
  const user = getUserClient();
  const isAdmin = isDistributorAdmin(user?.role ?? "");
  const windowWidth = useWindowWidth();
  const [expandedManufacturer, setExpandedManufacturer] = useState<
    string | null
  >(null);

  // Calculate totals
  const totalEarnings = data.reduce((sum, item) => sum + item.earnings, 0);
  const totalVoids = data.reduce((sum, item) => sum + item.totalVoids, 0);
  const totalEarningOpportunity = data.reduce(
    (sum, item) => sum + item.earningOpportunity,
    0
  );

  const handleRowClick = (
    manufacturer: VoidFillManufacturer,
    salesRepId: string
  ) => {
    const url = `/app/programs/spiff/${manufacturer.manId}?id=${manufacturer.manId}&manufacturerName=${encodeURIComponent(manufacturer.manName)}&startDate=undefined&endDate=undefined&programTimeline=${programTimeline}&isInternal=false${salesRepId ? `&salesRepId=${salesRepId}` : ""}`;
    router.push(url);
  };

  return (
    <Card className="void-fill-programs-summary-card w-full h-full">
      <Row className="justify-between" marginBottom="mb-2">
        {hideMetadataFilter ? (
          <h3 className="text-base font-medium tracking-[0.15rem] uppercase">
            Void Fill Programs Summary
          </h3>
        ) : (
          <p className="text-base font-normal text-heading-very-light">
            Void Fill Programs Summary
          </p>
        )}
        {!hideMetadataFilter && isAdmin && (
          <GenerateCsvBtn
            reportTypes={[
              { value: "VOID_FILL_SUMMARY", label: "Void Fill Summary" }
            ]}
            onClickHandler={handleGenerateCSV}
          />
        )}
      </Row>

      {!hideMetadataFilter && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mt-3 items-stretch sm:items-end mb-4">
            <div className="flex flex-col sm:flex-row gap-3 flex-1 min-w-0">
              {!hideSalesRepFilter && (
                <SelectFilter
                  key={`salesRep-${currentWarehouse}`}
                  searchable={salesRepOptions.length > 0}
                  searchPlaceholder="Search Sales Reps"
                  queryParam="voidFillSalesRep"
                  options={
                    salesRepOptions.length > 0
                      ? [
                          { value: "", label: "All Sales Reps" },
                          ...salesRepOptions
                        ]
                      : [{ value: "", label: "No Sales Rep Found" }]
                  }
                  disabled={salesRepOptions.length === 0}
                  className="w-full flex-1 text-sm"
                  onSelectChange={(value: any) =>
                    salesRepOptions.length > 0 &&
                    onFilterChange?.("salesRep", value)
                  }
                />
              )}
              <SelectFilter
                key={`program-${currentWarehouse}`}
                searchable
                searchPlaceholder="Search Programs"
                queryParam="voidFillProgram"
                options={
                  programOptions && programOptions.length > 0
                    ? [{ value: "", label: "All Programs" }, ...programOptions]
                    : [{ value: "", label: "No Program Found" }]
                }
                disabled={programOptions && programOptions.length === 0}
                className="w-full flex-1 text-sm"
                onSelectChange={(value: any) =>
                  programOptions &&
                  programOptions.length > 0 &&
                  onFilterChange?.("program", value)
                }
              />
            </div>
            <button
              onClick={onApplyFilters}
              type="button"
              disabled={!isFilterButtonEnabled}
              style={{
                backgroundColor: isFilterButtonEnabled ? "#106210" : "#9ca3af"
              }}
              className={`px-4 py-2 text-white rounded-md transition-colors whitespace-nowrap w-full sm:w-auto flex-shrink-0 ${
                isFilterButtonEnabled
                  ? "!bg-green-600 hover:!bg-green-500 cursor-pointer"
                  : "!bg-gray-400 cursor-not-allowed opacity-60"
              }`}
            >
              Filter
            </button>
          </div>
          <Divider marginY="my-5" />
          <CardBlue className="px-5 py-2 text-heading-blue text-sm">
            <Row
              marginBottom="mb-0"
              gap="gap-2"
              className="grid grid-cols-2 sm:flex sm:gap-1.5"
            >
              <div className="flex flex-col gap-1.5 w-full sm:w-1/4 text-center sm:text-left">
                <div className="font-normal">Manufacturers</div>
                <div className="font-semibold">{data.length}</div>
              </div>
              <div className="flex w-full sm:w-1/4 border-l border-info-0 justify-center">
                <div className="flex flex-col gap-1.5 text-center w-full">
                  <div className="font-normal">Total Voids</div>
                  <div className="font-semibold">
                    {formatNumber(totalVoids)}
                  </div>
                </div>
              </div>
              <div className="flex w-full sm:w-1/4 justify-center border-t-0 sm:border-t sm:border-l border-info-0">
                <div className="flex flex-col gap-1.5 text-center">
                  <div className="font-normal">Total Earnings</div>
                  <div className="font-semibold">
                    ${formatNumber(totalEarnings)}
                  </div>
                </div>
              </div>
              <div className="flex w-full sm:w-1/4 justify-center sm:justify-end border-l border-info-0">
                <div className="flex flex-col gap-1.5">
                  <div className="font-normal">Earning Opp.</div>
                  <div className="font-semibold text-center sm:text-right">
                    ${formatNumber(totalEarningOpportunity)}
                  </div>
                </div>
              </div>
            </Row>
          </CardBlue>
        </>
      )}
      <div
        className={`max-h-[380px] overflow-y-auto overflow-x-auto relative ${hideMetadataFilter ? "mt-4" : ""}`}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
            <div className="loader border-4 border-t-4 border-gray-300  border-t-green rounded-full w-8 h-8 animate-spin"></div>
          </div>
        )}
        {data.length > 0 ? (
          windowWidth > 767 ? (
            // Desktop Table View
            <table className="w-full border-collapse">
              <thead className="sticky top-0">
                <tr className="border-b bg-gray-50">
                  {!hideMetadataFilter && (
                    <th className="w-52 px-2.5 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Manufacturer
                    </th>
                  )}
                  <th className="px-2.5 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Voids
                  </th>
                  <th className="px-2.5 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Voids Filled
                  </th>
                  <th className="px-2.5 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    % Void Filled
                  </th>
                  <th className="px-2.5 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Earnings
                  </th>
                  <th className="px-2.5 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Earning Opp.
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((manufacturer) => (
                  <tr
                    key={manufacturer.manId}
                    className="border-b cursor-pointer hover:bg-gray-50 text-filter-light"
                    onClick={() =>
                      handleRowClick(manufacturer, salesRepId || "")
                    }
                  >
                    {!hideMetadataFilter && (
                      <td className="px-2.5 py-2 text-sm">
                        <Avatar
                          user={{
                            name: manufacturer.manName,
                            avatar: manufacturer.manLogo
                          }}
                        />
                      </td>
                    )}
                    <td className="px-2.5 py-2 text-center">
                      {formatNumber(manufacturer.totalVoids)}
                    </td>
                    <td className="px-2.5 py-2 text-center">
                      {formatNumber(manufacturer.voidsFilled)}
                    </td>
                    <td className="px-2.5 py-2 text-center">
                      {manufacturer.voidFilledPercentage}%
                    </td>
                    <td className="px-2.5 py-2 text-highlighted-color text-center">
                      ${formatNumber(manufacturer.earnings)}
                    </td>
                    <td className="px-2.5 py-2 text-highlighted-color text-center">
                      ${formatNumber(manufacturer.earningOpportunity)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            // Mobile Card View
            <div className="mb-4 pt-4 text-sm">
              {data.map((manufacturer) => {
                const manufacturerId = manufacturer.manId.toString();
                const isExpanded = expandedManufacturer === manufacturerId;

                return (
                  <div
                    key={manufacturer.manId}
                    className="shadow rounded-lg py-3 px-2.5 bg-white mb-3"
                  >
                    <div
                      className="flex justify-between items-center font-medium cursor-pointer gap-3"
                      onClick={() =>
                        setExpandedManufacturer(
                          isExpanded ? null : manufacturerId
                        )
                      }
                    >
                      <div className="title flex gap-2 items-center flex-1 min-w-0">
                        <span className="text-xl flex-shrink-0 w-3">
                          {isExpanded ? "-" : "+"}
                        </span>
                        {!hideMetadataFilter && (
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar
                              user={{
                                name: manufacturer.manName,
                                avatar: manufacturer.manLogo
                              }}
                            />
                          </div>
                        )}
                        {hideMetadataFilter && (
                          <h4 className="text-base text-highlighted-color truncate">
                            {manufacturer.manName}
                          </h4>
                        )}
                      </div>
                      <div className="flex-shrink-0">
                        <div className="text-right">
                          <span className="text-filter-light text-xs font-medium block">
                            Earnings
                          </span>
                          <span className="text-highlighted-color font-semibold block">
                            ${formatNumber(manufacturer.earnings)}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex flex-col gap-4">
                          <div className="flex justify-between flex-wrap gap-4">
                            <div>
                              <span className="text-filter-light text-xs font-medium">
                                Total Voids
                              </span>
                              <p className="mt-1 text-highlighted-color font-semibold">
                                {formatNumber(manufacturer.totalVoids)}
                              </p>
                            </div>
                            <div>
                              <span className="text-filter-light text-xs font-medium">
                                Voids Filled
                              </span>
                              <p className="mt-1 text-highlighted-color font-semibold">
                                {formatNumber(manufacturer.voidsFilled)}
                              </p>
                            </div>
                          </div>
                          <div className="flex justify-between flex-wrap gap-4">
                            <div>
                              <span className="text-filter-light text-xs font-medium">
                                % Void Filled
                              </span>
                              <p className="mt-1 text-highlighted-color font-semibold">
                                {manufacturer.voidFilledPercentage}%
                              </p>
                            </div>
                            <div>
                              <span className="text-filter-light text-xs font-medium">
                                Earnings
                              </span>
                              <p className="mt-1 text-highlighted-color font-semibold">
                                ${formatNumber(manufacturer.earnings)}
                              </p>
                            </div>
                          </div>
                          <div>
                            <span className="text-filter-light text-xs font-medium">
                              Earning Opportunity
                            </span>
                            <p className="mt-1 text-highlighted-color font-semibold">
                              ${formatNumber(manufacturer.earningOpportunity)}
                            </p>
                          </div>
                          <div className="my-2 text-green font-medium">
                            <Link
                              href={`/app/programs/spiff/${manufacturer.manId}?id=${manufacturer.manId}&manufacturerName=${encodeURIComponent(manufacturer.manName)}&startDate=undefined&endDate=undefined&programTimeline=${programTimeline}&isInternal=false${salesRepId ? `&salesRepId=${salesRepId}` : ""}`}
                            >
                              {/* <button
                                type="button"
                                className="w-full bg-green text-white py-2 px-4 text-sm rounded hover:opacity-80"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(manufacturer, salesRepId || "");
                                }}
                              >
                              </button> */}
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )
        ) : (
          <div className="pt-3 text-center font-medium text-heading-very-light text-sm min-h-20">
            {hasError
              ? "It looks like there's nothing to display right now."
              : MESSAGES.NO_RECORDS_FOUND}
          </div>
        )}
      </div>
    </Card>
  );
};

export default VoidFillProgramsSummaryCard;
