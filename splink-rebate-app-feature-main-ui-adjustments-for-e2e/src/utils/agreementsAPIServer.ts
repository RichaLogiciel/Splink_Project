import { apiServerClient } from "../lib/axiosServer";
import { Agreement } from "./agreementsAPI";

/**
 * Server-side function to fetch agreements for a store across multiple manufacturers in bulk
 * @param storeId - The store ID
 * @param manufacturerIds - Array of manufacturer IDs to fetch agreements for
 * @param timeline - Timeline filter: "Current" or "Historical" (will be converted to uppercase)
 * @returns Promise with both enrollments and availableAgreements
 */
export async function fetchStoreAgreementsBulkServer(
  storeId: number | string,
  manufacturerIds: number[],
  timeline?: string
): Promise<{ enrollments: Agreement[]; availableAgreements: Agreement[] }> {
  try {
    // Return empty arrays if no manufacturer IDs provided
    if (!manufacturerIds || manufacturerIds.length === 0) {
      return { enrollments: [], availableAgreements: [] };
    }

    // Join manufacturer IDs with commas as per API specification
    const manufacturerIdsParam = manufacturerIds.join(",");
    console.log(
      "[fetchStoreAgreementsBulkServer] manufacturerIdsParam:",
      manufacturerIdsParam
    );

    // Build URL with timeline parameter if provided
    let url = `/store/${storeId}/agreements?manufacturerId=${manufacturerIdsParam}`;
    if (timeline) {
      url += `&timeline=${timeline}`;
    }

    const response = await apiServerClient.get(url);

    // apiServerClient returns the full axios response, so we need response.data
    const data = response.data;
    console.log("[fetchStoreAgreementsBulkServer] data:", data);

    if (data?.status === "success" && data?.data) {
      console.log(
        "[fetchStoreAgreementsBulkServer] enrollments:",
        data.data.enrollments
      );
      console.log(
        "[fetchStoreAgreementsBulkServer] availableAgreements:",
        data.data.availableAgreements
      );
      return {
        enrollments: data.data.enrollments || [],
        availableAgreements: data.data.availableAgreements || []
      };
    }

    console.warn(
      "[fetchStoreAgreementsBulkServer] No success status or data:",
      data
    );
    return { enrollments: [], availableAgreements: [] };
  } catch (error) {
    console.error("[fetchStoreAgreementsBulkServer] Error:", error);
    return { enrollments: [], availableAgreements: [] };
  }
}

/**
 * Transforms bulk agreement response to AgreementInfo[] format
 * @param enrollments - Array of enrolled agreements
 * @param availableAgreements - Array of available agreements
 * @returns AgreementInfo[] grouped by manufacturer
 */
export function transformBulkAgreementsToAgreementInfo(
  enrollments: Agreement[],
  availableAgreements: Agreement[]
): any[] {
  console.log(
    "[transformBulkAgreementsToAgreementInfo] Input enrollments:",
    enrollments
  );
  console.log(
    "[transformBulkAgreementsToAgreementInfo] Input availableAgreements:",
    availableAgreements
  );

  // Group by manufacturer ID
  const byManufacturer = new Map<
    number,
    {
      enrolled: Agreement[];
      available: Agreement[];
    }
  >();

  // Process enrollments
  enrollments.forEach((agreement) => {
    if (agreement.manufacturerId) {
      if (!byManufacturer.has(agreement.manufacturerId)) {
        byManufacturer.set(agreement.manufacturerId, {
          enrolled: [],
          available: []
        });
      }
      byManufacturer.get(agreement.manufacturerId)!.enrolled.push(agreement);
    }
  });

  // Process available agreements
  availableAgreements.forEach((agreement) => {
    if (agreement.manufacturerId) {
      if (!byManufacturer.has(agreement.manufacturerId)) {
        byManufacturer.set(agreement.manufacturerId, {
          enrolled: [],
          available: []
        });
      }
      byManufacturer.get(agreement.manufacturerId)!.available.push(agreement);
    }
  });

  // Transform to AgreementInfo format
  const agreementInfo = Array.from(byManufacturer.entries()).map(
    ([manufacturerId, { enrolled, available }]) => ({
      manufacturer_id: manufacturerId,
      agreementInfo: [
        ...enrolled.map((agreement) => ({
          status: "enrolled" as const,
          id: agreement.agreementId,
          name: agreement.agreementName,
          endDate: agreement.endDate || ""
        })),
        ...available.map((agreement) => ({
          status: "available" as const,
          id: agreement.agreementId,
          name: agreement.agreementName,
          endDate: agreement.endDate || ""
        }))
      ]
    })
  );

  console.log(
    "[transformBulkAgreementsToAgreementInfo] Output agreementInfo:",
    agreementInfo
  );
  return agreementInfo;
}

/**
 * Extracts unique manufacturer IDs from program data
 * @param programData - The program data containing enrolled and remaining programs
 * @returns Array of unique manufacturer IDs
 */
export function extractManufacturerIds(programData: any): number[] {
  console.log("[extractManufacturerIds] Input programData:", programData);
  const manufacturerIds = new Set<number>();

  // Extract from enrolled programs
  if (
    programData.enrolledProgram &&
    Array.isArray(programData.enrolledProgram)
  ) {
    programData.enrolledProgram.forEach((program: any) => {
      if (program.manufacturer?.id) {
        manufacturerIds.add(program.manufacturer.id);
      }
    });
  }

  // Extract from remaining programs
  if (
    programData.remainingProgram &&
    Array.isArray(programData.remainingProgram)
  ) {
    programData.remainingProgram.forEach((program: any) => {
      if (program.manufacturer?.id) {
        manufacturerIds.add(program.manufacturer.id);
      }
    });
  }

  const result = Array.from(manufacturerIds);
  console.log("[extractManufacturerIds] Extracted manufacturer IDs:", result);
  return result;
}
