"use client";

import { useState, useEffect } from "react";
import ProgramTiersModal from "../Dialog/ProgramTiersModal";
import CustomPopOver from "../Popovers/CustomPopOver";
import PieWithoutLabel from "../PieChartCustom/PieWithoutLabel";
import {
  ProgramComplianceDetails,
  ManufacturerROIData
} from "@/types/DistributorTypes";
import { calcPercentage } from "@/utils/calculations";
import { getNumericDateString } from "@/utils/dateHelper";
import { formatNumber } from "@/utils/numberFormatter";
import { getUserClient } from "@/utils/getUserClient";
import { getManufacturerId, isManufacturer } from "@/utils/rolesConditions";
import {
  aggregateROIData,
  shouldShowROIToManufacturer
} from "@/utils/roiAggregation";
import { fetchManufacturerROIClient } from "@/views/Manufacturer/roiAPIs";

interface ProgramOverview {
  programId?: number;
  programName: string;
  completedCompliances: number;
  totalEnrollments: number;
  rebate: number;
  programStartDate: string;
  programEndDate: string;
  overview?: string;
  rebate_percentage?: string;
  rebate_type?: string;
  rebate_amount?: string;
  _tiers?: (ProgramOverview | ProgramComplianceDetails)[]; // For storing tier breakdown
}

interface ManufacturerProgramCardProps {
  data: ProgramOverview | ProgramComplianceDetails;
  isDistributorProgram?: boolean;
  isSalesRep?: boolean;
  showROIView?: boolean;
  distributorId?: number;
  isROIExpanded?: boolean;
  onROIExpandedChange?: (expanded: boolean) => void;
}

