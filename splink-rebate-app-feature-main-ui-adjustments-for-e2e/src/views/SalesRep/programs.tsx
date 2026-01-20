// Import core functionality

// Import Components
import StoreProgramCard from "@/components/Card/StoreProgramCard";
// Import Types
import { apiServerClient } from "@/lib/axiosServer";
import {
  CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS,
  DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS,
  DISTRIBUTOR_CAN_CREATE_PROGRAM_IDS
} from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import {
  getProgramTimelineQueryParam,
  isDistributorFeatureEnabled
} from "@/utils/helper";
import { getParentDistributorId } from "@/utils/rolesConditions";
import { fetchProgramsData } from "@/views/Distributor/programsApi";
import { ProgramListingCard } from "../../types/ProgramTypes";
import ProgramOverviewHeader from "../Distributor/ProgramOverviewHeader";

export const dynamic = "force-dynamic";

// Constants
const DEFAULT_AGREEMENT_ID = 0;

// Type Definitions
interface Agreement {
  agreementId: number;
  agreementName: string;
  programId: number;
}

interface AgreementsResponse {
  agreements?: Agreement[];
  count?: number;
}

interface salesRepProgramsPageProps {
  searchParams: {
    programTimeline: string;
  };
  isInternal?: boolean;
}

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
    const existing = programIdToAgreements.get(agreement.programId);
    if (existing) {
      existing.push(agreement);
    } else {
      programIdToAgreements.set(agreement.programId, [agreement]);
    }
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
): Map<number, Map<number, ProgramListingCard["programs"]>> => {
  const result = new Map<number, Map<number, ProgramListingCard["programs"]>>();

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
            (p) => p.id === program.id && p.type === program.type
          )
        ) {
          existingPrograms.push(program);
        }
      });
    });
  });

  return result;
};

const ProgramsPage = async ({
  searchParams,
  isInternal = false
}: salesRepProgramsPageProps) => {
  // Check if current distributor has chain programs enabled
  const user = getUserServer();

  // Check if default upcoming is enabled for distributor
  const defaultUpcomingEnabled = isDistributorFeatureEnabled(
    Number(getParentDistributorId(user.role, user)),
    DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  const programTimeline =
    searchParams?.programTimeline ||
    getProgramTimelineQueryParam(
      defaultUpcomingEnabled ? "Upcoming" : "Current"
    );

  const distributorId = user?.associatedUserId ?? user?.parentEntityId ?? null;
  const chainProgramsEnabled = isDistributorFeatureEnabled(
    distributorId,
    CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  // If chain programs are NOT enabled, we should NOT exclude chain stores
  // If chain programs ARE enabled, we should exclude chain stores (current behavior)
  const isExcludeChainStores = chainProgramsEnabled;

  const storesData: ProgramListingCard[] = await fetchProgramsData(
    "STORE",
    programTimeline,
    undefined,
    isInternal,
    isExcludeChainStores
  );

  // Sort by purchase volume
  if (storesData.length > 0) {
    storesData.sort(
      (a, b) =>
        b.salesData.purchaseVolume.amount - a.salesData.purchaseVolume.amount
    );
  }

  const canCreateProgram = isDistributorFeatureEnabled(
    distributorId,
    DISTRIBUTOR_CAN_CREATE_PROGRAM_IDS
  );

  // Fetch agreements for all manufacturers
  const programsByManufacturerAndAgreementObj: Record<
    string,
    Record<string, ProgramListingCard["programs"]>
  > = {};
  const agreementNamesObj: Record<string, Record<string, string>> = {};

  if (storesData.length > 0) {
    const manufacturerIds = storesData.map((program) => Number(program.id));
    const allAgreements = await fetchAllAgreements(manufacturerIds);

    // Create lookup map and group programs
    const agreementsArray = allAgreements.agreements || [];
    const programIdToAgreements =
      createProgramIdToAgreementsMap(agreementsArray);
    const programsByManufacturerAndAgreement =
      groupProgramsByManufacturerAndAgreement(
        storesData,
        programIdToAgreements
      );

    // Build agreement names object directly (avoid Map conversion)
    const agreementIdToName = new Map<number, string>();
    agreementsArray.forEach((agreement) => {
      agreementIdToName.set(agreement.agreementId, agreement.agreementName);
    });

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
  }

  return (
    <div className="programOverview">
      <ProgramOverviewHeader
        canCreate={canCreateProgram}
        showProgramTimeline={true}
      />
      <hr className="my-5" />
      <div className="text-left text-sm text-filter-light font-medium font-inter">
        <div className="programOverview">
          {storesData.length > 0 ? (
            <div className="flex flex-wrap gap-4 mt-2">
              {storesData.map((store: ProgramListingCard) => {
                const manufacturerId = String(store.id);
                const manufacturerName = store.manufacturer.name;
                const authorizedManufacturer = store.manufacturer?.authorized;
                const agreementsMap = agreementNamesObj[manufacturerId] || {};
                const programsByAgreement =
                  programsByManufacturerAndAgreementObj[manufacturerId] || {};

                // Build agreements array from agreementNamesObj
                const agreements = Object.entries(agreementsMap).map(
                  ([agreementIdStr, agreementName]) => ({
                    agreementId: Number(agreementIdStr),
                    agreementName
                  })
                );

                // Also include agreements that have programs but no name (fallback)
                Object.keys(programsByAgreement).forEach((agreementIdStr) => {
                  if (!agreementsMap[agreementIdStr]) {
                    agreements.push({
                      agreementId: Number(agreementIdStr),
                      agreementName: `Agreement ${agreementIdStr}`
                    });
                  }
                });

                // Sort agreements by name
                const sortedAgreements = [...agreements].sort((a, b) =>
                  a.agreementName.localeCompare(b.agreementName)
                );

                return (
                  <StoreProgramCard
                    key={store.id}
                    store={store}
                    manufacturerId={manufacturerId}
                    manufacturerName={manufacturerName}
                    authorizedManufacturer={authorizedManufacturer}
                    sortedAgreements={sortedAgreements}
                    programsByAgreement={programsByAgreement}
                    programTimeline={programTimeline}
                    isInternal={isInternal}
                    defaultOpen={true}
                  />
                );
              })}
            </div>
          ) : (
            <p className="text-center">
              It seems there are currently no programs available. Please check
              back later or explore other sections.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgramsPage;
