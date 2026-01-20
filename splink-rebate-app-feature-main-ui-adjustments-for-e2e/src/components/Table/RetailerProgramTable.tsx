"use client";
// Import Core functionality/component
import Image from "next/image";
import React, { useState } from "react";

// Import Components
import HorizontalProgressBar from "../Progress/HorizontalProgressBar";

// Import Util functions
import { calcPercentage } from "../../utils/calculations";

// Import Types
import { MESSAGES } from "@/configs/messages";
import { useWindowWidth } from "@/utils/clientHelper";
import { getUserClient } from "@/utils/getUserClient";
import { formatNumber } from "@/utils/numberFormatter";
import { isDistributor } from "@/utils/rolesConditions";
import infoIcon from "../../assets/icons/greenInfo.svg";
import { RetailerProgramTableType } from "../../types/ProgramTypes";
import TierDetailModal from "../Dialog/TierDetailModal";

const RetailerProgramTable: React.FC<RetailerProgramTableType> = ({
  programs,
  manufacturerData,
  storeComplianceTotal = 0,
  showPurchasedProductsButton = false,
  showStoreCompliance = true,
  showProductsUpcCode = false,
  hideProductsUpcCodeOnPurchasedShow = false,
  allPurchasedProducts,
  id,
  complianceLabel = "Store Compliance",
  hideCompianceColumn = false,
  showProgramSpecificEnrollments,
  isComplianceDetailLoading
}) => {
  const windowWidth = useWindowWidth();
  const [isProgramDetailOpen, setIsProgramDetailOpen] = useState(false);
  const [programDetails, setProgramDetails] = useState<any>();

  const handleMouseClick = (index: number) => () => {
    const program = programs[index];

    const {
      required: requiredcategoriesCount,
      purchased: purchasedcategoriesCount
    } = program?.totalCategoriesQuantity ?? {
      required: 0,
      purchased: 0
    };

    const totalVal = showStoreCompliance
      ? showProgramSpecificEnrollments
        ? program.storeCompliance.total
        : storeComplianceTotal
      : requiredcategoriesCount;
    const achivedVal = showStoreCompliance
      ? program.storeCompliance.completed
      : purchasedcategoriesCount;

    setProgramDetails({
      totalPotentialSavings: program.rebate,
      additionalInfo: program.type,
      title: program.type,
      skus: {
        total: totalVal,
        completed: achivedVal
      },
      overview: program.description || program.overview,
      graph: program.graph,
      totalRebate: program.rebate,
      earnedRebate: program.rebate,
      categorizedProducts: program.categorizedProducts,
      rebateRange: program.rebateRange
    });
    setIsProgramDetailOpen(!isProgramDetailOpen);
  };

  const user = getUserClient();
  const showDistributorCode = isDistributor(user?.role || "");

  return (
    <div
      className="RetailerProgram text-left text-filter-light font-normal font-inter mt-2"
      id={id}
    >
      {windowWidth > 640 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="h-11 border-b text-heading-very-light text-xs">
              <tr>
                <th className="font-normal min-w-56 px-2 sm:px-4">Type</th>
                <th className="font-normal min-w-20 px-2 sm:px-4">Rebate</th>
                <th className="font-normal min-w-64 px-2 sm:px-4">Overview</th>
                {showProgramSpecificEnrollments && (
                  <th className="font-normal min-w-28 px-2 sm:px-4">
                    % Compliant
                  </th>
                )}
                {!hideCompianceColumn && (
                  <th className="font-normal min-w-32 px-2 sm:px-4">
                    {showStoreCompliance
                      ? complianceLabel
                      : "Products in warehouse"}
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {programs?.length > 0 ? (
                programs.map((program, index) => {
                  // get total reuired categories count and purchased categories count from categorizedProducts
                  const {
                    required: requiredcategoriesCount,
                    purchased: purchasedcategoriesCount
                  } = program?.totalCategoriesQuantity ?? {
                    required: 0,
                    purchased: 0
                  };

                  const totalVal = showStoreCompliance
                    ? showProgramSpecificEnrollments
                      ? program.storeCompliance.total
                      : storeComplianceTotal
                    : requiredcategoriesCount;
                  const achivedVal = showStoreCompliance
                    ? program.storeCompliance.completed
                    : purchasedcategoriesCount;

                  return (
                    <tr
                      key={`${index}-${program.type}`}
                      className="border-b hover:bg-gray-50 cursor-pointer"
                      onClick={handleMouseClick(index)}
                    >
                      <td className="px-2 sm:px-4 py-3">{program.type}</td>
                      <td className="px-2 sm:px-4 py-3 text-green font-medium">
                        {program?.rebateRange
                          ? program.rebateRange
                          : program.rebate}
                      </td>
                      <td className="px-2 sm:px-4 py-3">{program.overview}</td>
                      {showProgramSpecificEnrollments && (
                        <td className="px-2 sm:px-4 py-3">
                          {isComplianceDetailLoading ? (
                            <div className="h-4 bg-gray-300 rounded w-16 animate-pulse"></div>
                          ) : (
                            <>
                              {formatNumber(
                                (achivedVal / totalVal) * 100,
                                false,
                                1
                              )}
                              %
                            </>
                          )}
                        </td>
                      )}

                      {!hideCompianceColumn && (
                        <td className="px-2 sm:px-4 py-3">
                          {isComplianceDetailLoading ? (
                            <div className="h-4 bg-gray-300 rounded w-30 animate-pulse"></div>
                          ) : (
                            <div className="flex items-center gap-4 text-heading-very-light text-xs">
                              <div className="min-w-32">
                                <HorizontalProgressBar
                                  percentage={
                                    calcPercentage(achivedVal, totalVal) || 0
                                  }
                                />
                              </div>
                              <span>
                                <strong className="text-filter-light text-sm">
                                  {formatNumber(achivedVal)}
                                </strong>
                                /{formatNumber(totalVal)}
                              </span>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="pt-3" colSpan={4}>
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
            programs.map((program, index) => {
              // get total reuired categories count and purchased categories count from categorizedProducts
              const {
                required: requiredcategoriesCount,
                purchased: purchasedcategoriesCount
              } = program?.totalCategoriesQuantity ?? {
                required: 0,
                purchased: 0
              };

              const totalVal = showStoreCompliance
                ? showProgramSpecificEnrollments
                  ? program.storeCompliance.total
                  : storeComplianceTotal
                : requiredcategoriesCount;
              const achivedVal = showStoreCompliance
                ? program.storeCompliance.completed
                : purchasedcategoriesCount;

              return (
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
                        <p className="text-green">
                          Rebate:{" "}
                          {program?.rebateRange
                            ? program.rebateRange
                            : program.rebate}
                        </p>
                      )}
                      <Image
                        onClick={handleMouseClick(index)}
                        className="inline-block"
                        src={infoIcon}
                        alt={program.type}
                        width={13}
                        height={13}
                      />
                    </div>
                  </div>

                  <div className="mt-2.5 text-highlighted-color">
                    {program.overview}
                  </div>

                  {showProgramSpecificEnrollments && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="term">
                        <span className="text-filter-light text-xs font-medium">
                          % Compliant
                        </span>
                        <div className="flex items-center gap-4 text-heading-very-light text-xs">
                          <span>
                            {formatNumber(
                              (achivedVal / totalVal) * 100,
                              false,
                              1
                            )}
                            %
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {!hideCompianceColumn && (
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className="term">
                        <span className="text-filter-light text-xs font-medium">
                          {showStoreCompliance
                            ? complianceLabel
                            : "Compliance Status"}
                        </span>
                        <div className="flex items-center gap-4 text-heading-very-light text-xs">
                          <div className="min-w-32">
                            <HorizontalProgressBar
                              percentage={
                                calcPercentage(achivedVal, totalVal) || 0
                              }
                            />
                          </div>
                          <span>
                            <strong className="text-filter-light text-sm">
                              {formatNumber(achivedVal)}
                            </strong>
                            /{formatNumber(totalVal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <p className="text-center font-medium text-heading-very-light text-sm p-4">
              {MESSAGES.NO_RECORDS_FOUND}
            </p>
          )}
        </div>
      )}

      <TierDetailModal
        isOpen={isProgramDetailOpen}
        setIsOpen={setIsProgramDetailOpen}
        data={programDetails}
        manfData={manufacturerData}
        skuLabel=""
        skuTitleLabel={complianceLabel}
        showCategorizedProducts
        formatEarnedRebate={false}
        customEarningLabel="Rebate"
        showDistributorCode={showDistributorCode}
        showPurchasedProductsButton={showPurchasedProductsButton}
        showStoreCompliance={showStoreCompliance}
        showProductsUpcCode={showProductsUpcCode}
        hideProductsUpcCodeOnPurchasedShow={hideProductsUpcCodeOnPurchasedShow}
        allPurchasedProducts={allPurchasedProducts}
        showRebateRange={programDetails?.rebateRange ? true : false}
      />
    </div>
  );
};

export default RetailerProgramTable;
