/**
 * Client-side utility functions for managing ordering feature preference in user cookie
 * Stores preference in the user cookie so it's available on both client and server
 * For server-side functions, use orderingFeaturePreferenceServer.ts
 */

import { UserCookie } from "@/types/UsersType";
import { getUserClient } from "./getUserClient";
import { setCookie } from "./setCookie";

/**
 * Get the ordering feature preference for a user from the user cookie (client-side)
 * @param associatedUserId - The associated user ID (sales rep ID) from user cookie
 * @returns true if enabled, false if disabled, null if not set
 */
export const getOrderingFeaturePreference = (
  associatedUserId?: number
): boolean | null => {
  try {
    const user = getUserClient();

    // If associatedUserId is provided, verify it matches the current user
    if (associatedUserId && user?.associatedUserId !== associatedUserId) {
      return null;
    }

    // Return the preference from user cookie, or null if not set
    if (user?.orderingFeatureEnabled !== undefined) {
      return user.orderingFeatureEnabled;
    }

    return null;
  } catch (error) {
    console.error("Error reading ordering feature preference:", error);
    return null;
  }
};

/**
 * Set the ordering feature preference for a user in the user cookie
 * @param associatedUserId - The associated user ID (sales rep ID) from user cookie
 * @param enabled - Whether the feature should be enabled
 */
export const setOrderingFeaturePreference = (
  associatedUserId: number,
  enabled: boolean
): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const user = getUserClient();

    if (!user || user.associatedUserId !== associatedUserId) {
      console.error("User mismatch or user not found");
      return;
    }

    // Update the user object with the new preference
    const updatedUser: UserCookie = {
      ...user,
      orderingFeatureEnabled: enabled
    };

    // Save updated user back to cookie
    setCookie("user", JSON.stringify(updatedUser));
  } catch (error) {
    console.error("Error saving ordering feature preference:", error);
  }
};

/**
 * Clear the ordering feature preference for a user (sets to null)
 * @param associatedUserId - The associated user ID (sales rep ID) from user cookie
 */
export const clearOrderingFeaturePreference = (
  associatedUserId: number
): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const user = getUserClient();

    if (!user || user.associatedUserId !== associatedUserId) {
      console.error("User mismatch or user not found");
      return;
    }

    // Update the user object to remove the preference
    const updatedUser: UserCookie = {
      ...user,
      orderingFeatureEnabled: null
    };

    // Save updated user back to cookie
    setCookie("user", JSON.stringify(updatedUser));
  } catch (error) {
    console.error("Error clearing ordering feature preference:", error);
  }
};
