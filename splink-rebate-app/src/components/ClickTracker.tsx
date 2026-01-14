"use client";

import { useEffect } from "react";
import { trackClick } from "@/utils/clickTrackingMixPanel";

interface ClickTrackerProps {
  viewName: string;
  children: React.ReactNode;
}

export default function ClickTracker({
  viewName,
  children
}: ClickTrackerProps) {
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      trackClick(e, viewName);
    };

    window.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("click", handleClick);
    };
  }, [viewName]);

  return <>{children}</>;
}
