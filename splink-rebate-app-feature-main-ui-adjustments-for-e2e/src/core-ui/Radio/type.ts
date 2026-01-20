export type RadioProps = {
  id: string;
  name: string;
  value: string;
  label: string;
  labelStyle?: string;
  checked: boolean;
  onChange: React.ChangeEventHandler<HTMLInputElement>;
  color: string;
  size: string;
  className?: string;
  disabled?: boolean;
};
