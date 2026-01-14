import { fetchManagerWarehouseList } from "@/app/app/DashboardAPIs";
import CreateNewProgram from "@/components/Buttons/CreateNewProgram";
import ProgramTimelineOptionSelector from "@/components/OptionSelector/ProgramTimelineOptionSelector";
import WarehouseSelectFilter from "@/components/WarehouseSelectFilter";
import { getUserServer } from "@/utils/getUserServer";
import { isWarehouseFeatureEnabled } from "@/utils/helper";
import {
  isDistributorAdmin,
  isDistributorAdminAndExecutive,
  isDistributorGeneralManager,
  isDistributorSalesRepManager
} from "@/utils/rolesConditions";

interface ProgramOverviewHeaderProps {
  canCreate?: boolean;
  showProgramTimeline?: boolean;
}

const ProgramOverviewHeader = async ({
  canCreate,
  showProgramTimeline = false
}: ProgramOverviewHeaderProps) => {
  const user = getUserServer();
  const isDist = isDistributorAdmin(user.role);
  const isAdminOrExecutive = isDistributorAdminAndExecutive(user.role);
  const isManager = isDistributorGeneralManager(user.role);
  const isSalesRepManager = isDistributorSalesRepManager(user.role);

  const distributorId = isDistributorAdmin(user.role)
    ? user?.associatedUserId
    : user?.parentEntityId;
  const warehouses =
    isWarehouseFeatureEnabled(distributorId) &&
    (isManager || isAdminOrExecutive)
      ? await fetchManagerWarehouseList()
      : [];

  return isDist && canCreate ? (
    <div className="flex justify-between gap-3 mb-2.5">
      <h2 className="text-lg font-semibold">Program Overview</h2>
      <div className="flex items-center gap-4">
        {showProgramTimeline && <ProgramTimelineOptionSelector />}
        {!isSalesRepManager && !isManager && (
          <WarehouseSelectFilter
            isManager={isAdminOrExecutive}
            warehouses={warehouses}
            forceUpdate={true}
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
            forceUpdate={true}
          />
        )}
        {showProgramTimeline && <ProgramTimelineOptionSelector />}
      </div>
    </div>
  );
};

export default ProgramOverviewHeader;
