import {
  ORDERING_FEATURE_ENABLED,
  ORDERING_FEATURE_EXCLUDED_SALES_REP_IDS,
  ORDERING_FEATURE_EXCLUDED_WAREHOUSE_IDS
} from "./constants";
import { isOrderAndCartFeatureEnabled } from "./helper";
import { getOrderingFeaturePreferenceServer } from "./orderingFeaturePreferenceServer";

/**
 * FUNCTION TO ENABLE ORDERING FEATURE FOR SALES REP IDS (Server-side)
 * This file should only be imported in server components
 *
 * Logic flow:
 * 1. Check if distributor is enabled (parentEntityId check) - if not, return false
 * 2. Check user preference in cookie - if exists, use it (user has priority)
 * 3. Check warehouse exclusion - if warehouse is excluded, return false
 * 4. Fall back to default logic: check env var and sales rep exclude list (backward compatibility)
 *
 * @param associatedUserId - The associated user ID (sales rep ID) from user cookie
 * @param parentEntityId - The parent entity ID (distributor ID) from user cookie
 * @param primaryWarehouseId - The primary warehouse ID from user cookie (optional)
 * @returns true if ordering feature is enabled, false otherwise
 */
const enableOrderingFeatureServer = (
  associatedUserId: number,
  parentEntityId?: number,
  primaryWarehouseId?: number | null
): boolean => {
  // Step 1: Distributor Check (Gate - Must Pass First)
  if (parentEntityId !== undefined) {
    const isDistributorEnabled = isOrderAndCartFeatureEnabled(parentEntityId);
    if (!isDistributorEnabled) {
      return false;
    }
  }

  // Step 2: User Preference Check (Cookie - Highest Priority)
  if (associatedUserId) {
    const userPreference = getOrderingFeaturePreferenceServer(associatedUserId);
    // If user has explicitly set a preference, use it (user has priority)
    if (userPreference !== null) {
      return userPreference;
    }
  }

  // Step 3: Warehouse Exclusion Check (Replaces sales rep exclusion)
  if (
    primaryWarehouseId !== undefined &&
    primaryWarehouseId !== null &&
    ORDERING_FEATURE_EXCLUDED_WAREHOUSE_IDS.includes(Number(primaryWarehouseId))
  ) {
    return false;
  }

  // Step 4: Default Logic (When cookie has no preference and warehouse not excluded)
  // Check if sales rep is NOT in excluded list AND global feature is enabled
  // This is kept for backward compatibility during transition
  return (
    !ORDERING_FEATURE_EXCLUDED_SALES_REP_IDS.includes(
      Number(associatedUserId)
    ) && ORDERING_FEATURE_ENABLED
  );
};

export { enableOrderingFeatureServer };
