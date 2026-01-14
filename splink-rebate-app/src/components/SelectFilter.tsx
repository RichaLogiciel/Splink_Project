"use client";
import { useRouter, useSearchParams } from "next/navigation";
import React, {
  SelectHTMLAttributes,
  Suspense,
  useEffect,
  useRef,
  useState
} from "react";

// Import components
import { useFilterChange } from "@/contexts/FilterChangeContext";
import { PAGINATION_PAGE_QUERY_PARAMS } from "@/utils/constants";
import SearchableSelectBox from "./Form/SearchableSelectBox";
import SelectBox from "./Form/SelectBox";

interface SelectFilterProps extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
  queryParam?: string;
  searchable?: boolean;
  [props: string]: any;
}

const SelectFilter: React.FC<SelectFilterProps> = ({
  className,
  queryParam = "srId",
  searchable = false,
  forceUpdate = false,
  ...props
}) => {
  const [selectedValue, setSelectedValue] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setFilterChanging } = useFilterChange();
  const prevSelectedValueRef = useRef<string>("");

  useEffect(() => {
    if (props?.onSelectChange) {
      // Call the onSelectChange prop if provided
      props.onSelectChange(selectedValue);
      return;
    }

    // Get the existing search parameters from the URL
    const params = new URLSearchParams(searchParams.toString());

    // Only delete pagination params when selectedValue actually changes
    // This preserves pagination params when other query params change (e.g., currentPage from pagination)
    const selectedValueChanged = prevSelectedValueRef.current !== selectedValue;
    if (selectedValueChanged) {
      // Delete parameters using values from the constant
      Object.values(PAGINATION_PAGE_QUERY_PARAMS).forEach((key) => {
        params.delete(key);
      });
      // Update the ref to track the new value
      prevSelectedValueRef.current = selectedValue;
    }

    if (selectedValue) {
      // Set or update the query parameter with the current selectedValue
      params.set(queryParam, selectedValue);
    } else {
      // Remove the query parameter if the selectedValue is empty
      params.delete(queryParam);
    }

    // Update the URL with the new search params, keeping other existing params intact
    router.push(`${location.pathname}?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValue, router, queryParam, searchParams]);

  const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newValue = event.target.value;
    // Immediately signal that filter is changing (before router.push)
    // Only trigger loading state when forceUpdate prop is true
    if (forceUpdate) {
      setFilterChanging(true);
    }
    setSelectedValue(newValue);
  };

  // Effect to get value from the URL query parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search); // Get query params from URL
    const preselectedId = params.get(queryParam); // Replace 'salesRepId' with your actual query param name
    if (preselectedId) {
      setSelectedValue(preselectedId); // Set the preselected value from the URL
      prevSelectedValueRef.current = preselectedId; // Initialize the ref with the preselected value
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Suspense>
      {searchable ? (
        <SearchableSelectBox
          onChange={handleSelectChange}
          className={className || "flex-auto sm:flex-initial"}
          value={selectedValue ?? ""}
          options={props?.options ?? []}
          placeholder={props?.searchPlaceholder || "Search..."}
          disabled={props?.disabled}
        />
      ) : (
        <SelectBox
          onChange={handleSelectChange}
          className={className || "flex-auto sm:flex-initial"}
          value={selectedValue ?? ""}
          options={props?.options ?? []}
          disabled={props?.disabled}
        />
      )}
    </Suspense>
  );
};

export default SelectFilter;
