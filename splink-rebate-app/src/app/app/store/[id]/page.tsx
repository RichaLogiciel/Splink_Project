import { getUserServer } from "@/utils/getUserServer";
import StoreDetailsDistributor from "@/views/Distributor/storeDetails";
import StoreDetailsSalesRep from "@/views/SalesRep/storeDetails";

import { USER_ROLES } from "@/configs/roles";
import { StoreDetails as StoreDetailsType } from "@/types/StoreTypes";

const StorePage = async ({ params, searchParams }: StoreDetailsType) => {
  const user = getUserServer();
  switch (user?.role) {
    case USER_ROLES.DISTRIBUTOR_ADMIN:
    case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
    case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
    case USER_ROLES.DISTRIBUTOR_SALES_MANAGER:
      return (
        <StoreDetailsDistributor params={params} searchParams={searchParams} />
      );

    case USER_ROLES.MANUFACTURER:
      return (
        <StoreDetailsDistributor params={params} searchParams={searchParams} />
      );

    case USER_ROLES.DISTRIBUTOR_SALES_REP:
      return (
        <StoreDetailsSalesRep params={params} searchParams={searchParams} />
      );

    default:
      return null;
  }
};
export default StorePage;
