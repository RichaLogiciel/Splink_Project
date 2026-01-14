import { ProgramDetail } from "./ProgramTypes";

// Chain store structure (individual store within a chain)
export interface ChainStore {
  storeId: number;
  storeName: string;
  address: string;
  purchaseVolume: number;
  earnedRebate: number;
  complianceStatus: boolean;
  enrollmentStatus?: boolean;
}

// Enrolled chain structure
export interface EnrolledChain {
  chainId: number;
  chainName: string;
  totalStores: number;
  enrolledStores: number;
  compliantStores: number;
  totalPurchaseVolume: number;
  totalEarnedRebate: number;
  compliancePercentage: number;
  stores: ChainStore[];
}

// Unenrolled chain structure
export interface UnenrolledChain {
  chainId: number;
  chainName: string;
  totalStores: number;
  potentialEarnings: number;
}

// Chain program overview structure
export interface ChainProgramOverview {
  id: number;
  programType: string;
  programHeader: string;
  overview: string;
  chainCompliance: number;
  totalChains: number;
  enrolledChains: number;
  rebateType: string;
  paymentTerms: string;
  complianceStatus: boolean;
  rebateCalculation: string;
  programDetails: ProgramDetail[];
}

// Main chain program detail response structure
export interface ChainProgramDetailResponse {
  manufacturerName: string;
  manufacturerLogo: string;
  authManufacturer: boolean;
  totalStores: number;
  totalPurchaseVolume: number;
  totalEarnings: number;
  chainProgramOverview: ChainProgramOverview[];
  enrolledChains: EnrolledChain[];
  unenrolledChains: UnenrolledChain[];
}

// Chain aggregated data (internal use for data processing)
export interface ChainAggregatedData {
  chainId: number;
  chainName: string;
  totalStores: number;
  enrolledStores: number;
  compliantStores: number;
  totalPurchaseVolume: number;
  totalEarnedRebate: number;
  compliancePercentage: number;
  stores: ChainStore[];
}

// Chain query options for repository methods
export interface ChainQueryOptions {
  searchQuery?: string;
  page?: number;
  limit?: number;
  sort?: "ASC" | "DESC";
  sortKey?:
    | "chain_name"
    | "total_stores"
    | "purchase_volume"
    | "earned_rebate"
    | "compliance_percentage";
  programTimeline?: string;
  isInternal?: boolean;
}

// Chain detail options for repository methods
export interface ChainDetailOptions {
  programId?: number;
  programDetailId?: number;
  includeProgramDetails?: boolean;
  includeStoreDetails?: boolean;
}

