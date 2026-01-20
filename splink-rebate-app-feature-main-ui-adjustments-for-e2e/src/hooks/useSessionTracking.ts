import { useEffect, useState } from "react";
import { trackSessionStart, trackSessionEnd } from "@/lib/mixpanelClient";
import { getUserClient } from "@/utils/getUserClient";

// Get the useMixPanel flag from environment variables
const useMixPanel = process.env.USE_MIXPANEL === "true";

export const useSessionTracking = () => {
  const [sessionStartTime, setSessionStartTime] = useState<number>(0);

  useEffect(() => {
    // Skip effect if Mixpanel is disabled
    if (!useMixPanel) return;

    const user = getUserClient();
    if (!user) return;

    // Start session tracking
    const startTime = Date.now();
    setSessionStartTime(startTime);
    trackSessionStart(user.role);

    // Track session end on page unload
    const handleBeforeUnload = () => {
      const sessionDuration = Math.floor((Date.now() - startTime) / 1000);
      trackSessionEnd(sessionDuration, user.role);
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      // Also track session end when component unmounts
      if (sessionStartTime > 0) {
        const sessionDuration = Math.floor(
          (Date.now() - sessionStartTime) / 1000
        );
        trackSessionEnd(sessionDuration, user.role);
      }
    };
  }, [sessionStartTime]);
};
