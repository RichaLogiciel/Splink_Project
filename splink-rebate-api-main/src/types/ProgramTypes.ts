export interface ProgramDetail {
  id: number;
  tier: number;
  min_qty: string;
  rebate_type: string;
  rebate_calculation: string;
  program_id: number;
  overview: string;
}

export interface ProgramOverview {
  id: number;
  name: string;
  programType: string;
  programTerms: string;
  programHeader: string;
  compliances: any[];
  programEntityType: string;
  programDetails: ProgramDetail[];
  startDate?: Date;
  endDate?: Date;
}

export interface ManufacturerProgram {
  manufacturerName: string;
  manufacturerLogo?: string;
  manufacturerId: number;
  totalPurchaseVolume: number;
  totalSaving: number;
  programPaymentTerm?: string;
  program_overview: ProgramOverview[];
}

export interface ManufacturerProgramCard extends ManufacturerProgram {
  isEnrolled?: boolean;
  salesData?: {
    purchaseVolume?: {
      amount: number;
      yoy: number;
    };
    totalSavings?: {
      amount: number;
      yoy: number;
    };
  };
}

/**
 * Parameters interface for store enrollment/unenrollment operations
 */
export interface StoreEnrollmentParams {
  action: "enroll" | "unenroll";
  storeId: number;
  manufacturerId: number;
  programIds?: number[];
}

/**
 * Response interface for store enrollment operations
 */
export interface StoreEnrollmentResult {
  success: boolean;
  message: string;
  enrolledCount: number;
  alreadyEnrolledCount: number;
  errorCount: number;
}
