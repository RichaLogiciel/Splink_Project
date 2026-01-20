"use client";

import Image from "next/image";
import React, { ReactNode } from "react";

interface AccordionItemProps {
  title: ReactNode;
  content: ReactNode;
  defaultOpen?: boolean;
}

// Import Images
import greyIconUp from "@/assets/icons/greyIconUp.svg";

const AccordionItem: React.FC<AccordionItemProps> = ({
  title,
  content,
  defaultOpen = false
}) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  const handleClick = () => setIsOpen(!isOpen);

  return (
    <div className="bg-white rounded-lg px-2 text-filter-light text-sm font-medium shadow">
      <div
        onClick={handleClick}
        className="cursor-pointer flex items-center text-base font-medium text-filter-light"
      >
        <div
          className={`w-7 h-7 sm:w-9 sm:h-9 flex justify-center items-center transition ${
            !isOpen && "rotate-180"
          }`}
        >
          <Image src={greyIconUp.src} width={12} height={8} alt="Info Icon" />
        </div>
        {title}
      </div>

      {isOpen && (
        <div className="content sm:pl-9 border-t border-border-gray">
          <div className="py-5 px-4">{content}</div>
        </div>
      )}
    </div>
  );
};

export default AccordionItem;
