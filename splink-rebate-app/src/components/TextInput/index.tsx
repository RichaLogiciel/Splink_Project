import { InputHTMLAttributes } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  containerClassName?: string;
  inputClassName?: string;
}

const TextInput = ({
  value = "",
  onChange = () => {},
  placeholder,
  name,
  required = false,
  containerClassName = "",
  inputClassName = ""
}: TextInputProps) => {
  return (
    <div className={containerClassName}>
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`bg-common-bg rounded p-2 placeholder:heading-very-light focus:outline-none focus:ring-2 focus:ring-blue-500 ${inputClassName}`}
      />
    </div>
  );
};

export default TextInput;
