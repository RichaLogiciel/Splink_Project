import React from "react";
import HorizontalProgressBar from "@/components/Progress/HorizontalProgressBar";

interface TierCardProps {
  name: string;
  tier: number;
  overview: string;
  compliant: boolean;
  complianceStatus: string;
  purchaseVolume: number;
  earnedRebate: number;
}

const TierCard: React.FC<TierCardProps> = ({
  name,
  tier,
  overview,
  compliant,
  complianceStatus,
  purchaseVolume,
  earnedRebate
}) => {
  return (
    <div
      className={`border rounded-lg p-3 flex flex-col justify-between ${
        compliant ? "bg-green-50" : "bg-yellow-50"
      }`}
    >
      <div className="flex flex-col gap-1">
        <span className="font-medium text-sm text-highlighted-color min-h-7">
          {name} (Tier {tier})
        </span>
        <span className="text-xs text-gray-500">{overview}</span>
      </div>
      <div className="flex items-center mt-2">
        <HorizontalProgressBar percentage={compliant ? 100 : 50} />
        <span className="ml-2 text-xs">{complianceStatus}</span>
      </div>
      <div className="flex justify-between mt-2 text-xs">
        <span>Purchase: ${purchaseVolume.toLocaleString()}</span>
        <span>Rebate: ${earnedRebate.toLocaleString()}</span>
      </div>
    </div>
  );
};

export default TierCard;
