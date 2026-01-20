// Re-export Agreement interface from agreementsAPI
export type { Agreement } from "./agreementsAPI";

// Constants
export const DEFAULT_AGREEMENT_ID = 0;
export const DEFAULT_AGREEMENT_VALUE = "";

/**
 * Creates a map of programId -> agreements for quick lookup
 * Returns Map<programId, Agreement[]> where each program can have multiple agreements
 */
export function buildProgramIdToAgreementsMap(
  agreements: Array<{
    agreementId: number;
    agreementName: string;
    programId?: number;
    programIds?: number[];
  }>
): Map<
  number,
  Array<{
    agreementId: number;
    agreementName: string;
    programId?: number;
    programIds?: number[];
  }>
> {
  const programIdToAgreements = new Map<
    number,
    Array<{
      agreementId: number;
      agreementName: string;
      programId?: number;
      programIds?: number[];
    }>
  >();

  agreements.forEach((agreement) => {
    const ids =
      Array.isArray(agreement.programIds) && agreement.programIds.length > 0
        ? agreement.programIds
        : agreement.programId != null
          ? [agreement.programId]
          : [];

    ids.forEach((programId) => {
      const existing = programIdToAgreements.get(programId);
      if (existing) {
        existing.push(agreement);
      } else {
        programIdToAgreements.set(programId, [agreement]);
      }
    });
  });

  return programIdToAgreements;
}

/**
 * Creates a map of programId -> agreementIds for filtering purposes
 * Returns Map<programId, number[]> where each program maps to an array of agreement IDs
 */
export function buildProgramIdToAgreementIdsMap(
  agreements: Array<{
    agreementId: number;
    agreementName: string;
    programId?: number;
    programIds?: number[];
  }>
): Map<number, number[]> {
  const programIdToAgreements = new Map<number, number[]>();

  agreements.forEach((agreement) => {
    const ids =
      Array.isArray(agreement.programIds) && agreement.programIds.length > 0
        ? agreement.programIds
        : agreement.programId != null
          ? [agreement.programId]
          : [];

    ids.forEach((programId) => {
      const existing = programIdToAgreements.get(programId);
      if (existing) {
        if (!existing.includes(agreement.agreementId)) {
          existing.push(agreement.agreementId);
        }
      } else {
        programIdToAgreements.set(programId, [agreement.agreementId]);
      }
    });
  });

  return programIdToAgreements;
}

/**
 * Builds agreement options for dropdown from agreements array
 * Returns sorted array of { label: string, value: string } options
 */
export function buildAgreementOptions(
  agreements: Array<{
    agreementId: number;
    agreementName: string;
    programId: number;
  }>
): Array<{ label: string; value: string }> {
  // Get unique agreements
  const agreementMap = new Map<number, string>();
  agreements.forEach((agreement) => {
    if (!agreementMap.has(agreement.agreementId)) {
      agreementMap.set(agreement.agreementId, agreement.agreementName);
    }
  });

  const options = Array.from(agreementMap.entries())
    .map(([agreementId, agreementName]) => ({
      label: agreementName,
      value: String(agreementId)
    }))
    .sort((a, b) => {
      const aHasRetail = a.label.toLowerCase().includes("retail");
      const bHasRetail = b.label.toLowerCase().includes("retail");

      // If one has "retail" and the other doesn't, prioritize the one with "retail"
      if (aHasRetail && !bHasRetail) return -1;
      if (!aHasRetail && bHasRetail) return 1;

      // Otherwise, sort alphabetically
      return a.label.localeCompare(b.label);
    });

  return options;
}

/**
 * Builds agreement options for a specific manufacturer
 * Takes manufacturer programs and returns options based on agreements associated with those programs
 */
export function buildAgreementOptionsForManufacturer(
  manufacturerId: string,
  manufacturerPrograms: Array<{
    id: number;
    type: string;
    [key: string]: any;
  }>,
  programIdToAgreements: Map<
    number,
    Array<{
      agreementId: number;
      agreementName: string;
      programId: number;
    }>
  >,
  agreementNamesObj: Record<string, Record<string, string>>
): Array<{ label: string; value: string }> {
  const agreementSet = new Set<number>();

  // Get all unique agreements for this manufacturer's programs
  manufacturerPrograms.forEach((program) => {
    const agreementsForProgram = programIdToAgreements.get(program.id);
    if (agreementsForProgram) {
      agreementsForProgram.forEach((agreement) => {
        agreementSet.add(agreement.agreementId);
      });
    }
  });

  // Convert to options array with agreement names
  if (agreementSet.size > 0) {
    return Array.from(agreementSet)
      .map((agreementId) => {
        const agreementName =
          agreementNamesObj[manufacturerId]?.[String(agreementId)];
        return {
          label: agreementName || `Agreement ${agreementId}`,
          value: String(agreementId)
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label));
  }

  // Fallback to program types if no agreements found
  return manufacturerPrograms.map((program) => ({
    label: program.type,
    value: String(program.id)
  }));
}

/**
 * Filters programs by selected agreement ID
 * Returns all programs if no agreement is selected (empty string)
 */
export function filterProgramsByAgreement<T extends { id?: number }>(
  programs: T[],
  selectedAgreementId: string,
  programIdToAgreements: Map<number, number[]>
): T[] {
  if (!selectedAgreementId || selectedAgreementId === DEFAULT_AGREEMENT_VALUE) {
    return programs;
  }

  const agreementIdNum = Number(selectedAgreementId);
  return programs.filter((program) => {
    if (!program.id) return false;
    const agreementIds = programIdToAgreements.get(program.id);
    return agreementIds?.includes(agreementIdNum) ?? false;
  });
}

/**
 * Filters agreements to only include those that have matching programs
 * Returns empty array if agreements or retailerPrograms is empty/undefined
 *
 * @param agreements - Array of agreements with programId property
 * @param retailerPrograms - Array of programs with id property (optional)
 * @returns Filtered array of agreements that have matching programs
 */
export function filterAgreementsWithPrograms<
  T extends { programId?: number; programIds?: number[] }
>(
  agreements: T[],
  retailerPrograms?: Array<{ id?: number; [key: string]: any }>
): T[] {
  if (!agreements || agreements.length === 0) {
    return [];
  }

  if (!retailerPrograms || retailerPrograms.length === 0) {
    return [];
  }

  // Create a Set of program IDs for efficient lookup
  const programIdsSet = new Set<number>();
  retailerPrograms.forEach((p) => {
    if (p.id != null) {
      programIdsSet.add(p.id);
    }
  });

  // Filter agreements to only include those with matching programs
  return agreements.filter((agreement) => {
    const ids =
      Array.isArray(agreement.programIds) && agreement.programIds.length > 0
        ? agreement.programIds
        : agreement.programId != null
          ? [agreement.programId]
          : [];
    return ids.some((id) => programIdsSet.has(id));
  });
}
