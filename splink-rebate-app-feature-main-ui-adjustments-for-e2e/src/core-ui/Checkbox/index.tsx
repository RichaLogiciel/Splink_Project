import React from "react";
import { checkboxTheme } from "./theme";
import { CheckboxProps } from "./types";

const Checkbox: React.FC<CheckboxProps> = ({
  id,
  label,
  lableStyle,
  checked,
  color,
  size,
  className,
  disabled,
  onChange,
  onClick
}) => {
  const checkboxClasses = [
    checkboxTheme.base,
    color && color,
    size && size,
    disabled ? checkboxTheme.disabled : checkboxTheme.cursorPointer,
    className // Add custom className to input
  ]
    .filter(Boolean)
    .join(" ");

  const labelClasses = lableStyle ? lableStyle : "";

  return (
    <label className={checkboxTheme.container}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={checkboxClasses}
        onClick={onClick}
      />
      <span className={labelClasses}>{label}</span>
    </label>
  );
};

export default Checkbox;
