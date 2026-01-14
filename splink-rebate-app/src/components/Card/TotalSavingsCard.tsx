import React from "react";
import Link from "next/link";
import Image from "next/image";

// Import Components
import Card from "../Card/";

// Import Images
import greenDollarIcon from "@/assets/icons/greenDollarIcon.svg";

export interface TotalSavingsCardType {
  icon?: string;
  label: string;
  value: string;
  yoyLabel?: string;
  yoyValue?: number;
  fullWidth?: boolean;
  isFlexible?: boolean;
  info?: string;
  footerInfo?: string;
  link?: {
    label?: string;
    href?: string;
  };
}

// Import Images
import grayWatchIcon from "../../assets/icons/grayWatchIcon.svg";
import YoyArrowIcon from "../../assets/icons/yoyArrowIcon.svg";
import yoyArrowRedIcon from "../../assets/icons/yoyArrowRedIcon.svg";

function TotalSavingsCard({
  icon = greenDollarIcon.src,
  label,
  value,
  yoyValue,
  yoyLabel,
  fullWidth,
  isFlexible = false,
  link,
  footerInfo,
  info
}: TotalSavingsCardType) {
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
      <div className="flex justify-between mb-2 items-center">
        <div
          className="text-xl font-semibold"
          dangerouslySetInnerHTML={{ __html: value }}
        ></div>

        {yoyValue && (
          <div
            className={`flex items-center p-1 rounded-sm text-xs font-normal  ${
              Number(yoyValue) > 0
                ? "bg-profit-bg text-profit"
                : "bg-red-300 text-red-700"
            }`}
          >
            <Image
              className={`${Number(yoyValue) < 0 && "rotate-90"}`}
              src={
                Number(yoyValue) > 0 ? YoyArrowIcon.src : yoyArrowRedIcon.src
              }
              alt="YoY Arrow Icon"
              width={21}
              height={21}
            />
            <div className="text-center">
              {yoyValue} {yoyLabel || "% YoY"}
            </div>
          </div>
        )}
      </div>
      <div className="text-heading-light">
        {info && (
          <div className="flex gap-1 text-sm">
            <Image
              src={grayWatchIcon.src}
              width={12}
              height={12}
              alt="watch icon"
            />
            {info}
          </div>
        )}
        <div className="flex gap-3 justify-end mt-5 pt-5 items-center border-t border-border-gray">
          <span className="text-xs">{footerInfo}</span>
          {link?.href && (
            <Link
              className="bg-border-gray rounded py-3 px-4 font-medium text-heading-light text-sm hover:opacity-60 text-center min-w-36"
              href={link?.href}
            >
              {link?.label}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}

export default TotalSavingsCard;
