"use client";

import {
  PROGRAM_CRITERIA,
  PROGRAM_CRITERIA_VALUES
} from "@/views/Distributor/programConstants";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";

export const criteriaOptions = [
  {
    id: PROGRAM_CRITERIA_VALUES.BASE,
    title: PROGRAM_CRITERIA.BASE,
    description: "Automatic rebate",
    info: "<strong>e.g.</strong> Store receives a rebate on ALL purchases"
  },
  {
    id: PROGRAM_CRITERIA_VALUES.PURCHASE_VALUE,
    title: PROGRAM_CRITERIA.PURCHASE_VALUE,
    description: "Hit a certain purchase ($) amount",
    info: "<strong>e.g.</strong> Spend $500 Store to earn rebate"
  },
  {
    id: PROGRAM_CRITERIA_VALUES.PURCHASE_QUANTITY,
    title: PROGRAM_CRITERIA.PURCHASE_QUANTITY,
    description: "Hit a certain quantity thresholds of cases/boxes/eaches",
    info: "<strong>e.g.</strong> Purchase 100+ cases to earn a rebate"
  },
  {
    id: PROGRAM_CRITERIA_VALUES.CATEGORY_SKUS,
    title: PROGRAM_CRITERIA.CATEGORY_SKUS,
    description: "Carry a specific products tied to one or mutliple category",
    info: "<strong>e.g.</strong> Purchase 10 core products and 5 flex products to earn a rebate"
  },
  {
    id: PROGRAM_CRITERIA_VALUES.GROWTH,
    title: PROGRAM_CRITERIA.GROWTH,
    description: "Reach certain growth metrics",
    info: "<strong>e.g.</strong> Increase purchase amount 5% year over year to earn a rebate"
  },
  {
    id: PROGRAM_CRITERIA_VALUES.POD,
    title: PROGRAM_CRITERIA.POD,
    description: "Reach certain POD goals",
    info: "<strong>e.g.</strong> Reach 500 POD to earn a rebate"
  },
  {
    id: PROGRAM_CRITERIA_VALUES.PER_ITEM,
    title: PROGRAM_CRITERIA.PER_ITEM,
    description: "Rebate earned per SKU in a specific category",
    info: "<strong>e.g.</strong> Earn 10 points (10 pts = 0.1%) per core product purchased"
  }
  // {
  //   id: "aggregate",
  //   title: "Aggregate",
  //   description: "If certain other program criteria are met",
  //   info: "<strong>e.g.</strong> If 3 other specific program headers are met "
  // }
];

export const criteriaSpiffOptions = [
  {
    id: PROGRAM_CRITERIA_VALUES.BASE_SPIFF,
    title: PROGRAM_CRITERIA.BASE_SPIFF,
    description: "Automatic rebate for Sales Rep",
    info: "<strong>e.g.</strong> Sales Reps recieve a rebate based on events"
  },
  {
    id: PROGRAM_CRITERIA_VALUES.VOID_FILL,
    title: PROGRAM_CRITERIA.VOID_FILL,
    description: "Select Store for Void Fill",
    info: "<strong>e.g.</strong> Sales Reps receives a rebate on Void Fill"
  }
];

export const criteriaNonPaymentOptions = [
  {
    id: PROGRAM_CRITERIA_VALUES.ITEM_DISTRIBUTION,
    title: PROGRAM_CRITERIA.ITEM_DISTRIBUTION,
    description: "Get top selling items placed into your stores",
    info: "<strong>e.g.</strong> Place Items A, B, C into 50 of your stores"
  }
];

const CriteriaCard = ({
  id,
  title,
  description,
  info,
  isSelected,
  onSelect,
  error
}: {
  id: string;
  title: string;
  description: string;
  info?: string;
  isSelected: boolean;
  onSelect: (id: string) => void;
  error?: boolean;
}) => (
  <div
    className={`p-4 pt-6 border rounded-lg flex flex-col items-center h-full justify-center ${
      error ? "border-danger" : isSelected ? "border-green" : "border-gray-200"
    }`}
  >
    <div className="content flex flex-col items-center text-center space-y-4">
      <h3 className="font-semibold text-sm text-green">{title}</h3>
      <p className="text-xs min-h-[40px]">{description}</p>
    </div>
    {info && (
      <div
        className="text-xs bg-green bg-opacity-[8%] rounded p-2 mt-2 text-center"
        dangerouslySetInnerHTML={{ __html: info }}
      />
    )}
    <button
      type="button"
      onClick={() => onSelect(id)}
      className={`px-4 py-1 rounded text-sm font-semibold border inline-block mt-4 ${
        error
          ? "border-danger text-danger"
          : isSelected
            ? "border-green bg-green text-white"
            : "border-green text-green"
      }`}
    >
      {isSelected ? "Selected" : "Select"}
    </button>
  </div>
);

const ProgramCriteria = () => {
  const {
    setValue,
    watch,
    formState: { errors },
    register,
    clearErrors,
    unregister
  } = useFormContext();
  const selectedCriteria = watch("selectedCriteria");
  const programType = watch("programType");

  useEffect(() => {
    register("selectedCriteria", {
      required: "Please select a criteria"
    });
  }, [register]);

  const handleSelect = (criteriaId: string) => {
    const newSelection = selectedCriteria === criteriaId ? "" : criteriaId;
    setValue("selectedCriteria", newSelection, {
      shouldValidate: true,
      shouldDirty: true
    });

    if (programType == "NA") return;

    setValue("isMultipleTiers", false);
    unregister("tiers", { keepDefaultValue: false });
    setValue("tiers", []);
    clearErrors("tiers");
  };

  return (
    <div className="space-y-4 w-[95%]">
      <div className="grid grid-cols-4 gap-4">
        {programType === "SPIFF"
          ? criteriaSpiffOptions.map((criteria) => (
              <CriteriaCard
                key={criteria.id}
                {...criteria}
                isSelected={selectedCriteria === criteria.id}
                onSelect={handleSelect}
                error={!!errors.selectedCriteria}
              />
            ))
          : programType == "NA"
            ? criteriaNonPaymentOptions.map((criteria) => (
                <CriteriaCard
                  key={criteria.id}
                  {...criteria}
                  isSelected={selectedCriteria === criteria.id}
                  onSelect={handleSelect}
                  error={!!errors.selectedCriteria}
                />
              ))
            : criteriaOptions.map((criteria) => (
                <CriteriaCard
                  key={criteria.id}
                  {...criteria}
                  isSelected={selectedCriteria === criteria.id}
                  onSelect={handleSelect}
                  error={!!errors.selectedCriteria}
                />
              ))}
      </div>
    </div>
  );
};

export default ProgramCriteria;
