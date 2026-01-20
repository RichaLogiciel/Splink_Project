import InternalProgramTab from "@/components/InternalProgramTab";
import StoreProgramsLoading from "@/components/Loading/Programs/StoreProgramsLoading";
import NoAccess from "@/components/NoAccess";
import StoreProgramsTab from "@/components/Tabs/StoreProgramsTab";
import { USER_ROLES } from "@/configs/roles";
import { APP_ROUTES } from "@/configs/routes";
import {
  DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS,
  DISTRIBUTOR_CAN_CREATE_PROGRAM_IDS
} from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import {
  getProgramTimelineQueryParam,
  isDistributorFeatureEnabled
} from "@/utils/helper";
import { getParentDistributorId } from "@/utils/rolesConditions";
import ProgramOverviewHeader from "@/views/Distributor/ProgramOverviewHeader";
import ProgramsSalesRep from "@/views/SalesRep/programs";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface StoreProgramsPageProps {
  searchParams: {
    warehouseId: string;
    programTimeline: string;
  };
}

const StoreProgramsPage = async ({ searchParams }: StoreProgramsPageProps) => {
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

  const warehouseId = searchParams?.warehouseId;

  switch (user?.role) {
    case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
    case USER_ROLES.DISTRIBUTOR_ADMIN:
    case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
    case USER_ROLES.DISTRIBUTOR_SALES_MANAGER:
      const distributorId =
        user?.parentEntityId ?? user?.associatedUserId ?? null;
      const canCreateProgram = isDistributorFeatureEnabled(
        distributorId,
        DISTRIBUTOR_CAN_CREATE_PROGRAM_IDS
      );
      return (
        <div className="storeProgramOverview">
          <ProgramOverviewHeader canCreate={canCreateProgram} />

          <div className="text-left text-sm text-filter-light font-medium font-inter">
            <InternalProgramTab
              allProgramsUrl={APP_ROUTES.storePrograms}
              internalProgramsUrl={APP_ROUTES.storeProgramsInternal}
              hideInternalForSalesRepManager={true}
            />

            <Suspense fallback={<StoreProgramsLoading />}>
              <StoreProgramsTab
                warehouseId={warehouseId}
                programTimeline={programTimeline}
              />
            </Suspense>
          </div>
        </div>
      );

    case USER_ROLES.DISTRIBUTOR_SALES_REP:
      return <ProgramsSalesRep searchParams={searchParams} />;

    default:
      return (
        <>
          <b className="block pb-4">Role: {user?.role} - Store Programs</b>
          <NoAccess />
        </>
      );
  }
};
export default StoreProgramsPage;
