import React from "react";
import { TextAreaProps } from "./types";
import { textAreaTheme } from "./theme";

const TextArea: React.FC<TextAreaProps> = ({
  label,
  helperText,
  error,
  disabled,
  className,
  ...rest
}) => {
  const textAreaClasses = [
    textAreaTheme.base,
    className,
    error ? textAreaTheme.colors.error : textAreaTheme.colors.default,
    disabled ? textAreaTheme.disabled.on : textAreaTheme.disabled.off
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <>
      {label && <label className={`${textAreaTheme.label}`}>{label}</label>}
      <textarea
        className={`${textAreaClasses} `}
        {...rest}
        disabled={disabled}
      />
      {helperText && (
        <p className={`${textAreaTheme.helperText}`}>{helperText}</p>
      )}
      {error && <p className={`${textAreaTheme.errorMessage}`}>{error}</p>}
    </>
  );
};

export default TextArea;
