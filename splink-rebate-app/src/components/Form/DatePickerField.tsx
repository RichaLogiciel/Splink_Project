"use client";

import React from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Control, Controller, FieldError } from "react-hook-form";

interface DatePickerFieldProps {
  name: string;
  label?: string;
  control: Control<any>;
  minDate?: Date;
  maxDate?: Date;
  required?: boolean;
  placeholder?: string;
  error?: FieldError;
  onChange?: (date: Date | null) => void;
  disabled?: boolean;
  showMonthDropdown?: boolean;
  showYearDropdown?: boolean;
}

export const DatePickerField: React.FC<DatePickerFieldProps> = ({
  disabled,
  name,
  label,
  control,
  minDate,
  maxDate,
  required = false,
  placeholder,
  error,
  onChange,
  showMonthDropdown = false,
  showYearDropdown = false
}) => {
  return (
    <div className="w-full">
      {label && (
        <label
          htmlFor={name}
          className="mb-1.5 text-xs text-black-lighter flex justify-between font-medium tracking-wide"
        >
          <div className="flex items-center">
            {label} {required && <span className="text-danger ml-1">*</span>}
          </div>
        </label>
      )}
      <Controller
        control={control}
        name={name}
        rules={{ required }}
        render={({ field, fieldState }) => (
          <>
            <DatePicker
              id={name}
              showIcon
              selected={field.value}
              onChange={(date) => {
                field.onChange(date);
                onChange?.(date);
              }}
              onBlur={field.onBlur}
              // minDate={minDate}
              // maxDate={maxDate}
              minDate={
                minDate
                  ? minDate
                  : showMonthDropdown || showYearDropdown
                    ? new Date(new Date().getFullYear() - 4, 0, 1)
                    : undefined
              }
              maxDate={
                maxDate
                  ? maxDate
                  : showMonthDropdown || showYearDropdown
                    ? new Date(new Date().getFullYear() + 4, 11, 31)
                    : undefined
              }
              className="w-full px-3 py-3 border rounded-md text-xs cursor-pointer font-inter"
              placeholderText={placeholder}
              dateFormat="MM-dd-yyyy"
              required={required}
              disabled={disabled}
              showMonthDropdown={showMonthDropdown}
              showYearDropdown={showYearDropdown}
              dropdownMode="select"
            />
            {fieldState.error && (
              <p className="block text-xs my-1 font-normal text-danger">
                {fieldState.error.message || "This field is required"}
              </p>
            )}
          </>
        )}
      />
      {error && (
        <p className="block text-xs my-1 font-normal text-danger">
          {error.message}
        </p>
      )}
    </div>
  );
};

export default DatePickerField;
