/**
 * Server-side utility functions for managing ordering feature preference in user cookie
 * This file should only be imported in server components
 */

import { getUserServer } from "./getUserServer";

/**
 * Get the ordering feature preference for a user from the user cookie (server-side)
 * @param associatedUserId - The associated user ID (sales rep ID) from user cookie
 * @returns true if enabled, false if disabled, null if not set
 */
export const getOrderingFeaturePreferenceServer = (
  associatedUserId?: number
): boolean | null => {
  try {
    const user = getUserServer();

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
    console.error("Error reading ordering feature preference (server):", error);
    return null;
  }
};
