import Image from "next/image";
import React from "react";
import CustomPopOver from "../Popovers/CustomPopOver";

interface ProgramBasicinfoProps {
  icon: string;
  showIcon?: boolean;
  showCustomPopOver?: boolean;
  label: string;
  value: string;
}

const ProgramBasicinfo: React.FC<ProgramBasicinfoProps> = ({
  icon,
  label,
  value,
  showIcon = false,
  showCustomPopOver = false
}) => {
  return (
    <div className="flex justify-between p-3 border-border-gray border-b text-filter-light gap-2.5">
      <div className="flex items-center gap-2">
        <span className="font-normal">{label}</span>
        {showIcon && (
          <Image
            height={15}
            width={15}
            className="max-h-4"
            src={icon}
            alt="Green Tick Icon"
          />
        )}
        {showCustomPopOver && <CustomPopOver startFromLeft />}
      </div>
      <span className="text-green font-medium">{value}</span>
    </div>
  );
};

export default ProgramBasicinfo;
