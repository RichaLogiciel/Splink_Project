export type CheckboxProps = {
  id: string;
  label?: string;
  lableStyle?: string;
  checked?: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  onClick?: React.MouseEventHandler<HTMLInputElement>;
  color?: string;
  size?: string;
  className?: string;
  disabled?: boolean;
};
