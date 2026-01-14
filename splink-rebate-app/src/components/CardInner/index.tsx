import { ReactNode } from "react";
interface CardInnerProps {
  children: ReactNode;
  className?: string;
}
const CardInner = ({ children, className }: CardInnerProps) => {
  return (
    <div
      className={`rounded-lg p-3 bg-white 
      ${className ? className : ""}`}
    >
      {children}
    </div>
  );
};

export default CardInner;
