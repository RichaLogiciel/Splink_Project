import {
  DistributorProgram,
  Manufacturer,
  ProgramListingCard,
  SalesData
} from "@/types/ProgramTypes";
import {
  convertNumberToRoman,
  formateRebate,
  getRangeFromCommaString,
  isListPriceApplicable
} from "@/utils/helper";
import { ENTITY_TYPES_RESPONSE, PROGRAM_TYPES } from "./programConstants";

/**
 * Maps a raw API response to an array of ProgramListingCard objects.
 *
 * This function takes the raw API response and ensures that it is an
 * array of objects. If the data is invalid, it logs an error and
 * returns an empty array. Otherwise, it maps each program data object
 * to a ProgramListingCard using createProgramListingCard.
 *
 * @param {any} data - The raw API response.
 * @param {string} type - The type of programs to fetch, e.g., "DISTRIBUTOR", "STORE".
 * @returns {ProgramListingCard[]} - An array of ProgramListingCard objects.
 */
export const mapResponseToProgramListingCard = (
  data: any,
  type: string
): ProgramListingCard[] => {
  if (!data || !Array.isArray(data)) {
    console.error("Invalid API data:", data);
    return []; // Fallback to an empty array
  }

  return data.map((programData: any) => {
    return createProgramListingCard(programData, type);
  });
};

/**
 * Creates a ProgramListingCard object from a raw API response program data.
 *
 * This function takes the raw API response program data and maps it to a
 * ProgramListingCard object. It is used by mapResponseToProgramListingCard
 * to map each program data object to a ProgramListingCard.
 *
 * @param {any} programData - The raw API response program data.
 * @param {string} type - The type of programs to fetch, e.g., "DISTRIBUTOR", "STORE".
 * @returns {ProgramListingCard} - A ProgramListingCard object.
 */
export const createProgramListingCard = (
  programData: any,
  type: string
): ProgramListingCard => {
  const manufacturer: Manufacturer = {
    name: programData.manufacturerName,
    avatar: programData.manufacturerLogo,
    authorized: programData.authManufacturer
  };

  const salesData: SalesData = {
    purchaseVolume: {
      amount: Number(programData.totalPurchaseVolume),
      yoy: 0
    },
    totalSavings: {
      amount: Number(programData.totalSaving),
      yoy: 0
    },
    totalOppSavings: {
      amount: 0
    },
    totalSalesRepSpiff: {
      amount: 0
    }
  };

  const programs: DistributorProgram[] = transformPrograms(programData, type);

  return {
    id: programData.manufacturerId.toString(),
    manufacturer,
    programPaymentTerm: programData.programPaymentTerm || "",
    salesData,
    programs
  };
};

/**
 * Transforms a program overview data array into a standardized format for
 * each entity type, including distributor and store. The transformed data
 * includes the program type, overview, payment terms, rebate type, and any
 * additional relevant information, such as store compliance, total earnings,
 * and total savings.
 *
 * @param {any[]} programData - The program overview data to be transformed.
 * @param {string} type - The type of programs to fetch, e.g., "DISTRIBUTOR", "STORE".
 *
 * @returns {DistributorProgram[]} - The transformed program overview data in a standardized
 * format.
 */
export const transformPrograms = (
  programData: any,
  type: string
): DistributorProgram[] => {
  if (
    !programData.program_overview ||
    !Array.isArray(programData.program_overview)
  ) {
    return []; // Fallback to an empty array
  }
  return programData.program_overview.flatMap((program: any) => {
    // Normalize payload shape (API may return snake_case or camelCase)
    const compliances: any[] = Array.isArray(program?.compliances)
      ? program.compliances
      : [];

    const programDetails: any[] = Array.isArray(program?.programDetails)
      ? program.programDetails
      : Array.isArray(program?.program_details)
        ? program.program_details
        : [];

    const programType = String(
      program?.programType ?? program?.program_type ?? ""
    );
    const programEntityType = String(
      program?.programEntityType ?? program?.program_entity_type ?? ""
    );

    const compliancesForProgram = compliances.filter(
      (compliance: any) => compliance?.programId === program?.id
    );

    if (programType.toLowerCase() === PROGRAM_TYPES.TIER.toLowerCase()) {
      const uniqueTierIds = Array.from(
        new Set(
          programDetails.length
            ? programDetails.map((pd: any) => pd?.tier)
            : compliancesForProgram.map((c: any) => c?.tier)
        )
      ).filter((tierId) => tierId != null);

      return uniqueTierIds.map((tierId: any) => {
        const tierCompliance =
          compliancesForProgram.find((c: any) => c?.tier === tierId) ?? {};
        return createDistributorProgram(program, tierCompliance, type, tierId);
      });
    }

    // Exclude sales rep programs from store/distributor listing
    if (
      programEntityType &&
      programEntityType.toLowerCase() ===
        ENTITY_TYPES_RESPONSE.SALES_REP.toLowerCase()
    ) {
      return [];
    }

    // If the API provides multiple program detail rows, emit one card-row per detail.
    // This is what should show under agreements on the programs page.
    if (programDetails.length > 1) {
      return programDetails.map((pd: any) => {
        const pdId = Number(pd?.id);
        const complianceForDetail =
          compliancesForProgram.find((c: any) => {
            const cDetailId = Number(
              c?.programDetailId ?? c?.program_detail_id ?? c?.programDetailID
            );
            return pdId && cDetailId === pdId;
          }) ?? {};

        return createDistributorProgram(
          program,
          complianceForDetail,
          type,
          undefined,
          pd
        );
      });
    }

    const firstCompliance = compliancesForProgram?.[0] ?? {};
    return createDistributorProgram(program, firstCompliance, type);
  });
};

