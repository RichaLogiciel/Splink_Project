import NoAccess from "@/components/NoAccess";
import { USER_ROLES } from "@/configs/roles";
import { getUserServer } from "@/utils/getUserServer";
import Chains from "@/views/Distributor/chains";

interface StoreChainsPageProps {
  searchParams: {
    warehouseId?: string;
    programTimeline?: string;
    currentPage?: string;
    s?: string;
    chainId?: string;
    sort?: string;
    sortKey?: string;
    srId?: string;
  };
}

const StoreChainsPage = async ({ searchParams }: StoreChainsPageProps) => {
  const user = getUserServer();

  const getDistributorId = () => {
    if (!user) return null;

    switch (user.role) {
      case USER_ROLES.DISTRIBUTOR_ADMIN:
        return user.associatedUserId;
      case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
      case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
      case USER_ROLES.DISTRIBUTOR_SALES_REP:
      case USER_ROLES.DISTRIBUTOR_SALES_MANAGER:
        return user.parentEntityId;
      default:
        return null;
    }
  };

  const distributorId = getDistributorId();

  if (!distributorId) {
    return (
      <>
        <b className="block pb-4">Error: No distributor ID found</b>
        <NoAccess />
      </>
    );
  }

  // Convert string values to numbers for the Chains component
  const convertedSearchParams = {
    ...searchParams,
    currentPage: searchParams.currentPage
      ? Number(searchParams.currentPage)
      : undefined,
    page: searchParams.currentPage
      ? Number(searchParams.currentPage)
      : undefined
  };

  switch (user?.role) {
    case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
    case USER_ROLES.DISTRIBUTOR_ADMIN:
    case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
    case USER_ROLES.DISTRIBUTOR_SALES_REP:
    case USER_ROLES.DISTRIBUTOR_SALES_MANAGER:
      return (
        <Chains
          distributorId={distributorId}
          searchParams={convertedSearchParams}
        />
      );

    // TODO: Uncomment this when we have a way to get the distributorId for manufacturers
    // case USER_ROLES.MANUFACTURER:
    // case USER_ROLES.MANUFACTURER_EXECUTIVE:
    // case USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER:
    //   return (
    //     <Chains
    //       distributorId={distributorId}
    //       searchParams={convertedSearchParams}
    //     />
    //   );

    default:
      return (
        <>
          <b className="block pb-4">Role: {user?.role} - Store Chains</b>
          <NoAccess />
        </>
      );
  }
};

export default StoreChainsPage;
