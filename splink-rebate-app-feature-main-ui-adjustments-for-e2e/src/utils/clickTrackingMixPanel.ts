import { trackEvent } from "@/lib/mixpanelClient";
import { getUserClient } from "@/utils/getUserClient";

interface ClickData {
  x: number;
  y: number;
  elementId?: string;
  elementText?: string;
  elementClass?: string;
  viewportWidth: number;
  viewportHeight: number;
}

export const trackClick = (e: MouseEvent, viewName: string) => {
  const target = e.target as HTMLElement;
  const rect = target.getBoundingClientRect();
  const user = getUserClient();

  // Get relative coordinates as percentages
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const xPercent = (e.clientX / viewportWidth) * 100;
  const yPercent = (e.clientY / viewportHeight) * 100;

  const clickData: ClickData = {
    x: Math.round(xPercent * 100) / 100, // Round to 2 decimal places
    y: Math.round(yPercent * 100) / 100,
    elementId: target.id || undefined,
    elementText: target.textContent?.trim() || undefined,
    elementClass: target.className || undefined,
    viewportWidth,
    viewportHeight
  };

  trackEvent("User Click", {
    ...clickData,
    viewName,
    userRole: user?.role,
    timestamp: new Date().toISOString(),
    path: window.location.pathname
  });
};
