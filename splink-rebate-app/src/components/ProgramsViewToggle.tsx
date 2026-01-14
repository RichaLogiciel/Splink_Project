"use client";

import { useState } from "react";
import { getUserClient } from "@/utils/getUserClient";
import { getManufacturerId, isManufacturer } from "@/utils/rolesConditions";
import { shouldShowROIToManufacturer } from "@/utils/roiAggregation";

interface ProgramsViewToggleProps {
  onViewChange: (showROI: boolean) => void;
}

const ProgramsViewToggle: React.FC<ProgramsViewToggleProps> = ({
  onViewChange
}) => {
  const [showROI, setShowROI] = useState(false);

  const handleToggle = () => {
    const newValue = !showROI;
    setShowROI(newValue);
    onViewChange(newValue);
  };

  // Get user and check if ROI should be shown for this manufacturer
  const user = getUserClient();
  const userRole = user?.role || "";
  const manufacturerId = isManufacturer(userRole)
    ? getManufacturerId(userRole, user)
    : null;
  const canShowROI = shouldShowROIToManufacturer(manufacturerId);

  // Don't render if feature flag is disabled
  if (!canShowROI) {
    return null;
  }

  return (
    <button
      onClick={handleToggle}
      className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
        showROI
          ? "bg-green text-white"
          : "bg-white text-heading-light border border-border-gray"
      }`}
    >
      View ROI
    </button>
  );
};

export default ProgramsViewToggle;
