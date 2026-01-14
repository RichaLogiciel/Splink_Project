export interface EnrollByAgreementParams {
  action: "enroll" | "unenroll";
  agreementIds: number[];
  storeIds: number[];
  userId: number;
  reason?: string;
  requestId?: string;
}

export interface EnrollByAgreementResult {
  success: boolean;
  message: string;
  data: {
    jobId: string;
    agreementIds: number[];
    storeIds: number[];
    action: "enroll" | "unenroll";
    programCount: number;
    expectedEnrollments: number;
    programIds?: number[];
  };
}

export interface AgreementStoreEnrollmentPayload {
  action: "enroll" | "unenroll";
  agreementIds: number[];
  storeIds: number[];
  programIds: number[];
  userId: number;
  reason?: string;
  timestamp: string;
  requestId?: string;
}

export interface GetAgreementsByManufacturerParams {
  manufacturerIds: number[];
}

export interface AgreementResponse {
  agreementId: number;
  agreementName: string;
  programId: number;
  manufacturerId: number;
}

export interface GetAgreementsByManufacturerResult {
  agreements: AgreementResponse[];
  count: number;
}

export interface GetStoreAgreementEnrollmentsParams {
  storeId: number;
  manufacturerIds?: number[];
}

export interface StoreAgreementEnrollment {
  agreementId: number;
  agreementName: string;
  programIds: number[];
  endDate: string;
  manufacturerId: number;
}

export interface StoreAgreementAvailableRaw {
  agreementId: number;
  agreementName: string;
  programId: number;
  endDate: string;
  manufacturerId: number;
}

export interface StoreAgreementAvailable {
  agreementId: number;
  agreementName: string;
  programIds: number[];
  endDate: string;
  manufacturerId: number;
}

export interface GetStoreAgreementEnrollmentsResult {
  enrollments: StoreAgreementEnrollment[];
  count: number;
  availableAgreements: StoreAgreementAvailable[];
  availableCount: number;
  storeId: number;
  manufacturerIds?: number[];
}
