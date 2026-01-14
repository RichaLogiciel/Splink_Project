"use client";
import greyInfoIcon from "@/assets/icons/greyInfoIcon.svg";
import { MESSAGES } from "@/configs/messages";
import Image from "next/image";
import { useState } from "react";

interface CustomPopOverProps {
  size?: {
    width: number;
    height: number;
    class: string;
  };
  startFromLeft?: boolean;
  startFromCenter?: boolean;
  iconSrc?: string;
  message?: string;
  customPostionClass?: string;
}

const CustomPopOver = ({
  size,
  startFromLeft = false,
  startFromCenter = false,
  iconSrc = greyInfoIcon.src,
  message = MESSAGES.REBATE_BASED_ON_LIST_PRICE
}: CustomPopOverProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const getPostionClassAndStyle = (isStyle: boolean = false) => {
    if (isStyle) {
      if (startFromCenter) return "translate(-60%, 0)";

      if (startFromLeft) return "translate(-20%, 0)";

      return "translate(50%, 0)";
    }

    if (startFromLeft || startFromCenter) return "left-[50%] right-[50%]";

    return "-right-16";
  };

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
          src={iconSrc}
          alt="Info Icon"
          width={size?.width || 16}
          height={size?.height || 16}
        />
      </button>

      {isOpen && (
        <div
          style={{
            transform: getPostionClassAndStyle(true)
          }}
          className={`absolute z-[999] w-72 max-w-[320px] px-4 py-2 top-[150%] ${getPostionClassAndStyle()} bg-white rounded-md shadow-xl ring-1 ring-black ring-opacity-5 text-xs text-highlighted-color`}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default CustomPopOver;
