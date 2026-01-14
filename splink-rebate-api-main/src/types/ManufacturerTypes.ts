export interface ProgramComplianceDetails {
  programName: string;
  tierName: string;
  programId?: number;
  compliancePercentage?: number;
  totalRebate?: number;
  programStartDate?: string;
  programEndDate?: string;
  totalStores?: number;
  qualifiedStores?: number;
  overview?: string;
  rebate_percentage?: string;
  rebate_type?: string;
  rebate_amount?: string;
  isRebateBasedOnListPrice?: boolean;
}

export interface ProgramOverview {
  programName: string;
  completedCompliances: number;
  totalEnrollments: number;
  rebate: number;
  programStartDate: string;
  programEndDate: string;
}
