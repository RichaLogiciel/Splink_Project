"use client";

import Image from "next/image";
import leftArrowIcon from "@/assets/icons/leftArrowIcon.svg";
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

interface ROIViewProps {
  programData: ProgramOverview | ProgramComplianceDetails | null;
  tiers?: (ProgramOverview | ProgramComplianceDetails)[];
  onBack: () => void;
}

const ROIView: React.FC<ROIViewProps> = ({ programData, tiers, onBack }) => {
  if (!programData) return null;

  const programName = programData.programName;

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
    <div className="w-full">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="cursor-pointer flex-shrink-0">
          <Image src={leftArrowIcon.src} alt="Back" height={16} width={8} />
        </button>
        <span className="font-semibold text-lg">
          {programName} - ROI Analysis
        </span>
      </div>

      <div>
        {/* ROI Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* % Compliance */}
          <div className="border rounded-lg p-4 bg-blue-bg">
            <h3 className="text-xs font-medium text-heading-light mb-2">
              % Compliance
            </h3>
            <p className="text-xl font-bold">
              {formatNumber(roiData.compliancePercentage, false, 1)}%
            </p>
          </div>

          {/* Sales/ Cost of Program */}
          <div className="border rounded-lg p-4 bg-blue-bg">
            <h3 className="text-xs font-medium text-heading-light mb-2">
              Sales/ Cost of Program
            </h3>
            <p className="text-xl font-bold">
              {formatNumber(roiData.salesCostOfProgram, false, 1)}x
            </p>
          </div>

          {/* Incremental Sales Lift */}
          <div className="border rounded-lg p-4 bg-blue-bg lg:col-span-2">
            <h3 className="text-xs font-medium text-heading-light mb-2">
              Incremental Sales Lift
            </h3>
            <p className="text-xl font-bold">
              ${formatNumber(roiData.incrementalSalesLift)}
            </p>
          </div>

          {/* # of New Doors */}
          <div className="border rounded-lg p-4 bg-blue-bg">
            <h3 className="text-xs font-medium text-heading-light mb-2">
              # of New Doors
            </h3>
            <p className="text-xl font-bold">
              {formatNumber(roiData.newDoors.count)}
              <span className="text-sm font-normal text-heading-light ml-2">
                ({formatNumber(roiData.newDoors.percentage, false, 1)}%)
              </span>
            </p>
          </div>

          {/* # of New POD */}
          <div className="border rounded-lg p-4 bg-blue-bg">
            <h3 className="text-xs font-medium text-heading-light mb-2">
              # of New POD
            </h3>
            <p className="text-xl font-bold">
              {formatNumber(roiData.newPOD.count)}
              <span className="text-sm font-normal text-heading-light ml-2">
                ({formatNumber(roiData.newPOD.percentage, false, 1)}%)
              </span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ROIView;
