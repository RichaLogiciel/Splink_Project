"use client";
import { usePageTransitionLoader } from "@/hooks/usePageTransitionLoader";
import { ReactNode } from "react";

interface FilterLoadingWrapperProps {
  children: ReactNode;
  loadingComponent?: ReactNode;
  className?: string;
}

/**
 * Reusable wrapper component for filter-based loading states
 * Shows loading overlay when search params change (via usePageTransitionLoader)
 * Can be used anywhere in the app that needs filter loading feedback
 */
export default function FilterLoadingWrapper({
  children,
  loadingComponent,
  className = "relative min-h-[200px]"
}: FilterLoadingWrapperProps) {
  const { isPending } = usePageTransitionLoader();

  return (
    <div className={className}>
      {/* Show loading overlay when params are changing */}
      {isPending && loadingComponent && (
        <div className="absolute inset-0 z-10 bg-white/90 backdrop-blur-sm">
          {loadingComponent}
        </div>
      )}

      {/* Content */}
      {children}
    </div>
  );
}
