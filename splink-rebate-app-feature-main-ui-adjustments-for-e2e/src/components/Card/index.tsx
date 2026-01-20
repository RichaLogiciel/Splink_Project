import { ReactNode } from "react";
interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: string;
  [props: string]: any;
}
const Card = ({ children, className, padding, ...props }: CardProps) => {
  return (
    <div
      {...props}
      className={`rounded-lg ${padding ? padding : "p-4"} bg-white 
      ${className ? className : ""}`}
    >
      {children}
    </div>
  );
};

export default Card;
