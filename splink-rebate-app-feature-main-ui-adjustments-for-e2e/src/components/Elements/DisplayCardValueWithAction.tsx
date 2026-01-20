"use client";
import { useState } from "react";

export default function DisplayCardValueWithAction({
  values,
  buttonLabels
}: {
  values: string[];
  buttonLabels: string[];
}) {
  const [currentIndex, setCurrentIndex] = useState<number>(0);

  const toggleValue = () => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? 1 : 0));
  };

  return (
    <>
      <div
        className="text-xl font-semibold"
        dangerouslySetInnerHTML={{ __html: values[currentIndex] }}
      ></div>
      <div className="w-auto mt-1">
        <button
          className="h-full rounded py-0.5 px-1 text-xs min-[400px]:text-sm font-medium hover:opacity-90 bg-common-bg rounded"
          onClick={toggleValue}
        >
          {buttonLabels[currentIndex]}
        </button>
      </div>
    </>
  );
}
