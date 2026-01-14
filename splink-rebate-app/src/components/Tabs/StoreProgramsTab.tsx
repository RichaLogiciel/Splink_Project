// Import Components
import { apiServerClient } from "@/lib/axiosServer";
import StoreProgramsContent from "./StoreProgramsContent";

// Import Types
import { ProgramListingCard } from "@/types/ProgramTypes";
import { CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS } from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import {
  getProgramTimelineQueryParam,
  isDistributorFeatureEnabled
} from "@/utils/helper";
import { isDistributorAdmin } from "@/utils/rolesConditions";
import { ENTITY_TYPES_RESPONSE } from "@/views/Distributor/programConstants";
import { mapResponseToProgramListingCard } from "@/views/Distributor/programsApiDataHelpers";

export const dynamic = "force-dynamic";

// Constants
const DEFAULT_AGREEMENT_ID = 0;
const DEFAULT_AGREEMENT_VALUE = "";

// Type Definitions
interface Agreement {
  agreementId: number;
  agreementName: string;
  programId?: number;
  programIds?: number[];
}

interface AgreementsResponse {
  agreements?: Agreement[];
  count?: number;
}

type ProgramsByManufacturerAndAgreement = Map<
  number,
  Map<number, ProgramListingCard["programs"]>
>;

const fetchData = async (
  warehouseId?: string,
  programTimeline?: string,
  isInternal?: boolean
) => {
  try {
    // Check if current distributor has chain programs enabled
    const user = getUserServer();
    const distributorId = isDistributorAdmin(user?.role)
      ? user?.associatedUserId
      : user?.parentEntityId;
    const chainProgramsEnabled = isDistributorFeatureEnabled(
      distributorId,
      CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
    );

    // If chain programs are NOT enabled, we should NOT exclude chain stores
    // If chain programs ARE enabled, we should exclude chain stores (current behavior)
    const isExcludeChainStores = chainProgramsEnabled;

    const programTimelineQueryParam =
      getProgramTimelineQueryParam(programTimeline);
    const url = `/programs?type=${ENTITY_TYPES_RESPONSE.STORE}&warehouseId=${warehouseId}&programTimeline=${programTimelineQueryParam}&isInternal=${isInternal}&isExcludeChainStores=${isExcludeChainStores}`;

    const { data } = await apiServerClient.get(url);
    const mappedData = mapResponseToProgramListingCard(
      data,
      ENTITY_TYPES_RESPONSE.STORE
    );

    return mappedData;
  } catch (error) {
    return [];
  }
};

const fetchAllAgreements = async (
  manufacturerIds: number[],
  timeline?: string
): Promise<AgreementsResponse> => {
  // Early return if no manufacturers
  if (!manufacturerIds || manufacturerIds.length === 0) {
    return { agreements: [] };
  }

  try {
    // Build URL with timeline parameter if provided
    let url = `/agreements?manufacturerId=${manufacturerIds.join(",")}`;
    if (timeline) {
      url += `&timeline=${timeline}`;
    }

    const { data } = await apiServerClient.get<AgreementsResponse>(url);
    return data || { agreements: [] };
  } catch (error) {
    console.error("Error fetching agreements:", error);
    return { agreements: [] };
  }
};

/**
 * Creates a map of programId -> agreements for quick lookup
 */
const createProgramIdToAgreementsMap = (
  agreements: Agreement[]
): Map<number, Agreement[]> => {
  const programIdToAgreements = new Map<number, Agreement[]>();

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
};

/**
 * Groups programs by manufacturer and agreement
 * Structure: Map<manufacturerId, Map<agreementId, programs[]>>
 */
