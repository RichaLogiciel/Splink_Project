import React from "react";
import Image from "next/image";

// Import Components
import Card from "@/components/Card";

// Import Utils
import { formatNumber } from "@/utils/numberFormatter";

// Import Images
import orangeCartIcon from "@/assets/icons/orangeCartIcon.svg";
import infoIcon from "@/assets/icons/info.svg";

interface SavingsOppCardData {
  label: string;
  value: number;
  info: string;
}

export interface SavingsOppCardType {
  icon?: string;
  label: string;
  fullWidth?: boolean;
  isFlexible?: boolean;
  data?: SavingsOppCardData[];
}

function SavingsOppCard({
  icon = orangeCartIcon.src,
  label,
  data = [],
  fullWidth,
  isFlexible = false
}: SavingsOppCardType) {
  return (
    <Card
      className={`w-full ${
        !fullWidth && "sm:w-[calc(50%-12px)] lg:w-[calc(25%-18px)]"
      } ${isFlexible ? "flex-1" : "flex-0"}`}
    >
      <div className="flex justify-between mb-4">
        <div className="flex gap-1.5 items-center">
          <Image src={icon} alt="Total Sales Icon" width={21} height={21} />
          <span className="text-sm font-medium text-heading-light">
            {label}
          </span>
        </div>
      </div>
      {data?.length > 0 && (
        <>
          {data.map((row, index) => (
            <div
              key={"savingOpRow-" + index}
              className="text-filter-light py-2.5 px-3 text-sm border-b border-border-gray"
            >
              <div className="flex justify-between gap-1.5 text-filter-light">
                <span>{row.label}</span>
                <span className="text-highlighted-color font-medium flex gap-1">
                  ${formatNumber(row.value)}
                  <Image
                    title={row.info}
                    src={infoIcon.src}
                    width={12}
                    height={12}
                    alt="Info Icon"
                  />
                </span>
              </div>
            </div>
          ))}
        </>
      )}
    </Card>
  );
}

export default SavingsOppCard;