// Paginated chain result structure
export interface PaginatedChainResult {
  chains: EnrolledChain[] | UnenrolledChain[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

// Chain data structure (raw data from database)
export interface ChainData {
  id: number;
  name: string;
  manufacturer_id: number;
  total_stores: number;
  enrolled_stores: number;
  compliant_stores: number;
  total_purchase_volume: number;
  total_earned_rebate: number;
  compliance_percentage: number;
  created_at: Date;
  updated_at: Date;
}

// Chain program details parameters
export interface ChainProgramDetailsParams {
  manufacturerId: number;
  distributorId: number;
  programId?: number;
  searchQuery?: string;
  enrolledPage?: number;
  notEnrolledPage?: number;
  sort?: "ASC" | "DESC";
  sortKey?: string;
  programTimeline?: string;
  isInternal?: boolean;
}

// Chain programs listing parameters
export interface ChainProgramsListingParams {
  distributorId: number;
  warehouseId?: string;
  programTimeline?: string;
  isInternal?: boolean;
}

// Chain categorized products parameters
export interface ChainCategorizedProductsParams {
  manufacturerId: number;
  distributorId: number;
  programId?: number;
  chainId?: number;
}

// Categorized products response structure
export interface CategorizedProductsResponse {
  categories: Array<{
    name: string;
    products: Array<{
      id: number;
      name: string;
      internal_code: string;
      recommended: boolean;
      purchased: boolean;
    }>;
  }>;
  totalProducts: number;
}

// Store data structure (for aggregation)
export interface StoreData {
  id: number;
  name: string;
  chain_id: number;
  parent_entity_id: number;
  purchase_volume: number;
  earned_rebate: number;
  compliance_status: boolean;
  enrollment_status: boolean;
  address?: string;
}

// Program information for chain stores
export interface StoreProgramInfo {
  id: number;
  programId: number;
  programDetailId: number;
  name: string;
  programType: string;
  programHeader: string;
  tier: number;
  paymentTerms: string;
  startDate: string;
  endDate: string;
  manufacturer: {
    id: number;
    name: string;
    logo: string;
    authorized: boolean;
  };
  rebateType: string;
  rebateAmount: number;
  rebatePercentage: number;
  overview: string;
  criteria: string;
  isEnrolled: boolean;
  isCompliant: boolean;
  complianceStatus: string;
  earnedRebate: number;
  totalPurchaseVolume: number;
  minSpend: number;
  minQty: number;
  maxQty: number;
  productsTags: string;
  rebateCalculation: string;
}

// New interfaces for chains-with-stores API endpoint
// Removed old ChainWithStoresStore and ChainWithStores interfaces
// Now using ChainWithStoresStoreEfficient and ChainWithStoresEfficient

export interface ChainWithStoresPagination {
  currentPage: number;
  totalPages: number;
  totalChains: number;
  totalStores: number;
  limit: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ChainsWithStoresResponse {
  chains: ChainWithStoresEfficient[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalChains: number;
    totalStores: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Removed old inefficient types - using efficient structure as default

export interface ChainsWithStoresQueryOptions {
  distributorId?: number;
  page?: number;
  limit?: number;
  sort?: string;
  sortKey?: string;
  searchQuery?: string;
  programTimeline?: string;
  chainIds?: number[];
  includeDetails?: boolean; // New field to control response detail level
}

// New interfaces for efficient chain programs (avoiding duplication)
export interface ChainProgramInfo {
  id: number;
  programId: number;
  programDetailId: number;
  name: string;
  programType: string;
  programHeader: string;
  tier: number;
  paymentTerms: string;
  startDate: Date;
  endDate: Date;
  manufacturer: {
    id: number;
    name: string;
    logo: string;
    authorized: boolean;
  };
  rebateType: string;
  rebateAmount: number;
  rebatePercentage: number;
  overview: string;
  criteria: string;
  minSpend: number;
  minQty: number;
  maxQty: number;
  productsTags: string;
  rebateCalculation: string;
  // Store compliance data for this program
  storeCompliance: ChainProgramStoreCompliance[];
  // Aggregated metrics
  totalStores: number;
  enrolledStores: number;
  compliantStores: number;
  compliancePercentage: number;
  totalEarnedRebate: number;
  totalPurchaseVolume: number;
}

export interface ChainProgramStoreCompliance {
  storeId: number;
  storeName: string;
  isEnrolled: boolean;
  isCompliant: boolean;
  complianceStatus: "Compliant" | "Non-Compliant" | "Pending";
  earnedRebate: number;
  totalPurchaseVolume: number;
}

// Updated interface for efficient chain stores
export interface ChainWithStoresStoreEfficient {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  externalStoreId: string;
  // Remove individual programs array - now at chain level
  totalPrograms: number;
  enrolledPrograms: number;
  compliantPrograms: number;
  totalEarnedRebate: number;
  totalPurchaseVolume: number;
}

// Updated interface for efficient chain with stores
export interface ChainWithStoresEfficient {
  id: number;
  name: string;
  totalStores: number;
  enrolledStores: number;
  compliantStores: number;
  compliancePercentage: number;
  totalEarnedRebate: number;
  totalPurchaseVolume: number;
  // Deduplicated programs with store compliance data
  programs: ChainProgramInfo[];
  // Simplified store data without duplicate programs
  stores: ChainWithStoresStoreEfficient[];
}

// Lightweight chain response for initial listing
export interface ChainWithStoresLightweight {
  id: number;
  name: string;
  totalStores: number;
  enrolledStores: number;
  compliantStores: number;
  compliancePercentage: number;
  totalEarnedRebate: number;
  totalPurchaseVolume: number;
  // Only include basic program count, not full details
  programCount: number;
  // Only include basic store count, not full details
  storeCount: number;
}

// Lightweight response structure
export interface ChainsWithStoresLightweightResponse {
  chains: ChainWithStoresLightweight[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalChains: number;
    totalStores: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// Update existing ChainsWithStoresQueryOptions to include detail level control

// New interface for manufacturer summaries in chain details
export interface ChainManufacturerSummary {
  manufacturerId: number;
  manufacturerName: string;
  manufacturerLogo?: string;
  authorized: boolean;
  totalPurchaseVolume: number;
  totalEarnedRebate: number;
  totalPrograms: number;
  enrolledPrograms: number;
  compliantPrograms: number;
  compliancePercentage: number;
  totalStores: number;
  enrolledStores: number;
  compliantStores: number;
}

// Detailed chain response for specific chain endpoint
export interface ChainDetailsResponse {
  id: number;
  name: string;
  distributorId?: number;
  totalStores: number;
  enrolledStores: number;
  compliantStores: number;
  compliancePercentage: number;
  totalEarnedRebate: number;
  totalPurchaseVolume: number;
  // Optional detailed data (only if requested)
  programs?: ChainProgramInfo[];
  stores?: ChainWithStoresStoreEfficient[];
  manufacturerSummaries?: ChainManufacturerSummary[];
}

// Chain details query options
export interface ChainDetailsQueryOptions {
  chainId: number;
  distributorId?: number;
  programTimeline?: string;
  includePrograms?: boolean;
  includeStores?: boolean;
  includeManufacturerSummaries?: boolean;
}

// New interfaces for Phase 4: Chain Programs and Stores endpoints
export interface ChainProgramsQueryOptions {
  chainId: number;
  distributorId?: number;
  programTimeline?: string;
  page?: number;
  limit?: number;
  sort?: "ASC" | "DESC";
  sortKey?:
    | "program_name"
    | "manufacturer_name"
    | "compliance_percentage"
    | "total_earned_rebate";
  searchQuery?: string;
}

export interface ChainStoresQueryOptions {
  chainId: number;
  distributorId?: number;
  manufacturerId?: number;
  programTimeline?: string;
  page?: number;
  limit?: number;
  sort?: "ASC" | "DESC";
  sortKey?:
    | "store_name"
    | "total_programs"
    | "enrolled_programs"
    | "compliant_programs"
    | "total_earned_rebate"
    | "total_purchase_volume";
  searchQuery?: string;
}

export interface ChainProgramsResponse {
  programs: ChainProgramInfo[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalPrograms: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface ChainStoresResponse {
  stores: ChainWithStoresStoreEfficient[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalStores: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

// New interfaces for manufacturer chains endpoint
export interface ManufacturerChainsQueryOptions {
  manufacturerId: number;
  distributorId: number;
  programTimeline?: string;
  page?: number;
  limit?: number;
  sort?: "ASC" | "DESC";
  sortKey?:
    | "chain_name"
    | "total_stores"
    | "compliance_percentage"
    | "total_earned_rebate";
  searchQuery?: string;
}

export interface ManufacturerChainInfo {
  chainId: number;
  chainName: string;
  totalStores: number;
  enrolledStores: number;
  compliantStores: number;
  compliancePercentage: number;
  totalEarnedRebate: number;
  totalPurchaseVolume: number;
  programCount: number;
}

export interface ManufacturerChainsResponse {
  chains: ManufacturerChainInfo[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalChains: number;
    limit: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}
