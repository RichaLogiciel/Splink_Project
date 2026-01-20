"use client";

import DatePickerField from "@/components/Form/DatePickerField";
import MultiSelect from "@/components/Form/MultiSelect";
import SelectBox from "@/components/Form/SelectBox";
import TextInput from "@/components/Form/TextInput";
import { calculateDateDifference } from "@/utils/dateHelper";
import { getUserClient } from "@/utils/getUserClient";
import {
  isDistributorAdmin,
  isManufacturerAdmin
} from "@/utils/rolesConditions";
import {
  CREATE_PROGRAM_TYPES,
  ENTITY_TYPES,
  PROGRAM_CALCULATION_TYPE_VALUES,
  PROGRAM_CRITERIA_VALUES
} from "@/views/Distributor/programConstants";
import { useSearchParams } from "next/navigation";
import { useFormContext } from "react-hook-form";

const ProgramOverview = ({
  setShowStoreSelectionModal,
  setShowSalesRepSelectionModal,
  distributors,
  manufacturers = []
}: {
  setShowStoreSelectionModal: (show: boolean) => void;
  setShowSalesRepSelectionModal: (show: boolean) => void;
  distributors: { label: string; value: string }[];
  manufacturers?: { label: string; value: string }[];
}) => {
  const {
    control,
    trigger,
    unregister,
    watch,
    setValue,
    clearErrors,
    setError,
    formState: { errors },
    register
  } = useFormContext();
  const programType = watch("programType");
  const isAllDistributor = watch("isAllDistributor");
  const isAllSalesRep = watch("isAllSalesRep");
  const isAllStores = watch("isAllStores");
  const startDate = watch("startDate");
  const endDate = watch("endDate");
  const participantType = watch("participantType");
  const selectedStores = watch("selected_stores") || [];
  const selectedSalesReps = watch("selected_sales_reps") || [];
  const manufacturerId = watch("manufacturer") || "";

  const user = getUserClient();
  const isManufacturer = isManufacturerAdmin(user?.role || "");
  const isDistributor = isDistributorAdmin(user?.role || "");

  const handleDistributorChange = (checked: boolean) => {
    setValue("isAllDistributor", checked);

    if (checked) {
      unregister("selected_distributors");
    } else {
      register("selected_distributors", {
        required: "Please select at least one distributor"
      });
      trigger("selected_distributors");
    }
  };

  const handleSalesRepChange = (checked: boolean) => {
    setValue("isAllSalesRep", checked);

    if (checked) {
      unregister("selected_distributors");
    } else {
      register("selected_distributors", {
        required: "Please select at least one distributor"
      });
      trigger("selected_distributors");
    }
  };

  const handleStoresChange = (checked: boolean) => {
    setValue("isAllStores", checked);

    if (checked) {
      unregister("selected_stores");
    } else {
      register("selected_stores", {
        required: "Please select at least one store"
      });
    }
  };

  const handleParticipantTypeChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    setValue("participantType", e.target.value as any, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true
    });

    // Clear form fields based on participant type selection
    if (e.target.value === ENTITY_TYPES.STORE) {
      // For Store selection
      unregister("selected_distributors");
      clearErrors("selected_distributors");
    } else if (e.target.value === ENTITY_TYPES.DISTRIBUTOR) {
      // For Distributor selection
      unregister("selected_stores");
      clearErrors("selected_stores");
    } else if (e.target.value === ENTITY_TYPES.SALES_REP) {
      if (!isManufacturer) {
        setValue("selected_distributors", [user?.associatedUserId]);
      }
      // For Sales Rep selection
      unregister("selected_stores");
      clearErrors("selected_stores");
    } else {
      // For empty selection, clear all
      unregister(["selected_stores", "selected_distributors"]);
      clearErrors(["selected_stores", "selected_distributors"]);
    }
  };

  const handleProgramTypeChangeForSPIFF = (ProgramType: string) => {
    if (!isManufacturer) {
      setValue("selected_distributors", [user?.associatedUserId]);
    }
    // For Sales Rep selection
    unregister("selected_stores");
    clearErrors("selected_stores");
  };

  let hideCompliancePeriod = false;

  // Only calculate if both dates are valid
  if (startDate && endDate) {
    const daysDifference = calculateDateDifference(startDate, endDate);
    hideCompliancePeriod = daysDifference < 364;
  } else {
    hideCompliancePeriod = true;
  }

  // Get Reference ID from URL
  const searchParams = useSearchParams();
  const referenceId = searchParams.get("referenceId");

  return (
    <div className="space-y-4 w-11/12">
      <div className={`grid grid-cols-${isDistributor ? 3 : 3} gap-4`}>
        <TextInput
          label="Program Name"
          name="programName"
          control={control}
          trigger={trigger}
          rules={{ required: "Program name is required" }}
          placeholder="Enter program name"
          errors={errors}
        />

        <div className="ProgramTypeField">
          <label
            className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide"
            htmlFor="programType"
          >
            Program Type
            <span className="text-danger ml-1">*</span>
          </label>

          <SelectBox
            {...control.register("programType", {
              required: "Program Type is required"
            })}
            id="programType"
            value={watch("programType")}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setValue("programType", e.target.value as any, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true
              });
              setValue("calculationType", "");
              setValue("selectedCriteria", "");
              setValue("participantType", "");

              if (e.target.value == "SPIFF" || e.target.value == "NA") {
                handleProgramTypeChangeForSPIFF(e.target.value);
                setValue("participantType", ENTITY_TYPES.SALES_REP);

                switch (e.target.value) {
                  case "SPIFF":
                    setValue(
                      "selectedCriteria",
                      PROGRAM_CRITERIA_VALUES.BASE_SPIFF
                    );
                    break;
                  default:
                    setValue(
                      "calculationType",
                      PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT
                    );
                    setValue(
                      "selectedCriteria",
                      PROGRAM_CRITERIA_VALUES.ITEM_DISTRIBUTION
                    );
                    break;
                }
              }
            }}
            options={
              isManufacturer
                ? CREATE_PROGRAM_TYPES.filter((option) => option.value !== "NA")
                : CREATE_PROGRAM_TYPES
            }
            className={`text-xs pr-[0] py-2 w-full bg-white`}
          />
          {errors.programType?.message && (
            <span className="text-red-500 text-xs mt-1">
              {errors.programType?.message as any}
            </span>
          )}
        </div>

        <div className="flex gap-4">
          {isDistributor && (
            <div className="ManufacturerField flex-1">
              <label
                className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide"
                htmlFor="manufacturer"
              >
                Manufacturer
                <span className="text-danger ml-1">*</span>
              </label>

              <MultiSelect
                name="manufacturers"
                containerClass=" "
                control={control}
                options={
                  manufacturers.length > 0
                    ? [
                        { label: "Select Manufacturer", value: "placeholder" },
                        ...(manufacturers
                          ?.sort((a: any, b: any) =>
                            a.label.localeCompare(b.label)
                          )
                          .filter((m: any) => m.value && m.value !== "") || [])
                      ]
                    : [{ label: "Select Manufacturer", value: "placeholder" }]
                }
                customOnChange
                onChange={(val: any) => {
                  const value = val?.value || "";
                  if (value === "placeholder" || value === "" || value === 0) {
                    setError("manufacturer", {
                      message: "Manufacturer is required"
                    });
                  } else {
                    clearErrors("manufacturer");
                  }
                  setValue(
                    "manufacturer",
                    value === "placeholder" ? "" : value,
                    {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true
                    }
                  );

                  setValue("tiers.0.product", "");
                }}
                multiSelect={false}
                placeholder="Select Manufacturer"
                className=""
                error={errors.manufacturer as any}
              />
            </div>
          )}

          {isDistributor && (
            <div className="internalInitiative w-28">
              <label
                className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide"
                htmlFor="internalInitiative"
              >
                Internal Initiative
                <span className="text-danger ml-1">*</span>
              </label>
              <label className="flex items-center cursor-pointer select-none mt-3">
                {/* <span
                  className={`text-xs sm:text-sm font-medium text-black-lighter mr-3 ${watch("internalInitiative") === "YES" ? "opacity-50" : "text-green"}`}
                >
                  No
                </span> */}
                <input
                  type="checkbox"
                  id="internalInitiative"
                  checked={watch("internalInitiative") === "YES"}
                  onChange={(e) => {
                    setValue(
                      "internalInitiative",
                      e.target.checked ? "YES" : "NO",
                      {
                        shouldValidate: true,
                        shouldDirty: true,
                        shouldTouch: true
                      }
                    );
                  }}
                  className="sr-only"
                />
                <span
                  className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ${watch("internalInitiative") === "YES" ? "bg-green" : "bg-gray-300"}`}
                >
                  <span
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${watch("internalInitiative") === "YES" ? "translate-x-4" : ""}`}
                  ></span>
                </span>
                {/* <span
                  className={`text-xs sm:text-sm font-medium text-black-lighter ml-3 ${watch("internalInitiative") === "NO" ? "opacity-50" : "text-green"}`}
                >
                  Yes
                </span> */}
              </label>
              {errors.internalInitiative?.message && (
                <span className="text-red-500 text-xs mt-1 ml-2">
                  {errors.internalInitiative?.message as any}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <DatePickerField
          required
          control={control}
          name="startDate"
          placeholder="MM-DD-YYYY"
          label="Program Start Date"
          // minDate={new Date()}
          onChange={(date) => {
            if (date) {
              const nextDay = new Date(date);
              nextDay.setDate(nextDay.getDate() + 1);
              setValue("endDate", nextDay);
            }
          }}
          showMonthDropdown
          showYearDropdown
        />

        <DatePickerField
          disabled={!startDate}
          required
          name="endDate"
          control={control}
          label="Program End Date"
          placeholder="MM-DD-YYYY"
          minDate={startDate}
          showMonthDropdown
          showYearDropdown
        />

        <div className="compliancePeriodField">
          <label
            className={`mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide ${
              hideCompliancePeriod ? "opacity-50" : "cursor-pointer"
            }`}
            htmlFor="compliancePeriod"
          >
            Compliance Period
            <span className="text-danger ml-1">*</span>
          </label>

          <SelectBox
            {...control.register("compliancePeriod", {
              required: "Compliance Period is required"
            })}
            disabled={hideCompliancePeriod}
            id="compliancePeriod"
            value={watch("compliancePeriod")}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setValue("compliancePeriod", e.target.value as any, {
                shouldValidate: true,
                shouldDirty: true,
                shouldTouch: true
              });
            }}
            options={[
              { label: "N/A", value: "NA" },
              { label: "Annual", value: "ANNUAL" },
              { label: "Semi-Annual", value: "SEMI-ANNUAL" },
              { label: "Quarterly", value: "QUARTERLY" }
            ]}
            className={`text-xs pr-[0] py-2 w-full bg-white ${
              hideCompliancePeriod
                ? "cursor-not-allowed opacity-50"
                : "cursor-pointer"
            }`}
          />
          {errors.compliancePeriod?.message && !hideCompliancePeriod && (
            <span className="text-red-500 text-xs mt-1">
              {errors.compliancePeriod?.message as any}
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {programType != "SPIFF" && programType != "NA" && (
          <div className="w-full">
            <label
              className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide"
              htmlFor="participantType"
            >
              Participant Type
              <span className="text-danger ml-1">*</span>
            </label>

            <SelectBox
              {...control.register("participantType", {
                required: "Participant type is required"
              })}
              id="participantType"
              value={participantType}
              onChange={handleParticipantTypeChange}
              options={[
                ...(programType != "SPIFF"
                  ? [{ label: "Select Participant Type", value: "" }]
                  : []),
                ...(isManufacturer && programType != "SPIFF"
                  ? [
                      {
                        label: "Distributor",
                        value: ENTITY_TYPES.DISTRIBUTOR
                      }
                    ]
                  : []),
                ...(programType == "SPIFF" || programType == "NA"
                  ? [{ label: "Sales Rep", value: ENTITY_TYPES.SALES_REP }]
                  : []),
                ...(programType == "REBATE"
                  ? [{ label: "Store", value: ENTITY_TYPES.STORE }]
                  : [])
              ]}
              className={`text-xs pr-[0] py-2 w-full bg-white`}
            />
            {errors.participantType?.message && (
              <span className="text-red-500 text-xs mt-1">
                {errors.participantType?.message as any}
              </span>
            )}
          </div>
        )}

        {participantType != "" && (
          <div className="w-full col-span-2 flex gap-4">
            {(participantType == ENTITY_TYPES.STORE ||
              participantType == ENTITY_TYPES.DISTRIBUTOR) && (
              <div className="flex gap-4 items-center mt-5 h-9">
                <div className="flex gap-2 cursor-pointer items-center h-auto">
                  <label className="cursor-pointer">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500 mr-2"
                      checked={
                        participantType === ENTITY_TYPES.STORE
                          ? isAllStores
                          : isAllDistributor
                      }
                      onChange={(e) =>
                        participantType === ENTITY_TYPES.STORE
                          ? handleStoresChange(e.target.checked)
                          : handleDistributorChange(e.target.checked)
                      }
                    />
                    <span className="text-sm">
                      All{" "}
                      {participantType === ENTITY_TYPES.STORE
                        ? "Stores"
                        : "Distributors"}
                    </span>
                  </label>
                </div>
              </div>
            )}

            {participantType === ENTITY_TYPES.DISTRIBUTOR && (
              <div className="w-auto min-w-52">
                <label
                  htmlFor="selected_distributors"
                  className="mb-1.5 text-xs text-black-lighter flex justify-between font-medium tracking-wide"
                >
                  <div className="flex">Select Distributors</div>
                </label>
                <MultiSelect
                  {...control.register("selected_distributors", {
                    required: "Please select at least one distributor"
                  })}
                  isDisabled={isAllDistributor}
                  control={control}
                  options={distributors}
                  error={errors.selected_distributors as any}
                  placeholder="Select Distributors"
                  rules={{
                    validate: (value: any) =>
                      value && value.length > 0
                        ? true
                        : "Please select at least one distributor"
                  }}
                />
              </div>
            )}

            {participantType === ENTITY_TYPES.SALES_REP && (
              <>
                {/* <div className="flex gap-4 items-center mt-5 h-9">
                  <div className="flex gap-2 cursor-pointer items-center h-auto">
                    <label className="cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500 mr-2"
                        checked={isAllSalesRep}
                        onChange={(e) => handleSalesRepChange(e.target.checked)}
                      />
                      <span className="text-sm">All Sales Reps</span>
                    </label>
                  </div>
                </div> */}

                <div className="h-auto mt-3">
                  <button
                    type="button"
                    disabled={isDistributor && !manufacturerId}
                    onClick={() => setShowSalesRepSelectionModal(true)}
                    className="px-3 py-1.5 bg-green text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedSalesReps.length > 0
                      ? `${selectedSalesReps.length} Sales Reps selected`
                      : "Select Sales Reps"}
                  </button>
                </div>
              </>
            )}

            <div className="h-auto mt-6">
              {participantType === ENTITY_TYPES.STORE && (
                <button
                  type="button"
                  disabled={isAllStores || (isDistributor && !manufacturerId)}
                  onClick={() => setShowStoreSelectionModal(true)}
                  className="px-3 py-1.5 bg-green text-white text-sm rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {selectedStores.length > 0
                    ? `${selectedStores.length} stores selected`
                    : "Select Stores"}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgramOverview;
