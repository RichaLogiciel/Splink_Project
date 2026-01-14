"use client";

import {
  PROGRAM_CALCULATION_TYPE,
  PROGRAM_CALCULATION_TYPE_VALUES,
  PROGRAM_CRITERIA_VALUES
} from "@/views/Distributor/programConstants";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";

const CalculationCard = ({
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
    className={`p-4 pt-6 border rounded-lg ${
      error ? "border-red-500" : isSelected ? "border-green" : "border-gray-200"
    }`}
  >
    <div className="flex flex-col items-center h-full justify-between w-full">
      <div className="content flex flex-col items-center text-center space-y-4 w-full">
        <h3 className="font-semibold text-sm text-green">{title}</h3>
        <p className="text-xs text-gray-600 min-h-[40px]">{description}</p>
      </div>
      {info && (
        <div
          className="text-xs bg-green bg-opacity-[8%] rounded p-2 w-full mt-2 text-center"
          dangerouslySetInnerHTML={{ __html: info }}
        />
      )}
      <button
        type="button"
        onClick={() => onSelect(id)}
        className={`px-4 py-1 rounded text-sm font-semibold border border-green inline-block mt-4 ${
          isSelected ? "bg-green text-white" : "text-green"
        }`}
      >
        {isSelected ? "Selected" : "Select"}
      </button>
    </div>
  </div>
);

const CalculationType = () => {
  const {
    setValue,
    getValues,
    formState: { errors },
    watch,
    register
  } = useFormContext();

  const calculationType = watch("calculationType");
  const programType = watch("programType");
  const isVoidFill =
    watch("selectedCriteria") === PROGRAM_CRITERIA_VALUES.VOID_FILL;

  useEffect(() => {
    register("calculationType", {
      required: "Please select a calculation type"
    });
  }, [register]);

  const calculationTypes = [
    {
      id: PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT,
      title: PROGRAM_CALCULATION_TYPE.FIXED_AMOUNT,
      description: "Fixed $ amount",
      info: "<strong>e.g.</strong> $100 back"
    },
    {
      id: PROGRAM_CALCULATION_TYPE_VALUES.FIXED_PER_ITEM,
      title: PROGRAM_CALCULATION_TYPE.FIXED_PER_ITEM,
      description: "Fixed $ amount based on # of items",
      info: "<strong>e.g.</strong> $1.00 back per case"
    },
    {
      id: PROGRAM_CALCULATION_TYPE_VALUES.LANDED_VALUE,
      title: PROGRAM_CALCULATION_TYPE.LANDED_VALUE,
      description: "% of total spend value in $",
      info: "<strong>e.g.</strong> 4% back on total purchases"
    },
    {
      id: PROGRAM_CALCULATION_TYPE_VALUES.LIST_VALUE,
      title: PROGRAM_CALCULATION_TYPE.LIST_VALUE,
      description: "% of total spend value in $ based on list price",
      info: "<strong>e.g.</strong> 4% back based on list price"
    }
  ];

  const calculationSpiffTypes = [
    {
      id: PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_ITEM_PER_STORE,
      title: PROGRAM_CALCULATION_TYPE.FIXED_AMOUNT_PER_ITEM_PER_STORE,
      description:
        "Fixed $ amount based on number of unique items sold per store",
      info: "<strong>e.g.</strong> $2 per box of [brand] in a new store"
    },
    {
      id: PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_QUANTITY,
      title: PROGRAM_CALCULATION_TYPE.FIXED_AMOUNT_PER_QUANTITY,
      description: "Fixed $ amount based on number of items sold",
      info: "<strong>e.g.</strong> $2 per box of [brand]"
    },
    {
      id: PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_CATEGORY_ITEM_PER_STORE,
      title: PROGRAM_CALCULATION_TYPE.FIXED_AMOUNT_PER_CATEGORY_ITEM_PER_STORE,
      description: "Fixed $ amount Per category Item Per Store",
      info: "<strong>e.g.</strong> $2 per box of any core product in a new store"
    },
    {
      id: PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_STORE_COMPLIANCE,
      title: PROGRAM_CALCULATION_TYPE.FIXED_AMOUNT_PER_STORE_COMPLIANCE,
      description: "Fixed $ amount based on number of stores in compliance",
      info: "<strong>e.g.</strong> $2 per store customer that reaches Tier 1 compliance"
    },
    {
      id: PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_ITEM_PER_STORE_VOID_FILL,
      title: PROGRAM_CALCULATION_TYPE.FIXED_AMOUNT_PER_ITEM_PER_STORE_VOID_FILL,
      description:
        "Fixed $ amount based on number of items sold in a new store",
      info: "<strong>e.g.</strong> $2 per box of [brand] in a new store"
    }
  ];

  const handleSelect = (criteriaId: string) => {
    const newSelection = calculationType === criteriaId ? "" : criteriaId;
    setValue("calculationType", newSelection, {
      shouldValidate: true,
      shouldDirty: true
    });

    // For Void Fill, set the calculation type to the default value
    if (
      newSelection ===
      PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_ITEM_PER_STORE_VOID_FILL
    ) {
      setValue("selectedCriteria", PROGRAM_CRITERIA_VALUES.VOID_FILL, {
        shouldValidate: true,
        shouldDirty: true
      });
    }

    // Reset tier values if calculation type changes
    if (newSelection && newSelection !== calculationType) {
      setValue(`tiers`, []);
      setValue(`isMultipleTiers`, false);
    }
  };

  return (
    <div className="grid grid-cols-4 gap-4">
      {programType === "SPIFF"
        ? calculationSpiffTypes.map((type) => (
            <CalculationCard
              key={type.id}
              {...type}
              isSelected={calculationType === type.id}
              onSelect={handleSelect}
              error={!!errors.calculationType}
            />
          ))
        : calculationTypes.map((type) => (
            <CalculationCard
              key={type.id}
              {...type}
              isSelected={calculationType === type.id}
              onSelect={handleSelect}
              error={!!errors.calculationType}
            />
          ))}
    </div>
  );
};

export default CalculationType;
