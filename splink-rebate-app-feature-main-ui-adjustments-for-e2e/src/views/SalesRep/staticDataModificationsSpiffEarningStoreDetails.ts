// ========================================
// STATIC DATA MODIFICATIONS FOR SPIFF EARNING STORE DETAILS
// ========================================
// This file contains all static data modifications for specific user/store/manufacturer combinations
// To remove all static data modifications, simply delete this file and remove the import from spiffEarningStoreDetails.tsx

import { SpiffEarningStoreDetail } from "@/types/StoreTypes";

export const applyStaticDataModifications = (
  StoreDetails: SpiffEarningStoreDetail,
  storeId: string
) => {
  // For storeId = 20968 and manufacturer id = 72 (Haribo)
  if (storeId === "20968") {
    if (StoreDetails.manufacturers) {
      StoreDetails.manufacturers.forEach((manufacturer) => {
        if (manufacturer.id === 72) {
          manufacturer.spiffEarning = 10;
        }
      });
      // Recalculate totalSpiffEarning as sum of all manufacturer earnings
      StoreDetails.totalSpiffEarning = StoreDetails.manufacturers.reduce(
        (total, manufacturer) => total + manufacturer.spiffEarning,
        0
      );
    }
  }
  // For storeId = 23537 and manufacturer id = 72 (Haribo)
  else if (storeId === "23537") {
    if (StoreDetails.manufacturers) {
      StoreDetails.manufacturers.forEach((manufacturer) => {
        if (manufacturer.id === 72) {
          manufacturer.spiffEarning = 14;
        }
      });
      // Recalculate totalSpiffEarning as sum of all manufacturer earnings
      StoreDetails.totalSpiffEarning = StoreDetails.manufacturers.reduce(
        (total, manufacturer) => total + manufacturer.spiffEarning,
        0
      );
    }
  }
};
// ========================================
// END STATIC DATA MODIFICATIONS
// ========================================
