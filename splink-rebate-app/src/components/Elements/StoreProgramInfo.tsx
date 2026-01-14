import Image from "next/image";
import React from "react";
// Import Images
import greenCircledArrowIcon from "@/assets/icons/greenCircledArrowIcon.svg";
import CustomPopOver from "../Popovers/CustomPopOver";

// program props
interface ProgramBasicInfoProps {
  icon?: string;
  showIcon?: boolean;
  label: string;
  value?: string;
  showValue?: boolean;
  isChainUser?: boolean;
  showCustomPopOver?: boolean;
  viewTierDetails?: (evt: any) => void;
}

const ProgramBasicInfo: React.FC<ProgramBasicInfoProps> = ({
  icon,
  label,
  value = "",
  showIcon = false,
  showValue = true,
  isChainUser = false,
  showCustomPopOver = false,
  viewTierDetails = () => {}
}) => {
  return (
    <div
      className="flex justify-between p-3 border-border-gray border-b text-filter-light text-sm gap-2 cursor-pointer"
      onClick={viewTierDetails}
    >
      <div className="flex items-center gap-2">
        {!icon && (
          <div
            className={`bg-red min-w-2 min-h-2 rounded-full ${showIcon ? "bg-[#18b368]" : "bg-[#BC0909]"}`}
          ></div>
        )}
        <span className="font-normal">{label}</span>
        {showIcon && icon && (
          <Image
            height={15}
            width={15}
            className="max-h-4"
            src={icon}
            alt="Green Tick Icon"
          />
        )}
        {showCustomPopOver && <CustomPopOver startFromCenter />}
      </div>

      {isChainUser && value ? (
        <span className={`flex justify-between align-middle font-medium gap-4`}>
          {value}
          <Image
            className="inline-block"
            alt="arrow"
            src={greenCircledArrowIcon}
            width={18}
            height={18}
          />
        </span>
      ) : (
        <span className={`text-green font-medium ${!showValue && "min-w-24"}`}>
          {showValue ? value : "View Details"}
        </span>
      )}
    </div>
  );
};

export default ProgramBasicInfo;
