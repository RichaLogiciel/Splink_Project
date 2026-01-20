import { ReactNode } from "react";
interface CardBlueProps {
  children: ReactNode;
  className?: string;
}
const CardBlue = ({ children, className }: CardBlueProps) => {
  return (
    <div
      className={`rounded-lg bg-blue-bg 
      ${className ? className : ""}`}
    >
      {children}
    </div>
  );
};

export default CardBlue;
