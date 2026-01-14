import { SelectHTMLAttributes, forwardRef } from "react";

// Define the type for the options array
interface Option {
  value: string;
  label: string;
}

interface SelectBoxProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: Option[];
  className?: string;
  [props: string]: any;
}

const SelectBox = forwardRef<HTMLSelectElement, SelectBoxProps>(
  ({ options, className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={`rounded-md outline-none pl-3 pr-9 border-border-gray border max-w-full ${className}`}
        {...props}
      >
        {options.map((option: Option) => (
          <option value={option.value} key={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);

SelectBox.displayName = "SelectBox";

export default SelectBox;
