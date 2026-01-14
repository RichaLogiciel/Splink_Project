"use client";

import { useEffect } from "react";
import { trackEvent } from "@/lib/mixpanelClient";

interface MixpanelTrackerProps {
  eventName: string;
  properties: Record<string, any>;
}

export default function MixpanelTracker({
  eventName,
  properties
}: MixpanelTrackerProps) {
  useEffect(() => {
    trackEvent(eventName, properties);
  }, [eventName, JSON.stringify(properties)]);

  return null; // This component doesn't render anything
}
