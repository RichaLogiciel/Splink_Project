export type ButtonSize = "sm" | "md" | "lg";
export type ButtonType =
  | "primary"
  | "dark"
  | "success"
  | "danger"
  | "warning"
  | "";

export interface ButtonProps {
  color?: ButtonType;
  size?: ButtonSize;
  full?: boolean;
  outline?: boolean;
  rounded?: boolean;
  disabled?: boolean;
  className?: string;
}
