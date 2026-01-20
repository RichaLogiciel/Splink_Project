"use client";

import Image from "next/image";
import { useState } from "react";

// Import Components
import Card from "../Card";

export interface StoreEarningCardType {
  icon: string;
  label: string;
  value: string;
  buttonLabel?: string;
  fullWidth?: boolean;
  id?: string;
  isFlexible?: boolean;
  showDownloadButton?: boolean;
}

// Import Images
import { exportStoreEarningsCSV } from "@/utils/csvExport";
import { toast } from "react-toastify";

function StoreEarningCard({
  icon,
  label,
  value,
  fullWidth,
  isFlexible = false,
  id,
  buttonLabel = "Generate Report",
  showDownloadButton = false
}: StoreEarningCardType) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      await exportStoreEarningsCSV();
      toast.success("CSV file downloaded successfully!");
    } catch (error: any) {
      toast.error(
        error?.message || "Failed to download CSV file. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card
      id={id}
      className={`relative w-full h-[121px] ${
        !fullWidth && " lg:w-[calc(25%-18px)]"
      } ${isFlexible ? "flex-1" : "flex-0"} items-center
      ${value != undefined ? "flex flex-row justify-between" : ""}
      `}
    >
      <div className="flex flex-col w-full">
        <div className="flex justify-between mb-4 flex-col">
          <div className="flex gap-1.5 items-center">
            <Image src={icon} alt="Total Sales Icon" width={21} height={21} />
            <span className="text-sm font-medium text-heading-light">
              {label}
            </span>
          </div>
        </div>
        <div className="flex mb-0 justify-between gap-2">
          <div className="flex justify-start gap-2 items-center mb-0">
            <div className="flex items-center gap-1.5">
              <div
                className="text-2xl font-semibold"
                dangerouslySetInnerHTML={{
                  __html: value
                }}
              ></div>
            </div>
          </div>
          {showDownloadButton && (
            <button
              className={`block text-sm font-medium text-right hover:opacity-70 ${isExporting ? "text-gray-500 animate-pulse cursor-not-allowed" : "text-green"} relative outline-none`}
              onClick={(e) => {
                e.preventDefault();
                handleExportCSV();
              }}
            >
              {isExporting ? "Generating..." : buttonLabel}
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default StoreEarningCard;
