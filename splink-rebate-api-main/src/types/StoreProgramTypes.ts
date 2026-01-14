export interface SavingsResult {
  total_savings: number;
  manufacturerId: number;
  manufacturerName: string;
}

export interface ManufacturerStoreSavings {
  manufacturerid: number;
  logo: string;
  manufacturername: string;
  salesvolume: string;
  totalsavings: string;
  ratio?: number;
}

export interface StoreProgramOverviewData {
  topPerformingPrograms: ManufacturerStoreSavings[];
  bottomPerformingPrograms: ManufacturerStoreSavings[];
}

/**
 * Response interface for manual enrollment operations
 * This provides the specific response structure for the API endpoint
 */
export interface ManualEnrollmentResponse {
  success: boolean;
  message: string;
  data: {
    action: "enroll" | "unenroll";
    storeId: number;
    manufacturerId: number;
    programIds?: number[];
  };
}
