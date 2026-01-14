import { ReactNode, useState } from "react";
interface CardButtonProps {
  children: ReactNode;
  className?: string;
  tooltip?: string;
  [props: string]: any;
}
const CardButton = ({
  children,
  className,
  tooltip,
  ...props
}: CardButtonProps) => {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={`${props?.padding ? props?.padding : "p-2.5"} rounded cursor-pointer relative 
      ${className ? className : ""}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      {...props}
    >
      {children}
      {tooltip && showTooltip && (
        <div
          className={`absolute right-full top-1/2 -translate-y-1/2 mr-1 z-50 px-2 py-1 
          text-xs text-white bg-gray-800 rounded whitespace-nowrap`}
        >
          {tooltip}
        </div>
      )}
    </div>
  );
};

export default CardButton;
