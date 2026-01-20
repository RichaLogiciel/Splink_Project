// ========================================
// STATIC DATA MODIFICATIONS FOR SINGLE SPIFF OPPORTUNITIES
// ========================================
// This file contains all static data modifications for specific user/store/manufacturer combinations
// To remove all static data modifications, simply delete this file and remove the import from SingleSPIFFOpportunities.tsx

import { SpiffEarningStoreManufacturerDetail } from "@/types/StoreTypes";

export const applyStaticDataModifications = (
  data: SpiffEarningStoreManufacturerDetail[],
  storeId: string
): SpiffEarningStoreManufacturerDetail[] => {
  return data.map((manufacturer) => {
    // For storeId = 20968 and manufacturer id = 72 (Haribo)
    if (storeId === "20968" && manufacturer.id === 72) {
      return {
        ...manufacturer,
        spiffEarning: 10,
        programs: manufacturer.programs?.map((program) => ({
          ...program,
          spiffEarning: 10
        }))
      };
    }
    // For storeId = 23537 and manufacturer id = 72 (Haribo)
    else if (storeId === "23537" && manufacturer.id === 72) {
      return {
        ...manufacturer,
        spiffEarning: 14,
        programs: manufacturer.programs?.map((program) => ({
          ...program,
          spiffEarning: 14
        }))
      };
    }
    return manufacturer;
  });
};
// ========================================
// END STATIC DATA MODIFICATIONS
// ========================================
