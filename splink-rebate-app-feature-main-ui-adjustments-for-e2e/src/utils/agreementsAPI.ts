import { apiClient } from "../lib/axiosClient";

export interface Agreement {
  agreementId: number;
  agreementName: string;
  programId?: number;
  programIds?: number[];
  endDate?: string;
  manufacturerId?: number;
  manufacturerName?: string;
  manufacturerLogo?: string;
}

export interface AgreementsResponse {
  status: string;
  data: {
    agreements: Agreement[];
    count: number;
  };
}

export interface StoreAgreementsResponse {
  status: string;
  data: {
    enrollments: Agreement[];
    count: number;
    availableAgreements: Agreement[];
    availableCount: number;
    storeId: number;
    manufacturerId?: number;
  };
}

export interface GroupedAgreement {
  manufacturerId: number;
  manufacturerName: string;
  manufacturerLogo: string;
  agreements: Agreement[];
}

/**
 * Fetches agreements for a given manufacturer ID
 * @param manufacturerId - The manufacturer ID (can be number or string)
 * @param timeline - Timeline filter: "Current" or "Historical" (will be converted to uppercase)
 * @returns Promise with array of agreements or empty array on error
 */
export async function fetchAgreementsByManufacturer(
  manufacturerId: number | string,
  timeline?: string
): Promise<Agreement[]> {
  try {
    // Build URL with timeline parameter if provided
    let url = `/agreements?manufacturerId=${manufacturerId}`;
    if (timeline) {
      url += `&timeline=${timeline}`;
    }

    // apiClient.get() returns res.data directly due to the interceptor
    // So response is already the unwrapped object { status: "success", data: { agreements: [...] } }
    const response = (await apiClient.get(url)) as AgreementsResponse;

    // Since the interceptor unwraps, response is already the AgreementsResponse object
    if (response?.status === "success" && response?.data?.agreements) {
      return response.data.agreements;
    }

    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Fetches agreements for a store scoped to a specific manufacturer
 * @param storeId - The store ID (can be number or string)
 * @param manufacturerId - The manufacturer ID (can be number or string)
 * @param action - "enroll" to get availableAgreements, "unenroll" to get enrollments
 * @param timeline - Timeline filter: "Current" or "Historical" (will be converted to uppercase)
 * @returns Promise with array of agreements or empty array on error
 */
export async function fetchStoreAgreementsByManufacturer(
  storeId: number | string,
  manufacturerId: number | string,
  action: "enroll" | "unenroll" = "enroll",
  timeline?: string
): Promise<Agreement[]> {
  try {
    // Build URL with timeline parameter if provided
    let url = `/store/${storeId}/agreements?manufacturerId=${manufacturerId}`;
    if (timeline) {
      url += `&timeline=${timeline}`;
    }

    const response = (await apiClient.get(url)) as StoreAgreementsResponse;

    if (response?.status === "success") {
      if (action === "unenroll" && response?.data?.enrollments) {
        return response.data.enrollments;
      } else if (action === "enroll" && response?.data?.availableAgreements) {
        return response.data.availableAgreements;
      }
    }

    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Fetches all agreements for a store (without manufacturer filter)
 * @param storeId - The store ID (can be number or string)
 * @param action - "enroll" to get availableAgreements, "unenroll" to get enrollments
 * @param timeline - Timeline filter: "Current" or "Historical" (will be converted to uppercase)
 * @returns Promise with array of agreements or empty array on error
 */
export async function fetchAllStoreAgreements(
  storeId: number | string,
  action: "enroll" | "unenroll" = "enroll",
  timeline?: string
): Promise<Agreement[]> {
  try {
    // Build URL with timeline parameter if provided
    let url = `/store/${storeId}/agreements`;
    if (timeline) {
      url += `?timeline=${timeline}`;
    }

    const response = (await apiClient.get(url)) as StoreAgreementsResponse;

    if (response?.status === "success") {
      if (action === "unenroll" && response?.data?.enrollments) {
        return response.data.enrollments;
      } else if (action === "enroll" && response?.data?.availableAgreements) {
        return response.data.availableAgreements;
      }
    }

    return [];
  } catch (error) {
    return [];
  }
}

/**
 * Groups agreements by manufacturer
 * @param agreements - Array of agreements
 * @param manufacturerMap - Map of manufacturerId to manufacturer info (id, name, logo)
 * @returns Array of grouped agreements by manufacturer
 */
export function groupAgreementsByManufacturer(
  agreements: Agreement[],
  manufacturerMap: Map<number, { id: number; name: string; logo: string }>
): GroupedAgreement[] {
  const grouped = new Map<number, GroupedAgreement>();

  agreements.forEach((agreement) => {
    // Try to get manufacturerId from agreement or from programIds mapping
    const manufacturerId = agreement.manufacturerId;

    // If manufacturerId is not in agreement, try to find it from manufacturerMap
    // by matching programIds (this would require additional logic if needed)
    if (
      !manufacturerId &&
      agreement.programIds &&
      agreement.programIds.length > 0
    ) {
      // This is a fallback - ideally manufacturerId should be in the agreement
      // For now, we'll need to rely on the manufacturerMap being passed correctly
    }

    if (manufacturerId && manufacturerMap.has(manufacturerId)) {
      const manufacturer = manufacturerMap.get(manufacturerId)!;

      if (!grouped.has(manufacturerId)) {
        grouped.set(manufacturerId, {
          manufacturerId: manufacturer.id,
          manufacturerName: manufacturer.name,
          manufacturerLogo: manufacturer.logo,
          agreements: []
        });
      }

      grouped.get(manufacturerId)!.agreements.push(agreement);
    }
  });

  return Array.from(grouped.values());
}

/**
 * Enrolls or unenrolls a store from agreements
 * @param params - Object containing action, agreementIds, storeIds, userId, and optional reason
 * @returns Promise with the API response
 */
export interface EnrollByAgreementParams {
  action: "enroll" | "unenroll";
  agreementIds: number[];
  storeIds: number[];
  userId: number;
  reason?: string;
}

export interface EnrollByAgreementResponse {
  success: boolean;
  message?: string;
  data?: any;
}

export async function enrollStoreByAgreement(
  params: EnrollByAgreementParams
): Promise<EnrollByAgreementResponse> {
  try {
    const requestBody = {
      action: params.action,
      agreementIds: params.agreementIds,
      storeIds: params.storeIds,
      userId: params.userId,
      reason: params.reason || "Bulk enrollment via store details page"
    };

    const response = await apiClient.post(
      `/store/enroll-by-agreement`,
      requestBody
    );

    return {
      success: response.data?.success !== false,
      message: response.data?.message,
      data: response.data
    };
  } catch (error: any) {
    throw {
      message:
        error?.response?.data?.message ||
        error?.message ||
        `Unable to ${params.action} store. Please try again.`,
      response: error?.response,
      error
    };
  }
}
