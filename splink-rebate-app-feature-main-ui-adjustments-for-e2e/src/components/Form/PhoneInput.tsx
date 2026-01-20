"use client";
import {
  Controller,
  Control,
  FieldErrors,
  RegisterOptions,
  FieldError,
  UseFormTrigger,
  UseFormSetValue
} from "react-hook-form";
import { useEffect } from "react";

interface TextInputProps {
  label?: string;
  defaultValue?: string;
  name: string;
  errors?: FieldErrors;
  placeholder?: string;
  rules?: RegisterOptions;
  type?: string;
  className?: string;
  control: Control<any>; // Adjust to your form's type if needed
  trigger?: UseFormTrigger<any>;
  setValue?: UseFormSetValue<any>;
}

const TextInput: React.FC<TextInputProps> = ({
  name = "field_name",
  errors = {},
  placeholder = "",
  rules = {
    required: "Phone number is required",
    pattern: {
      value: /^\(\d{3}\) \d{3}-\d{4}$/,
      message: "Phone number must be in the format (xxx) xxx-xxxx"
    }
  },
  type = "text",
  className = "",
  control,
  defaultValue = "",
  trigger,
  setValue
}) => {
  // Function to format the phone number
  const formatPhoneNumber = (value: string) => {
    if (!value) return "";

    // Remove any non-digit characters
    const cleaned = ("" + value).replace(/\D/g, "");
    // Format the phone number
    const match = cleaned.match(/(\d{0,3})(\d{0,3})(\d{0,4})/);
    if (match) {
      const formatted = `(${match[1] ? match[1] : ""}) ${
        match[2] ? match[2] : ""
      }${match[3] ? `-${match[3]}` : ""}`;
      return formatted;
    }
  };

  useEffect(() => {
    // Format the default value when the component mounts
    if (defaultValue && setValue) {
      const formattedValue = formatPhoneNumber(defaultValue);
      setValue(name, formattedValue);
      trigger && trigger(name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative w-full">
      <Controller
        name={name}
        control={control}
        rules={rules}
        defaultValue={defaultValue}
        render={({ field }) => (
          <input
            className={className}
            type={type}
            id={name}
            placeholder={placeholder}
            value={formatPhoneNumber(field.value)}
            onChange={(e) => {
              const formattedValue = formatPhoneNumber(e.target.value);
              field.onChange(formattedValue);
            }}
            onBlur={async () => {
              trigger && (await trigger(name)); // Triggers validation for this field
              field.onBlur(); // Calls the field's onBlur event
            }}
            autoComplete={name} // Moved here, directly on input
          />
        )}
      />
      {errors[name] && (
        <span className="block text-xs text-[#FF1010]">
          {typeof errors[name] === "object" && "message" in errors[name]
            ? (errors[name] as FieldError).message
            : "An error occurred."}
        </span>
      )}
    </div>
  );
};

export default TextInput;
