"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

// Import Components
import ToggleSwitch from "../../core-ui/ToggleSwitch/";
import Card from "../Card/";

export interface DashboardCardType {
  icon: string;
  label: string;
  value: string;
  values?: string[];
  buttonLabels?: string[];
  yoyLabel?: string;
  yoyValue?: number;
  fullWidth?: boolean;
  isFlexible?: boolean;
  link?: {
    label?: string;
    href?: string;
  };
  valueInfoText?: string;
  showEstimatedWarning?: boolean;
  id?: string;
  rightSideLabel?: string;
  rightSideValue?: string;
  switcherLabel?: string;
}

// Import Images
import { formatNumber } from "@/utils/numberFormatter";
import YoyArrowIcon from "../../assets/icons/yoyArrowIcon.svg";
import yoyArrowRedIcon from "../../assets/icons/yoyArrowRedIcon.svg";
import EstimatedSavingsWarningPopOver from "../Popovers/EstimatedSavingsWarning";

function DashboardCard({
  icon,
  label,
  value,
  yoyValue,
  yoyLabel,
  fullWidth,
  isFlexible = false,
  link,
  values = [],
  buttonLabels = [],
  valueInfoText,
  showEstimatedWarning,
  id,
  rightSideLabel,
  rightSideValue,
  switcherLabel
}: DashboardCardType) {
  const [showRightSide, setShowRightSide] = useState(false);

  const handleSwitcherChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setShowRightSide(e.target.checked);
  };

  const shouldShowSwitcher =
    rightSideValue && rightSideValue !== "0" && rightSideLabel;
  const shouldShowRightSide = shouldShowSwitcher && showRightSide;

  return (
    <Card
      id={id}
      className={`relative w-full h-[121px] ${
        !fullWidth && " lg:w-[calc(25%-18px)]"
      } ${isFlexible ? "flex-1" : "flex-0"} items-center
      ${rightSideValue != undefined ? "flex flex-row justify-between" : ""}
      `}
    >
      <div className="flex flex-col">
        <div className="flex justify-between mb-4 flex-col">
          <div className="flex gap-1.5 items-center">
            <Image src={icon} alt="Total Sales Icon" width={21} height={21} />
            <span className="text-sm font-medium text-heading-light">
              {shouldShowRightSide ? rightSideLabel : label}
            </span>
          </div>
        </div>
        <div
          className={`flex justify-between mb-0 ${valueInfoText ? "items-end" : ""}`}
        >
          <div className={`flex justify-start gap-2 items-center mb-0`}>
            {showEstimatedWarning ? (
              <div className="flex items-center gap-1.5">
                <div
                  className="text-2xl font-semibold"
                  dangerouslySetInnerHTML={{
                    __html: shouldShowRightSide ? rightSideValue : value
                  }}
                ></div>
                <EstimatedSavingsWarningPopOver />
              </div>
            ) : (
              <div
                className="text-2xl font-semibold"
                dangerouslySetInnerHTML={{
                  __html: shouldShowRightSide ? rightSideValue : value
                }}
              ></div>
            )}
            {valueInfoText ? (
              <span className="d-block text-lg">{valueInfoText}</span>
            ) : null}
          </div>

          {link?.href && (
            <Link className="text-sm font-medium text-green" href={link?.href}>
              {link?.label}
            </Link>
          )}

          {yoyValue && Number(yoyValue) ? (
            <div
              className={`flex gap-1 items-center p-1 rounded-sm text-sm font-normal  ${
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
                width={12}
                height={12}
              />
              <div className="text-center">
                {formatNumber(yoyValue, false, 1)} {yoyLabel || "% YoY"}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {shouldShowSwitcher && (
        <div className="absolute top-3 right-3">
          <ToggleSwitch
            checked={showRightSide}
            onChange={handleSwitcherChange}
            label={!showRightSide ? switcherLabel : ""}
            size="sm"
            color="green"
            labelClass="text-xs font-medium text-heading-light"
          />
        </div>
      )}
    </Card>
  );
}

export default DashboardCard;
