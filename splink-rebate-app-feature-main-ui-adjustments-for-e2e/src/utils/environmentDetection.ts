// "DEVELOPMENT", "STAGING", "PRODUCTION", "DEMO", "LOCAL"
export const ENVIRONMENTS = {
  DEVELOPMENT: "DEVELOPMENT",
  PRODUCTION: "PRODUCTION",
  DEMO: "DEMO",
  STAGING: "STAGING",
  LOCAL: "LOCAL",
  UNKNOWN: "UNKNOWN",
  SERVER: "SERVER"
};

/**
 * Detects the current environment based on the URL
 * @returns The environment name (DEVELOPMENT, PRODUCTION, DEMO, STAGING, LOCAL, UNKNOWN)
 */
export const detectEnvironment = (): string => {
  const APP_ENV = process.env.NEXT_PUBLIC_APP_ENV;

  if (APP_ENV) {
    if (APP_ENV === ENVIRONMENTS.DEVELOPMENT) return ENVIRONMENTS.DEVELOPMENT;
    if (APP_ENV === ENVIRONMENTS.PRODUCTION) return ENVIRONMENTS.PRODUCTION;
    if (APP_ENV === ENVIRONMENTS.DEMO) return ENVIRONMENTS.DEMO;
    if (APP_ENV === ENVIRONMENTS.STAGING) return ENVIRONMENTS.STAGING;
    if (APP_ENV === ENVIRONMENTS.LOCAL) return ENVIRONMENTS.LOCAL;
  }

  if (!APP_ENV && typeof window !== "undefined") {
    const hostname = window.location.hostname;

    if (hostname.startsWith("dev.")) return ENVIRONMENTS.DEVELOPMENT;
    if (hostname.startsWith("app.")) return ENVIRONMENTS.PRODUCTION;
    if (hostname.startsWith("demo.")) return ENVIRONMENTS.DEMO;
    if (hostname.startsWith("stage.")) return ENVIRONMENTS.STAGING;
    if (hostname.startsWith("localhost") || hostname.startsWith("127.0.0.1"))
      return ENVIRONMENTS.LOCAL;
  }

  if (typeof window === "undefined" && !APP_ENV) return ENVIRONMENTS.SERVER;

  return ENVIRONMENTS.UNKNOWN;
};

export const currentEnvironment = detectEnvironment();
// Export the current environment
export const isStaging = currentEnvironment === ENVIRONMENTS.STAGING;
export const isProduction = currentEnvironment === ENVIRONMENTS.PRODUCTION;
export const isDemo = currentEnvironment === ENVIRONMENTS.DEMO;
export const isDevelopment = currentEnvironment === ENVIRONMENTS.DEVELOPMENT;
export const isLocal = currentEnvironment === ENVIRONMENTS.LOCAL;
