import { ReactNode } from "react";
interface RowProps {
  children: ReactNode;
  className?: string;
  gap?: string;
  marginBottom?: string;
}
const Row = ({ children, className, gap, marginBottom }: RowProps) => {
  return (
    <div
      className={`flex ${marginBottom ? marginBottom : "mb-6"} ${
        gap ? gap : "gap-6"
      } 
      ${className ? className : ""}`}
    >
      {children}
    </div>
  );
};

export default Row;
