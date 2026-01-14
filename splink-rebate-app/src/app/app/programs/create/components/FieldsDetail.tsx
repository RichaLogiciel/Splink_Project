import blueInfoIcon from "@/assets/icons/blueInfo.svg";
import redCircleCrossIcon from "@/assets/icons/redCircleCrossIcon.svg";
import redRemoveIcon from "@/assets/icons/redRemoveIcon.svg";
import SelectBox from "@/components/Form/SelectBox";
import Image from "next/image";
import { forwardRef, useEffect, useRef, useState } from "react";
import { useFieldArray, useFormContext } from "react-hook-form";

import plusGreenIcon from "@/assets/icons/plusGreenIcon.svg";
import DatePickerField from "@/components/Form/DatePickerField";
import MultiSelect from "@/components/Form/MultiSelect";
import CustomPopOver from "@/components/Popovers/CustomPopOver";
import {
  fetchManufacturerProducts,
  fetchProductTags,
  getReadableRebateValue,
  getRebateType
} from "@/utils/createProgramUtils";
import { getUserClient } from "@/utils/getUserClient";
import {
  getManufacturerId,
  isDistributorAdmin,
  isManufacturer
} from "@/utils/rolesConditions";
import {
  PROGRAM_CALCULATION_TYPE_VALUES,
  PROGRAM_CRITERIA_VALUES
} from "@/views/Distributor/programConstants";

interface TierRowProps {
  tierNumber: number;
  selectedCriteria: string;
}

interface TagField {
  id: string;
  tag: { label: string; value: string };
  qty: number;
}

// Add type for form errors
type FieldErrors = {
  [key: string]: any;
  [key: number]: any;
};

const unitTypeOptions = [
  { value: "", label: "Select unit type" },
  { value: "unit", label: "Unit" },
  { value: "box", label: "Box" },
  { value: "case", label: "Case" }
];

export const enableMultipleTiers = (
  selectedCriteria: string,
  calculationType?: string
) => {
  if (!selectedCriteria) return false;

  switch (selectedCriteria) {
    case PROGRAM_CRITERIA_VALUES.BASE:
      return false;
    case PROGRAM_CRITERIA_VALUES.BASE_SPIFF:
      if (
        calculationType ===
        PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_STORE_COMPLIANCE
      ) {
        return true;
      }
      return false;
    case PROGRAM_CRITERIA_VALUES.VOID_FILL:
      return false;

    default:
      return true;
  }
};

const RebateTierFields = forwardRef(
  (
    { tierNumber, forSpiff }: { tierNumber: number; forSpiff?: boolean },
    ref
  ) => {
    const {
      register,
      trigger,
      setValue,
      watch,
      formState: { errors }
    } = useFormContext();

    const calculateType = getRebateType(watch("calculationType"));

    const programType = watch("programType");

    useEffect(() => {
      if (programType == "NA") {
        setValue("rebateValue", 0);
      }
    }, [programType]);

    if (programType == "NA") {
      return null;
    }

    return (
      <div className="flex-1">
        <label
          className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide"
          htmlFor="rebateValue"
        >
          {forSpiff ? "SPIFF Value" : "Rebate Value"}
          <span className="text-danger ml-1">*</span>
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-2" }}
            message="Showing Rebate Value Based on Calculation Type Selection"
          />
        </label>
        <div className="relative ">
          <div className="absolute inset-y-0 left-0 px-2.5 w-7 flex items-center justify-center pointer-events-none bg-common-bg rounded-l overflow-hidden">
            <span className="text-gray-500 sm:text-sm">
              {calculateType == "fixed" ? "$" : "%"}
            </span>
          </div>
          <input
            type="number"
            value={watch(`tiers.${tierNumber}.rebateValue`)}
            {...register(`tiers.${tierNumber}.rebateValue`, {
              required: `Rebate value is required`,
              min: {
                value: 1,
                message: `Rebate value must be greater than 0`
              }
            })}
            id="rebateValue"
            className={`block font-normal w-full px-3 py-2 pl-9 text-highlighted-color rounded border focus:ring-2 focus:border-transparent outline-none placeholder:text-heading-very-light text-xs ${
              (errors as FieldErrors)?.[`tiers.${tierNumber}.rebateValue`]
                ? "border-transparent ring-2 ring-error/50 focus:ring-error/50 bg-error/5"
                : ""
            }`}
            onBlur={() => {
              trigger(`tiers.${tierNumber}.rebateValue`);
            }}
            placeholder="Rebate Value"
          />
        </div>
        {(errors as FieldErrors)?.tiers?.[tierNumber]?.rebateValue && (
          <p className="text-danger text-xs mt-1">
            {(errors as FieldErrors)?.tiers?.[tierNumber]?.rebateValue?.message}
          </p>
        )}
      </div>
    );
  }
);
RebateTierFields.displayName = "RebateTierFields";

const GrowthTierRow = ({ tierNumber }: { tierNumber: number }) => {
  const {
    trigger,
    register,
    setValue,
    watch,
    formState: { errors }
  } = useFormContext();

  const targetGrowth = watch(`tiers.${tierNumber}.targetGrowth`);
  useEffect(() => {
    setValue(
      `tiers.${tierNumber}.programOverview`,
      `${targetGrowth}% year over year growth`
    );
  }, [targetGrowth]);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="flex-1">
        <label
          className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide"
          htmlFor="targetGrowth"
        >
          Target Growth
          <span className="text-danger ml-1">*</span>
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Target Growth is showing based on Growth Criteria Selection"
          />
        </label>
        <input
          value={watch(`tiers.${tierNumber}.targetGrowth`)}
          type="number"
          data-testid="targetGrowth"
          id="targetGrowth"
          placeholder="Target Growth"
          {...register(`tiers.${tierNumber}.targetGrowth`, {
            required: "Growth is required",
            pattern: {
              value: /^[0-9]*$/,
              message: "Please enter only numbers"
            },
            min: {
              value: 1,
              message: "Growth must be greater than 0"
            }
          })}
          className={`block font-normal w-full px-3 py-2 text-highlighted-color rounded border focus:ring-2 focus:border-transparent outline-none placeholder:text-heading-very-light text-xs ${
            errors[`tiers.${tierNumber}.targetGrowth`]
              ? "border-transparent ring-2 ring-error/50 focus:ring-error/50 bg-error/5"
              : ""
          }`}
          onBlur={() => {
            trigger(`tiers.${tierNumber}.targetGrowth`);
          }}
        />
        {(errors as FieldErrors)?.tiers?.[tierNumber]?.targetGrowth && (
          <p className="text-danger text-xs mt-1">
            {
              (errors as FieldErrors)?.tiers?.[tierNumber]?.targetGrowth
                ?.message
            }
          </p>
        )}
      </div>
      <RebateTierFields tierNumber={tierNumber} />
    </div>
  );
};

