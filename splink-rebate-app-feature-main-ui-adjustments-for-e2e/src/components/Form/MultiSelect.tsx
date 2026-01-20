"use client";

import { Control, Controller, FieldError } from "react-hook-form";
import Select from "react-select";

type Option = {
  value: string;
  label: string;
  description?: string;
};

interface Props {
  name: string;
  control: Control<any>;
  options: Option[];
  defaultValue?: Option[] | Option | null;
  error?: FieldError;
  placeholder?: string;
  isDisabled?: boolean;
  rules?: any;
  multiSelect?: boolean;
  className?: string;
  containerClass?: string;
  onChange?: (val: any) => void;
  customOnChange?: boolean;
}

export default function MultiSelect({
  name,
  control,
  options,
  defaultValue = [],
  error,
  placeholder = "Select...",
  isDisabled = false,
  rules,
  multiSelect = true,
  className = "",
  containerClass = "mb-4",
  onChange: onChangeFunc = () => {},
  customOnChange = false
}: Props) {
  const handleMultiChange = (selected: Option[], fieldOnChange: any) => {
    if (!selected || selected.length === 0) {
      fieldOnChange([]);
      return;
    }

    const isAllSelected = selected.some((opt) => opt.value === "ALL");

    if (isAllSelected) {
      // Replace with all except "ALL"
      const final = options.filter((opt) => opt.value !== "ALL");
      fieldOnChange(final);
    } else {
      const cleaned = selected.filter((opt) => opt.value !== "ALL");
      fieldOnChange(cleaned);
    }
  };

  // Helper function to check if an option has NA internal code
  const isNAProduct = (option: Option) => {
    if (!option.description) return false;
    // Check if description contains "Internal Code: N/A" or "Internal Code: NA"
    return (
      option.description.includes("Internal Code: N/A") ||
      option.description.includes("Internal Code: NA")
    );
  };

  const formatOptionLabel = (option: Option) => {
    const isNA = isNAProduct(option);
    if (typeof option.description === "string") {
      return (
        <div className={`flex flex-col gap-1 ${isNA ? "opacity-75" : ""}`}>
          <span className={isNA ? "text-zinc-400" : ""}>{option.label}</span>
          <div
            className={`text-[11px] leading-[14px] ${isNA ? "text-zinc-400" : "text-gray-500"}`}
            dangerouslySetInnerHTML={{ __html: option.description }}
          />
        </div>
      );
    }
    return <span className={isNA ? "text-zinc-400" : ""}>{option.label}</span>;
  };

  // Filter out options with undefined values to prevent duplicate key warnings
  const filteredOptions = options.filter(
    (option) => option.value !== undefined && option.value !== null
  );

  return (
    <div className={`${containerClass}`} data-testid={name}>
      <Controller
        name={name}
        rules={rules}
        control={control}
        defaultValue={defaultValue}
        render={({ field }) => (
          <Select
            {...field}
            id={name}
            data-testid={name}
            options={filteredOptions}
            closeMenuOnSelect={!multiSelect}
            isMulti={multiSelect}
            isDisabled={isDisabled}
            placeholder={placeholder}
            formatOptionLabel={formatOptionLabel}
            filterOption={(option, inputValue) => {
              const description = (
                option?.data?.description || ""
              ).toLowerCase();
              const search = inputValue.toLowerCase();
              return (
                option.label.toLowerCase().includes(search) ||
                description.includes(search)
              );
            }}
            value={field.value}
            onChange={(val) => {
              if (multiSelect) {
                handleMultiChange(val as Option[], field.onChange);
              } else {
                field.onChange(val ?? null);
              }

              if (
                onChangeFunc &&
                typeof onChangeFunc === "function" &&
                val &&
                customOnChange
              ) {
                onChangeFunc?.(val ?? null);
              }
            }}
            backspaceRemovesValue
            classNamePrefix="react-select"
            className={`text-xs cursor-pointer font-inter ${className}`}
            styles={{
              option: (provided: any, state: any) => {
                const isNA = isNAProduct(state.data);
                return {
                  ...provided,
                  backgroundColor: state.isFocused
                    ? isNA
                      ? "#f4f4f5"
                      : provided.backgroundColor
                    : isNA
                      ? "#f4f4f5"
                      : provided.backgroundColor,
                  color: isNA ? "#71717a" : provided.color,
                  "&:active": {
                    backgroundColor: isNA ? "#e4e4e7" : provided.backgroundColor
                  }
                };
              },
              singleValue: (provided: any, state: any) => {
                const isNA = isNAProduct(state.data);
                return {
                  ...provided,
                  color: isNA ? "#71717a" : provided.color
                };
              },
              multiValue: (provided: any, state: any) => {
                const isNA = isNAProduct(state.data);
                return {
                  ...provided,
                  backgroundColor: isNA ? "#f4f4f5" : provided.backgroundColor
                };
              },
              multiValueLabel: (provided: any, state: any) => {
                const isNA = isNAProduct(state.data);
                return {
                  ...provided,
                  color: isNA ? "#71717a" : provided.color
                };
              },
              multiValueRemove: (provided: any, state: any) => {
                const isNA = isNAProduct(state.data);
                return {
                  ...provided,
                  color: isNA ? "#71717a" : provided.color
                };
              }
            }}
          />
        )}
      />
      {error && !isDisabled && (
        <p className="text-danger text-xs mt-1">{error.message}</p>
      )}
    </div>
  );
}
