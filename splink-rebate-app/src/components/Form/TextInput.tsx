"use client";
import {
  Control,
  Controller,
  FieldError,
  FieldErrors,
  RegisterOptions,
  UseFormTrigger
} from "react-hook-form";

interface TextInputProps {
  label?: string;
  name: string;
  errors?: FieldErrors;
  placeholder?: string;
  rules?: RegisterOptions;
  type?: string;
  className?: string;
  control: Control<any>; // Adjust to your form's type if needed
  trigger: UseFormTrigger<any>;
  defaultValue?: any;
}

const TextInput: React.FC<TextInputProps> = ({
  label = "Text Input",
  name = "field_name",
  errors = {},
  placeholder = "Text input",
  rules = {},
  type = "text",
  className = "",
  control,
  trigger,
  defaultValue
}) => {
  return (
    <div className={`w-full ${className}`}>
      <label
        htmlFor={name}
        className="mb-1.5 text-xs text-black-lighter flex justify-between font-medium tracking-wide"
      >
        <div className="flex items-center">
          {label}
          {Object.keys(rules).filter((rule: any) => rule?.required) && (
            <span className="text-danger ml-1">*</span>
          )}
        </div>
      </label>
      <div className="relative w-full">
        <Controller
          name={name}
          control={control}
          rules={rules}
          render={({ field }) =>
            type == "textarea" ? (
              <textarea
                className={`block font-normal w-full px-3 py-2 text-highlighted-color rounded border focus:ring-2 focus:border-transparent outline-none placeholder:text-heading-very-light text-xs ${
                  errors[name]
                    ? "border-transparent ring-2 ring-error/50 focus:ring-error/50 bg-error/5"
                    : ""
                }`}
                id={name}
                placeholder={placeholder}
                value={field.value || ""}
                onChange={(e) => {
                  const formattedValue = e.target.value;
                  field.onChange(formattedValue);
                }}
                onBlur={async () => {
                  await trigger(name);
                }}
              />
            ) : (
              <input
                defaultValue={defaultValue}
                autoComplete={type === "email" ? "username" : undefined}
                className={`block font-normal w-full px-3 py-2 text-highlighted-color rounded border focus:ring-2 focus:border-transparent outline-none placeholder:text-heading-very-light text-xs ${
                  errors[name]
                    ? "border-transparent ring-2 ring-error/50 focus:ring-error/50 bg-error/5"
                    : ""
                }`}
                type={type}
                id={name}
                placeholder={placeholder}
                value={field.value || ""}
                onChange={(e) => {
                  const formattedValue = e.target.value;
                  field.onChange(formattedValue);
                }}
                onBlur={async () => {
                  await trigger(name);
                }}
              />
            )
          }
        />
        {errors[name] && (
          <span className="block text-xs my-1 font-normal text-danger">
            {typeof errors[name] === "object" && "message" in errors[name]
              ? (errors[name] as FieldError).message
              : "An error occurred."}
          </span>
        )}
      </div>
    </div>
  );
};

export default TextInput;