const PODTierRow = ({ tierNumber }: { tierNumber: number }) => {
  const {
    register,
    trigger,
    watch,
    setValue,
    control,
    formState: { errors }
  } = useFormContext();
  const didInit = useRef(false);

  const {
    fields: tagFields,
    append,
    remove
  } = useFieldArray({
    control,
    name: `tiers.${tierNumber}.product_tag_rows`,
    keyName: "id"
  });
  const rebateValue = watch(`tiers.${tierNumber}.rebateValue`);
  const podTarget = watch(`tiers.${tierNumber}.podTarget`);
  const tagRows = watch(`tiers.${tierNumber}.product_tag_rows`);

  useEffect(() => {
    if (!didInit.current && tagFields.length === 0) {
      append({ tag: { label: "", value: "" }, podTarget: 0 });
      didInit.current = true;
    }

    const tagNames = tagRows
      ?.map((tag: any) => `${podTarget} ${tag.tag?.label}`)
      ?.join(", ");

    setValue(
      `tiers.${tierNumber}.programOverview`,
      `Deliver "${tagNames}" Distribution Point Goal`
    );
  }, [JSON.stringify(tagRows), podTarget, rebateValue]);

  const user = getUserClient();
  const isManufacturerAccount = isManufacturer(user?.role || "");
  const manufacturerId = isManufacturerAccount
    ? getManufacturerId(user?.role || "", user)
    : watch("manufacturer");
  // Fetch productTagOptions from API
  const [productTagOptions, setProductTagOptions] = useState<
    { label: string; value: string }[]
  >([]);
  useEffect(() => {
    fetchProductTags(manufacturerId).then(setProductTagOptions);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="flex flex-col gap-3 col-span-3">
        <label className="text-sm font-medium flex items-center">
          Product Tags & Quantities
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Product Tags & Quantities is showing based on POD Criteria Selection"
          />
        </label>
        <div className="tags grid gap-3">
          {tagFields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-start">
              <div className="flex-1">
                <label className="text-xs mb-1 font-medium block">
                  Product Tag
                  <span className="text-danger ml-1">*</span>
                </label>
                <MultiSelect
                  containerClass=""
                  multiSelect={false}
                  defaultValue={watch(
                    `tiers.${tierNumber}.product_tag_rows.${index}.tag`
                  )}
                  rules={{
                    required: "Please select a tag",
                    validate: (val: any) =>
                      val && val.value ? true : "Please select a tag"
                  }}
                  error={
                    (errors as FieldErrors)?.tiers?.[tierNumber]
                      ?.product_tag_rows?.[index]?.tag
                  }
                  name={`tiers.${tierNumber}.product_tag_rows.${index}.tag`}
                  options={productTagOptions}
                  control={control}
                />
              </div>

              <div className="flex-1">
                <label className="text-xs mb-1 font-medium block">
                  POD Goal
                  <span className="text-danger ml-1">*</span>
                </label>
                <input
                  type="number"
                  placeholder="POD Goal"
                  value={watch(`tiers.${tierNumber}.podTarget`)}
                  {...register(`tiers.${tierNumber}.podTarget`, {
                    required: "POD Goal is required",
                    min: {
                      value: 1,
                      message: "Must be greater than 0"
                    }
                  })}
                  onBlur={() => {
                    trigger(`tiers.${tierNumber}.podTarget`);
                  }}
                  className={`block font-normal w-full px-3 py-2 h-10 text-highlighted-color rounded border focus:ring-2 focus:border-transparent outline-none placeholder:text-heading-very-light text-xs ${
                    (errors as FieldErrors)?.tiers?.[tierNumber]?.podTarget
                      ? "border-transparent ring-2 ring-error/50 focus:ring-error/50 bg-error/5"
                      : ""
                  }`}
                />
                {(errors as FieldErrors)?.tiers?.[tierNumber]?.podTarget && (
                  <p className="text-danger text-xs mt-1">
                    {
                      (errors as FieldErrors)?.tiers?.[tierNumber]?.podTarget
                        ?.message
                    }
                  </p>
                )}
              </div>

              {tagFields.length < 1 && (
                <Image
                  src={plusGreenIcon}
                  className="cursor-pointer mt-8"
                  width={14}
                  onClick={() =>
                    append({ tag: { label: "", value: "" }, qty: "" })
                  }
                  height={14}
                  alt="Close Icon"
                />
              )}

              {tagFields.length > 1 && (
                <Image
                  className="cursor-pointer mt-8"
                  onClick={() => remove(index)}
                  src={redCircleCrossIcon}
                  width={16}
                  height={16}
                  alt="Close Icon"
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <RebateTierFields tierNumber={tierNumber} />
    </div>
  );
};

const PurchaseQuantityTierRow = ({ tierNumber }: { tierNumber: number }) => {
  const {
    register,
    watch,
    trigger,
    setValue,
    formState: { errors }
  } = useFormContext();

  const minQuantity = watch(`tiers.${tierNumber}.minQuantity`);
  const maxQuantity = watch(`tiers.${tierNumber}.maxQuantity`);
  const rebateValue = watch(`tiers.${tierNumber}.rebateValue`);
  const unitType = watch(`tiers.${tierNumber}.unitType`);
  const compliancePeriod = watch("compliancePeriod");

  useEffect(() => {
    if (minQuantity && rebateValue && unitType) {
      setValue(
        `tiers.${tierNumber}.programOverview`,
        `${minQuantity}${(maxQuantity ? " - " + maxQuantity : "+")?.trim()} ${compliancePeriod} ${unitType} purchases`
      );
    }
  }, [minQuantity, maxQuantity, rebateValue, unitType, compliancePeriod]);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="col-span-3">
        <label className="text-sm font-medium flex items-center">
          Purchase Quantity
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Quantity Fields are showing based on Purchase Quantity Criteria Selection"
          />
        </label>
      </div>
      <div className="flex-1">
        <label className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide">
          Unit Type
          <span className="text-danger ml-1">*</span>
        </label>
        <SelectBox
          defaultValue=""
          {...register(`tiers.${tierNumber}.unitType`, {
            required: "Please select a unit type"
          })}
          options={unitTypeOptions}
          id="unitType"
          data-testid="unitType"
          className={`text-xs pr-[0] py-2 w-full bg-white`}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setValue(`tiers.${tierNumber}.unitType`, e.target.value);
            trigger(`tiers.${tierNumber}.unitType`);
          }}
          errors={errors as FieldErrors}
        />
        {(errors as FieldErrors)?.tiers?.[tierNumber]?.unitType && (
          <p className="text-danger text-xs mt-1">
            {(errors as FieldErrors)?.tiers?.[tierNumber]?.unitType?.message}
          </p>
        )}
      </div>
      <div className="flex-1">
        <label
          className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide"
          htmlFor="minQuantity"
        >
          Min Quantity
          <span className="text-danger ml-1">*</span>
        </label>
        <input
          type="number"
          value={minQuantity ?? ""}
          placeholder="Min Quantity"
          {...register(`tiers.${tierNumber}.minQuantity`, {
            required: "Min Quantity is required",
            pattern: {
              value: /^[0-9]*$/,
              message: "Please enter only numbers"
            },
            min: {
              value: 0,
              message: "Min Quantity must be greater than 0"
            }
          })}
          id="minQuantity"
          onBlur={() => {
            trigger(`tiers.${tierNumber}.minQuantity`);
          }}
          className={`block font-normal w-full px-3 py-2 text-highlighted-color rounded border focus:ring-2 focus:border-transparent outline-none placeholder:text-heading-very-light text-xs ${
            errors[`tiers.${tierNumber}.minQuantity`]
              ? "border-transparent ring-2 ring-error/50 focus:ring-error/50 bg-error/5"
              : ""
          }`}
        />
        {(errors as FieldErrors)?.tiers?.[tierNumber]?.minQuantity && (
          <p className="text-danger text-xs mt-1">
            {(errors as FieldErrors)?.tiers?.[tierNumber]?.minQuantity?.message}
          </p>
        )}
      </div>
      <div className="flex-1">
        <label
          className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide"
          htmlFor="maxQuantity"
        >
          Max Quantity
        </label>
        <input
          type="number"
          id="maxQuantity"
          value={maxQuantity}
          placeholder="Max Quantity"
          {...register(`tiers.${tierNumber}.maxQuantity`, {
            pattern: {
              value: /^[0-9]*$/,
              message: "Please enter only numbers"
            }
          })}
          className={`block font-normal w-full px-3 py-2 text-highlighted-color rounded border focus:ring-2 focus:border-transparent outline-none placeholder:text-heading-very-light text-xs ${
            errors[`tiers.${tierNumber}.maxQuantity`]
              ? "border-transparent ring-2 ring-error/50 focus:ring-error/50 bg-error/5"
              : ""
          }`}
        />
      </div>
      <div className="mt-2">
        <RebateTierFields tierNumber={tierNumber} />
      </div>
    </div>
  );
};

const PerItemTierRow = ({ tierNumber }: { tierNumber: number }) => {
  const didInit = useRef(false);
  const {
    register,
    watch,
    trigger,
    control,
    setValue,
    getValues,
    formState: { errors }
  } = useFormContext();

  const {
    fields: tagFields,
    append,
    remove
  } = useFieldArray({
    control,
    name: `tiers.${tierNumber}.product_tag_rows`,
    keyName: "id"
  });
  const rebateValue = watch(`tiers.${tierNumber}.rebateValue`);
  const unitType = watch(`tiers.${tierNumber}.unitType`);
  const valuePerItem = watch(`tiers.${tierNumber}.valuePerItem`);
  const tagRows = watch(`tiers.${tierNumber}.product_tag_rows`);

  useEffect(() => {
    if (!didInit.current && tagFields.length === 0) {
      append({ tag: { label: "", value: "" }, qty: "" });
      didInit.current = true;
      return;
    }
    const calculationType = getValues("calculationType");

    const tagNames = tagRows
      ?.map((tag: any) => `${tag.qty} ${tag.tag?.label} SKUs`)
      ?.join(", ");

    setValue(
      `tiers.${tierNumber}.programOverview`,
      `Carry ${tagNames} ${unitType} for a total of ${valuePerItem} points and ${getReadableRebateValue(calculationType, rebateValue)} rebate`
    );
  }, [JSON.stringify(tagRows), rebateValue, unitType, valuePerItem]);

  const user = getUserClient();
  const isManufacturerAccount = isManufacturer(user?.role || "");
  const manufacturerId = isManufacturerAccount
    ? getManufacturerId(user?.role || "", user)
    : watch("manufacturer");
  // Fetch productTagOptions from API
  const [productTagOptions, setProductTagOptions] = useState<
    { label: string; value: string }[]
  >([]);
  useEffect(() => {
    fetchProductTags(manufacturerId).then(setProductTagOptions);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="flex flex-col gap-3 col-span-3">
        <label className="text-sm font-medium flex items-center">
          Product Tags & Quantities
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Product Tags & Quantities are showing based on Per Item Criteria Selection"
          />
        </label>
        <div className="tags grid gap-3">
          {tagFields.map((field, index) => (
            <div key={field.id} className="flex gap-3 items-start">
              <div className="flex-1">
                <label className="text-xs mb-1 font-medium block">
                  Product Tag
                  <span className="text-danger ml-1">*</span>
                </label>
                <MultiSelect
                  containerClass=""
                  multiSelect={false}
                  defaultValue={watch(
                    `tiers.${tierNumber}.product_tag_rows.${index}.tag`
                  )}
                  rules={{
                    required: "Please select a tag",
                    validate: (val: any) =>
                      val && val.value ? true : "Please select a tag"
                  }}
                  error={
                    (errors as FieldErrors)?.tiers?.[tierNumber]
                      ?.product_tag_rows?.[index]?.tag
                  }
                  name={`tiers.${tierNumber}.product_tag_rows.${index}.tag`}
                  options={productTagOptions}
                  control={control}
                />
              </div>

              <div className="flex-1">
                <label className="text-xs mb-1 font-medium block">
                  Quantity
                  <span className="text-danger ml-1">*</span>
                </label>
                <input
                  type="number"
                  placeholder="Qty"
                  {...register(
                    `tiers.${tierNumber}.product_tag_rows.${index}.qty`,
                    {
                      required: "Quantity is required",
                      min: {
                        value: 1,
                        message: "Must be greater than 0"
                      }
                    }
                  )}
                  className={`block font-normal w-full px-3 py-2 h-10 text-highlighted-color rounded border focus:ring-2 focus:border-transparent outline-none placeholder:text-heading-very-light text-xs ${
                    (errors as FieldErrors)?.tiers?.[tierNumber]
                      ?.product_tag_rows?.[index]?.qty
                      ? "border-transparent ring-2 ring-error/50 focus:ring-error/50 bg-error/5"
                      : ""
                  }`}
                  onBlur={() => {
                    trigger(
                      `tiers.${tierNumber}.product_tag_rows.${index}.qty`
                    );
                  }}
                />
                {(errors as FieldErrors)?.tiers?.[tierNumber]
                  ?.product_tag_rows?.[index]?.qty && (
                  <p className="text-danger text-xs mt-1">
                    {
                      (errors as FieldErrors)?.tiers?.[tierNumber]
                        ?.product_tag_rows?.[index]?.qty?.message
                    }
                  </p>
                )}
              </div>

              {tagFields.length < 1 && (
                <Image
                  src={plusGreenIcon}
                  className="cursor-pointer mt-8"
                  width={14}
                  onClick={() =>
                    append({ tag: { label: "", value: "" }, qty: "" })
                  }
                  height={14}
                  alt="Close Icon"
                />
              )}

              {tagFields.length > 1 && (
                <Image
                  className="cursor-pointer mt-8"
                  onClick={() => remove(index)}
                  src={redCircleCrossIcon}
                  width={16}
                  height={16}
                  alt="Close Icon"
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1">
        <label className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide">
          Unit Type
          <span className="text-danger ml-1">*</span>
        </label>
        <SelectBox
          defaultValue=""
          {...register(`tiers.${tierNumber}.unitType`, {
            required: "Please select a unit type"
          })}
          options={unitTypeOptions}
          id="unitType"
          data-testid="unitType"
          className={`text-xs pr-[0] py-2 w-full bg-white`}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setValue(`tiers.${tierNumber}.unitType`, e.target.value);
            trigger(`tiers.${tierNumber}.unitType`);
          }}
          errors={errors as FieldErrors}
        />
        {(errors as FieldErrors)?.tiers?.[tierNumber]?.unitType && (
          <p className="text-danger text-xs mt-1">
            {(errors as FieldErrors)?.tiers?.[tierNumber]?.unitType?.message}
          </p>
        )}
      </div>
      <div className="flex-1">
        <label className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide">
          Value Per Item
          <span className="text-danger ml-1">*</span>
        </label>
        <input
          type="number"
          value={watch(`tiers.${tierNumber}.valuePerItem`)}
          placeholder="Value Per Item"
          {...register(`tiers.${tierNumber}.valuePerItem`, {
            required: "Value Per Item is required",
            pattern: {
              value: /^[0-9]*$/,
              message: "Please enter only numbers"
            },
            min: {
              value: 1,
              message: "Value must be greater than 0"
            }
          })}
          className={`block font-normal w-full px-3 py-2 text-highlighted-color rounded border focus:ring-2 focus:border-transparent outline-none placeholder:text-heading-very-light text-xs ${
            errors[`tiers.${tierNumber}.valuePerItem`]
              ? "border-transparent ring-2 ring-error/50 focus:ring-error/50 bg-error/5"
              : ""
          }`}
        />

        {(errors as FieldErrors)?.tiers?.[tierNumber]?.valuePerItem && (
          <p className="text-danger text-xs mt-1">
            {
              (errors as FieldErrors)?.tiers?.[tierNumber]?.valuePerItem
                ?.message
            }
          </p>
        )}
      </div>
      <RebateTierFields tierNumber={tierNumber} />
    </div>
  );
};

const PurchaseValueTierRow = ({ tierNumber }: { tierNumber: number }) => {
  const {
    setValue,
    trigger,
    register,
    formState: { errors },
    watch
  } = useFormContext();

  const minAmount = watch(`tiers.${tierNumber}.minAmount`);
  const compliancePeriod = watch("compliancePeriod");

  useEffect(() => {
    if (minAmount) {
      setValue(
        `tiers.${tierNumber}.programOverview`,
        `Purchase minimum of $${minAmount} during the ${compliancePeriod}`.trim()
      );
    }
  }, [minAmount]);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="flex-1">
        <label className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide">
          Min Purchase
          <span className="text-danger ml-1">*</span>
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Min Purchase is showing based on Purchase Value Criteria Selection"
          />
        </label>
        <div className="relative ">
          <div className="absolute inset-y-0 left-0 px-2.5 flex items-center pointer-events-none bg-common-bg rounded-l overflow-hidden">
            <span className="text-gray-500 sm:text-sm">$</span>
          </div>
          <input
            type="number"
            value={watch(`tiers.${tierNumber}.minAmount`)}
            placeholder="Min Purchase"
            {...register(`tiers.${tierNumber}.minAmount`, {
              required: "Min Purchase is required",
              pattern: {
                value: /^[0-9]*$/,
                message: "Please enter only numbers"
              },
              min: {
                value: 1,
                message: "Min Purchase must be greater than 0"
              }
            })}
            onBlur={() => {
              trigger(`tiers.${tierNumber}.minAmount`);
            }}
            className={`block font-normal w-full px-3 py-2 pl-9 text-highlighted-color rounded border focus:ring-2 focus:border-transparent outline-none placeholder:text-heading-very-light text-xs ${
              errors[`tiers.${tierNumber}.minAmount`]
                ? "border-transparent ring-2 ring-error/50 focus:ring-error/50 bg-error/5"
                : ""
            }`}
          />
        </div>
        {(errors as FieldErrors)?.tiers?.[tierNumber]?.minAmount && (
          <p className="text-danger text-xs mt-1">
            {(errors as FieldErrors)?.tiers?.[tierNumber]?.minAmount?.message}
          </p>
        )}
      </div>
      <RebateTierFields tierNumber={tierNumber} />
    </div>
  );
};

const CategorySkusTierRow = ({ tierNumber }: { tierNumber: number }) => {
  const didInit = useRef(false);

  const {
    register,
    trigger,
    control,
    setValue,
    formState: { errors },
    watch
  } = useFormContext();

  const {
    fields: tagFields,
    append,
    remove
  } = useFieldArray({
    control,
    name: `tiers.${tierNumber}.product_tag_rows`,
    keyName: "id"
  });
  const rebateValue = watch(`tiers.${tierNumber}.rebateValue`);
  const tagRows = watch(`tiers.${tierNumber}.product_tag_rows`);

  useEffect(() => {
    if (!didInit.current && tagFields.length === 0) {
      append({ tag: { label: "", value: "" }, qty: "" });
      didInit.current = true;
      return;
    }

    const totalQty = tagRows?.reduce(
      (acc: number, curr: any) => acc + Number((curr as TagField).qty || 0),
      0
    );

    const tagNames = tagRows
      ?.map((tag: any) => `${tag.qty} ${tag.tag?.label}`)
      ?.join(", ");

    setValue(
      `tiers.${tierNumber}.programOverview`,
      `Carry total of ${totalQty} SKUs. ${tagNames}`
    );
  }, [JSON.stringify(tagRows), rebateValue]);

  const user = getUserClient();
  const isManufacturerAccount = isManufacturer(user?.role || "");
  const manufacturerId = isManufacturerAccount
    ? getManufacturerId(user?.role || "", user)
    : watch("manufacturer");
  // Fetch productTagOptions from API
  const [productTagOptions, setProductTagOptions] = useState<
    { label: string; value: string }[]
  >([]);
  useEffect(() => {
    fetchProductTags(manufacturerId).then(setProductTagOptions);
  }, []);
  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-medium flex items-center">
        Product Tags & Quantities
        <CustomPopOver
          iconSrc={blueInfoIcon.src}
          size={{ width: 14, height: 14, class: "ml-1.5" }}
          message="Product Tags & Quantities are showing based on Category Skus Criteria Selection"
        />
      </label>
      <div className="tags grid gap-3">
        {tagFields.map((field, index) => (
          <div key={field.id} className="flex gap-3 items-start">
            <div className="flex-1">
              <label className="text-xs mb-1 font-medium block">
                Product Tag
                <span className="text-danger ml-1">*</span>
              </label>
              <MultiSelect
                containerClass=""
                multiSelect={false}
                defaultValue={watch(
                  `tiers.${tierNumber}.product_tag_rows.${index}.tag`
                )}
                rules={{
                  required: "Please select a tag",
                  validate: (val: any) =>
                    val && val.value ? true : "Please select a tag"
                }}
                error={
                  (errors as FieldErrors)?.tiers?.[tierNumber]
                    ?.product_tag_rows?.[index]?.tag
                }
                name={`tiers.${tierNumber}.product_tag_rows.${index}.tag`}
                options={productTagOptions}
                control={control}
              />
            </div>

            <div className="flex-1">
              <label className="text-xs mb-1 font-medium block">
                Quantity
                <span className="text-danger ml-1">*</span>
              </label>
              <input
                type="number"
                placeholder="Qty"
                {...register(
                  `tiers.${tierNumber}.product_tag_rows.${index}.qty`,
                  {
                    required: "Quantity is required",
                    min: {
                      value: 1,
                      message: "Must be greater than 0"
                    }
                  }
                )}
                onBlur={() => {
                  trigger(`tiers.${tierNumber}.product_tag_rows.${index}.qty`);
                }}
                className={`block font-normal w-full px-3 py-2 h-10 text-highlighted-color rounded border focus:ring-2 focus:border-transparent outline-none placeholder:text-heading-very-light text-xs ${
                  (errors as FieldErrors)?.tiers?.[tierNumber]
                    ?.product_tag_rows?.[index]?.qty
                    ? "border-transparent ring-2 ring-error/50 focus:ring-error/50 bg-error/5"
                    : ""
                }`}
              />
              {(errors as FieldErrors)?.tiers?.[tierNumber]?.product_tag_rows?.[
                index
              ]?.qty && (
                <p className="text-danger text-xs mt-1">
                  {
                    (errors as FieldErrors)?.tiers?.[tierNumber]
                      ?.product_tag_rows?.[index]?.qty?.message
                  }
                </p>
              )}
            </div>

            <Image
              src={plusGreenIcon}
              className="cursor-pointer mt-8"
              width={14}
              onClick={() => append({ tag: { label: "", value: "" }, qty: "" })}
              height={14}
              alt="Close Icon"
            />
            {tagFields.length > 1 && (
              <Image
                className="cursor-pointer mt-8"
                onClick={() => remove(index)}
                src={redCircleCrossIcon}
                width={16}
                height={16}
                alt="Close Icon"
              />
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 mt-3 gap-4">
        <RebateTierFields tierNumber={tierNumber} />
      </div>
    </div>
  );
};

const BaseTierRow = ({ tierNumber }: { tierNumber: number }) => {
  const { setValue, watch } = useFormContext();
  const rebateValue = watch(`tiers.${tierNumber}.rebateValue`);

  useEffect(() => {
    setValue(`tiers.${tierNumber}.programOverview`, "Base volume rebate");
  }, [rebateValue]);

  return (
    <div className="grid grid-cols-3 gap-4">
      <RebateTierFields tierNumber={tierNumber} />
    </div>
  );
};

const BaseSpiffTierRow_StoreCompliance = ({
  tierNumber
}: {
  tierNumber: number;
}) => {
  const didInit = useRef(false);
  const { control, setValue, getValues, watch } = useFormContext();

  const {
    fields: tagFields,
    append,
    remove
  } = useFieldArray({
    control,
    name: `tiers.${tierNumber}.product_tag_rows`,
    keyName: "id"
  });

  const rebateValue = watch(`tiers.${tierNumber}.rebateValue`);
  const rebateType = getRebateType(getValues(`calculationType`));
  const compliancePeriod = getValues(`compliancePeriod`);

  useEffect(() => {
    if (!didInit.current && tagFields.length === 0) {
      append({ tag: { label: "", value: "" }, qty: "" });
      didInit.current = true;
      return;
    }

    setValue(
      `tiers.${tierNumber}.programOverview`,
      `${rebateType == "fixed" ? "$" + rebateValue : rebateValue + "%"} per compliant store. One-time ${compliancePeriod} payment per store.`
    );
  }, [rebateValue]);

  return (
    <div className="grid grid-cols-3 mt-3 gap-4">
      <RebateTierFields tierNumber={tierNumber} forSpiff={true} />
    </div>
  );
};

const BaseSpiffTierRow_CategoryItem = ({
  tierNumber
}: {
  tierNumber: number;
}) => {
  const didInit = useRef(false);
  const {
    control,
    setValue,
    register,
    trigger,
    formState: { errors },
    watch
  } = useFormContext();

  const {
    fields: tagFields,
    append,
    remove
  } = useFieldArray({
    control,
    name: `tiers.${tierNumber}.product_tag_rows`,
    keyName: "id"
  });

  const rebateValue = watch(`tiers.${tierNumber}.rebateValue`);
  const tagRows = watch(`tiers.${tierNumber}.product_tag_rows`);

  useEffect(() => {
    if (!didInit.current && tagFields.length === 0) {
      append({ tag: { label: "", value: "" } });
      didInit.current = true;
      return;
    }

    const tagNames = tagRows
      ?.map((tag: any) => `${tag.tag?.label}`)
      ?.join(", ");

    setValue(
      `tiers.${tierNumber}.programOverview`,
      `Earn $${rebateValue} per ${tagNames} per store`
    );
  }, [JSON.stringify(tagRows), rebateValue]);

  const user = getUserClient();
  const isManufacturerAccount = isManufacturer(user?.role || "");
  const manufacturerId = isManufacturerAccount
    ? getManufacturerId(user?.role || "", user)
    : watch("manufacturer");
  // Fetch productTagOptions from API
  const [productTagOptions, setProductTagOptions] = useState<
    { label: string; value: string }[]
  >([]);
  useEffect(() => {
    fetchProductTags(manufacturerId).then(setProductTagOptions);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="tags grid grid-cols-2 gap-3">
        {tagFields.map((field, index) => (
          <div key={field.id} className="flex gap-3 items-start">
            <div className="flex-1">
              <label className="text-xs mb-1 font-medium flex items-center">
                Product Tag
                <span className="text-danger ml-1">*</span>
                <CustomPopOver
                  customPostionClass="ml-2"
                  iconSrc={blueInfoIcon.src}
                  size={{ width: 14, height: 14, class: "ml-2" }}
                  message="Product Tags & Quantities are showing based on Calculation Type Fixed $ amount Per Category Item Per Store"
                />
              </label>
              <MultiSelect
                containerClass=""
                multiSelect={false}
                defaultValue={watch(
                  `tiers.${tierNumber}.product_tag_rows.${index}.tag`
                )}
                rules={{
                  required: "Please select a tag",
                  validate: (val: any) =>
                    val && val.value ? true : "Please select a tag"
                }}
                error={
                  (errors as FieldErrors)?.tiers?.[tierNumber]
                    ?.product_tag_rows?.[index]?.tag
                }
                name={`tiers.${tierNumber}.product_tag_rows.${index}.tag`}
                options={productTagOptions}
                control={control}
              />
            </div>

            {tagFields.length < 1 && (
              <Image
                src={plusGreenIcon}
                className="cursor-pointer mt-8"
                width={14}
                onClick={() =>
                  append({ tag: { label: "", value: "" }, qty: "" })
                }
                height={14}
                alt="Close Icon"
              />
            )}
            {tagFields.length > 1 && (
              <Image
                className="cursor-pointer mt-8"
                onClick={() => remove(index)}
                src={redCircleCrossIcon}
                width={16}
                height={16}
                alt="Close Icon"
              />
            )}
          </div>
        ))}
        <div className="flex-1">
          <label className="mb-1.5 text-xs text-black-lighter font-medium flex">
            Unit Type
            <span className="text-danger ml-1">*</span>
          </label>
          <SelectBox
            defaultValue=""
            {...register(`tiers.${tierNumber}.unitType`, {
              required: "Please select a unit type"
            })}
            options={unitTypeOptions}
            id="unitType"
            data-testid="unitType"
            className={`text-xs pr-[0] py-2 w-full bg-white h-9`}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              setValue(`tiers.${tierNumber}.unitType`, e.target.value);
              trigger(`tiers.${tierNumber}.unitType`);
            }}
            errors={errors as FieldErrors}
          />
          {(errors as FieldErrors)?.tiers?.[tierNumber]?.unitType && (
            <p className="text-danger text-xs mt-1">
              {(errors as FieldErrors)?.tiers?.[tierNumber]?.unitType?.message}
            </p>
          )}
        </div>
        <RebateTierFields tierNumber={tierNumber} forSpiff={true} />
      </div>
    </div>
  );
};

const BaseSpiffTierRow_ItemPerStore = ({
  tierNumber
}: {
  tierNumber: number;
}) => {
  const {
    register,
    control,
    watch,
    trigger,
    setValue,
    formState: { errors }
  } = useFormContext();

  const user = getUserClient();

  const rebateValue = watch(`tiers.${tierNumber}.rebateValue`);

  useEffect(() => {
    if (rebateValue) {
      setValue(
        `tiers.${tierNumber}.programOverview`,
        `Earn $${rebateValue} per new item placed items per store`
      );
    }
  }, [rebateValue]);

  const isManufacturerAccount = isManufacturer(user?.role || "");
  const manufacturerId = isManufacturerAccount
    ? getManufacturerId(user?.role || "", user)
    : watch("manufacturer");
  // Fetch productTagOptions from API
  const [productOptions, setProductOptions] = useState<
    { label: string; value: string }[]
  >([]);
  useEffect(() => {
    fetchManufacturerProducts(manufacturerId).then(setProductOptions);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="flex-1 col-span-3">
        <label className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide">
          Select Products
          <span className="text-danger ml-1">*</span>
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Product selection field is showing based on Calculation Type Fixed $ amount Per Quantity"
          />
        </label>
        <MultiSelect
          control={control}
          {...register(`tiers.${tierNumber}.product`, {
            required: "Please select a product"
          })}
          options={productOptions}
          data-testid="product"
          containerClass={``}
          placeholder="Select a Product"
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setValue(`tiers.${tierNumber}.product`, e.target.value);
            trigger(`tiers.${tierNumber}.product`);
          }}
          error={(errors as FieldErrors)?.tiers?.[tierNumber]?.product}
        />
      </div>
      <div className="col-span-3">
        <label className="text-sm font-medium flex items-center">
          Purchase Quantity
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Quantity Fields are showing based on Calculation Type Fixed $ amount Per Item Per Store (Per POD)"
          />
        </label>
      </div>
      <div className="flex-1">
        <label className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide">
          Unit Type
          <span className="text-danger ml-1">*</span>
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Unit Type is showing based on Calculation Type Selection"
          />
        </label>
        <SelectBox
          defaultValue=""
          {...register(`tiers.${tierNumber}.unitType`, {
            required: "Please select a unit type"
          })}
          options={unitTypeOptions}
          id="unitType"
          data-testid="unitType"
          className={`text-xs pr-[0] py-2 w-full bg-white`}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setValue(`tiers.${tierNumber}.unitType`, e.target.value);
            trigger(`tiers.${tierNumber}.unitType`);
          }}
          errors={errors as FieldErrors}
        />
        {(errors as FieldErrors)?.tiers?.[tierNumber]?.unitType && (
          <p className="text-danger text-xs mt-1">
            {(errors as FieldErrors)?.tiers?.[tierNumber]?.unitType?.message}
          </p>
        )}
      </div>
      <div className="flex-1">
        <RebateTierFields tierNumber={tierNumber} forSpiff={true} />
      </div>
    </div>
  );
};

const BaseSpiffTierRow_PerQty = ({ tierNumber }: { tierNumber: number }) => {
  const {
    control,
    register,
    watch,
    trigger,
    setValue,
    formState: { errors }
  } = useFormContext();

  const rebateValue = watch(`tiers.${tierNumber}.rebateValue`);
  const unitType = watch(`tiers.${tierNumber}.unitType`);

  const user = getUserClient();
  const isDistAdmin = isDistributorAdmin(user?.role || "");

  useEffect(() => {
    if (rebateValue && unitType) {
      setValue(
        `tiers.${tierNumber}.programOverview`,
        `Earn $${rebateValue} per ${unitType} sold`
      );
    }
  }, [rebateValue, unitType]);

  const isManufacturerAccount = isManufacturer(user?.role || "");
  const manufacturerId = isManufacturerAccount
    ? getManufacturerId(user?.role || "", user)
    : watch("manufacturer");
  // Fetch productTagOptions from API
  const [productOptions, setProductOptions] = useState<
    { label: string; value: string }[]
  >([]);
  useEffect(() => {
    fetchManufacturerProducts(manufacturerId).then(setProductOptions);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      <div className="flex-1 col-span-3">
        <label className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide">
          Select Products
          <span className="text-danger ml-1">*</span>
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Product selection field is showing based on Calculation Type Fixed $ amount Per Quantity"
          />
        </label>
        <MultiSelect
          control={control}
          {...register(`tiers.${tierNumber}.product`, {
            required: "Please select a product"
          })}
          options={productOptions}
          data-testid="product"
          containerClass={``}
          placeholder="Select a Product"
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setValue(`tiers.${tierNumber}.product`, e.target.value);
            trigger(`tiers.${tierNumber}.product`);
          }}
          error={(errors as FieldErrors)?.tiers?.[tierNumber]?.product}
        />
      </div>
      <div className="flex-1">
        <label className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide">
          Unit Type
          <span className="text-danger ml-1">*</span>
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Unit Type Fields is showing based on Calculation Type Fixed $ amount Per Quantity"
          />
        </label>
        <SelectBox
          defaultValue=""
          {...register(`tiers.${tierNumber}.unitType`, {
            required: "Please select a unit type"
          })}
          options={unitTypeOptions}
          id="unitType"
          data-testid="unitType"
          className={`text-xs pr-[0] py-2 w-full bg-white h-9`}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setValue(`tiers.${tierNumber}.unitType`, e.target.value);
            trigger(`tiers.${tierNumber}.unitType`);
          }}
          errors={errors as FieldErrors}
        />
        {(errors as FieldErrors)?.tiers?.[tierNumber]?.unitType && (
          <p className="text-danger text-xs mt-1">
            {(errors as FieldErrors)?.tiers?.[tierNumber]?.unitType?.message}
          </p>
        )}
      </div>
      <div className="flex-1">
        <RebateTierFields tierNumber={tierNumber} forSpiff={true} />
      </div>
    </div>
  );
};

const VoidFillSpiffTierRow_ItemPerStore = ({
  tierNumber
}: {
  tierNumber: number;
}) => {
  const {
    register,
    control,
    watch,
    trigger,
    setValue,
    formState: { errors }
  } = useFormContext();

  const user = getUserClient();
  const rebateValue = watch(`tiers.${tierNumber}.rebateValue`);
  const startDate = watch(`tiers.${tierNumber}.lookUpStartDate`);
  const programStartDate = watch(`startDate`);

  useEffect(() => {
    if (rebateValue) {
      setValue(
        `tiers.${tierNumber}.programOverview`,
        `Earn $${rebateValue} per new item placed items per store`
      );
    }
  }, [rebateValue]);

  const isManufacturerAccount = isManufacturer(user?.role || "");
  const manufacturerId = isManufacturerAccount
    ? getManufacturerId(user?.role || "", user)
    : watch("manufacturer");
  // Fetch productTagOptions from API
  const [productOptions, setProductOptions] = useState<
    { label: string; value: string }[]
  >([]);
  useEffect(() => {
    fetchManufacturerProducts(manufacturerId).then(setProductOptions);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Look Back Period */}
      <div className="flex-1 col-span-3">
        <label className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide">
          Look Back Period
          <span className="text-danger ml-1">*</span>
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Look Back Period field is showing based on Calculation Type Per Item Per Store (Per POD)"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <DatePickerField
            required
            control={control}
            name={`tiers.${tierNumber}.lookUpStartDate`}
            placeholder="MM-DD-YYYY"
            label="Start Date"
            showMonthDropdown
            showYearDropdown
          />

          <DatePickerField
            disabled={!startDate}
            name={`tiers.${tierNumber}.lookUpEndDate`}
            required
            control={control}
            label="End Date"
            placeholder="MM-DD-YYYY"
            minDate={startDate}
            maxDate={programStartDate}
            showMonthDropdown
            showYearDropdown
          />
        </div>
      </div>
      <div className="flex-1 col-span-3">
        <label className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide">
          Select Products
          <span className="text-danger ml-1">*</span>
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Product selection field is showing based on Calculation Type Fixed $ amount Per Quantity"
          />
        </label>
        <MultiSelect
          control={control}
          {...register(`tiers.${tierNumber}.product`, {
            required: "Please select a product"
          })}
          options={productOptions}
          data-testid="product"
          containerClass={``}
          placeholder="Select a Product"
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setValue(`tiers.${tierNumber}.product`, e.target.value);
            trigger(`tiers.${tierNumber}.product`);
          }}
          error={(errors as FieldErrors)?.tiers?.[tierNumber]?.product}
        />
      </div>
      <div className="col-span-3">
        <label className="text-sm font-medium flex items-center">
          Purchase Quantity
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Quantity Fields are showing based on Calculation Type Fixed $ amount Per Item Per Store (Per POD)"
          />
        </label>
      </div>
      <div className="flex-1">
        <label className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide">
          Unit Type
          <span className="text-danger ml-1">*</span>
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Unit Type is showing based on Calculation Type Selection"
          />
        </label>
        <SelectBox
          defaultValue=""
          {...register(`tiers.${tierNumber}.unitType`, {
            required: "Please select a unit type"
          })}
          options={unitTypeOptions}
          id="unitType"
          data-testid="unitType"
          className={`text-xs pr-[0] py-2 w-full bg-white`}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setValue(`tiers.${tierNumber}.unitType`, e.target.value);
            trigger(`tiers.${tierNumber}.unitType`);
          }}
          errors={errors as FieldErrors}
        />
        {(errors as FieldErrors)?.tiers?.[tierNumber]?.unitType && (
          <p className="text-danger text-xs mt-1">
            {(errors as FieldErrors)?.tiers?.[tierNumber]?.unitType?.message}
          </p>
        )}
      </div>
      <div className="flex-1">
        <RebateTierFields tierNumber={tierNumber} forSpiff={true} />
      </div>
    </div>
  );
};

