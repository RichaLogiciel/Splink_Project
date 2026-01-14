import React from "react";
import { inputTheme } from "./theme";
import { InputProps, Sizes } from "./types";

const Input: React.FC<InputProps> = ({
  label,
  helperText,
  error,
  disabled,
  inputSize = "md",
  className,
  pageVariable,
  ...rest
}) => {
  const inputClasses = [
    inputTheme.base,
    className,
    getSizeClasses(inputSize),
    error ? inputTheme.colors.error : inputTheme.colors.default,
    disabled ? inputTheme.disabled.on : inputTheme.disabled.off
  ]
    .filter(Boolean)
    .join(" ");
  const labelClasses = getLabelClasses(inputSize);

  return (
    <>
      {label && <label className={`${labelClasses}`}>{label}</label>}
      <input className={`${inputClasses} `} {...rest} disabled={disabled} />
      {helperText && <p className={`${inputTheme.helperText}`}>{helperText}</p>}
      {error && <p className={`${inputTheme.errorMessage}`}>{error}</p>}
    </>
  );
};

const getSizeClasses = (size: Sizes): string => {
  return inputTheme.inputSize[size] || "";
};

const getLabelClasses = (size: Sizes): string => {
  const baseClass = inputTheme.label;
  const sizeClass = inputTheme.labelSize[size] || "";

  return `${baseClass} ${sizeClass}`;
};

export default Input;
