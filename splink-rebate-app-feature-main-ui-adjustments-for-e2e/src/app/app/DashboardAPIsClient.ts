import { apiClient } from "@/lib/axiosClient";

/**
 * Client-side version: Posts sales rep IDs to retrieve Void/Fill programs summary.
 * Optionally include excludeChainStore, warehouseId, warehouseIdFilter, and programId when provided.
 * Use this function in client components (components marked with "use client").
 */
export async function getVoidFillProgramsSummaryClient({
  salesRepIds,
  excludeChainStore,
  warehouseId,
  warehouseIdFilter = false,
  programId,
  manufacturerId,
  programTimeline = "Current"
}: {
  salesRepIds?: number[];
  excludeChainStore?: boolean;
  warehouseId?: string;
  warehouseIdFilter?: boolean;
  programId?: number;
  manufacturerId?: number;
  programTimeline?: string;
}): Promise<any> {
  try {
    const body: any = {};

    // Add salesRepIds if provided (including empty array when no options available)
    // Only skip if undefined (not provided at all, e.g., when warehouseIdFilter is true)
    if (salesRepIds !== undefined) {
      body.salesRepIds = salesRepIds;
    }

    if (excludeChainStore !== undefined) {
      body.excludeChainStore = excludeChainStore;
    }
    if (warehouseId && warehouseId !== "") {
      body.warehouseId = warehouseId;
    }

    body.warehouseIdFilter = warehouseIdFilter;

    if (programId !== undefined) {
      body.programId = programId;
    }

    if (manufacturerId) {
      body.manufacturerId = manufacturerId;
    }

    if (programTimeline) {
      body.programTimeline = programTimeline;
    }

    const { data } = await apiClient.post(
      `/programs/get-void-fill-programs-summary`,
      body
    );
    return data;
  } catch (error) {
    return { status: "error", data: [] };
  }
}
