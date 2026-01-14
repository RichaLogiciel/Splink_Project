"use client";

import greenDownloadIcon from "@/assets/icons/greenDownloadIcon.svg";
import { StoreTableData } from "@/types/StoreTypes";
import {
  CSVFieldConfig,
  downloadCSV,
  fieldPresets,
  generateStoreCSV,
  getTimestamp
} from "@/utils/csvUtils";
import { downloadStoresListingCSV } from "@/views/Distributor/programDetailAPIsClient";
import Image from "next/image";
import { useState } from "react";
import { toast } from "react-toastify";

interface DownloadCSVButtonProps {
  stores?: StoreTableData[];
  filename: string;
  fieldPreset?: keyof typeof fieldPresets;
  customFields?: CSVFieldConfig[];
  disabled?: boolean;
  className?: string;
  // API-based download props
  manufacturerId?: number;
  enrolled?: boolean | string;
  searchQuery?: string;
  warehouseId?: string;
  programTimeline?: string;
  isInternal?: boolean;
  isIndependentStores?: boolean;
  hideEnrollTable?: boolean;
  sort?: string;
  sortKey?: string;
  canDownloadFromAPI?: boolean;
  agreementId?: string | number;
}

const DownloadCSVButton = ({
  stores,
  filename,
  fieldPreset,
  customFields,
  disabled = false,
  className = "",
  // API-based download props
  canDownloadFromAPI = false,
  manufacturerId,
  enrolled,
  searchQuery,
  warehouseId,
  programTimeline,
  isInternal,
  isIndependentStores,
  hideEnrollTable,
  sort,
  sortKey,
  agreementId
}: DownloadCSVButtonProps) => {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadCSV = async () => {
    try {
      // Use API-based download if manufacturerId is provided
      if (manufacturerId !== undefined && canDownloadFromAPI) {
        setIsDownloading(true);
        const toastId = toast.info(
          "Export started! Your download will begin shortly."
        );
        try {
          const blob = await downloadStoresListingCSV(
            manufacturerId,
            searchQuery || "",
            enrolled,
            warehouseId,
            programTimeline,
            isInternal,
            isIndependentStores,
            hideEnrollTable,
            sort,
            sortKey,
            agreementId
          );

          // Validate that we have a valid Blob
          if (!blob || !(blob instanceof Blob)) {
            throw new Error("Invalid blob received from API");
          }

          // Create a download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");
          link.href = url;
          const currentDate = new Date().toISOString().split("T")[0];
          link.download = `${filename}-${currentDate}.csv`;
          document.body.appendChild(link);

          // Dismiss info toast before starting download
          toast.dismiss(toastId);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          toast.success("CSV downloaded successfully");
        } catch (error) {
          // Dismiss info toast before starting download
          toast.dismiss(toastId);
          console.error("Error downloading CSV from API:", error);
          toast.error("Failed to download CSV file");
        } finally {
          setIsDownloading(false);
        }
        return;
      }

      // Fallback to client-side CSV generation if API props are not provided
      if (!stores || stores.length === 0) {
        toast.error("No data available for download");
        return;
      }

      if (!fieldPreset) {
        toast.error("Field preset is required for client-side CSV generation");
        return;
      }

      const fields = customFields || fieldPresets[fieldPreset];
      const csvContent = generateStoreCSV(stores, fields);
      const timestampedFilename = `${filename}-${getTimestamp()}.csv`;

      downloadCSV(csvContent, timestampedFilename);
      toast.success(`Downloaded ${stores.length} records to CSV`);
    } catch (error) {
      console.error("Error downloading CSV:", error);
      toast.error("Failed to download CSV file");
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownloadCSV}
      disabled={disabled || isDownloading}
      className={`text-green border border-green rounded px-3 py-2 hover:opacity-75 flex items-center gap-2 ${className} ${disabled || isDownloading ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <Image src={greenDownloadIcon} alt="Download Icon" />
      {isDownloading ? "Generating..." : "Generate Report"}
    </button>
  );
};

export default DownloadCSVButton;
