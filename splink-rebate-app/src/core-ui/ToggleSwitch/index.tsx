import React from "react";
import { toggleSwitchTheme } from "./theme";
import { ToggleSwitchProps, ToggleSwitchSize } from "./types";

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  color = "primary",
  size = "md",
  disabled = false,
  label,
  id,
  onChange,
  className,
  labelClass
}) => {
  const switchClasses = filterClases([
    toggleSwitchTheme.base,
    getSizeClasses(size),
    disabled ? toggleSwitchTheme.disabled.on : toggleSwitchTheme.disabled.off,
    checked ? toggleSwitchTheme.checked.on : toggleSwitchTheme.checked.off,
    className
  ]);

  const labelClasses = filterClases([
    getLabelClasses(size),
    disabled ? toggleSwitchTheme.disabled.on : toggleSwitchTheme.disabled.off,
    labelClass
  ]);

  const toggleSwitchInput = filterClases([
    toggleSwitchTheme.toggleSwitchInput,
    disabled ? "cursor-not-allowed" : toggleSwitchTheme.disabled.off
  ]);

  return (
    <div className={`${toggleSwitchTheme.container}`}>
      {label && (
        <label htmlFor={id} className={`${labelClasses}`}>
          {label}
        </label>
      )}
      <div className={`${switchClasses} `}>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className={`${toggleSwitchInput}`}
        />
        <span
          className={`${getSwitchHandleClasses(size)} ${
            checked ? toggleSwitchTheme.switchHandle.on : ""
          }`}
        />
      </div>
    </div>
  );
};

const getSizeClasses = (size: ToggleSwitchSize): string => {
  return toggleSwitchTheme.size[size];
};

const getLabelClasses = (size: ToggleSwitchSize): string => {
  const baseClass = toggleSwitchTheme.label;
  const sizeClass = toggleSwitchTheme.labelSize[size] || "";

  return `${baseClass} ${sizeClass}`;
};

const getSwitchHandleClasses = (size: ToggleSwitchSize): string => {
  const baseClass = toggleSwitchTheme.switchHandle.base;
  const sizeClass = toggleSwitchTheme.switchHandle.size[size] || "";

  return `${baseClass} ${sizeClass}`;
};

const filterClases = (classes: Array<string | undefined>): string => {
  return classes.filter(Boolean).join(" ");
};

export default ToggleSwitch;
