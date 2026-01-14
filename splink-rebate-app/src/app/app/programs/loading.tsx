import DistributorProgramLoader from "@/components/Loading/Programs/DistributorProgramLoader";
import ManufacturerProgramLoader from "@/components/Loading/Programs/ManufacturerProgramLoader";
import { USER_ROLES } from "@/configs/roles";
import { getUserServer } from "@/utils/getUserServer";

export default async function Loading() {
  const user = await getUserServer();

  switch (user?.role) {
    case USER_ROLES.MANUFACTURER:
    case USER_ROLES.MANUFACTURER_EXECUTIVE:
    case USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER:
      return <ManufacturerProgramLoader />;
    case USER_ROLES.DISTRIBUTOR_ADMIN:
    case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
    case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
    case USER_ROLES.DISTRIBUTOR_SALES_MANAGER:
    case USER_ROLES.DISTRIBUTOR_SALES_REP:
      return <DistributorProgramLoader />;
    default:
      break;
  }
}
