"use client";

import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import Image from "next/image";
import { useEffect, useState } from "react";

export interface FilterState {
  skusNeeded?: { value: number };
  complianceMin?: number;
}

interface AdvancedFiltersModalProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  onApply: () => void;
  onReset: () => void;
  buttonRef?: React.RefObject<HTMLButtonElement>;
}

const AdvancedFiltersModal: React.FC<AdvancedFiltersModalProps> = ({
  isOpen,
  setIsOpen,
  filters,
  onFiltersChange,
  onApply,
  onReset,
  buttonRef
}) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(filters);
  const [complianceInputValue, setComplianceInputValue] = useState<string>("");

  useEffect(() => {
    setLocalFilters(filters);
    setComplianceInputValue(
      filters.complianceMin !== undefined
        ? filters.complianceMin.toString()
        : ""
    );
  }, [filters]);

  const handleSkusValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setLocalFilters((prev) => ({
      ...prev,
      skusNeeded: {
        value
      }
    }));
  };

  const handleComplianceMinChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const inputValue = e.target.value;
    setComplianceInputValue(inputValue);

    if (inputValue === "") {
      setLocalFilters((prev) => {
        const newFilters = { ...prev };
        delete newFilters.complianceMin;
        return newFilters;
      });
      return;
    }

    const parsedValue = parseFloat(inputValue);
    if (isNaN(parsedValue)) return;

    // Store the raw value while typing, will be clamped on blur or apply
    setLocalFilters((prev) => ({
      ...prev,
      complianceMin: parsedValue
    }));
  };

  const handleComplianceBlur = () => {
    // Enforce min 50 and max 100 when user finishes typing
    if (complianceInputValue === "") {
      setLocalFilters((prev) => {
        const newFilters = { ...prev };
        delete newFilters.complianceMin;
        return newFilters;
      });
      return;
    }

    const parsedValue = parseFloat(complianceInputValue);
    if (isNaN(parsedValue)) {
      setComplianceInputValue("");
      setLocalFilters((prev) => {
        const newFilters = { ...prev };
        delete newFilters.complianceMin;
        return newFilters;
      });
      return;
    }

    const clampedValue = Math.min(100, Math.max(50, parsedValue));
    setComplianceInputValue(clampedValue.toString());
    setLocalFilters((prev) => ({
      ...prev,
      complianceMin: clampedValue
    }));
  };

  const handleReset = () => {
    const emptyFilters: FilterState = {};
    setLocalFilters(emptyFilters);
    onReset();
  };

  const handleApply = () => {
    // Clamp compliance value before applying
    const finalFilters = { ...localFilters };
    if (finalFilters.complianceMin !== undefined) {
      finalFilters.complianceMin = Math.min(
        100,
        Math.max(50, finalFilters.complianceMin)
      );
    }
    onFiltersChange(finalFilters);
    onApply();
  };

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
      {isOpen && buttonRef?.current && (
        <div
          className="absolute z-50 bg-white rounded-lg shadow-xl border border-gray-200 w-80 max-h-[600px] flex flex-col left-0 md:right-0 sm:left-auto"
          style={{
            top: "calc(100% + 8px)"
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex justify-between items-center p-4 border-b bg-gray-100 rounded-t-lg">
            <h2 className="text-gray-800 text-lg font-semibold">
              Advanced Filters
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-600 hover:text-gray-800 transition-colors"
            >
              <Image
                src={popupCloseIcon.src}
                alt="Close"
                width={13}
                height={13}
              />
            </button>
          </div>

          {/* Filter Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {/* SKUs Needed Filter */}
            <div id="skus-needed-filter">
              <label
                htmlFor="skus-needed-select"
                className="block text-gray-700 text-sm font-medium mb-2"
              >
                SKUs Needed
              </label>
              <div className="flex gap-2">
                <select
                  id="skus-needed-select"
                  value="<="
                  disabled
                  className="w-20 px-3 py-2 bg-gray-100 text-gray-600 border border-gray-300 rounded outline-none text-sm cursor-not-allowed"
                >
                  <option value="<=">&lt;=</option>
                </select>
                <input
                  name="skusNeeded"
                  id="skus-needed-input"
                  type="number"
                  min="0"
                  value={localFilters.skusNeeded?.value ?? ""}
                  onChange={handleSkusValueChange}
                  placeholder="1"
                  className="flex-1 px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded outline-none focus:border-blue-500 text-sm appearance-none"
                />
              </div>
            </div>

            {/* Compliance Filter */}
            <div id="compliance-filter">
              <label
                htmlFor="compliance-input"
                className="block text-gray-700 text-sm font-medium mb-2"
              >
                Compliance % (Min 50%)
              </label>
              <div className="flex gap-2">
                <select
                  value=">="
                  disabled
                  className="w-20 px-3 py-2 bg-gray-100 text-gray-600 border border-gray-300 rounded outline-none text-sm cursor-not-allowed"
                >
                  <option value=">=">&gt;=</option>
                </select>
                <input
                  name="complianceMin"
                  id="compliance-input"
                  type="number"
                  min="50"
                  max="100"
                  value={complianceInputValue}
                  onChange={handleComplianceMinChange}
                  onBlur={handleComplianceBlur}
                  placeholder="50"
                  className="flex-1 px-3 py-2 bg-white text-gray-800 border border-gray-300 rounded outline-none focus:border-blue-500 text-sm appearance-none"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t bg-gray-100 rounded-b-lg flex gap-3">
            <button
              onClick={() => setIsOpen(false)}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Close
            </button>
            <button
              onClick={handleReset}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Reset
            </button>
            <button
              onClick={handleApply}
              className="flex-1 px-4 py-2 bg-green text-white rounded hover:bg-opacity-90 transition-colors text-sm font-medium"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AdvancedFiltersModal;
