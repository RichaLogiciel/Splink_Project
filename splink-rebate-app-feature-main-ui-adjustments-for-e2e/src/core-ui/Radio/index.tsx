import React from "react";
import { RadioProps } from "./type";
import { radioTheme } from "./theme";

const Radio: React.FC<RadioProps> = ({
  id,
  name,
  value,
  label,
  labelStyle,
  checked,
  onChange,
  color,
  size,
  className,
  disabled
}) => {
  const classNames = [
    radioTheme.container,
    className,
    disabled ? radioTheme.disabled : radioTheme.cursorPointer
  ]
    .filter(Boolean)
    .join(" ");

  const inputClasses = [
    radioTheme.base,
    color,
    size,
    disabled ? radioTheme.disabled : ""
  ]
    .filter(Boolean)
    .join(" ");

  const labelClasses = labelStyle ? labelStyle : "";

  return (
    <div className={classNames}>
      <input
        id={id}
        name={name}
        type="radio"
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={inputClasses}
      />
      <label htmlFor={id} className={labelClasses}>
        {label}
      </label>
    </div>
  );
};

export default Radio;
