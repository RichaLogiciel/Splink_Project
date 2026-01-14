"use client";

import { apiClient } from "@/lib/axiosClient";
import { ManufacturerROIResponse } from "@/types/DistributorTypes";
import { getCookie } from "@/utils/getCookie";

/**
 * Retrieves ROI metrics for a specific manufacturer program (client-side).
 *
 * @param {number} programId - The ID of the program to retrieve ROI metrics for.
 * @param {number} [distributorId] - Optional distributor ID to filter ROI metrics.
 *
 * @returns {Promise<ManufacturerROIResponse>} - A promise that resolves to ROI data, or error response.
 */
export async function fetchManufacturerROIClient(
  programId: number,
  distributorId?: number
): Promise<ManufacturerROIResponse> {
  try {
    const params = new URLSearchParams({ programId: programId.toString() });
    if (distributorId) {
      params.append("distributorId", distributorId.toString());
    }

    // Get the token dynamically for this request
    const token = getCookie("accessToken");

    const response = await apiClient.get<ManufacturerROIResponse>(
      `/manufacturer/roi?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    // The interceptor returns res.data, but TypeScript doesn't know this
    // So we need to access .data property or cast it
    return response as unknown as ManufacturerROIResponse;
  } catch (error) {
    console.error("Error fetching manufacturer ROI:", error);
    return {
      status: "error",
      message: "Failed to fetch ROI data"
    };
  }
}
