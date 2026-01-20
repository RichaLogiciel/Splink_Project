import { getUserServer } from "@/utils/getUserServer";
// import DashboardManufacturer from "@/views/Manufacturer/dashboard";
import ChainDashboard from "@/views/Chain/Dashboard";
import DashboardDistributor from "@/views/Distributor/dashboard";
import DashboardManufacturer from "@/views/Manufacturer/dashboardWrapper";
import DashboardSalesRep from "@/views/SalesRep/dashboard";
import StoreDashboard from "@/views/Store/Dashboard";

import DashboardMixpanelTracker from "@/components/DashboardMixpanelTracker";
import NoAccess from "@/components/NoAccess";
import { USER_ROLES } from "@/configs/roles";

interface DashboardPageProps {
  searchParams: {
    distributorId: string;
    warehouseId: string;
    manufacturerId?: string;
    programDetailId?: string;
    storeId: string;
    programTimeline?: string;
    sort?: string;
    sortKey?: string;
    sortFor?: string;
  };
}

const DashboardPage = async ({ searchParams }: DashboardPageProps) => {
  const user = getUserServer();

  return (
    <>
      <DashboardMixpanelTracker />

      {(() => {
        switch (user?.role) {
          case USER_ROLES.MANUFACTURER:
          case USER_ROLES.MANUFACTURER_EXECUTIVE:
          case USER_ROLES.MANUFACTURER_ACCOUNT_MANAGER:
            // return <DashboardManufacturer searchParams={searchParams} />;
            return <DashboardManufacturer searchParams={searchParams} />;

          case USER_ROLES.DISTRIBUTOR_ADMIN:
          case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
          case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
          case USER_ROLES.DISTRIBUTOR_SALES_MANAGER:
            return <DashboardDistributor searchParams={searchParams} />;

          case USER_ROLES.STORE:
            return (
              <StoreDashboard
                programTimeline={searchParams?.programTimeline as string}
              />
            );

          //sales rep dashboard
          case USER_ROLES.DISTRIBUTOR_SALES_REP:
            return <DashboardSalesRep searchParams={searchParams} />;

          case USER_ROLES.CHAIN_ADMIN:
            return <ChainDashboard searchParams={searchParams} />;

          default:
            return (
              <>
                <b className="block pb-4">Role: {user?.role} - Dashboard</b>
                <NoAccess />
              </>
            );
        }
      })()}
    </>
  );
};

export default DashboardPage;
