// Import Core functionality/component
import { useEffect, useMemo, useState } from "react";

// Import Components
import Image from "next/image";
import SearchField from "../SearchField";

// Import Types

// Import Images
import dropdownIcon from "@/assets/icons/dropdownIcon.svg";
import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import {
  getProductNameWithSizeAndCaseSku,
  toLowerOrEmpty
} from "@/utils/helper";

export interface MultiSelectOptionsModalProps {
  options: { id: number; name: string; internalCode?: string; size?: string }[];
  selectedOptionIds?: number[];
  handleApplyClick?: (ids: number[]) => void;
  handleResetClick?: () => void;
}

const MultiSelectOptionsModal: React.FC<MultiSelectOptionsModalProps> = ({
  options,
  selectedOptionIds,
  handleResetClick,
  handleApplyClick
}) => {
  const MAX_LENGTH = options?.length;
  const DEFAULT_ID = -1;
  const isLoading = false;
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [searchText, setSearchText] = useState<string>("");
  const [selectedOptions, setSelectedOptions] = useState<number[]>(
    selectedOptionIds ?? []
  );
  const [showWarning, setShowWarning] = useState(false);

  const optionsData = useMemo<
    { id: number; name: string; internalCode?: string; size?: string }[]
  >(() => {
    // Return all options if no search text
    if (!searchText) {
      return options;
    }

    const searchLower = toLowerOrEmpty(searchText);

    // Filter options based on search text
    return options.filter((option: any) => {
      const fullProductName = getProductNameWithSizeAndCaseSku(
        toLowerOrEmpty(option.name),
        toLowerOrEmpty(option.size),
        undefined
      );

      return fullProductName?.includes(searchLower);
    });
  }, [searchText, options]);

  // Helper function to check if a product should be greyed out
  const isNAProduct = (option: any) => {
    return option?.internalCode === "NA" || option?.internalCode === "N/A";
  };

  const isAllSelected = useMemo<boolean>(() => {
    return !!(
      optionsData?.length &&
      (!selectedOptions?.length ||
        optionsData?.every((op: any) => selectedOptions?.includes(op.id)))
    );
  }, [optionsData, selectedOptions]);

  useEffect(() => {
    if (isOpen) {
      document.body.classList.add("overflow-hidden");
    } else {
      document.body.classList.remove("overflow-hidden");
    }

    return () => document.body.classList.remove("overflow-hidden");
  }, [isOpen]);

  // Handle checkbox selection
  const toggleSelection = (id: number) => {
    if (
      selectedOptions?.length == MAX_LENGTH &&
      !selectedOptions.includes(id)
    ) {
      // Show the warning
      setShowWarning(true);

      // Hide the warning after 3 seconds (3000 milliseconds)
      setTimeout(() => {
        setShowWarning(false);
      }, 1500);
      return;
    }

    setSelectedOptions((prev) =>
      prev.includes(id)
        ? prev.filter((optionId) => optionId !== id && optionId != DEFAULT_ID)
        : [...prev.filter((optionId) => optionId != DEFAULT_ID), id]
    );
  };

  // Handle all checkbox selection
  const toggleAllSelection = () => {
    if (isAllSelected) {
      setSelectedOptions([DEFAULT_ID]);
    } else {
      setSelectedOptions(optionsData?.map((op: any) => op.id));
    }
  };

  // Reset selected options
  const handleReset = () => {
    setSelectedOptions([DEFAULT_ID]);
    if (handleResetClick) handleResetClick();
    setIsOpen(false);
  };

  // Apply selection (You can handle API calls or state updates here)
  const handleApply = () => {
    if (handleApplyClick)
      handleApplyClick(
        isAllSelected ||
          (selectedOptions?.length == 1 && selectedOptions.includes(DEFAULT_ID))
          ? []
          : selectedOptions
      );
    setIsOpen(false);
  };

  const handleClose = () => {
    setSelectedOptions(selectedOptionIds ?? []);
    setSearchText("");
    setIsOpen(false);
  };

  return (
    <>
      <div
        style={{
          position: "relative"
        }}
      >
        <button
          onClick={() => (isOpen ? handleClose() : setIsOpen(true))}
          className="h-full w-full px-4 py-2.5 text-left bg-white border border-border-gray rounded outline-none"
        >
          <span className="flex items-center justify-between gap-4">
            <span className="text-filter-light">
              {!isAllSelected &&
              selectedOptions?.length &&
              !(
                selectedOptions?.length == 1 &&
                selectedOptions.includes(DEFAULT_ID)
              )
                ? `Products (${selectedOptions?.length})`
                : "All Products"}
            </span>
            <span className="pointer-events-none">
              <Image
                src={dropdownIcon.src}
                height={6}
                width={10}
                alt="dropdownIcon"
              />
            </span>
          </span>
        </button>

        {isOpen && (
          <div
            className="fixed w-full h-screen z-50 bg-black bg-opacity-30 top-0 left-0"
            onClick={handleClose}
          ></div>
        )}
        {isOpen && (
          <div className="rounded-lg p-4 bg-white mt-1 w-[350px] sm:w-[400px] md:w-[730px] 2xl:w-[900px] fixed left-2/4 top-2/4 transform -translate-x-2/4 -translate-y-2/4 z-50 shadow-lg">
            <div className="flex justify-between mb-6">
              <div className="text-base font-semibold">Products</div>
              <Image
                onClick={handleClose}
                className="cursor-pointer"
                src={popupCloseIcon.src}
                alt="popupCloseIcon"
                height={13}
                width={13}
              />
            </div>
            <div className="flex flex-row gap-2 w-full mb-4 items-center justify-between">
              <ul className="grid">
                <li className="p-2">
                  <div className="relative display-products-only-container flex items-center gap-2">
                    <div className="flex items-center space-x-2 overflow-hidden">
                      <label
                        htmlFor="option-all"
                        className="text-sm font-medium cursor-pointer text-filter-light select-none truncate"
                      >
                        Select All
                      </label>
                      <input
                        onChange={toggleAllSelection}
                        id="option-all"
                        type="checkbox"
                        checked={isAllSelected}
                        className="cursor-pointer w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </div>
                  </div>
                </li>
              </ul>
              <div className="w-50%">
                <SearchField
                  className="w-full"
                  containerclass="min-[991px]:w-auto"
                  onInputChange={(val: any) => {
                    setSearchText(val);
                  }}
                />
              </div>
            </div>
            <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-1 overflow-auto flex-1 min-h-0 max-h-48 [@media(min-height:600px)]:max-h-[15vh] [@media(min-height:720px)]:max-h-[50vh] mb-4">
              {optionsData?.map((option: any, index: number) => {
                const productNameWithSize = getProductNameWithSizeAndCaseSku(
                  option.name,
                  option.size,
                  undefined
                );
                const isNA = isNAProduct(option);
                return (
                  <li
                    className={`p-2 ${isNA ? "bg-[#f4f4f5]" : ""}`}
                    key={`${index}-${option.id}`}
                  >
                    <div className="relative display-products-only-container flex items-center gap-2">
                      <div className="flex items-center space-x-2 overflow-hidden">
                        <input
                          checked={
                            !selectedOptions?.length ||
                            selectedOptions.includes(option.id)
                          }
                          onChange={() => toggleSelection(option.id)}
                          id={`option-${option.id}`}
                          type="checkbox"
                          className="cursor-pointer w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded-sm focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                        />
                        <label
                          htmlFor={`option-${option.id}`}
                          className={`ms-2 text-sm font-medium cursor-pointer select-none truncate ${isNA ? "text-zinc-400" : "text-filter-light"}`}
                        >
                          <span
                            data-product-id={option.id}
                            className="block w-full overflow-hidden text-ellipsis whitespace-nowrap sm:whitespace-normal sm:line-clamp-2"
                            title={productNameWithSize}
                          >
                            {productNameWithSize}
                          </span>
                        </label>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {showWarning && (
              <div
                className="p-4 mb-4 text-sm text-yellow-800 rounded-lg bg-yellow-50 dark:bg-gray-800 dark:text-yellow-300"
                role="alert"
              >
                <span className="font-medium">
                  Maximum limit reached: You can select up to {MAX_LENGTH}{" "}
                  products.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button
                disabled={isLoading}
                className="w-auto flex gap-2 justify-center items-center bg-black text-white px-7 py-2.5 rounded-md hover:bg-opacity-90 text-sm font-medium"
                type="button"
                onClick={handleReset}
              >
                Reset
              </button>
              <button
                disabled={isLoading}
                className="w-auto flex gap-2 justify-center items-center bg-green text-white px-7 py-2.5 rounded-md hover:bg-opacity-90 text-sm font-medium"
                type="button"
                onClick={handleApply}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};
export default MultiSelectOptionsModal;
