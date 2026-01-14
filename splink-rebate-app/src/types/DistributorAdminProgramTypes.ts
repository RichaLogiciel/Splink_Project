export interface DistributorAdminProgram {
  programId: number;
  manufacturerName: string;
  programName: string;
  participantType: "SALES_REP" | "DISTRIBUTOR" | "STORE";
  programType: string;
  startDate: string;
  endDate: string;
  approvalStatus: string;
  visibilityScope: string;
  internalInitiative: boolean | null;
  programDetails: Record<string, any>[];
}

export interface DistributorAdminProgramsResponse {
  status: string;
  data: DistributorAdminProgram[];
}

export interface DistributorAdminProgramsParams {
  participantType?: "SALES_REP" | "DISTRIBUTOR" | "STORE";
  manufacturerName?: string;
  distributorName?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
}
