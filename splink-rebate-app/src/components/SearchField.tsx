"use client";
import { useRouter, useSearchParams } from "next/navigation";
import React, {
  Suspense,
  useEffect,
  useRef,
  useState,
  useTransition
} from "react";

// Import components
import { useWindowWidth } from "@/utils/clientHelper";
import InputWithIcon from "./Form/InputWithIcon";

// Component Type
interface SearchFieldProps {
  [props: string]: any;
}

// Import Images
import SearchIcon from "../assets/icons/searchIcon.svg";

const SearchFieldInput: React.FC<SearchFieldProps> = ({ ...props }) => {
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const router = useRouter();
  const searchParams = useSearchParams(); // Get the current search parameters
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [isPending, startTransition] = useTransition();
  const windowWidth = useWindowWidth();

  // Scroll preservation for mobile
  const scrollPositionRef = useRef<number>(0);
  const isInitialMountRef = useRef<boolean>(true);
  const prevDebouncedSearchRef = useRef<string>("");

  // Detect mobile
  const isMobile = windowWidth <= 768;

  // Initialize search input from URL params on mount
  useEffect(() => {
    const urlSearchParam = searchParams.get("s");
    if (urlSearchParam) {
      const decodedValue = decodeURIComponent(urlSearchParam);
      setSearchInput(decodedValue);
      setDebouncedSearch(decodedValue);
    }
  }, []); // Run only on mount

  // Sync with URL changes from external sources (e.g., back button)
  useEffect(() => {
    // Check if the URL search parameter is different from the current search input and debounced search
    const urlSearchParam = searchParams.get("s");
    if (
      urlSearchParam &&
      urlSearchParam !== searchInput &&
      urlSearchParam !== debouncedSearch
    ) {
      const decodedValue = decodeURIComponent(urlSearchParam);
      setSearchInput(decodedValue);
      setDebouncedSearch(decodedValue);
    }
  }, [searchParams]); // Watch for URL changes

  const handleSearchInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchInput(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounced timer with reduced delay for better responsiveness
    debounceTimerRef.current = setTimeout(() => {
      // Trim only left and right spaces, keep internal spaces
      const trimmedValue = value.trim();
      setDebouncedSearch(trimmedValue);
    }, 300);
  };

  const handleClearButton = () => {
    setSearchInput("");
    setDebouncedSearch("");
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (props.onInputChange) {
      props.onInputChange(debouncedSearch);
      return;
    }

    // Skip scroll preservation on initial mount
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevDebouncedSearchRef.current = debouncedSearch;
    } else {
      // Capture scroll position before search update (mobile only)
      if (isMobile && prevDebouncedSearchRef.current !== debouncedSearch) {
        scrollPositionRef.current = window.scrollY;
      }
    }

    const pageVariable = props.pageVariable ? props.pageVariable : "page";
    // Get the existing search parameters from the URL
    const params = new URLSearchParams(searchParams.toString());

    if (debouncedSearch) {
      if (!params.get("s")) {
        // Remove the 'page' parameter if it exists
        params.delete(pageVariable);
      }
    }

    if (debouncedSearch) {
      // Use encodeURIComponent to properly encode special characters (e.g., # becomes %23)
      const encodedValue = encodeURIComponent(debouncedSearch);
      params.set("s", encodedValue);
    } else {
      // Remove the "s" parameter if the searchInput is empty
      params.delete("s");
    }

    // Use startTransition to mark navigation as non-urgent for better perceived performance
    // Use replace instead of push to avoid history pollution and router.replace with scroll: false for smoother UX
    startTransition(() => {
      router.replace(`${location.pathname}?${params.toString()}`, {
        scroll: false
      });
    });

    // Restore scroll position after table re-renders (mobile only)
    // Move outside startTransition for better timing and use longer delay to ensure table has rendered
    if (
      isMobile &&
      scrollPositionRef.current > 0 &&
      !isInitialMountRef.current
    ) {
      // Use setTimeout with longer delay to wait for table data to load and render
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Double-check scroll position is still needed
            if (scrollPositionRef.current > 0) {
              window.scrollTo({
                top: scrollPositionRef.current,
                behavior: "instant"
              });
            }
          });
        });
      }, 0); // Increased delay to allow table re-render to complete
    }

    prevDebouncedSearchRef.current = debouncedSearch;
  }, [
    debouncedSearch,
    router,
    searchParams,
    props.pageVariable,
    startTransition,
    isMobile
  ]);

  return (
    <Suspense>
      <InputWithIcon
        {...props}
        inputSize={"sm"}
        containerClass={`search-container w-full ${props?.containerclass || "sm:w-auto"}`}
        className={"px-9 h-10 w-full font-normal"}
        placeholder={props.placeholder || "Search"}
        value={searchInput}
        onChange={handleSearchInput}
        icon={SearchIcon.src}
        onClearBtnClick={handleClearButton}
        clearIcon={!!searchInput}
      />
    </Suspense>
  );
};

const SearchField: React.FC<SearchFieldProps> = ({ ...props }) => {
  return (
    <Suspense>
      <SearchFieldInput {...props} />
    </Suspense>
  );
};

export default SearchField;
