"use client";

import { useEffect } from "react";
import {
  startTimeTracking,
  endTimeTracking
} from "@/utils/timeTrackingMixPanel";
import { initMixpanel } from "@/lib/mixpanelClient";

interface TimeTrackerProps {
  pageName: string;
}

export default function TimeTracker({ pageName }: TimeTrackerProps) {
  useEffect(() => {
    // Ensure Mixpanel is initialized
    initMixpanel();

    // Start tracking after initialization
    startTimeTracking(pageName);

    return () => {
      endTimeTracking();
    };
  }, [pageName]);

  return null; // This component doesn't render anything
}
