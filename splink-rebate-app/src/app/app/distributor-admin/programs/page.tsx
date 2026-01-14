import React from "react";
import DistributorAdminProgramsView from "@/views/Distributor/distributorAdminProgramsView";
import NoAccess from "@/components/NoAccess";
import { getUserServer } from "@/utils/getUserServer";
import { isSuperAdmin } from "@/utils/rolesConditions";

interface DistributorAdminProgramsPageProps {
  searchParams: {
    page?: string;
    limit?: string;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
    participantType?: "SALES_REP" | "DISTRIBUTOR" | "STORE";
    manufacturerName?: string;
    distributorName?: string;
    startDate?: string;
    endDate?: string;
  };
}

const DistributorAdminProgramsPage = async ({
  searchParams
}: DistributorAdminProgramsPageProps) => {
  const user = getUserServer();
  const isSuper = isSuperAdmin(user?.role);

  // Only super admins can access this page
  if (!isSuper) {
    return <NoAccess />;
  }

  return (
    <DistributorAdminProgramsView
      searchParams={searchParams}
      userRole={user?.role}
    />
  );
};

export default DistributorAdminProgramsPage;
