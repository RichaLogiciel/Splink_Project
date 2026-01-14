import React from "react";

interface PasswordValidationPopOverProps {
  className?: string;
}

const PasswordValidationPopOver: React.FC<PasswordValidationPopOverProps> = ({
  className
}) => {
  const content = [
    "Password must be at least 8 characters.",
    "Must include one uppercase letter, one number, and one special character."
  ];

  return (
    <div
      className={`
        absolute z-50 bg-white shadow-popout-shadow rounded w-max max-w-sm ${className}
      `}
    >
      <div className="p-4 pl-7 text-xs text-highlighted-color">
        <ul className="list-disc">
          {content.map((item: string, index: number) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default PasswordValidationPopOver;
