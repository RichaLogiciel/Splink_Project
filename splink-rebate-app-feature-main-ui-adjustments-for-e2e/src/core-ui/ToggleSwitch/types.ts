export type ToggleSwitchSize = "sm" | "md" | "lg";
export type ToggleSwitchProps = {
  checked: boolean;
  color?: string;
  size?: ToggleSwitchSize;
  disabled?: boolean;
  label?: string;
  id?: string;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  className?: string;
  labelClass?: string;
};
