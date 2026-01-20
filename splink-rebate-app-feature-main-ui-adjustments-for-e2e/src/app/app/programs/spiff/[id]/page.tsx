import { fetchManagerWarehouseList } from "@/app/app/DashboardAPIs";
import { getUserServer } from "@/utils/getUserServer";
import { isWarehouseFeatureEnabled } from "@/utils/helper";
import {
  isDistributorAdmin,
  isDistributorAdminAndExecutive,
  isDistributorGeneralManager,
  isDistributorSalesRepManager
} from "@/utils/rolesConditions";
import SpiffProgramDetail from "@/views/SalesRep/spiffProgramDetail";

export const dynamic = "force-dynamic";

interface SpiffProgramDetailPageProps {
  params: { id: string };
  searchParams: { [key: string]: string };
}

const SpiffProgramDetailPage = async ({
  params,
  searchParams
}: SpiffProgramDetailPageProps) => {
  const user = getUserServer();

  const isManager = isDistributorGeneralManager(user.role);
  const isAdminOrExecutive = isDistributorAdminAndExecutive(user.role);
  const isSalesRepManager = isDistributorSalesRepManager(user.role);
  const distributorId = isDistributorAdmin(user.role)
    ? user?.associatedUserId
    : user?.parentEntityId;

  const warehouses =
    isWarehouseFeatureEnabled(distributorId) &&
    (isManager || isAdminOrExecutive || isSalesRepManager)
      ? await fetchManagerWarehouseList()
      : [];

  return (
    <SpiffProgramDetail
      params={params}
      searchParams={searchParams}
      warehouses={warehouses}
    />
  );
};

export default SpiffProgramDetailPage;
