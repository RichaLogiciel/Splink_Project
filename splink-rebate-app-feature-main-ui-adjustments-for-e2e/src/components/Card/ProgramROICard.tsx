"use client";

import { formatNumber } from "@/utils/numberFormatter";
import { ProgramComplianceDetails } from "@/types/DistributorTypes";

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
  _tiers?: (ProgramOverview | ProgramComplianceDetails)[];
}

interface ProgramROICardProps {
  data: ProgramOverview | ProgramComplianceDetails;
}

const ProgramROICard: React.FC<ProgramROICardProps> = ({ data }) => {
  const programName = data.programName;

  // Fake data for ROI metrics
  const roiData = {
    compliancePercentage: 87.5,
    salesCostOfProgram: 4.2,
    incrementalSalesLift: 125000,
    newDoors: {
      count: 45,
      percentage: 12.3
    },
    newPOD: {
      count: 23,
      percentage: 8.7
    }
  };

  return (
    <div className="flex w-full sm:w-[calc(50%-8px)] lg:w-[calc(33%-8px)] border rounded-lg p-4 flex-wrap flex-col items-start justify-start relative">
      <div className="text-s font-semibold mb-4 w-full">
        <span>{programName}</span>
      </div>

      {/* ROI Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        {/* Sales/ Cost of Program */}
        <div className="border rounded-lg p-3 bg-blue-bg">
          <h3 className="text-xs font-medium text-heading-light mb-1">
            Sales/ Cost
          </h3>
          <p className="text-lg font-bold">
            {formatNumber(roiData.salesCostOfProgram, false, 1)}x
          </p>
        </div>

        {/* Incremental Sales Lift */}
        <div className="border rounded-lg p-3 bg-blue-bg">
          <h3 className="text-xs font-medium text-heading-light mb-1">
            Incremental Sales Lift
          </h3>
          <p className="text-lg font-bold">
            ${formatNumber(roiData.incrementalSalesLift)}
          </p>
        </div>

        {/* # of New Doors */}
        <div className="border rounded-lg p-3 bg-blue-bg">
          <h3 className="text-xs font-medium text-heading-light mb-1">
            New Doors
          </h3>
          <p className="text-lg font-bold">
            {formatNumber(roiData.newDoors.count)}
            <span className="text-xs font-normal text-heading-light ml-1">
              ({formatNumber(roiData.newDoors.percentage, false, 1)}%)
            </span>
          </p>
        </div>

        {/* # of New POD */}
        <div className="border rounded-lg p-3 bg-blue-bg">
          <h3 className="text-xs font-medium text-heading-light mb-1">
            New POD
          </h3>
          <p className="text-lg font-bold">
            {formatNumber(roiData.newPOD.count)}
            <span className="text-xs font-normal text-heading-light ml-1">
              ({formatNumber(roiData.newPOD.percentage, false, 1)}%)
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProgramROICard;
