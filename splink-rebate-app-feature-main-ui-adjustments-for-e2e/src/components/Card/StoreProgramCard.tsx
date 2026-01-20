"use client";

import greenTickIcon from "@/assets/icons/greenTickIcon.svg";
import greyIconUp from "@/assets/icons/greyIconUp.svg";
import ManufacturerAvatar from "@/components/Avatar/ManufacturerAvatar";
import Card from "@/components/Card";
import ProgramBasicInfo from "@/components/Elements/ProgramBasicinfo";
import ProgramSaleInfo from "@/components/Elements/ProgramSaleInfo";
import { DistributorProgram, ProgramListingCard } from "@/types/ProgramTypes";
import { getNumericDateString } from "@/utils/dateHelper";
import { getProgramTimelineQueryParam } from "@/utils/helper";
import { formatNumber } from "@/utils/numberFormatter";
import { getRebateValue } from "@/utils/programHelper";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface StoreProgramCardProps {
  store: ProgramListingCard;
  manufacturerId: string;
  manufacturerName: string;
  authorizedManufacturer: boolean | undefined;
  sortedAgreements: Array<{ agreementId: number; agreementName: string }>;
  programsByAgreement: Record<string, DistributorProgram[]>;
  programTimeline?: string;
  isInternal?: boolean;
  warehouseId?: string;
  defaultOpen?: boolean;
}

const StoreProgramCard: React.FC<StoreProgramCardProps> = ({
  store,
  manufacturerId,
  manufacturerName,
  authorizedManufacturer,
  sortedAgreements,
  programsByAgreement,
  programTimeline,
  isInternal,
  warehouseId,
  defaultOpen = true
}) => {
  // State to track which agreements are open
  const [openAgreements, setOpenAgreements] = useState<Set<number>>(() => {
    const initial = new Set<number>();
    if (defaultOpen) {
      sortedAgreements.forEach((agreement) => {
        initial.add(agreement.agreementId);
      });
    }
    return initial;
  });

  // Update openAgreements when sortedAgreements changes (data refresh)
  useEffect(() => {
    if (sortedAgreements.length > 0) {
      const allAgreementIds = new Set(
        sortedAgreements.map((agreement) => agreement.agreementId)
      );
      setOpenAgreements(allAgreementIds);
    } else {
      setOpenAgreements(new Set<number>());
    }
  }, [sortedAgreements]);

  const toggleAgreement = (agreementId: number) => {
    setOpenAgreements((prev) => {
      const next = new Set(prev);
      if (next.has(agreementId)) {
        next.delete(agreementId);
      } else {
        next.add(agreementId);
      }
      return next;
    });
  };

  const href = useMemo(() => {
    const params = new URLSearchParams({
      id: manufacturerId,
      manufacturerName,
      ...(store.startDate && { startDate: store.startDate }),
      ...(store.endDate && { endDate: store.endDate }),
      ...(programTimeline && {
        programTimeline: getProgramTimelineQueryParam(programTimeline)
      }),
      ...(isInternal !== undefined && { isInternal: String(isInternal) }),
      ...(warehouseId && { warehouseId })
    });
    return `/app/programs/store/${manufacturerId}?${params.toString()}`;
  }, [
    manufacturerId,
    manufacturerName,
    store.startDate,
    store.endDate,
    programTimeline,
    isInternal,
    warehouseId
  ]);

  return (
    <Link
      href={href}
      className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(33%-8px)] sm:min-h-80"
    >
      <Card className="h-full">
        <div className="flex items-center justify-between">
          {/* Manufacturer Avatar */}
          <ManufacturerAvatar
            large={true}
            user={store.manufacturer}
            imageClass="w-[52px] h-[52px]"
            subText={
              store.programs.length > 0 &&
              store.programs[0].startDate &&
              store.programs[0].endDate
                ? `${getNumericDateString(store.programs[0].startDate)} - ${getNumericDateString(store.programs[0].endDate)}`
                : undefined
            }
          />
        </div>

        {/* Sale Info */}
        <ProgramSaleInfo
          purchaseLabel="Sales Volume"
          savingLabel="Est. Store Earnings"
          purchaseVolume={formatNumber(store.salesData.purchaseVolume.amount)}
          totalSavings={formatNumber(store.salesData.totalSavings.amount)}
          showEstimatedWarning={!authorizedManufacturer}
          showEstimatedEarnings={true}
          hidePurchaseVolume={false}
        />

        {/* Agreement Accordion */}
        {sortedAgreements.length > 0 ? (
          <div className="mt-2 max-h-48 overflow-y-auto">
            {sortedAgreements.map((agreement) => {
              const agreementIdStr = String(agreement.agreementId);
              const programs = programsByAgreement[agreementIdStr] || [];
              const isOpen = openAgreements.has(agreement.agreementId);

              return (
                <div key={agreement.agreementId} className="mb-2">
                  {/* Accordion Header */}
                  <div
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      toggleAgreement(agreement.agreementId);
                    }}
                    className="cursor-pointer flex items-center text-sm font-semibold text-filter-light py-2.5 bg-common-bg rounded-sm"
                  >
                    <div
                      className={`w-5 h-5 ml-2 flex justify-center items-center transition-transform ${
                        isOpen && "rotate-180"
                      }`}
                    >
                      <Image
                        src={greyIconUp.src}
                        width={12}
                        height={8}
                        alt="Toggle"
                      />
                    </div>
                    <span
                      className="ml-2 text-ellipsis line-clamp-2"
                      title={agreement.agreementName}
                    >
                      {agreement.agreementName}
                    </span>
                  </div>

                  {/* Accordion Content */}
                  {isOpen &&
                    programs.length > 0 &&
                    programs.map((program, index) => {
                      const rebateValue =
                        program?.rebateRange ||
                        getRebateValue(program.rebate)?.toString() ||
                        "";
                      return (
                        <div
                          key={`${program.id}-${index}`}
                          className="flex justify-between items-center p-2 border-b border-border-gray text-filter-light hover:bg-gray-50 transition-colors"
                        >
                          <span className="font-normal text-sm">
                            {program.type}
                          </span>
                          {rebateValue && (
                            <span className="text-green font-medium text-sm">
                              {rebateValue}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </div>
        ) : /* Fallback to simple program list if no agreements */
        store.programs.length > 0 ? (
          <div className="mt-4 mb-2 max-h-48 overflow-y-auto border-t border-border-gray">
            {store.programs.map((program, index) => (
              <ProgramBasicInfo
                key={`${program.id}-${index}`}
                icon={greenTickIcon.src}
                label={program.type}
                showIcon={
                  program.programEntityType === "DISTRIBUTOR" &&
                  program.complianceStatus
                }
                value={
                  program?.rebateRange
                    ? program?.rebateRange
                    : getRebateValue(program.rebate)?.toString()
                }
                showCustomPopOver={program.isRebateBasedOnListPrice}
              />
            ))}
          </div>
        ) : (
          <div className="mt-4 mb-2 max-h-48 overflow-y-auto border-t border-border-gray p-4 text-center text-heading-light font-medium">
            No programs found
          </div>
        )}
      </Card>
    </Link>
  );
};

export default StoreProgramCard;
