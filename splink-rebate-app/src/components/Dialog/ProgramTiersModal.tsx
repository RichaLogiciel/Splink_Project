"use client";

import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";
import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import CustomPopOver from "../Popovers/CustomPopOver";
import PieWithoutLabel from "../PieChartCustom/PieWithoutLabel";
import { ProgramComplianceDetails } from "@/types/DistributorTypes";
import { calcPercentage } from "@/utils/calculations";
import { getNumericDateString } from "@/utils/dateHelper";
import { formatNumber } from "@/utils/numberFormatter";

interface ProgramOverview {
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
}

interface ProgramTiersModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  programName: string;
  programOverview?: string;
  tiers?: (ProgramOverview | ProgramComplianceDetails)[];
  isDistributorProgram?: boolean;
  isSalesRep?: boolean;
  aggregatedProgramData?: ProgramOverview | ProgramComplianceDetails;
}

const ProgramTiersModal: React.FC<ProgramTiersModalProps> = ({
  isOpen,
  setIsOpen,
  programName,
  programOverview,
  tiers,
  isDistributorProgram = true,
  isSalesRep = false,
  aggregatedProgramData
}) => {
  const subTitle = isDistributorProgram
    ? "Distributors in Compliance"
    : "Store Compliance";

  return (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      className="relative z-50"
    >
      <div className="fixed inset-0 w-screen overflow-y-auto space-y-4 bg-black bg-opacity-20 p-4">
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel className="max-w-6xl w-full border bg-white p-8 rounded-lg max-h-[90vh] overflow-y-auto">
            <DialogTitle className="flex justify-between items-center mb-4">
              <span className="font-semibold text-lg">{programName}</span>
              <Image
                onClick={() => setIsOpen(false)}
                className="cursor-pointer"
                src={popupCloseIcon.src}
                alt="popupCloseIcon"
                height={13}
                width={13}
              />
            </DialogTitle>

            {programOverview && (
              <div className="mb-6">
                <p className="text-sm font-medium text-[#344054]">
                  {programOverview}
                </p>
              </div>
            )}

            {tiers && tiers.length > 0 ? (
              <div className="flex flex-wrap gap-4">
                {tiers.map((tier, idx) => {
                  const completedCompliances =
                    "completedCompliances" in tier
                      ? tier.completedCompliances
                      : "qualifiedStores" in tier
                        ? tier.qualifiedStores
                        : 0;
                  const totalEnrollments =
                    "totalEnrollments" in tier
                      ? tier.totalEnrollments
                      : "totalStores" in tier
                        ? tier.totalStores
                        : 0;
                  const rebate =
                    "rebate" in tier ? tier.rebate : tier.totalRebate;
                  const rebatePercentage = tier.rebate_percentage;
                  const rebateType = tier.rebate_type;
                  const rebateAmount = tier.rebate_amount;
                  const isRebateBasedOnListPrice =
                    "isRebateBasedOnListPrice" in tier
                      ? tier.isRebateBasedOnListPrice
                      : false;
                  const tierOverview = tier.overview;

                  return (
                    <div
                      key={idx}
                      className="flex w-full sm:w-[calc(50%-8px)] lg:w-[calc(50%-8px)] border rounded-lg p-4 flex-wrap flex-col items-start justify-start relative"
                    >
                      <div className="text-s font-semibold flex gap-2 w-full items-center justify-between">
                        <div className="flex gap-2">
                          <span>{tier.programName}</span>
                          <span className="text-base font-semibold">
                            (
                            {rebateType === "percentage"
                              ? `${formatNumber(Number(rebatePercentage) || 0, false, 1)}%`
                              : `$${formatNumber(Number(rebateAmount) || 0, false, 1)}`}
                            )
                          </span>
                          {isRebateBasedOnListPrice && (
                            <CustomPopOver startFromLeft />
                          )}
                        </div>
                      </div>

                      {tierOverview && (
                        <div className="mt-2 mb-2 w-full">
                          <p className="text-xs font-medium text-[#344054]">
                            {tierOverview}
                          </p>
                        </div>
                      )}

                      <div className="flex justify-between items-center flex-wrap w-full my-2">
                        <div className="text-xs font-normal text-heading-light">
                          {subTitle}
                        </div>

                        {Number(completedCompliances) >= 0 &&
                        Number(totalEnrollments) >= 0 ? (
                          <div className="flex items-center gap-2">
                            <PieWithoutLabel
                              style={{ width: "24px" }}
                              percentage={calcPercentage(
                                Number(completedCompliances) ?? 0,
                                Number(totalEnrollments) ?? 0
                              )}
                              useDynamicColor
                            />
                            <span>
                              <strong>
                                {formatNumber(Number(completedCompliances))}
                              </strong>
                              /{formatNumber(Number(totalEnrollments))}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-green-50 text-s font-medium text-green-700 text-[#344054]">
                            N/A
                          </span>
                        )}
                      </div>

                      {/* Total Rebate/SPIFF */}
                      <div className="flex justify-between bg-blue-bg px-2 mb-4 rounded-md items-center w-full">
                        <div className="text-xs">
                          {isSalesRep ? "SPIFF" : "Rebate"}
                        </div>
                        <span className="text-s mt-1 block font-semibold">
                          ${formatNumber(Number(rebate ?? 0), false, 1)}
                        </span>
                      </div>

                      {/* Program Dates */}
                      {(tier.programStartDate || tier.programEndDate) && (
                        <div className="flex justify-between items-center w-full">
                          {tier.programStartDate && (
                            <div>
                              <div className="text-xs font-normal text-heading-light">
                                Start Date
                              </div>
                              <p className="text-xs font-semibold">
                                {getNumericDateString(tier.programStartDate)}
                              </p>
                            </div>
                          )}
                          {tier.programEndDate && (
                            <div>
                              <div className="text-xs font-normal text-heading-light">
                                End Date
                              </div>
                              <p className="text-xs font-semibold">
                                {getNumericDateString(tier.programEndDate)}
                              </p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-heading-very-light text-sm">
                No tiers available
              </p>
            )}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default ProgramTiersModal;
