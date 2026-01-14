import { ProgramComplianceDetails } from "./ManufacturerTypes";

export interface DistributorDetails {
  id: number;
  name: string;
  totalStores: number;
  totalSales: number;
  location: string;
  details: ProgramComplianceDetails[];
}

export interface BulkEnrollmentParams {
  distributorId: number;
  action: "enroll" | "unenroll";
  programIds: number[];
  manufacturerId: number;
  storeIds?: number[];
  warehouseId?: number;
  userId: number;
  userRole: string;
}

export interface StoreEnrollmentResult {
  storeId: number;
  success: boolean;
  enrolledCount: number;
  alreadyEnrolledCount: number;
  errorCount: number;
  workerJobQueued: boolean;
  error?: string;
}

export interface AggregatedResults {
  successful: number;
  failed: number;
  workerJobsQueued: number;
  details: {
    enrolledCount: number;
    alreadyEnrolledCount: number;
    errorCount: number;
  };
}

export interface BulkEnrollmentResult {
  success: boolean;
  message: string;
  data: {
    totalStores: number;
    successful: number;
    failed: number;
    details: {
      enrolledCount: number;
      alreadyEnrolledCount: number;
      errorCount: number;
    };
    distributorId: number;
    programIds: number[];
    action: "enroll" | "unenroll";
    workerJobsQueued: number;
  };
}
