import React from "react";

interface LoaderProps {
  show: boolean;
  className?: string;
}

const Loader: React.FC<LoaderProps> = ({
  show,
  className = "absolute top-[calc(50%-60px)] left-1/2"
}) => {
  if (!show) return null;

  return (
    <div
      className={`${className} flex justify-center items-center bg-gray-100 pointer-events-none`}
    >
      <div className="loader border-8 border-gray-300 border-t-8 border-t-profit rounded-full w-12 h-12 animate-spin"></div>
    </div>
  );
};

export default Loader;
