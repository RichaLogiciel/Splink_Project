import CustomDropdown from "@/components/Form/CustomDropdown";
import userRoles from "@/mocks/users/user-roles.json";
import { MANUFACTURER_AM_INVITE_ENABLED } from "@/utils/constants";
import { isWarehouseFeatureEnabled } from "@/utils/helper";
import {
  isDistributorAdmin,
  isDistributorAdminAndExecutive,
  isManufacturerAdminAndExecutive
} from "@/utils/rolesConditions";

const UserRoleDropdown = ({ user }: { user?: any }) => {
  let options = userRoles.superAdmin;
  if (isManufacturerAdminAndExecutive(user?.role)) {
    options = MANUFACTURER_AM_INVITE_ENABLED
      ? userRoles.manufacturerWithAM
      : userRoles.manufacturer;
  }

  if (isDistributorAdminAndExecutive(user?.role)) {
    options = isWarehouseFeatureEnabled(
      isDistributorAdmin(user?.role)
        ? user?.associatedUserId
        : user?.parentEntityId
    )
      ? userRoles.distributorWithManagers
      : userRoles.distributor;
  }

  return (
    <CustomDropdown
      id={"user-role-dropdown"}
      options={options}
      queryParamKey="type"
      labelPrefix="Role:"
    />
  );
};

export default UserRoleDropdown;
