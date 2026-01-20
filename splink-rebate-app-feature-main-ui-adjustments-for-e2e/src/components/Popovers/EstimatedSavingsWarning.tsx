"use client";
import infoIcon from "@/assets/icons/redInfo.svg";
import { MESSAGES } from "@/configs/messages";
import Image from "next/image";
import { useState } from "react";

interface EstimatedSavingsWarningPopOverProps {
  size?: {
    width: number;
    height: number;
    class: string;
  };
  startFromLeft?: boolean;
}

const EstimatedSavingsWarningPopOver = ({
  size,
  startFromLeft = false
}: EstimatedSavingsWarningPopOverProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={(e) => {
        e.preventDefault();
        setIsOpen(!isOpen);
      }}
    >
      <button className="focus:outline-none h-auto left-[50%]">
        <Image
          className={`object-cover ${size?.class || "w-3.5 h-3.5"}`}
          src={infoIcon.src}
          alt="Info Icon"
          width={size?.width || 14}
          height={size?.height || 14}
        />
      </button>

      {isOpen && (
        <div
          style={{
            transform: startFromLeft
              ? "translate(-20%, 0)"
              : "translate(50%, 0)"
          }}
          className={`absolute z-[999] w-72 max-w-[320px] px-4 py-2 top-[150%] ${startFromLeft ? "left-[50%] right-[50%]" : "-right-16"} bg-white rounded-md shadow-xl ring-1 ring-black ring-opacity-5 text-xs text-highlighted-color`}
        >
          {MESSAGES.ESTIMATED_SAVINGS_WARNING}
        </div>
      )}
    </div>
  );
};

export default EstimatedSavingsWarningPopOver;
