import { trackEvent } from "@/lib/mixpanelClient";
import { getUserClient } from "@/utils/getUserClient";

// Get the useMixPanel flag from environment variables
const useMixPanel = process.env.USE_MIXPANEL === "true";

interface TimeTrackingData {
  startTime: number;
  pageName: string;
}

let currentPageData: TimeTrackingData | null = null;

export const startTimeTracking = (pageName: string) => {
  // Skip if Mixpanel is disabled
  if (!useMixPanel) {
    return;
  }

  // If there's an existing page view, end it before starting new one
  if (currentPageData) {
    endTimeTracking();
  }

  currentPageData = {
    startTime: Date.now(),
    pageName
  };
};

export const endTimeTracking = () => {
  // Skip if Mixpanel is disabled
  if (!useMixPanel) {
    return;
  }

  if (!currentPageData) return;

  const endTime = Date.now();
  const timeSpent = endTime - currentPageData.startTime;
  const user = getUserClient();

  // Track the time spent in seconds
  trackEvent("View Time Spent", {
    viewName: currentPageData.pageName,
    timeSpentSeconds: Math.round(timeSpent / 1000),
    timeSpentMinutes: Math.round(timeSpent / 60000),
    userRole: user?.role,
    timestamp: new Date().toISOString(),
    previousView: sessionStorage.getItem("previousView") || "none"
  });

  // Store current view as previous for next tracking
  sessionStorage.setItem("previousView", currentPageData.pageName);
  currentPageData = null;
};
