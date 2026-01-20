import { apiClient } from "@/lib/axiosClient";

/**
 * Update the ordering feature preference for the current user
 * @param enabled - Whether the ordering feature should be enabled
 * @returns Promise that resolves when the update is successful
 */
export const updateOrderingFeaturePreference = async (
  enabled: boolean
): Promise<void> => {
  try {
    await apiClient.put("/user/ordering-feature-preference", {
      enabled
    });
  } catch (error) {
    console.error("Error updating ordering feature preference:", error);
    throw error;
  }
};
