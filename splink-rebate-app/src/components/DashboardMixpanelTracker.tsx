"use client";

import { useEffect } from "react";
import { initMixpanel, identifyUser } from "@/lib/mixpanelClient";
import { getUserClient } from "@/utils/getUserClient";
import MixpanelTracker from "@/components/MixpanelTracker";

export default function DashboardMixpanelTracker() {
  useEffect(() => {
    const user = getUserClient();
    if (user) {
      initMixpanel();
      identifyUser({
        userId: user.id,
        role: user.role,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        orgName: user.name
      });
    }
  }, []);

  const user = getUserClient();

  return (
    <MixpanelTracker
      eventName="Dashboard View"
      properties={{
        userRole: user?.role,
        timestamp: new Date().toISOString()
      }}
    />
  );
}
