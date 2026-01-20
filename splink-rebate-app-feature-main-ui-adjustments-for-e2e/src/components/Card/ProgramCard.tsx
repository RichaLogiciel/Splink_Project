"use client";
// Import Components
import ProgramBasicInfo from "../Elements/ProgramBasicinfo";
import ProgramSaleInfo from "../Elements/ProgramSaleInfo";
import ManufacturerAvatar from "./../Avatar/ManufacturerAvatar";
import Card from "./index";

// Import Images
import greenTickIcon from "../../assets/icons/greenTickIcon.svg";

// Import Utils
import { formatNumber } from "../../utils/numberFormatter";

// Import Types
import { getNumericDateString } from "@/utils/dateHelper";
import { getRebateValue } from "@/utils/programHelper";
import Link from "next/link";
import { memo, useMemo } from "react";
import { ProgramListingCard } from "../../types/ProgramTypes";

interface ProgramCardProps {
  data: ProgramListingCard;
  url: string;
  purchaseLabel?: string;
  savingLabel?: string;
  showEstimatedEarnings?: boolean;
  showSavingsNotApplicable?: boolean;
  showProgramPaymentTermBadge?: boolean;
  programTimeline?: string;
  isInternal?: boolean;
  hidePurchaseVolume?: boolean;
  warehouseId?: string;
}

const ProgramCard: React.FC<ProgramCardProps> = ({
  data,
  url,
  purchaseLabel = "",
  savingLabel = "",
  showEstimatedEarnings = true,
  showSavingsNotApplicable,
  showProgramPaymentTermBadge,
  programTimeline,
  isInternal,
  hidePurchaseVolume = false,
  warehouseId
}) => {
  const manufacturerName = data.manufacturer.name;
  const authorizedManufacturer = data.manufacturer?.authorized;

  // Memoize href to avoid recalculating on every render
  const href = useMemo(() => {
    const params = new URLSearchParams({
      id: data.id,
      manufacturerName,
      ...(data.startDate && { startDate: data.startDate }),
      ...(data.endDate && { endDate: data.endDate }),
      ...(programTimeline && { programTimeline }),
      ...(isInternal !== undefined && { isInternal: String(isInternal) }),
      ...(warehouseId && { warehouseId })
    });
    return `${url}${data.id}?${params.toString()}`;
  }, [
    url,
    data.id,
    manufacturerName,
    data.startDate,
    data.endDate,
    programTimeline,
    isInternal,
    warehouseId
  ]);

  return (
    <Link
      className="w-full sm:w-[calc(50%-8px)] lg:w-[calc(33%-8px)] sm:min-h-80"
      prefetch
      href={href}
    >
      <Card className="h-full">
        <div className="flex items-center justify-between">
          {/* Manufacturer Avatar */}
          <ManufacturerAvatar
            large={true}
            user={data.manufacturer}
            imageClass="w-[52px] h-[52px]"
            subText={
              showProgramPaymentTermBadge &&
              data.programs.length > 0 &&
              data.programs[0].startDate &&
              data.programs[0].endDate
                ? `${getNumericDateString(data.programs[0].startDate)} - ${getNumericDateString(data.programs[0].endDate)}`
                : undefined
            }
          />
        </div>

        {/* Sale Info */}
        <ProgramSaleInfo
          purchaseLabel={purchaseLabel}
          savingLabel={savingLabel}
          purchaseVolume={formatNumber(data.salesData.purchaseVolume.amount)}
          totalSavings={formatNumber(data.salesData.totalSavings.amount)}
          showEstimatedWarning={!authorizedManufacturer}
          showEstimatedEarnings={showEstimatedEarnings}
          showSavingsNotApplicable={showSavingsNotApplicable}
          hidePurchaseVolume={hidePurchaseVolume}
        />

        {/* Programs */}
        {data.programs.length > 0 ? (
          <div className="mt-4 mb-2 max-h-48 overflow-y-auto">
            {data.programs.map((program, index) => (
              <ProgramBasicInfo
                key={`${program.id}-${index}`}
                icon={greenTickIcon.src}
                label={program.programLine || program.type}
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

export default memo(ProgramCard);