const VoidFillSpiffTierRow_PerQty = ({
  tierNumber
}: {
  tierNumber: number;
}) => {
  const {
    control,
    register,
    watch,
    trigger,
    setValue,
    formState: { errors }
  } = useFormContext();

  const rebateValue = watch(`tiers.${tierNumber}.rebateValue`);
  const unitType = watch(`tiers.${tierNumber}.unitType`);
  const startDate = watch(`tiers.${tierNumber}.lookUpStartDate`);
  const programStartDate = watch(`startDate`);

  const user = getUserClient();

  useEffect(() => {
    if (rebateValue && unitType) {
      setValue(
        `tiers.${tierNumber}.programOverview`,
        `Earn $${rebateValue} per ${unitType} sold`
      );
    }
  }, [rebateValue, unitType]);

  const isManufacturerAccount = isManufacturer(user?.role || "");
  const manufacturerId = isManufacturerAccount
    ? getManufacturerId(user?.role || "", user)
    : watch("manufacturer");
  // Fetch productTagOptions from API
  const [productOptions, setProductOptions] = useState<
    { label: string; value: string }[]
  >([]);
  useEffect(() => {
    fetchManufacturerProducts(manufacturerId).then(setProductOptions);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Look Back Period */}
      <div className="flex-1 col-span-3">
        <label className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide">
          Look Back Period
          <span className="text-danger ml-1">*</span>
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Look Back Period field is showing based on Calculation Type Per Item"
          />
        </label>
        <div className="grid grid-cols-2 gap-4">
          <DatePickerField
            required
            control={control}
            name={`tiers.${tierNumber}.lookUpStartDate`}
            placeholder="MM-DD-YYYY"
            label="Start Date"
            maxDate={programStartDate}
            showMonthDropdown
            showYearDropdown
          />

          <DatePickerField
            disabled={!startDate}
            name={`tiers.${tierNumber}.lookUpEndDate`}
            required
            control={control}
            label="End Date"
            placeholder="MM-DD-YYYY"
            minDate={startDate}
            maxDate={programStartDate}
            showMonthDropdown
            showYearDropdown
          />
        </div>
      </div>
      <div className="flex-1 col-span-3">
        <label className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide">
          Select Products
          <span className="text-danger ml-1">*</span>
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Product selection field is showing based on Calculation Type Fixed $ amount Per Quantity"
          />
        </label>
        <MultiSelect
          control={control}
          {...register(`tiers.${tierNumber}.product`, {
            required: "Please select a product"
          })}
          options={productOptions}
          data-testid="product"
          containerClass={``}
          placeholder="Select a Product"
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setValue(`tiers.${tierNumber}.product`, e.target.value);
            trigger(`tiers.${tierNumber}.product`);
          }}
          error={(errors as FieldErrors)?.tiers?.[tierNumber]?.product}
        />
      </div>
      <div className="flex-1">
        <label className="mb-1.5 text-xs text-black-lighter flex font-medium tracking-wide">
          Unit Type
          <span className="text-danger ml-1">*</span>
          <CustomPopOver
            iconSrc={blueInfoIcon.src}
            size={{ width: 14, height: 14, class: "ml-1.5" }}
            message="Unit Type Fields is showing based on Calculation Type Fixed $ amount Per Quantity"
          />
        </label>
        <SelectBox
          defaultValue=""
          {...register(`tiers.${tierNumber}.unitType`, {
            required: "Please select a unit type"
          })}
          options={unitTypeOptions}
          id="unitType"
          data-testid="unitType"
          className={`text-xs pr-[0] py-2 w-full bg-white h-9`}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setValue(`tiers.${tierNumber}.unitType`, e.target.value);
            trigger(`tiers.${tierNumber}.unitType`);
          }}
          errors={errors as FieldErrors}
        />
        {(errors as FieldErrors)?.tiers?.[tierNumber]?.unitType && (
          <p className="text-danger text-xs mt-1">
            {(errors as FieldErrors)?.tiers?.[tierNumber]?.unitType?.message}
          </p>
        )}
      </div>
      <div className="flex-1">
        <RebateTierFields tierNumber={tierNumber} forSpiff={true} />
      </div>
    </div>
  );
};

