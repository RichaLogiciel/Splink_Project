"use client";

import dropdownIcon from "@/assets/icons/dropdownIcon.svg";
import { generateQueryString } from "@/utils/helper";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

interface DropdownProps {
  options: DropdownOption[];
  queryParamKey: string;
  labelPrefix?: string;
  excludePageParam?: boolean;
  onOptionChange?: (val: string) => void;
  value?: string; // Controlled value prop
  defaultValue?: string; // Default value to show when no URL param exists
  minWidth?: string;
  classes?: string;
  optionsContainerClasses?: string;
  optionsClasses?: string;
  startFromRight?: boolean;
  id?: string;
}

interface DropdownOption {
  label: string;
  value: string;
}

const CustomDropdown: React.FC<DropdownProps> = ({
  options,
  queryParamKey,
  labelPrefix,
  excludePageParam,
  onOptionChange,
  value,
  defaultValue,
  minWidth = "sm:min-w-60",
  classes,
  optionsContainerClasses,
  optionsClasses,
  startFromRight,
  id
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());

  // If onOptionChange is provided, use controlled mode (no URL dependency)
  // Otherwise, use URL-based mode
  const urlValue = params.get(queryParamKey);

  // Determine current selection: controlled value > URL value > defaultValue > default
  const getCurrentSelection = () => {
    if (value !== undefined && onOptionChange) {
      // Controlled mode
      return (
        options.find((item) => item.value === value)?.label ||
        options[0]?.label ||
        ""
      );
    }
    // URL-based mode: URL value > defaultValue > first option
    const valueToUse = urlValue !== null ? urlValue : defaultValue;
    return (
      options.find((item) => item.value === valueToUse)?.label ||
      options[0]?.label ||
      ""
    );
  };

  const [isOpen, setIsOpen] = useState(false);
  const [currentSelection, setCurrentSelection] = useState(
    getCurrentSelection()
  );

  // Update selection when controlled value or URL changes
  useEffect(() => {
    if (onOptionChange && value !== undefined) {
      // Controlled mode - update from prop
      const newSelection =
        options.find((item) => item.value === value)?.label ||
        options[0]?.label ||
        "";
      setCurrentSelection(newSelection);
    } else if (!onOptionChange) {
      // URL-based mode - update from URL or defaultValue
      const valueToUse = urlValue !== null ? urlValue : defaultValue;
      const newSelection =
        options.find((item) => item.value === valueToUse)?.label ||
        options[0]?.label ||
        "";
      setCurrentSelection(newSelection);
    }
  }, [value, urlValue, defaultValue, options, onOptionChange]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleOptionChange = (option: DropdownOption) => () => {
    setCurrentSelection(option.label);

    if (onOptionChange) {
      onOptionChange(option.value);
      setIsOpen(false);
      return;
    }

    const queryString = generateQueryString(
      params,
      excludePageParam
        ? {
            [queryParamKey]: option.value || null
          }
        : {
            [queryParamKey]: option.value || null,
            page: 1 // Reset page to 1 for new queries
          }
    );

    // Push the search query to the router
    router.push(`${location.pathname}?${queryString}`);
    setIsOpen(false);
  };

  return (
    <div id={id} className="relative w-full sm:w-auto" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={
          classes
            ? classes
            : `h-full w-full px-4 py-2.5 text-left bg-white border border-border-gray rounded outline-none`
        }
      >
        <span className="flex items-center justify-between gap-4">
          <span className="text-filter-light">
            {labelPrefix && (
              <span className="text-[#4C4D52B2]">{labelPrefix} </span>
            )}
            {currentSelection}
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
          className={
            optionsContainerClasses
              ? optionsContainerClasses
              : `absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 overflow-auto focus:outline-none text-sm ${minWidth} ${startFromRight ? "end-0" : ""}`
          }
        >
          {options.map((option) => (
            <div
              key={`${labelPrefix}-${option.value}`}
              className={
                optionsClasses
                  ? optionsClasses
                  : "cursor-pointer select-none px-4 py-2 relative hover:bg-heading-blue hover:text-white"
              }
              onClick={handleOptionChange(option)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;
