import { getUserServer } from "@/utils/getUserServer";
import SpiffEarningStoreDetails from "@/views/SalesRep/spiffEarningStoreDetails";

import { USER_ROLES } from "@/configs/roles";
import { StoreDetails as StoreDetailsType } from "@/types/StoreTypes";

const StoreSpiffPage = async ({ params, searchParams }: StoreDetailsType) => {
  const user = getUserServer();
  switch (user?.role) {
    case USER_ROLES.DISTRIBUTOR_SALES_REP:
      return (
        <SpiffEarningStoreDetails params={params} searchParams={searchParams} />
      );

    default:
      return null;
  }
};
export default StoreSpiffPage;
