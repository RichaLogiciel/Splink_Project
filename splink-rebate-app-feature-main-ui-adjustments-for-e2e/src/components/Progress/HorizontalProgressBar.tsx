import { getProgressBarColor } from "@/utils/helper";
import React from "react";

interface HorizontalProgressBarProps {
  percentage: number;
  className?: string;
}
const HorizontalProgressBar: React.FC<HorizontalProgressBarProps> = ({
  percentage,
  className
}) => {
  const backgroundHexColor = getProgressBarColor(percentage);
  return (
    <div
      className={`flex-auto max-w-32 store-count-bar h-2 rounded-2xl bg-horizontal-bar ${className}`}
    >
      <div
        style={{ width: `${percentage}%`, backgroundColor: backgroundHexColor }}
        className={`store-count-bar h-2 rounded-2xl max-w-full`}
      ></div>
    </div>
  );
};

export default HorizontalProgressBar;
