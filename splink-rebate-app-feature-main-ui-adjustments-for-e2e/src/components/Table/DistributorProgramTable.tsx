"use client";
import Image from "next/image";
import React, { useState } from "react";

// Import Types
import { DistributorProgramTableType } from "@/types/ProgramTypes";

// Import Images
import { useWindowWidth } from "@/utils/clientHelper";

import DistributorProgramDetails from "@/components/Dialog/DistributorProgramDetailsModal";
import { MESSAGES } from "@/configs/messages";
import { PROGRAM_CRITERIA } from "@/views/Distributor/programConstants";
import infoIcon from "../../assets/icons/greenInfo.svg";

const DistributorProgramTable: React.FC<DistributorProgramTableType> = ({
  programs,
  showEstimatedWarning,
  totalPurchaseVolume,
  allPurchasedProducts,
  showEstimatedEarning = true,
  showSavingsNotApplicable,
  id,
  warehouseId,
  warehouses
}) => {
  const [isProgramDetailOpen, setIsProgramDetailOpen] = useState(false);
  const [programDetails, setProgramDetails] = useState<any>();
  const [programCriteriaType, setProgramCriteriaType] = useState("");

  const windowWidth = useWindowWidth();

  const isCatSkuOrPod = (criteria: string | undefined) =>
    PROGRAM_CRITERIA.CATEGORY_SKUS == criteria ||
    PROGRAM_CRITERIA.POD == criteria ||
    PROGRAM_CRITERIA.GROWTH == criteria ||
    PROGRAM_CRITERIA.OUTREACH == criteria;

  const handleMouseClick = (criteria: string, index: number) => (e: any) => {
    e.stopPropagation();
    if (isCatSkuOrPod(criteria)) {
      setProgramCriteriaType(criteria);
      setProgramDetails(programs[index]);
      setIsProgramDetailOpen(!isProgramDetailOpen);
    }
  };

  return (
    <div
      className="DistributorProgram text-left text-filter-light font-normal font-inter mt-2"
      id={id}
    >
      {windowWidth > 640 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="h-11 border-b text-heading-very-light text-xs">
              <tr>
                <th className="font-normal min-w-48 px-2 sm:px-4">Type</th>
                <th className="font-normal min-w-20 px-2 sm:px-4">Rebate</th>
                <th className="font-normal min-w-48 px-2 sm:px-4">Overview</th>
                <th className="font-normal min-w-32 px-2 sm:px-4">
                  Payment Term
                </th>
                <th className="font-normal min-w-20 px-2 sm:px-4 text-center">
                  Compliance Status
                </th>
              </tr>
            </thead>
            <tbody>
              {programs?.length > 0 ? (
                programs.map((program, index) => (
                  <tr
                    key={`${index}-${program.type}`}
                    className={`${isCatSkuOrPod(program?.criteria) && "cursor-pointer hover:bg-gray-50 transition-colors"} border-b`}
                    onClick={handleMouseClick(program?.criteria || "", index)}
                  >
                    <td className="px-2 sm:px-4 py-3">{program.type}</td>
                    <td className="px-2 sm:px-4 py-3 text-green font-medium">
                      {program.rebate}
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-sm">
                      {program.overview}
                    </td>
                    <td className="px-2 sm:px-4 py-3">
                      {program.paymentTerms}
                    </td>
                    <td className="px-2 sm:px-4 py-3 text-center">
                      {!isCatSkuOrPod(program?.criteria) ? (
                        "N/A"
                      ) : (
                        <Image
                          className="inline-block"
                          src={infoIcon}
                          alt={
                            program.complianceStatus
                              ? "Compliant"
                              : "Non-compliant"
                          }
                          width={18}
                          height={6}
                        />
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="pt-3" colSpan={5}>
                    <p className="text-center font-medium text-heading-very-light text-sm">
                      {MESSAGES.NO_RECORDS_FOUND}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="sm:hidden my-4 pt-4 text-sm -mx-6 bg-common-bg  -mb-9">
          {programs?.length > 0 ? (
            programs.map((program, index) => (
              <div
                key={`mobile-${index}-${program.type}`}
                className="shadow rounded-lg py-3 px-4 bg-white mb-3"
              >
                <div className="flex gap-4 items-center justify-between font-medium">
                  <h4 className="text-base text-highlighted-color">
                    {program.type}
                  </h4>
                  <div className="flex gap-2 min-w-36 justify-end">
                    {program.rebate && (
                      <p className="text-green">Rebate: {program.rebate}</p>
                    )}
                    {isCatSkuOrPod(program?.criteria) ? (
                      <Image
                        onClick={handleMouseClick(
                          program?.criteria || "",
                          index
                        )}
                        className="inline-block"
                        src={infoIcon}
                        alt={
                          program.complianceStatus
                            ? "Compliant"
                            : "Non-compliant"
                        }
                        width={13}
                        height={13}
                      />
                    ) : null}
                  </div>
                </div>

                <div className="mt-2.5 text-highlighted-color">
                  {program.overview}
                </div>

                <div className="mt-3.5 grid grid-cols-2 gap-4">
                  <div className="term">
                    <span className="text-filter-light text-xs font-medium">
                      Payment Term
                    </span>
                    <p className="mt-1 text-highlighted-color font-semibold">
                      {program.paymentTerms}
                    </p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center font-medium text-heading-very-light text-sm p-4">
              {MESSAGES.NO_RECORDS_FOUND}
            </p>
          )}
        </div>
      )}

      <DistributorProgramDetails
        criteriaType={programCriteriaType}
        programData={programDetails}
        isOpen={isProgramDetailOpen}
        setIsOpen={setIsProgramDetailOpen}
        showEstimatedWarning={showEstimatedWarning}
        totalPurchaseVolume={totalPurchaseVolume}
        allPurchasedProducts={allPurchasedProducts}
        showEstimatedEarning={showEstimatedEarning}
        showSavingsNotApplicable={showSavingsNotApplicable}
        warehouseId={warehouseId}
        warehouses={warehouses}
      />
    </div>
  );
};

export default DistributorProgramTable;