const TierRow = ({ tierNumber, selectedCriteria }: TierRowProps) => {
  const { watch } = useFormContext();
  const calculationType = watch(`calculationType`);

  switch (selectedCriteria) {
    case PROGRAM_CRITERIA_VALUES.VOID_FILL:
      switch (calculationType) {
        case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_ITEM_PER_STORE_VOID_FILL:
          return <VoidFillSpiffTierRow_ItemPerStore tierNumber={tierNumber} />;
        default:
          return <BaseTierRow tierNumber={tierNumber} />;
      }

    case PROGRAM_CRITERIA_VALUES.BASE_SPIFF:
      switch (calculationType) {
        case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_STORE_COMPLIANCE:
          return <BaseSpiffTierRow_StoreCompliance tierNumber={tierNumber} />;
        case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_CATEGORY_ITEM_PER_STORE:
          return <BaseSpiffTierRow_CategoryItem tierNumber={tierNumber} />;
        case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_ITEM_PER_STORE:
          return <BaseSpiffTierRow_ItemPerStore tierNumber={tierNumber} />;
        case PROGRAM_CALCULATION_TYPE_VALUES.FIXED_AMOUNT_PER_QUANTITY:
          return <BaseSpiffTierRow_PerQty tierNumber={tierNumber} />;
        default:
          return <BaseTierRow tierNumber={tierNumber} />;
      }

    case PROGRAM_CRITERIA_VALUES.BASE:
      return <BaseTierRow tierNumber={tierNumber} />;
    case PROGRAM_CRITERIA_VALUES.CATEGORY_SKUS:
      return <CategorySkusTierRow tierNumber={tierNumber} />;
    case PROGRAM_CRITERIA_VALUES.PURCHASE_QUANTITY:
      return <PurchaseQuantityTierRow tierNumber={tierNumber} />;
    case PROGRAM_CRITERIA_VALUES.PURCHASE_VALUE:
      return <PurchaseValueTierRow tierNumber={tierNumber} />;
    case PROGRAM_CRITERIA_VALUES.POD:
      return <PODTierRow tierNumber={tierNumber} />;
    case PROGRAM_CRITERIA_VALUES.GROWTH:
      return <GrowthTierRow tierNumber={tierNumber} />;
    case PROGRAM_CRITERIA_VALUES.PER_ITEM:
      return <PerItemTierRow tierNumber={tierNumber} />;
    default:
      return null;
  }
};