/**
 * Creates a DistributorProgram object from program and compliance data.
 *
 * @param {any} program - The object containing details about the program,
 * including programType and programTerms.
 * @param {any} compliance - The object containing compliance information,
 * which includes details such as qualification status and description.
 * @param {string} type - The type of program entity, e.g., "STORE".
 *
 * @returns {DistributorProgram} - A structured DistributorProgram object
 * containing rebate, type, complianceStatus, paymentTerms, overview, and
 * additional information like distributionTarget and totalSavings.
 */
export const createDistributorProgram = (
  program: any,
  compliance: any,
  type: string,
  tier?: string,
  programDetailOverride?: any
): DistributorProgram => {
  // Normalize payload shape (API may return snake_case or camelCase)
  const programDetails: any[] = Array.isArray(program?.programDetails)
    ? program.programDetails
    : Array.isArray(program?.program_details)
      ? program.program_details
      : [];

  const programHeader = program?.programHeader ?? program?.program_header ?? "";
  const programType = String(
    program?.programType ?? program?.program_type ?? ""
  );
  const programTerms = program?.programTerms ?? program?.program_terms ?? "";
  const programEntityType =
    program?.programEntityType ?? program?.program_entity_type ?? "";
  const startDate = program?.startDate ?? program?.start_date;
  const endDate = program?.endDate ?? program?.end_date;

  const programDetail =
    programDetailOverride ??
    (tier
      ? programDetails.find((pd: any) => pd?.tier == tier)
      : programDetails?.length
        ? programDetails[0]
        : undefined);

  // Use rebate info from programDetail if compliance doesn't have it
  const rebate = formateRebate(compliance ?? {}, programDetail);
  let programtype = "";

  if (programType.toLowerCase() == "tier" && !tier) {
    // Convert Number into Roman Numeral
    const romanTier = compliance?.tier
      ? convertNumberToRoman(Number(compliance?.tier))
      : "";
    programtype = `${programHeader} - ${programType || ""}${romanTier ? ` ${romanTier}` : ""}`;
  } else if (tier) {
    // Convert Number into Roman Numeral
    const romanTier = tier ? convertNumberToRoman(Number(tier)) : "";
    programtype = `${programHeader} - TIER ${romanTier || ""}`;
  } else {
    // If we are rendering multiple detail rows, try to distinguish them.
    const detailSuffix =
      programDetails.length > 1
        ? programDetail?.tier != null
          ? ` ${programDetail.tier}`
          : programDetail?.id != null
            ? ` (Detail ${programDetail.id})`
            : ""
        : "";
    programtype = `${programHeader || ""}${detailSuffix}`;
  }

  // CRITICAL: the listing should carry the programDetailId for the specific detail row
  const programDetailId = Number(
    programDetail?.id ??
      program?.programDetailId ??
      program?.programdetailId ??
      0
  );

  return {
    id: program.id,
    programDetailId,
    rebate: String(rebate) ?? "",
    rebateRange: programDetail?.fixed_rebate_amount
      ? getRangeFromCommaString(programDetail.fixed_rebate_amount)
      : "",
    type: programtype,
    programEntityType,
    complianceStatus: compliance?.isQualified ?? false,
    paymentTerms: programTerms ?? "",
    overview:
      compliance?.description ??
      programDetail?.overview ??
      programDetail?.description ??
      "",
    startDate,
    endDate,
    additionalInfo: {
      title: "",
      info: "",
      distributionTarget: { total: 0, completed: 0 },
      totalSavings: { amount: 0, yoy: 0 },
      description: ""
    },
    isRebateBasedOnListPrice: isListPriceApplicable(
      programDetail?.rebate_calculation_type ?? ""
    )
  };
};
