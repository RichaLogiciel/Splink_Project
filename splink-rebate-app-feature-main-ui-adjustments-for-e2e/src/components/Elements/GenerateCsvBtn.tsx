import greenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import greenDownloadIcon from "@/assets/icons/greenDownloadIcon.svg";
import greenInfo from "@/assets/icons/greenInfo.svg";
import storeIcon from "@/assets/icons/storeIcon.svg";
import usersIcon from "@/assets/icons/usersIcon.svg";
import { REPORT_TYPE } from "@/utils/constants";
import { exportStoreEarningsCSV } from "@/utils/csvExport";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";

const GenerateCsvBtn = ({
  manufacturerId,
  manufacturerName,
  programTimeline,
  reportTypes,
  onClickHandler
}: {
  manufacturerId?: number;
  manufacturerName?: string;
  programTimeline?: string;
  reportTypes?: { value: string; label: string }[];
  onClickHandler?: any;
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState("all");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const defaultReportTypeOptions = [
    { value: REPORT_TYPE.ALL, label: "All" },
    { value: REPORT_TYPE.STORE_EARNINGS, label: "Store Earnings" },
    { value: REPORT_TYPE.PROGRAM_SUMMARY, label: "Program Summary" }
  ];

  const reportTypeOptions = reportTypes || defaultReportTypeOptions;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleExportCSV = async (reportType: string = selectedReportType) => {
    setIsExporting(true);
    setIsDropdownOpen(false);
    try {
      if (onClickHandler) {
        await onClickHandler();
      } else if (reportType === REPORT_TYPE.ALL) {
        // Loop through all report types
        for (const reportType of reportTypeOptions) {
          if (reportType.value === REPORT_TYPE.ALL) continue;
          // Export the report type
          await exportStoreEarningsCSV({
            manufacturerId: manufacturerId,
            manufacturerName: manufacturerName,
            programTimeline: programTimeline,
            reportType: reportType.value
          });
          // Wait 2 second to bypass Chrome's multiple download popup
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } else {
        // Export the selected report type
        await exportStoreEarningsCSV({
          manufacturerId: manufacturerId,
          manufacturerName: manufacturerName,
          programTimeline: programTimeline,
          reportType: reportType
        });
      }
      toast.success("CSV file downloaded successfully!");
    } catch (error: any) {
      toast.error(
        error?.message || "Failed to download CSV file. Please try again."
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleDropdownToggle = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleOptionClick = (reportType: string) => {
    setSelectedReportType(reportType);
    handleExportCSV(reportType);
  };

  return (
    <div className="ml-auto min-w-fit">
      <div className="relative inline-block" ref={dropdownRef}>
        {/* Split Button */}
        <div className="flex">
          {/* Main Button */}
          <button
            className="flex gap-1.5 items-center border border-green text-green rounded-l-md px-3 py-1.5 text-sm hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed disabled:animate-pulse bg-white"
            onClick={handleDropdownToggle}
            disabled={isExporting}
          >
            <Image
              src={greenDownloadIcon}
              alt="downloadIcon"
              width={14}
              height={14}
            />
            Generate Report
          </button>

          {/* Dropdown Arrow */}
          <button
            className="flex items-center justify-center border border-green border-l-0 text-green rounded-r-md px-2 py-1.5 text-xs hover:bg-green hover:text-white disabled:opacity-50 disabled:cursor-not-allowed bg-white"
            onClick={handleDropdownToggle}
            disabled={isExporting}
          >
            <svg
              className={`w-3 h-3 transition-transform duration-200 ${
                isDropdownOpen ? "rotate-180" : ""
              }`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>

        {/* Dropdown Menu */}
        {isDropdownOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
            <div className="py-1">
              {reportTypeOptions.map((option) => (
                <button
                  key={option.value}
                  className="w-full text-left px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 hover:text-gray-900 flex items-center"
                  onClick={() => handleOptionClick(option.value)}
                >
                  <span className="mr-2">
                    {option.value === REPORT_TYPE.SALES_REP_EARNINGS && (
                      <Image
                        src={usersIcon}
                        alt="Store Earnings"
                        width={16}
                        height={16}
                      />
                    )}
                    {option.value === REPORT_TYPE.STORE_EARNINGS && (
                      <Image
                        src={storeIcon}
                        alt="Store Earnings"
                        width={16}
                        height={16}
                      />
                    )}
                    {option.value === REPORT_TYPE.PROGRAM_SUMMARY && (
                      <Image
                        src={greenDollarIcon}
                        alt="Program Summary"
                        width={16}
                        height={16}
                      />
                    )}
                    {option.value === REPORT_TYPE.ALL && (
                      <Image
                        src={greenInfo}
                        alt="All Reports"
                        width={16}
                        height={16}
                      />
                    )}
                  </span>
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default GenerateCsvBtn;
