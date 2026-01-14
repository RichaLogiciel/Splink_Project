interface DividerProps {
  marginY?: string;
  className?: string;
}
const Divider = ({ className = "", marginY }: DividerProps) => {
  return (
    <div
      className={`h-px bg-border-gray ${className} ${marginY ? marginY : "my-4"}`}
    ></div>
  );
};

export default Divider;
