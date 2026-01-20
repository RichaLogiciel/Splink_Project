import { getUserServer } from "@/utils/getUserServer";
import ChainDetails from "@/views/Distributor/chainDetails";

import { USER_ROLES } from "@/configs/roles";

interface ChainDetailsPageProps {
  params: { chainId: string };
  searchParams: {
    warehouseId?: string;
    programTimeline?: string;
    currentPage?: string;
    s?: string;
    sort?: string;
    sortKey?: string;
  };
}

const ChainDetailsPage = async ({
  params,
  searchParams
}: ChainDetailsPageProps) => {
  const user = getUserServer();

  switch (user?.role) {
    case USER_ROLES.DISTRIBUTOR_ADMIN:
    case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
    case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
    case USER_ROLES.DISTRIBUTOR_SALES_REP:
    case USER_ROLES.DISTRIBUTOR_SALES_MANAGER:
      return <ChainDetails params={params} searchParams={searchParams} />;

    case USER_ROLES.MANUFACTURER:
    case USER_ROLES.MANUFACTURER_EXECUTIVE:
    case USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER:
      return <ChainDetails params={params} searchParams={searchParams} />;

    default:
      return null;
  }
};

export default ChainDetailsPage;
