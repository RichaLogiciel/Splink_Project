// Import Components
import ProgramOverviewHeader from "@/views/Distributor/ProgramOverviewHeader";
import ProgramCard from "../../components/Card/ProgramCard";

// Import Types
import {
  DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS,
  DISTRIBUTOR_CAN_CREATE_PROGRAM_IDS
} from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import {
  getProgramTimelineQueryParam,
  isDistributorFeatureEnabled
} from "@/utils/helper";
import {
  getParentDistributorId,
  isDistributor,
  isDistributorAdminAndExecutive,
  isDistributorGeneralManager
} from "@/utils/rolesConditions";
import { ProgramListingCard } from "../../types/ProgramTypes";
import { fetchProgramsData } from "./programsApi";

export const dynamic = "force-dynamic";

interface DistributorProgramsPageProps {
  searchParams: {
    warehouseId: string;
    programTimeline: string;
  };
}

const ProgramsPage = async ({ searchParams }: DistributorProgramsPageProps) => {
  const user = getUserServer();
  const warehouseId = searchParams?.warehouseId;

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

  let distributorsData: ProgramListingCard[] = [];
  distributorsData = await fetchProgramsData(
    "DISTRIBUTOR",
    programTimeline,
    warehouseId
  );
  const isManager = isDistributorGeneralManager(user.role);
  const isAdminOrExecutive = isDistributorAdminAndExecutive(user.role);

  // Temporary fix for 10% YoY growth
  if (user?.associatedUserId == 166 && isDistributor(user.role)) {
    const hostessProgram = distributorsData.find(
      (distributor) => distributor.id == "136"
    );
    if (hostessProgram) {
      hostessProgram.salesData.purchaseVolume.amount = 1011101.25;
    }
  }

  // Sort by purchase volume
  if (distributorsData.length > 0) {
    distributorsData.sort(
      (a, b) =>
        b.salesData.purchaseVolume.amount - a.salesData.purchaseVolume.amount
    );
  }

  const distributorId = user?.parentEntityId ?? user?.associatedUserId ?? null;
  const canCreateProgram = isDistributorFeatureEnabled(
    distributorId,
    DISTRIBUTOR_CAN_CREATE_PROGRAM_IDS
  );

  return (
    <div className="programOverview">
      <ProgramOverviewHeader
        canCreate={canCreateProgram}
        showProgramTimeline={true}
      />
      <hr className="my-5" />

      <div className="text-left text-sm text-filter-light font-medium font-inter">
        {distributorsData.length > 0 ? (
          <div className="flex flex-wrap gap-4 mt-2">
            {distributorsData.map((distributor: ProgramListingCard) => (
              <ProgramCard
                key={distributor.id}
                url="/app/programs/manufacturer/"
                data={distributor}
                showEstimatedEarnings={!isManager}
                showSavingsNotApplicable={
                  isAdminOrExecutive && warehouseId ? true : false
                }
                savingLabel="Estimated Earnings"
                programTimeline={programTimeline}
                showProgramPaymentTermBadge={true}
                warehouseId={warehouseId}
              />
            ))}
          </div>
        ) : (
          <p className="text-center">
            It seems there are currently no programs available. Please check
            back later or explore other sections.
          </p>
        )}
      </div>
    </div>
  );
};

export default ProgramsPage;
