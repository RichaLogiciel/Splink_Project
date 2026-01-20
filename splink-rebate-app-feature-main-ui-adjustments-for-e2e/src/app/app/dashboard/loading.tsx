import ChainDashboardLoader from "@/components/Loading/Dashboard/ChainDashboardLoader";
import DistributorDashboardLoader from "@/components/Loading/Dashboard/DistributorDashboardLoader";
import ManufacturerDashboardLoader from "@/components/Loading/Dashboard/ManufacturerDashboardLoader";
import SalesRepDashboardLoader from "@/components/Loading/Dashboard/SalesRepDashboardLoader";
import StoreDashboardLoader from "@/components/Loading/Dashboard/StoreDashboardLoader";
import { USER_ROLES } from "@/configs/roles";
import { getUserServer } from "@/utils/getUserServer";

export default async function Loading() {
  // console.log("Loading");

  const user = await getUserServer();

  switch (user?.role) {
    case USER_ROLES.MANUFACTURER:
    case USER_ROLES.MANUFACTURER_EXECUTIVE:
    case USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER:
      return <ManufacturerDashboardLoader />;

    case USER_ROLES.DISTRIBUTOR_ADMIN:
    case USER_ROLES.DISTRIBUTOR_SALES_MANAGER:
    case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
    case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
      return <DistributorDashboardLoader />;

    case USER_ROLES.STORE:
      return <StoreDashboardLoader />;

    case USER_ROLES.DISTRIBUTOR_SALES_REP:
      return <SalesRepDashboardLoader />;

    case USER_ROLES.CHAIN_ADMIN:
      return <ChainDashboardLoader />;

    default:
      return (
        <div className="animate-pulse">
          <div className="mb-4">
            <div className="h-6 bg-gray-300 rounded w-48"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((item) => (
              <div key={item} className="bg-white p-6 rounded-lg shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-8 h-8 bg-gray-300 rounded"></div>
                  <div className="w-16 h-4 bg-gray-300 rounded"></div>
                </div>
                <div className="w-20 h-8 bg-gray-300 rounded mb-2"></div>
                <div className="w-32 h-4 bg-gray-300 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      );
  }
}