const ManufacturerProgramCard: React.FC<ManufacturerProgramCardProps> = ({
  data,
  isDistributorProgram = true,
  isSalesRep = false,
  showROIView = false,
  distributorId,
  isROIExpanded: externalIsROIExpanded,
  onROIExpandedChange
}) => {
  const [isTiersModalOpen, setIsTiersModalOpen] = useState(false);
  const [roiData, setRoiData] = useState<ManufacturerROIData | null>(null);
  const [isLoadingROI, setIsLoadingROI] = useState(false);
  const [localIsROIExpanded, setLocalIsROIExpanded] = useState(false);

  // Use external state if provided, otherwise use local state
  const isROIExpanded =
    externalIsROIExpanded !== undefined
      ? externalIsROIExpanded
      : localIsROIExpanded;
  const setIsROIExpanded = (expanded: boolean) => {
    if (onROIExpandedChange) {
      onROIExpandedChange(expanded);
    } else {
      setLocalIsROIExpanded(expanded);
    }
  };

  const subTitle = isDistributorProgram
    ? "Distributors in Compliance"
    : "Store Compliance";

  // shared properties with safe access
  const programName = data.programName;
  const programOverview = data.overview;
  const programId = data.programId;
  const completedCompliances =
    "completedCompliances" in data
      ? data.completedCompliances
      : "qualifiedStores" in data
        ? data.qualifiedStores
        : 0;
  const totalEnrollments =
    "totalEnrollments" in data
      ? data.totalEnrollments
      : "totalStores" in data
        ? data.totalStores
        : 0;

  const isRebateBasedOnListPrice =
    "isRebateBasedOnListPrice" in data ? data.isRebateBasedOnListPrice : false;

  const rebate = "rebate" in data ? data.rebate : data.totalRebate;
  const programStartDate = data.programStartDate;
  const programEndDate = data.programEndDate;

  const rebatePercentage = data.rebate_percentage;
  const rebateType = data.rebate_type;
  const rebateAmount = data.rebate_amount;

  // Check if there are multiple tiers
  const tiers = "_tiers" in data ? data._tiers : undefined;
  const hasMultipleTiers = tiers && tiers.length > 1;

  // Get user and check if ROI should be shown for this manufacturer
  const user = getUserClient();
  const userRole = user?.role || "";
  const manufacturerId = isManufacturer(userRole)
    ? getManufacturerId(userRole, user)
    : null;
  const canShowROI = shouldShowROIToManufacturer(manufacturerId);

  // Fetch ROI data when showROIView is enabled (exclude sales rep programs and check feature flag)
  useEffect(() => {
    const fetchROIData = async () => {
      if (canShowROI && showROIView && programId && !isSalesRep) {
        setIsLoadingROI(true);
        try {
          const response = await fetchManufacturerROIClient(
            programId,
            distributorId
          );
          if (
            response.status === "success" &&
            response.data &&
            response.data.length > 0
          ) {
            // Determine rebate type based on program type
            const rebateType = isSalesRep ? "SALES_REP" : "STORE";

            // When distributorId is undefined/null (all distributors selected), aggregate all records
            // When distributorId is provided (single distributor), use existing logic
            let relevantData: ManufacturerROIData | null = null;

            if (distributorId === undefined || distributorId === null) {
              // Aggregate all ROI data for the selected rebate type
              relevantData = aggregateROIData(response.data, rebateType);
            } else {
              // Single distributor: find first matching record by rebate type
              relevantData =
                response.data.find((d) => d.rebateType === rebateType) ||
                response.data[0];
            }

            if (relevantData) {
              setRoiData(relevantData);
            }
          }
        } catch (error) {
          console.error("Failed to fetch ROI data:", error);
        } finally {
          setIsLoadingROI(false);
        }
      }
    };

    fetchROIData();
  }, [canShowROI, showROIView, programId, isSalesRep, distributorId]);

  return (
    <>
      <div className="flex w-full sm:w-[calc(50%-8px)] lg:w-[calc(50%-8px)] min-w-[450px] xl:min-w-[500px] border rounded-lg p-2 sm:p-3 flex-wrap flex-col items-start justify-start relative">
        <div className="text-xs sm:text-sm font-semibold flex gap-1 sm:gap-2 w-full items-start sm:items-center justify-between flex-wrap">
          <div className="flex gap-1 sm:gap-2 flex-wrap items-center min-w-0 flex-1">
            <span className="break-words">{programName}</span>
            <span className="text-xs sm:text-sm lg:text-base font-semibold whitespace-nowrap">
              (
              {rebateType === "percentage"
                ? rebatePercentage?.includes("-")
                  ? rebatePercentage
                  : `${formatNumber(Number(rebatePercentage) || 0, false, 1)}%`
                : rebateAmount?.includes("-")
                  ? rebateAmount
                  : `$${formatNumber(Number(rebateAmount) || 0, false, 1)}`}
              )
            </span>
            {isRebateBasedOnListPrice && <CustomPopOver startFromLeft />}
          </div>
          {/* View Tiers Link - Show for non-distributor programs with multiple tiers (but hide when ROI view is enabled) */}
          {!isDistributorProgram &&
            !(canShowROI && showROIView && !isSalesRep) &&
            hasMultipleTiers && (
              <span
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsTiersModalOpen(true);
                }}
                className="text-xs font-medium text-green cursor-pointer hover:underline z-10 flex-shrink-0"
              >
                View Tiers
              </span>
            )}
          {/* View Details Link - Show for ROI view */}
          {canShowROI && showROIView && !isSalesRep && (
            <span
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setIsROIExpanded(!isROIExpanded);
              }}
              className="text-xs font-medium text-green cursor-pointer hover:underline z-10 flex-shrink-0"
            >
              {isROIExpanded ? "View Summary" : "View Details"}
            </span>
          )}
        </div>

        {programOverview && (
          <span className="text-xs font-medium text-[#344054]">
            {programOverview}
          </span>
        )}

        {canShowROI && showROIView && !isSalesRep ? (
          /* ROI Metrics - Show simplified or detailed view based on expansion */
          <div className="mt-4 w-full">
            {isLoadingROI ? (
              <div className="text-center text-sm text-heading-light py-4">
                Loading ROI data...
              </div>
            ) : roiData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2 sm:gap-4 w-full">
                {isROIExpanded ? (
                  <>
                    {/* Sales / Cost of Program - Detailed */}
                    <div className="border rounded-lg p-3 sm:p-5 bg-blue-bg">
                      <div className="min-h-[3rem] sm:min-h-[3.5rem] flex flex-col mb-1 sm:mb-2">
                        <h3 className="text-xs sm:text-sm font-medium text-heading text-center">
                          Sales / Cost
                        </h3>
                        <div className="mt-auto pb-1 sm:pb-2 border-b border-gray-300"></div>
                      </div>
                      <div className="space-y-1 sm:space-y-1.5">
                        <p className="text-xs sm:text-sm lg:text-base font-bold mb-1 sm:mb-2 text-center">
                          {formatNumber(roiData.salesToCostRatio, false, 1)}x
                        </p>
                        <div className="flex justify-between items-center gap-3 sm:gap-4">
                          <span className="text-xs font-bold text-heading">
                            Sales:
                          </span>
                          <span className="text-xs font-semibold">
                            $
                            {formatNumber(
                              Number(roiData.currentYearProgramProductSales) ||
                                0
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-3 sm:gap-4">
                          <span className="text-xs font-bold text-heading">
                            Cost:
                          </span>
                          <span className="text-xs font-semibold">
                            ${formatNumber(Number(roiData.costOfProgram) || 0)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Incremental Sales - Detailed */}
                    <div className="border rounded-lg p-3 sm:p-5 bg-blue-bg">
                      <div className="min-h-[3rem] sm:min-h-[3.5rem] flex flex-col mb-1 sm:mb-2">
                        <h3 className="text-xs sm:text-sm font-medium text-heading w-full flex justify-center text-center">
                          Incremental
                          <br className="sm:hidden" /> Sales
                        </h3>
                        <div className="mt-auto pb-1 sm:pb-2 border-b border-gray-300"></div>
                      </div>
                      <div className="space-y-1 sm:space-y-1.5">
                        <p className="text-xs sm:text-sm lg:text-base font-bold mb-1 sm:mb-2 text-center">
                          {formatNumber(roiData.incrementalSalesLift, false, 1)}
                          %
                        </p>
                        <div className="flex justify-between items-center gap-3 sm:gap-4">
                          <span className="text-xs font-bold text-heading">
                            {new Date().getFullYear()}:
                          </span>
                          <span className="text-xs font-semibold">
                            $
                            {formatNumber(
                              Number(roiData.currentYearProgramProductSales) ||
                                0
                            )}
                          </span>
                        </div>
                        <div className="flex justify-between items-center gap-3 sm:gap-4">
                          <span className="text-xs font-bold text-heading">
                            {new Date().getFullYear() - 1}:
                          </span>
                          <span className="text-xs font-semibold">
                            $
                            {formatNumber(
                              Number(roiData.previousYearProgramProductSales) ||
                                0
                            )}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* # of New Doors - Detailed */}
                    <div className="border rounded-lg p-3 sm:p-5 bg-blue-bg flex flex-col">
                      <div className="min-h-[3rem] sm:min-h-[3.5rem] flex flex-col mb-1 sm:mb-2">
                        <h3 className="text-xs sm:text-sm font-medium text-heading text-center">
                          New Doors
                        </h3>
                        <div className="mt-auto pb-1 sm:pb-2 border-b border-gray-300"></div>
                      </div>
                      <div className="flex-1 flex flex-col justify-center space-y-1">
                        <p className="text-xs sm:text-sm font-semibold text-center">
                          {formatNumber(roiData.newDoorsCount)} New Doors
                        </p>
                        <p className="text-xs sm:text-sm font-semibold text-center">
                          {formatNumber(roiData.lastYearDoorsCount)} Last Year
                        </p>
                      </div>
                    </div>

                    {/* # of New POD - Detailed */}
                    <div className="border rounded-lg p-3 sm:p-5 bg-blue-bg flex flex-col">
                      <div className="min-h-[3rem] sm:min-h-[3.5rem] flex flex-col mb-1 sm:mb-2">
                        <h3 className="text-xs sm:text-sm font-medium text-heading text-center">
                          New POD
                        </h3>
                        <div className="mt-auto pb-1 sm:pb-2 border-b border-gray-300"></div>
                      </div>
                      <div className="flex-1 flex flex-col justify-center space-y-1">
                        <p className="text-xs sm:text-sm font-semibold text-center">
                          {formatNumber(roiData.newPodCount)} New
                        </p>
                        <p className="text-xs sm:text-sm font-semibold text-center">
                          {formatNumber(roiData.totalPodCount)} Total
                        </p>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Sales / Cost of Program - Simplified */}
                    <div className="border rounded-lg p-3 sm:p-5 bg-blue-bg">
                      <h3 className="text-xs sm:text-sm font-medium text-heading mb-1 sm:mb-2 text-center">
                        Sales / Cost
                      </h3>
                      <p className="text-xs sm:text-sm lg:text-base font-bold text-center">
                        {formatNumber(roiData.salesToCostRatio, false, 1)}x
                      </p>
                    </div>

                    {/* Incremental Sales - Simplified */}
                    <div className="border rounded-lg p-3 sm:p-5 bg-blue-bg">
                      <h3 className="text-xs sm:text-sm font-medium text-heading mb-1 sm:mb-2 w-full flex justify-center text-center">
                        Incremental
                        <br className="sm:hidden" /> Sales
                      </h3>
                      <p className="text-xs sm:text-sm lg:text-base font-bold text-center">
                        {formatNumber(roiData.incrementalSalesLift, false, 1)}%
                      </p>
                    </div>

                    {/* New Doors - Simplified with percentage */}
                    <div className="border rounded-lg p-3 sm:p-5 bg-blue-bg">
                      <h3 className="text-xs sm:text-sm font-medium text-heading mb-1 sm:mb-2 text-center">
                        New Doors
                      </h3>
                      <p className="text-xs sm:text-sm lg:text-base font-bold text-center">
                        {formatNumber(roiData.newDoorsCount)}
                        <span className="text-xs font-normal text-heading-light ml-1 sm:ml-2">
                          (
                          {roiData.lastYearDoorsCount > 0
                            ? formatNumber(
                                (roiData.newDoorsCount /
                                  roiData.lastYearDoorsCount) *
                                  100,
                                false,
                                1
                              )
                            : "0"}
                          %)
                        </span>
                      </p>
                    </div>

                    {/* New POD - Simplified with percentage */}
                    <div className="border rounded-lg p-3 sm:p-5 bg-blue-bg">
                      <h3 className="text-xs sm:text-sm font-medium text-heading mb-1 sm:mb-2 text-center">
                        New POD
                      </h3>
                      <p className="text-xs sm:text-sm lg:text-base font-bold text-center">
                        {formatNumber(roiData.newPodCount)}
                        <span className="text-xs font-normal text-heading-light ml-1 sm:ml-2">
                          ({formatNumber(roiData.newPodPercentage, false, 1)}%)
                        </span>
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="text-center text-sm text-heading-light py-4">
                No ROI data available
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center flex-wrap w-full my-2 gap-1 sm:gap-2">
              {!isSalesRep && (
                <>
                  <div className="text-xs font-normal text-heading-light">
                    {subTitle}
                  </div>

                  {Number(completedCompliances) >= 0 &&
                  Number(totalEnrollments) >= 0 ? (
                    <div className="flex items-center gap-1 sm:gap-2">
                      <PieWithoutLabel
                        style={{ width: "20px", minWidth: "20px" }}
                        percentage={calcPercentage(
                          Number(completedCompliances) ?? 0,
                          Number(totalEnrollments) ?? 0
                        )}
                        useDynamicColor
                      />
                      <span className="text-xs sm:text-sm whitespace-nowrap">
                        <strong>
                          {formatNumber(Number(completedCompliances))}
                        </strong>
                        /{formatNumber(Number(totalEnrollments))}
                      </span>
                    </div>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-green-50 text-xs sm:text-sm font-medium text-green-700 text-[#344054]">
                      N/A
                    </span>
                  )}
                </>
              )}
            </div>

            {/* Total Rebate/SPIFF */}
            <div className="flex justify-between bg-blue-bg px-2 py-1 sm:py-2 mb-2 sm:mb-4 rounded-md items-center w-full">
              <div className="text-xs">{isSalesRep ? "SPIFF" : "Rebate"}</div>
              <span className="text-xs sm:text-sm mt-1 block font-semibold">
                ${formatNumber(Number(rebate ?? 0), false, 1)}
              </span>
            </div>

            {/* Program Dates */}
            {(programStartDate || programEndDate) && (
              <div className="flex justify-between items-center w-full gap-2 sm:gap-4">
                {programStartDate && (
                  <div className="min-w-0">
                    <div className="text-xs font-normal text-heading-light">
                      Start Date
                    </div>
                    <p className="text-xs font-semibold truncate">
                      {getNumericDateString(programStartDate)}
                    </p>
                  </div>
                )}
                {programEndDate && (
                  <div className="min-w-0 text-right">
                    <div className="text-xs font-normal text-heading-light">
                      End Date
                    </div>
                    <p className="text-xs font-semibold truncate">
                      {getNumericDateString(programEndDate)}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <ProgramTiersModal
        isOpen={isTiersModalOpen}
        setIsOpen={setIsTiersModalOpen}
        programName={programName}
        programOverview={programOverview}
        tiers={"_tiers" in data ? data._tiers : undefined}
        isDistributorProgram={isDistributorProgram}
        isSalesRep={isSalesRep}
        aggregatedProgramData={data}
      />
    </>
  );
};

export default ManufacturerProgramCard;
