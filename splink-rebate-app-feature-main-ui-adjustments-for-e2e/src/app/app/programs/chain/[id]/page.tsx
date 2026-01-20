import { fetchManagerWarehouseList } from "@/app/app/DashboardAPIs";
import { USER_ROLES } from "@/configs/roles";
import { getUserServer } from "@/utils/getUserServer";
import { isWarehouseFeatureEnabled } from "@/utils/helper";
import {
  isDistributorAdmin,
  isDistributorAdminAndExecutive,
  isDistributorGeneralManager
} from "@/utils/rolesConditions";
import ChainProgramDetailDistributor from "@/views/Distributor/chainProgramDetailPage";

export const dynamic = "force-dynamic";

interface ChainProgramDetailPageProps {
  params: { id: string }; // Capture dynamic route parameter
  searchParams: { [key: string]: string }; // Capture query parameters
}

const ChainProgramDetailPage = async ({
  params,
  searchParams
}: ChainProgramDetailPageProps) => {
  const user = getUserServer();

  const isManager = isDistributorGeneralManager(user.role);

  const isAdminOrExecutive = isDistributorAdminAndExecutive(user.role);
  const distributorId = isDistributorAdmin(user.role)
    ? user?.associatedUserId
    : user?.parentEntityId;

  const warehouses =
    isWarehouseFeatureEnabled(distributorId) &&
    (isManager || isAdminOrExecutive)
      ? await fetchManagerWarehouseList()
      : [];

  switch (user?.role) {
    case USER_ROLES.DISTRIBUTOR_ADMIN:
    case USER_ROLES.DISTRIBUTOR_SALES_MANAGER:
    case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
    case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
      return (
        <ChainProgramDetailDistributor
          userId={user.id}
          params={params}
          searchParams={searchParams}
          warehouses={warehouses}
        />
      );

    case USER_ROLES.DISTRIBUTOR_SALES_REP:
      return (
        <ChainProgramDetailDistributor
          userId={user.id}
          params={params}
          searchParams={searchParams}
          isSalesRep={true}
        />
      );
  }
};

export default ChainProgramDetailPage;
