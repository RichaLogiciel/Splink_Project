import { detectEnvironment, ENVIRONMENTS } from "@/utils/environmentDetection";
import mixpanel from "mixpanel-browser";

const MIXPANEL_TOKEN = process.env.NEXT_PUBLIC_MIXPANEL_TOKEN;
const useMixPanel = process.env.NEXT_PUBLIC_USE_MIXPANEL === "true";

let isInitialized = false;
let environment = ENVIRONMENTS.UNKNOWN;

// Enhanced user properties
interface UserProperties {
  userId?: string | number;
  role?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  orgName?: string;
}

export const initMixpanel = () => {
  // Skip initialization if Mixpanel is disabled
  if (!useMixPanel) {
    return;
  }

  if (isInitialized) return;

  if (!MIXPANEL_TOKEN) {
    console.warn("Mixpanel token is missing!");
    return;
  }

  try {
    // Set environment based on URL
    environment = detectEnvironment();

    mixpanel.init(MIXPANEL_TOKEN, {
      debug: process.env.NODE_ENV === ENVIRONMENTS.DEVELOPMENT
    });
    isInitialized = true;

    // Set global environment property for all events
    mixpanel.register({
      environment: environment?.toUpperCase()
    });
  } catch (error) {
    console.error("Failed to initialize Mixpanel:", error);
  }
};

// Identify user when they log in
export const identifyUser = (userProperties: UserProperties) => {
  // Skip if Mixpanel is disabled
  if (!useMixPanel) {
    return;
  }

  if (!isInitialized) {
    console.warn("Mixpanel not initialized");
    return;
  }

  if (userProperties.userId) {
    mixpanel.identify(String(userProperties.userId));

    // Create a fullName if firstName and lastName are available
    let fullName = "";
    if (userProperties.firstName || userProperties.lastName) {
      fullName =
        `${userProperties.firstName || ""} ${userProperties.lastName || ""}`.trim();
    }

    mixpanel.people.set({
      ...userProperties,
      $last_login: new Date().toISOString(),
      // Use actual name if available, otherwise use userId
      $name: fullName || userProperties.orgName || `${userProperties.userId}`,
      $email: userProperties.email,
      $first_name: userProperties.firstName,
      $last_name: userProperties.lastName,
      $organization: userProperties.orgName,
      environment: environment?.toUpperCase()
    });

    // Track user login for retention analysis
    trackEvent("User Login", {
      role: userProperties.role,
      loginMethod: "email",
      organization: userProperties.orgName
    });
  }
};

// Helper function to get user properties from getUserClient
export const getUserPropertiesFromClient = () => {
  // Skip if Mixpanel is disabled
  if (!useMixPanel) {
    return {};
  }

  try {
    const user = JSON.parse(localStorage.getItem("userInfo") || "{}");

    return {
      userId: user.id,
      role: user.role,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      orgName: user.name
    };
  } catch (error) {
    console.error("Error getting user properties:", error);
    return {};
  }
};

// Track specific events
export const trackEvent = (
  eventName: string,
  properties?: Record<string, any>
) => {
  // Skip if Mixpanel is disabled
  if (!useMixPanel) {
    return;
  }

  if (!isInitialized) {
    console.warn("Mixpanel not initialized");
    return;
  }

  // Environment is automatically included from register()
  mixpanel.track(eventName, properties);
};

// Track session start for retention analysis
export const trackSessionStart = (userRole: string) => {
  // Skip if Mixpanel is disabled
  if (!useMixPanel) {
    return;
  }

  if (!isInitialized) {
    console.warn("Mixpanel not initialized");
    return;
  }

  trackEvent("Session Start", {
    role: userRole,
    sessionStartTime: new Date().toISOString()
  });
};

// Track session end for retention analysis
export const trackSessionEnd = (
  sessionDurationSeconds: number,
  userRole: string
) => {
  // Skip if Mixpanel is disabled
  if (!useMixPanel) {
    return;
  }

  if (!isInitialized) {
    console.warn("Mixpanel not initialized");
    return;
  }

  trackEvent("Session End", {
    role: userRole,
    sessionDurationSeconds,
    sessionEndTime: new Date().toISOString()
  });
};
