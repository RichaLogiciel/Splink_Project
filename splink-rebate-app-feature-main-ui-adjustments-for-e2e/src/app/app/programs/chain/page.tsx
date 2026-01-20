import InternalProgramTab from "@/components/InternalProgramTab";
import NoAccess from "@/components/NoAccess";
import ChainProgramsTab from "@/components/Tabs/ChainProgramsTab";
import { USER_ROLES } from "@/configs/roles";
import { APP_ROUTES } from "@/configs/routes";
import { DISTRIBUTOR_CAN_CREATE_PROGRAM_IDS } from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import {
  getProgramTimelineQueryParam,
  isDistributorFeatureEnabled
} from "@/utils/helper";
import ProgramOverviewHeader from "@/views/Distributor/ProgramOverviewHeader";
import ProgramsSalesRep from "@/views/SalesRep/programs";

interface ChainProgramsPageProps {
  searchParams: {
    warehouseId: string;
    programTimeline: string;
  };
}

const ChainProgramsPage = async ({ searchParams }: ChainProgramsPageProps) => {
  const user = getUserServer();

  const warehouseId = searchParams?.warehouseId;
  const programTimeline = getProgramTimelineQueryParam(
    searchParams?.programTimeline
  );

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
        <div className="chainProgramOverview">
          <ProgramOverviewHeader canCreate={canCreateProgram} />

          <div className="text-left text-sm text-filter-light font-medium font-inter">
            <InternalProgramTab
              allProgramsUrl={APP_ROUTES.chainPrograms}
              internalProgramsUrl={APP_ROUTES.chainProgramsInternal}
              hideInternalForSalesRepManager={true}
            />

            <ChainProgramsTab
              warehouseId={warehouseId}
              programTimeline={programTimeline}
            />
          </div>
        </div>
      );

    case USER_ROLES.DISTRIBUTOR_SALES_REP:
      return <ProgramsSalesRep searchParams={searchParams} />;

    default:
      return (
        <>
          <b className="block pb-4">Role: {user?.role} - Chain Programs</b>
          <NoAccess />
        </>
      );
  }
};

export default ChainProgramsPage;
