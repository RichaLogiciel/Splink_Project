import {
  getCalculationTypeLabel,
  getCriteriaLabel,
  getParticipants
} from "@/utils/createProgramUtils";
import {
  PROGRAM_CRITERIA,
  PROGRAM_CRITERIA_VALUES
} from "@/views/Distributor/programConstants";
import { useFormContext } from "react-hook-form";

const formatDate = (date: Date | string) => {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
};

export const ProgramOverviewSummary = () => {
  const { getValues } = useFormContext();
  const isAllStores = getValues("isAllStores");
  const isAllSalesReps = getValues("isAllSalesRep");
  const isAllDistributors = getValues("isAllDistributor");
  const selectedStores = getValues("selected_stores");
  const selectedDistributors = getValues("selected_distributors");
  const programName = getValues("programName");
  const programType = getValues("programType");
  const startDate = getValues("startDate");
  const endDate = getValues("endDate");
  const compliancePeriod = getValues("compliancePeriod");
  const participantType = getValues("participantType");

  return (
    <div className="mt-2.5 text-xs flex items-center gap-2">
      {programName && (
        <>
          <div className="flex gap-1">
            <span className="opacity-70">Program Name:</span>
            <span>{programName}</span>
          </div>
          <span className="opacity-70">|</span>
        </>
      )}

      {programType && (
        <>
          <div className="flex gap-1">
            <span className="opacity-70">Program Type:</span>
            <span>{programType}</span>
          </div>
          <span className="opacity-70">|</span>
        </>
      )}

      {startDate && endDate && (
        <>
          <div className="flex gap-1">
            <span className="opacity-70">Duration:</span>
            <span>
              {startDate && formatDate(startDate)} -{" "}
              {endDate && formatDate(endDate)}
            </span>
          </div>
          <span className="opacity-70">|</span>
        </>
      )}

      {compliancePeriod && (
        <>
          <div className="flex gap-1">
            <span className="opacity-70">Compliance Period:</span>
            <span>{compliancePeriod}</span>
          </div>
          <span className="opacity-70">|</span>
        </>
      )}

      {participantType && (
        <div className="flex gap-1">
          <span className="opacity-70">Participant:</span>
          <span>
            {getParticipants({
              participantType,
              isAllStores,
              isAllDistributors,
              isAllSalesReps,
              selectedStores,
              selectedDistributors
            })}
          </span>
        </div>
      )}
    </div>
  );
};

export const ProgramCriteriaSummary = ({ criteria }: { criteria: string }) => {
  return (
    <div className="mt-2.5 text-xs flex items-center gap-2">
      <div className="flex gap-1">
        <span className="opacity-70">Program Criteria:</span>
        <span>
          {criteria == PROGRAM_CRITERIA_VALUES.ITEM_DISTRIBUTION
            ? PROGRAM_CRITERIA.ITEM_DISTRIBUTION
            : getCriteriaLabel(criteria)}
        </span>
      </div>
    </div>
  );
};

export const CalculationTypeSummary = ({
  calculationType
}: {
  calculationType: string;
}) => {
  return (
    <div className="mt-2.5 text-xs flex items-center gap-2">
      <div className="flex gap-1">
        <span className="opacity-70">Program Criteria:</span>
        <span>{getCalculationTypeLabel(calculationType)}</span>
      </div>
    </div>
  );
};

export default ProgramOverviewSummary;
