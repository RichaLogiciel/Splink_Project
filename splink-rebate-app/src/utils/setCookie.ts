const MAX_AGE_SECONDS = Number(
  process?.env?.NEXT_PUBLIC_COOKIE_EXPIRE_IN_SECONDS || 5184000
); // 60 days in seconds

export const setCookie = (
  key: string,
  value: any,
  maxAgeSeconds: number = MAX_AGE_SECONDS
) => {
  let secureFlag = "";
  // Only add the Secure flag if the protocol is https:
  if (typeof window !== "undefined" && window.location.protocol === "https:") {
    secureFlag = "secure;";
  }

  // Always encode the value
  const encodedValue = encodeURIComponent(value);

  let cookieString = `${key}=${encodedValue}; path=/; ${secureFlag} samesite=lax; max-age=${maxAgeSeconds}; domain=${window.location.hostname};`;

  // For deletion, an empty value with max-age=0 is standard
  if (value === "" || maxAgeSeconds === 0) {
    cookieString = `${key}=; path=/; ${secureFlag} samesite=lax; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; domain=${window.location.hostname};`;
  }

  console.log("[setCookie] Setting cookie:", cookieString); // Add this log
  document.cookie = cookieString;
};
