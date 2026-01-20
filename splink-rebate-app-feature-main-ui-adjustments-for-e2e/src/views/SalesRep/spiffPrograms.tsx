// Import core functionality

// Import Components
import ProgramCard from "../../components/Card/ProgramCard";
// Import Types
import InternalProgramTab from "@/components/InternalProgramTab";
import { APP_ROUTES } from "@/configs/routes";
import {
  DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS,
  DISTRIBUTOR_CAN_CREATE_PROGRAM_IDS
} from "@/utils/constants";
import { isStaging } from "@/utils/environmentDetection";
import { getUserServer } from "@/utils/getUserServer";
import {
  getProgramTimelineQueryParam,
  isDistributorFeatureEnabled
} from "@/utils/helper";
import {
  getParentDistributorId,
  isDistributor,
  isDistributorAdmin,
  isDistributorAdminAndExecutive,
  isDistributorGeneralManager,
  isDistributorSalesRep
} from "@/utils/rolesConditions";
import { fetchAllSpiffProgramsForDistributorV2 } from "@/views/Distributor/programsApi";
import { ProgramListingCard } from "../../types/ProgramTypes";
import ProgramOverviewHeader from "../Distributor/ProgramOverviewHeader";

export const dynamic = "force-dynamic";

interface SpiffProgramsPageProps {
  searchParams: {
    warehouseId: string;
    programTimeline: string;
  };
  isInternal?: boolean;
}

const SpiffProgramsPage = async ({
  searchParams,
  isInternal = false
}: SpiffProgramsPageProps) => {
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

  const isDistributorView =
    isDistributorAdmin(user.role) ||
    isDistributorAdminAndExecutive(user.role) ||
    isDistributorGeneralManager(user.role);
  const isNotSalesRep =
    isDistributor(user.role) && !isDistributorSalesRep(user.role);

  let spiffData: ProgramListingCard[] =
    await fetchAllSpiffProgramsForDistributorV2(
      programTimeline,
      isInternal,
      searchParams?.warehouseId
    );

  // Helper function to generate unique key for program comparison
  const getProgramKey = (program: any) => {
    return `${program.rebate}-${program.programName}-${program.programType}-${program.type}-${program.overview}-${program.paymentTerms}-${program.programLine}`;
  };

  // Filter duplicate programs for each manufacturer
  spiffData = spiffData.map((manufacturer) => {
    const uniquePrograms = manufacturer.programs.filter(
      (program, index, self) => {
        const programKey = getProgramKey(program);
        const firstIndex = self.findIndex(
          (p) => getProgramKey(p) === programKey
        );
        return index === firstIndex;
      }
    );

    // Add $ amount to Heineken Internal
    if (isInternal && isStaging && manufacturer.id == "519") {
      manufacturer.salesData.purchaseVolume.amount = 121; // Purchase Volume is showing as SPIFF Earnings
    }

    // Fix $25 issue that's showing in details page for Brown-Forman
    if (isInternal && isStaging && manufacturer.id == "528") {
      manufacturer.salesData.purchaseVolume.amount = 25; // Purchase Volume is showing as SPIFF Earnings
    }

    return {
      ...manufacturer,
      programs: uniquePrograms
    };
  });

  const distributorId = user?.parentEntityId ?? user?.associatedUserId ?? null;
  const canCreateProgram = isDistributorFeatureEnabled(
    distributorId,
    DISTRIBUTOR_CAN_CREATE_PROGRAM_IDS
  );

  return (
    <div className="programOverview">
      <ProgramOverviewHeader
        canCreate={canCreateProgram}
        showProgramTimeline={!isNotSalesRep}
      />
      {!isNotSalesRep && <hr className="my-5" />}

      <div className="text-left text-sm text-filter-light font-medium font-inter">
        {isNotSalesRep && (
          <InternalProgramTab
            allProgramsUrl={APP_ROUTES.programsSpiff}
            internalProgramsUrl={APP_ROUTES.programsSpiffInternal}
          />
        )}

        <div className="programOverview">
          {spiffData.length > 0 ? (
            <div className="flex flex-wrap gap-4 mt-2">
              {spiffData.map((spiff: ProgramListingCard) => (
                <ProgramCard
                  purchaseLabel={
                    isDistributorView ? "Total Rep Earnings" : "My Earnings"
                  }
                  savingLabel=""
                  key={spiff.id}
                  url="/app/programs/spiff/"
                  data={spiff}
                  showProgramPaymentTermBadge
                  programTimeline={programTimeline}
                  isInternal={isInternal}
                  warehouseId={searchParams?.warehouseId}
                />
              ))}
            </div>
          ) : (
            <p className="text-center">
              It seems there are currently no SPIFF programs available. Please
              check back later or explore other sections.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpiffProgramsPage;