const TierTabs = ({
  tiers,
  activeTier,
  setActiveTier,
  setTiers,
  onAddTier
}: {
  tiers: number[];
  activeTier: number;
  setActiveTier: (tier: number) => void;
  setTiers: (fn: (prev: number[]) => number[]) => void;
  onAddTier: () => void;
}) => {
  const { watch, setValue, clearErrors } = useFormContext();
  const formTiers = watch("tiers") || [];

  const handleRemoveTier = (tier: number, index: number) => {
    setTiers((prev) => prev.filter((t) => t !== tier));
    if (activeTier === tier) {
      setActiveTier(0);
    }

    // Remove the tier data from formTiers
    const updatedTiers = [...formTiers];
    updatedTiers.splice(index, 1);
    setValue("tiers", updatedTiers);
    clearErrors("tiers");
  };

  return (
    <div className="flex items-center justify-between border-b">
      <div className="flex gap-3.5 items-center">
        {tiers.map((tier, index) => (
          <div key={tier} className="flex items-start gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                setActiveTier(tier);
              }}
              className={`px-1 pb-2.5 text-sm font-medium ${
                activeTier === tier
                  ? "border-b-2 border-green text-green"
                  : "text-gray-500"
              }`}
            >
              Tier {index + 1}
            </button>
            {tier !== 0 && (
              <button
                type="button"
                onClick={() => handleRemoveTier(tier, index)}
                className="text-danger mt-0.5"
              >
                <Image src={redRemoveIcon} alt="Remove" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onAddTier}
        className="px-3 py-1 bg-green text-white text-sm rounded"
      >
        Add Tier
      </button>
    </div>
  );
};

const FieldsDetail = () => {
  const { watch, unregister, clearErrors, setValue, control } =
    useFormContext();
  const [isMultipleTiers, setIsMultipleTiers] = useState(
    watch("isMultipleTiers")
  );
  const [activeTier, setActiveTier] = useState(0);
  const selectedCriteria = watch("selectedCriteria");

  const {
    fields: tierFields,
    append: appendTier,
    remove: removeTier,
    replace: replaceTier
  } = useFieldArray({
    control,
    name: "tiers"
  });

  const handleAddTier = () => {
    const newTier = { tierId: tierFields.length };
    appendTier(newTier);
    setActiveTier(tierFields.length);
  };

  const handleMultipleTiersChange = (value: boolean) => {
    setIsMultipleTiers(value);
    if (!value) {
      // Reset to single tier
      replaceTier([{ tierId: 0 }]);
      setActiveTier(0);
    } else {
      // Initialize with first tier when enabling multiple tiers
      replaceTier([{ tierId: 0 }]);
      setActiveTier(0);
    }
    unregister("tiers", { keepDefaultValue: false });
    clearErrors("tiers");

    setValue("isMultipleTiers", value);
  };

  return (
    <div className="space-y-6">
      {enableMultipleTiers(selectedCriteria, watch("calculationType")) && (
        <div className="space-y-2">
          <label className="text-xs">Is Multiple Tiers</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={isMultipleTiers}
                onChange={() => handleMultipleTiersChange(true)}
                className="focus:ring-green accent-green hover:accent-green"
              />
              <span className="text-sm font-medium">Yes</span>
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                checked={!isMultipleTiers}
                onChange={() => handleMultipleTiersChange(false)}
                className="focus:ring-green accent-green hover:accent-green"
              />
              <span className="text-sm font-medium">No</span>
            </label>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {isMultipleTiers &&
          enableMultipleTiers(selectedCriteria, watch("calculationType")) && (
            <TierTabs
              tiers={tierFields.map((_, index) => index)}
              activeTier={activeTier}
              setActiveTier={setActiveTier}
              setTiers={(fn) => {
                const newTiers = fn(tierFields.map((_, index) => index));
                replaceTier(newTiers.map((_, index) => ({ tierId: index })));
              }}
              onAddTier={handleAddTier}
            />
          )}

        <div className="space-y-6">
          {!isNaN(activeTier) && (
            <TierRow
              key={activeTier}
              tierNumber={activeTier}
              selectedCriteria={selectedCriteria}
            />
          )}
        </div>
      </div>

      {/* <FieldSummary selectedCriteria={selectedCriteria} tiers={formTiers} /> */}
    </div>
  );
};

export default FieldsDetail;