const groupProgramsByManufacturerAndAgreement = (
  programs: ProgramListingCard[],
  programIdToAgreements: Map<number, Agreement[]>
): ProgramsByManufacturerAndAgreement => {
  const result: ProgramsByManufacturerAndAgreement = new Map();

  programs.forEach((manufacturerProgram) => {
    const manufacturerId = Number(manufacturerProgram.id);

    let agreementMap = result.get(manufacturerId);
    if (!agreementMap) {
      agreementMap = new Map();
      result.set(manufacturerId, agreementMap);
    }

    manufacturerProgram.programs.forEach((program) => {
      const agreementsForProgram = programIdToAgreements.get(program.id) || [];

      const agreementIds =
        agreementsForProgram.length > 0
          ? agreementsForProgram.map((a) => a.agreementId)
          : [DEFAULT_AGREEMENT_ID];

      agreementIds.forEach((agreementId) => {
        let existingPrograms = agreementMap.get(agreementId);
        if (!existingPrograms) {
          existingPrograms = [];
          agreementMap.set(agreementId, existingPrograms);
        }

        // Avoid duplicates - check both id and type to include different tiers
        if (
          !existingPrograms.some(
            (p) =>
              p.id === program.id &&
              p.type === program.type &&
              // include different programDetail rows under the same program
              (p as any).programDetailId === (program as any).programDetailId
          )
        ) {
          existingPrograms.push(program);
        }
      });
    });
  });

  return result;
};

const StoreProgramsTab = async ({
  warehouseId,
  programTimeline,
  isInternal = false
}: {
  warehouseId?: string;
  programTimeline?: string;
  isInternal?: boolean;
}) => {
  const programs = await fetchData(warehouseId, programTimeline, isInternal);

  // Sort by purchase volume
  if (programs.length > 0) {
    programs.sort(
      (a, b) =>
        b.salesData.purchaseVolume.amount - a.salesData.purchaseVolume.amount
    );

    // Fetch agreements for all manufacturers
    const manufacturerIds = programs.map((program) => Number(program.id));
    const programTimelineQueryParam =
      getProgramTimelineQueryParam(programTimeline);
    const allAgreements = await fetchAllAgreements(
      manufacturerIds,
      programTimelineQueryParam
    );

    // Create lookup map and group programs
    const agreementsArray = allAgreements.agreements || [];
    const programIdToAgreements =
      createProgramIdToAgreementsMap(agreementsArray);
    const programsByManufacturerAndAgreement =
      groupProgramsByManufacturerAndAgreement(programs, programIdToAgreements);

    // Build agreement names object directly (avoid Map conversion)
    const agreementIdToName = new Map<number, string>();
    agreementsArray.forEach((agreement) => {
      agreementIdToName.set(agreement.agreementId, agreement.agreementName);
    });

    const agreementNamesObj: Record<string, Record<string, string>> = {};
    const programsByManufacturerAndAgreementObj: Record<
      string,
      Record<string, ProgramListingCard["programs"]>
    > = {};

    // Single iteration to build all required structures
    programsByManufacturerAndAgreement.forEach(
      (agreementMap, manufacturerId) => {
        const manufacturerIdStr = String(manufacturerId);
        const manufacturerAgreements: Record<string, string> = {};
        const manufacturerProgramsByAgreement: Record<
          string,
          ProgramListingCard["programs"]
        > = {};

        agreementMap.forEach((programs, agreementId) => {
          const agreementIdStr = String(agreementId);
          manufacturerProgramsByAgreement[agreementIdStr] = programs;

          const agreementName = agreementIdToName.get(agreementId);
          if (agreementName) {
            manufacturerAgreements[agreementIdStr] = agreementName;
          }
        });

        if (Object.keys(manufacturerAgreements).length > 0) {
          agreementNamesObj[manufacturerIdStr] = manufacturerAgreements;
        }
        programsByManufacturerAndAgreementObj[manufacturerIdStr] =
          manufacturerProgramsByAgreement;
      }
    );

    return (
      <StoreProgramsContent
        programs={programs}
        programTimeline={programTimeline}
        isInternal={isInternal}
        warehouseId={warehouseId}
        programsByManufacturerAndAgreement={
          programsByManufacturerAndAgreementObj
        }
        agreementNamesObj={agreementNamesObj}
      />
    );
  }

  return (
    <StoreProgramsContent
      programs={programs}
      programTimeline={programTimeline}
      isInternal={isInternal}
      warehouseId={warehouseId}
    />
  );
};

export default StoreProgramsTab;
