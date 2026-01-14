"use client";
import { useFilterChange } from "@/contexts/FilterChangeContext";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Hook to detect when search params are changing and provide loading state
 * Combines immediate filter change detection (from context) with search params monitoring
 * to show loading immediately and keep it active until data loads
 */
export function usePageTransitionLoader() {
  const searchParams = useSearchParams();
  const { isFilterChanging } = useFilterChange();
  const [isPending, setIsPending] = useState(false);
  const [paramsUnstable, setParamsUnstable] = useState(false);
  const prevParamsRef = useRef<string>("");
  const isInitialMountRef = useRef<boolean>(true);

  // Monitor search params changes
  useEffect(() => {
    const currentParams = searchParams.toString();

    // Check if params have changed
    if (prevParamsRef.current !== currentParams) {
      // On initial mount, just set the previous params without marking as unstable
      // Don't clear isInitialMountRef here - it will be cleared after component renders
      if (isInitialMountRef.current && prevParamsRef.current === "") {
        prevParamsRef.current = currentParams;
        return;
      }

      // Params are changing, mark as unstable
      setParamsUnstable(true);

      // Update previous params
      prevParamsRef.current = currentParams;
    }
  }, [searchParams]);

  // Combine filter changing state with params stability
  useEffect(() => {
    // Don't show loading on initial mount - let Suspense handle it
    if (isInitialMountRef.current) {
      return;
    }

    // Show loading if:
    // 1. Filter is actively changing (immediate feedback), OR
    // 2. Params are unstable (just changed, waiting for data)
    const shouldShowLoading = isFilterChanging || paramsUnstable;

    setIsPending(shouldShowLoading);
  }, [isFilterChanging, paramsUnstable]);

  // Separate effect to clear paramsUnstable with timeout
  useEffect(() => {
    // Safety mechanism: If params are unstable but filter change is cleared,
    // clear paramsUnstable after a reasonable timeout (max 5 seconds)
    // This prevents infinite loading if data detection fails
    if (!isFilterChanging && paramsUnstable) {
      // Filter change cleared means data loaded, clear params unstable after a brief delay
      const timeoutId = setTimeout(() => {
        setParamsUnstable(false);
      }, 100);

      // Safety timeout: Force clear after 5 seconds to prevent stuck loading
      const safetyTimeoutId = setTimeout(() => {
        setParamsUnstable(false);
      }, 5000);

      return () => {
        clearTimeout(timeoutId);
        clearTimeout(safetyTimeoutId);
      };
    }
  }, [isFilterChanging, paramsUnstable]);

  // Reset on mount to avoid showing loader on initial render
  useEffect(() => {
    prevParamsRef.current = searchParams.toString();
    setParamsUnstable(false);
    // Mark as initial mount - will be cleared after component renders with initial data
    isInitialMountRef.current = true;

    // Clear initial mount flag after component has rendered with initial data
    // This ensures the first filter change will trigger loading
    const timeoutId = setTimeout(() => {
      isInitialMountRef.current = false;
    }, 100);

    return () => clearTimeout(timeoutId);
  }, []);

  return { isPending };
}
