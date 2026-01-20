// Import core functionality

// Import Components
import ProgramCard from "@/components/Card/ProgramCard";
// Import Types
import { ProgramListingCard } from "@/types/ProgramTypes";
import {
  DISTRIBUTOR_CAN_CREATE_PROGRAM_IDS,
  ENABLE_SALES_MANAGER_PROGRAMS_FOR_DISTRIBUTOR_IDS,
  SALES_MANAGER_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
} from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import {
  getProgramTimelineQueryParam,
  isDistributorFeatureEnabled
} from "@/utils/helper";
import {
  isDistributorAdminAndExecutive,
  isDistributorSalesRepManager
} from "@/utils/rolesConditions";
import ProgramOverviewHeader from "@/views/Distributor/ProgramOverviewHeader";
import { fetchAllSalesManagerPrograms } from "@/views/Distributor/programsApi";

interface SalesManagerProgramsPageProps {
  searchParams: {
    warehouseId: string;
    programTimeline: string;
  };
  isInternal?: boolean;
}

const SalesManagerProgramsPage = async ({
  searchParams,
  isInternal = false
}: SalesManagerProgramsPageProps) => {
  const programTimeline = getProgramTimelineQueryParam(
    searchParams?.programTimeline
  );
  const user = getUserServer();

  // Access control - only allow Distributor Admin, Distributor Executive, and Sales Rep Manager
  const hasAccess = isDistributorAdminAndExecutive(user.role);
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">Unauthorized to access this page.</p>
        </div>
      </div>
    );
  }

  // Feature flag check - only allow if Sales Manager Programs are enabled for this distributor
  const distributorId = user?.parentEntityId ?? user?.associatedUserId ?? null;
  const isSalesManagerProgramsEnabled =
    ENABLE_SALES_MANAGER_PROGRAMS_FOR_DISTRIBUTOR_IDS &&
    isDistributorFeatureEnabled(
      distributorId,
      SALES_MANAGER_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
    );

  if (!isSalesManagerProgramsEnabled) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Feature Not Available
          </h1>
          <p className="text-gray-600">
            Sales Manager Programs are not available for your distributor.
          </p>
        </div>
      </div>
    );
  }

  const isSalesManagerView = isDistributorSalesRepManager(user.role);

  const canCreateProgram = isDistributorFeatureEnabled(
    distributorId,
    DISTRIBUTOR_CAN_CREATE_PROGRAM_IDS
  );

  // Use static data instead of API call
  // const salesManagerData: ProgramListingCard[] = salesManagerProgramsData;
  const salesManagerData = await fetchAllSalesManagerPrograms(
    programTimeline,
    isInternal,
    searchParams?.warehouseId
  );

  return (
    <div className="programOverview">
      <ProgramOverviewHeader
        canCreate={canCreateProgram}
        showProgramTimeline={true}
      />

      <hr className="my-4" />

      <div className="text-left text-sm text-filter-light font-medium font-inter py-2">
        {salesManagerData.length > 0 && !isInternal ? (
          <div className="flex flex-wrap gap-4 mt-2">
            {salesManagerData.map((program: ProgramListingCard) => (
              <ProgramCard
                savingLabel={
                  isSalesManagerView ? "My Earnings" : "Total Manager Earnings"
                }
                purchaseLabel=""
                key={program.id}
                url="/app/programs/sales-manager/"
                data={program}
                showProgramPaymentTermBadge
                programTimeline={programTimeline}
                isInternal={isInternal}
                hidePurchaseVolume={true}
                warehouseId={searchParams?.warehouseId}
              />
            ))}
          </div>
        ) : (
          <p className="text-center">
            It seems there are currently no Sales Manager programs available.
            Please check back later or explore other sections.
          </p>
        )}
      </div>
    </div>
  );
};

export default SalesManagerProgramsPage;
