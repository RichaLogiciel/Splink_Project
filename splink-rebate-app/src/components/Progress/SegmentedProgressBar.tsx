import { getProgressBarColor } from "@/utils/helper";
import React from "react";

interface SegmentedProgressBarProps {
  completed: number;
  total: number;
}
const SegmentedProgressBar: React.FC<SegmentedProgressBarProps> = ({
  completed,
  total
}) => {
  return (
    <div
      style={{
        gridTemplateColumns: `repeat(${total > 0 ? total : 1}, minmax(0, 1fr))`
      }}
      className={`max-w-32 store-count-bar h-2 grid grid-cols-1 md:grid-cols-${total > 0 ? total : 1} gap-2 w-full`}
    >
      {Array.from({ length: total > 0 ? total : 1 }).map((_, i) =>
        completed > i ? (
          <div
            key={i}
            style={{ backgroundColor: getProgressBarColor(100) }}
            className={`store-count-bar h-2 rounded-2xl max-w-full`}
          ></div>
        ) : (
          <div
            key={i}
            className={`store-count-bar h-2 rounded-2xl bg-horizontal-bar max-w-full`}
          ></div>
        )
      )}
    </div>
  );
};

export default SegmentedProgressBar;
