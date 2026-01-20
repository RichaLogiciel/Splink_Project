import React from "react";
import { buttonTheme } from "./theme";
import { ButtonProps, ButtonSize, ButtonType } from "./types";

const Button: React.FC<
  ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({
  color = "",
  size = "md",
  full = false,
  outline = false,
  rounded = false,
  disabled = false,
  className = "",
  ...rest
}) => {
  const buttonClasses = [
    buttonTheme.base,
    getSizeClasses(size),
    getColorClasses(color, outline),
    rounded ? buttonTheme.rounded.on : buttonTheme.rounded.off,
    outline ? buttonTheme.outline : "",
    full ? buttonTheme.fullSized : "",
    disabled ? buttonTheme.disabled : "",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return <button className={buttonClasses} disabled={disabled} {...rest} />;
};

/**
 * Returns the CSS classes for the given size property based on the buttonTheme.
 *
 * @param {ButtonSize} size - The size of the button.
 * @return {string}
 */
const getSizeClasses = (size: ButtonSize): string => {
  return buttonTheme.size[size] || "";
};

/**
 * Returns the CSS classes for the given color and outline properties.
 *
 * @param {ButtonType} color - The color of the button.
 * @param {boolean} outline - Whether the button should have an outline.
 * @return {string}
 */
const getColorClasses = (color: ButtonType, outline: boolean): string => {
  if (!color) return "";

  return outline ? buttonTheme.outlineColor[color] : buttonTheme.color[color];
};

export default Button;
