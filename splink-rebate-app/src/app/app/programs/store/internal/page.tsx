import CreateNewProgram from "@/components/Buttons/CreateNewProgram";
import InternalProgramTab from "@/components/InternalProgramTab";
import NoAccess from "@/components/NoAccess";
import StoreProgramsTab from "@/components/Tabs/StoreProgramsTab";
import WarehouseSelectFilter from "@/components/WarehouseSelectFilter";
import { USER_ROLES } from "@/configs/roles";
import { APP_ROUTES } from "@/configs/routes";
import { DISTRIBUTOR_CAN_CREATE_PROGRAM_IDS } from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import {
  getProgramTimelineQueryParam,
  isDistributorFeatureEnabled,
  isWarehouseFeatureEnabled
} from "@/utils/helper";
import {
  isDistributorAdmin,
  isDistributorAdminAndExecutive,
  isDistributorGeneralManager,
  isDistributorSalesRepManager
} from "@/utils/rolesConditions";
import ProgramsSalesRep from "@/views/SalesRep/programs";
import { fetchManagerWarehouseList } from "../../../DashboardAPIs";

interface StoreProgramsPageProps {
  searchParams: {
    warehouseId: string;
    programTimeline: string;
  };
}

const StoreProgramsPage = async ({ searchParams }: StoreProgramsPageProps) => {
  const user = getUserServer();
  const isDist = isDistributorAdmin(user?.role || "");

  const warehouseId = searchParams?.warehouseId;
  const programTimeline = getProgramTimelineQueryParam(
    searchParams?.programTimeline
  );

  const isManager = isDistributorGeneralManager(user.role);

  const isAdminOrExecutive = isDistributorAdminAndExecutive(user.role);
  const isSalesRepManager = isDistributorSalesRepManager(user.role);
  const distributorId = isDistributorAdmin(user.role)
    ? user?.associatedUserId
    : user?.parentEntityId;

  const warehouses =
    isWarehouseFeatureEnabled(distributorId) &&
    (isManager || isAdminOrExecutive)
      ? await fetchManagerWarehouseList()
      : [];

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
          {isDist && canCreateProgram ? (
            <div className="flex justify-between gap-3 mb-2.5">
              <h2 className="text-lg font-semibold">Program Overview</h2>
              <div className="flex items-center gap-3">
                {!isSalesRepManager && !isManager && (
                  <WarehouseSelectFilter
                    isManager={isAdminOrExecutive}
                    warehouses={warehouses}
                  />
                )}
                <CreateNewProgram />
              </div>
            </div>
          ) : (
            <div className="mb-4 flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold">Program Overview</h2>
              <div className="flex items-center gap-3">
                {!isSalesRepManager && !isManager && (
                  <WarehouseSelectFilter
                    isManager={isAdminOrExecutive}
                    warehouses={warehouses}
                  />
                )}
              </div>
            </div>
          )}

          <div className="text-left text-sm text-filter-light font-medium font-inter">
            <InternalProgramTab
              allProgramsUrl={APP_ROUTES.storePrograms}
              internalProgramsUrl={APP_ROUTES.storeProgramsInternal}
              hideInternalForSalesRepManager={true}
            />

            <StoreProgramsTab
              warehouseId={warehouseId}
              programTimeline={programTimeline}
              isInternal={true}
            />
          </div>
        </div>
      );

    case USER_ROLES.DISTRIBUTOR_SALES_REP:
      return <ProgramsSalesRep searchParams={searchParams} isInternal={true} />;

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
