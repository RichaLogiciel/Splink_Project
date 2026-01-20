import popupCloseIcon from "@/assets/icons/popupRedCloseIcon.svg";
import {
  getCalculationTypeLabel,
  getCriteriaLabel,
  getParticipants,
  getParticipantType,
  getReadableRebateValue,
  getRebateType
} from "@/utils/createProgramUtils";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";

interface ReviewPopupProps {
  onClose: () => void;
  onSubmit: () => void;
  formValues: any;
  loading: boolean;
}

const ReviewPopup = ({
  onClose,
  onSubmit,
  formValues,
  loading
}: ReviewPopupProps) => {
  const [activeTier, setActiveTier] = useState(0);
  const { register, setValue, watch } = useFormContext();

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric"
    });
  };

  const tier = watch("tiers");
  useEffect(() => {
    formValues.tiers?.forEach((_: unknown, index: number) => {
      setValue(
        `tiers.${index}.programDescription`,
        `${formValues.programType}, ${formatDate(
          formValues.startDate
        )} - ${formatDate(
          formValues.endDate
        )}, ${getParticipantType(formValues.participantType)}, ${getCriteriaLabel(
          formValues.selectedCriteria
        )}, ${getCalculationTypeLabel(formValues.calculationType)}`
      );
    });
  }, [
    tier,
    formValues.programType,
    formValues.startDate,
    formValues.endDate,
    formValues.participantType,
    formValues.selectedCriteria,
    formValues.calculationType
  ]);

  const calculateType = getRebateType(formValues.calculationType);
  const isProgramTypeNA = formValues.programType == "NA";

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[800px] max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-highlighted-color">
              Review Program
            </h2>
            <button
              disabled={loading}
              data-testid="review-close-button"
              onClick={onClose}
              className="text-heading-light disabled:opacity-50 disabled:pointer-events-none"
            >
              <Image src={popupCloseIcon} alt="Close" />
            </button>
          </div>

          <div
            className={`space-y-6 ${loading ? "opacity-50 pointer-events-none" : ""}`}
            data-testid="review-content"
          >
            <div className="w-[80%]">
              <h3 className="text-sm font-semibold mb-4 uppercase text-[#333333]">
                PROGRAM OVERVIEW
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-heading-light">Program Name</div>
                  <div className="text-sm text-[#333]">
                    {formValues.programName}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-heading-light">Program Type</div>
                  <div className="text-sm text-[#333]">
                    {formValues.programType == "NA"
                      ? "No Payment"
                      : formValues.programType}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-heading-light">
                    Program Duration
                  </div>
                  <div className="text-sm text-[#333]">
                    {formatDate(formValues.startDate)} -{" "}
                    {formatDate(formValues.endDate)}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-heading-light">
                    Compliance Period
                  </div>
                  <div className="text-sm text-[#333]">
                    {formValues.compliancePeriod}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-xs text-heading-light">Participants</div>
                  <div className="text-sm text-[#333]">
                    {getParticipants({
                      participantType: formValues.participantType,
                      isAllStores: formValues.isAllStores,
                      isAllSalesReps: formValues.isAllSalesRep,
                      isAllDistributors: formValues.isAllDistributor,
                      selectedStores: formValues.selected_stores,
                      selectedDistributors: formValues.selected_distributors
                    })}
                  </div>
                </div>
              </div>
            </div>
            {!isProgramTypeNA && (
              <div className="pt-2 w-[95%]">
                <h3 className="text-sm font-semibold mb-5 uppercase text-[#333]">
                  PROGRAM CRITERIA & CALCULATION DETAILS
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-heading-light">Criteria</div>
                    <div className="text-sm">
                      {getCriteriaLabel(formValues.selectedCriteria)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-xs text-heading-light">
                      Calculation Type
                    </div>
                    <div className="text-sm">
                      {getCalculationTypeLabel(formValues.calculationType)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {formValues.tiers?.length > 0 && (
              <>
                <div className="TierContainer w-[95%]">
                  {formValues.isMultipleTiers && (
                    <div className="flex border-b mb-4 gap-5">
                      {formValues.tiers.map((_: any, index: number) => (
                        <button
                          key={index}
                          onClick={() => setActiveTier(index)}
                          className={`py-2 text-sm font-medium ${
                            activeTier === index
                              ? "text-green border-b-2 border-green"
                              : "text-heading-light"
                          }`}
                        >
                          Tier {index + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-4">
                    {!isProgramTypeNA && (
                      <div className="TierItem">
                        <div className="text-xs text-heading-light mb-1">
                          {calculateType == "fixed" ? "$ Amount" : "Percentage"}
                        </div>
                        <div className="text-sm text-[#333]">
                          {getReadableRebateValue(
                            formValues.calculationType,
                            formValues.tiers[activeTier].rebateValue
                          )}
                        </div>
                      </div>
                    )}

                    {formValues.tiers[activeTier].unitType && (
                      <div className="TierItem">
                        <div className="text-xs text-heading-light mb-2">
                          Unit Type
                        </div>
                        <div className="text-sm text-[#333] capitalize">
                          {formValues.tiers[activeTier].unitType}
                        </div>
                      </div>
                    )}
                    {formValues.tiers[activeTier].minQuantity && (
                      <div className="TierItem">
                        <div className="text-xs text-heading-light mb-2">
                          Minimum Quantity
                        </div>
                        <div className="text-sm text-[#333]">
                          {formValues.tiers[activeTier].minQuantity}
                        </div>
                      </div>
                    )}
                    {(formValues.tiers[activeTier].maxQuantity ||
                      formValues.tiers[activeTier].maxQuantity == "") && (
                      <div className="TierItem">
                        <div className="text-xs text-heading-light mb-2">
                          Maximum Quantity
                        </div>
                        <div className="text-sm text-[#333]">
                          {formValues.tiers[activeTier].maxQuantity}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-6 w-[95%]">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="programOverviewContainer">
                      <div className="text-xs">Program Overview</div>
                      <textarea
                        className="mt-2 p-4 text-[#333] border border-[#ADAEB366] rounded-lg text-sm w-full resize-none"
                        rows={3}
                        value={formValues.tiers[activeTier].programOverview}
                        onChange={(e) => {
                          setValue(
                            `tiers.${activeTier}.programOverview`,
                            e.target.value
                          );
                        }}
                      ></textarea>
                    </div>
                    <div className="programDescriptionContainer">
                      <div className="text-xs">Program Description</div>
                      <textarea
                        className="mt-2 p-4 text-[#333] border border-[#ADAEB366] rounded-lg text-sm w-full resize-none"
                        rows={3}
                        {...register("programDescription", {
                          required: "Program description is required"
                        })}
                        value={formValues.tiers[activeTier].programDescription}
                        onChange={(e) => {
                          setValue(
                            `tiers.${activeTier}.programDescription`,
                            e.target.value
                          );
                        }}
                      ></textarea>
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-black rounded w-24 hover:opacity-75 disabled:opacity-50 disabled:pointer-events-none"
              >
                Cancel
              </button>
              <button
                disabled={loading}
                data-testid="review-submit-button"
                onClick={onSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-green rounded w-24 hover:opacity-75 disabled:opacity-50 disabled:pointer-events-none"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewPopup;
