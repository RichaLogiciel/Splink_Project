import {
  isDistributorAdmin,
  isDistributorGeneralManager,
  isDistributorSalesRep,
  isDistributorSalesRepManager
} from "@/utils/rolesConditions";

export const getV2ApiUrl = (url: string = "") => {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not set");
  }

  return `${baseUrl.replace("/v1", "/v2")}${url}`;
};

/**
 * Checks if v2 API should be used for the current request
 * @param userRole - The role of the current user
 * @returns true if both conditions are met: user is distributor admin AND env variable is enabled
 */
export const shouldUseV2Api = (userRole?: string): boolean => {
  // Check if environment variable is enabled
  const useV2Api =
    process.env.NEXT_PUBLIC_ENABLE_STORE_AGGREGATION_V2 === "true";

  //return false otherwise use v1 api
  if (!useV2Api) {
    return false;
  }

  // Check if user is distributor admin
  return (
    isDistributorAdmin(userRole ?? "") ||
    isDistributorSalesRep(userRole ?? "") ||
    isDistributorSalesRepManager(userRole ?? "") ||
    isDistributorGeneralManager(userRole ?? "")
  );
};

// Helper function to validate URL format
export const isValidUrl = (urlString: string | null | undefined): boolean => {
  if (!urlString || typeof urlString !== "string") {
    return false;
  }

  try {
    const url = new URL(urlString);
    // Check if it's http or https
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
};

// Helper function to verify if URL returns HTTP 200
export const verifyUrlAccessible = async (
  urlString: string
): Promise<boolean> => {
  try {
    // Try to fetch with a GET request to a small range to verify accessibility
    const testResponse = await fetch(urlString, {
      method: "HEAD", // Use HEAD to avoid downloading the entire file
      cache: "no-cache"
    });

    // Check if response is ok (status 200-299)
    return testResponse.ok;
  } catch (error) {
    // If HEAD fails, try GET with range header as fallback
    try {
      const testResponse = await fetch(urlString, {
        method: "GET",
        headers: {
          Range: "bytes=0-0" // Only fetch first byte to minimize data transfer
        },
        cache: "no-cache"
      });

      return testResponse.ok || testResponse.status === 206; // 206 is Partial Content for range requests
    } catch (fallbackError) {
      console.error("Error verifying URL accessibility:", fallbackError);
      return false;
    }
  }
};
