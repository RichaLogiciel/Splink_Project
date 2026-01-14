import { fetchManagerWarehouseList } from "@/app/app/DashboardAPIs";
import { USER_ROLES } from "@/configs/roles";
import { getUserServer } from "@/utils/getUserServer";
import {
  getProgramTimelineQueryParam,
  isWarehouseFeatureEnabled
} from "@/utils/helper";
import {
  isDistributorAdmin,
  isDistributorAdminAndExecutive,
  isDistributorGeneralManager
} from "@/utils/rolesConditions";
import { getProgramPdfUrl } from "@/views/Distributor/programDetailAPIs";
import StoreProgramDetailDistributor from "@/views/Distributor/storeProgramDetailPage";

export const dynamic = "force-dynamic";

interface StoreProgramDetailPageProps {
  params: { id: string }; // Capture dynamic route parameter
  searchParams: { [key: string]: string }; // Capture query parameters
}

const StoreProgramDetailPage = async ({
  params,
  searchParams
}: StoreProgramDetailPageProps) => {
  const user = getUserServer();

  const isManager = isDistributorGeneralManager(user.role);

  const isAdminOrExecutive = isDistributorAdminAndExecutive(user.role);
  const distributorId = isDistributorAdmin(user.role)
    ? user?.associatedUserId
    : user?.parentEntityId;

  const warehouses =
    isWarehouseFeatureEnabled(distributorId) &&
    (isManager || isAdminOrExecutive)
      ? await fetchManagerWarehouseList()
      : [];

  // Fetch PDF URL server-side (only for Current or Upcoming timelines)
  const programTimeline = getProgramTimelineQueryParam(
    searchParams?.programTimeline
  );
  let pdfUrl: string | null = "http://localhost:3001/sample.pdf";

  // if (
  //   searchParams?.programTimeline === "Current" ||
  //   searchParams?.programTimeline === "Upcoming"
  // ) {
  //   try {
  //     const pdfResult = await getProgramPdfUrl(
  //       Number(params.id),
  //       programTimeline as "Current" | "Upcoming",
  //       "STORE"
  //     );
  //     pdfUrl = pdfResult.program_pdf;
  //   } catch (error) {
  //     console.error("Error fetching program PDF URL:", error);
  //     pdfUrl = null;
  //   }
  // }

  switch (user?.role) {
    case USER_ROLES.DISTRIBUTOR_ADMIN:
    case USER_ROLES.DISTRIBUTOR_SALES_MANAGER:
    case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
    case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
      return (
        <StoreProgramDetailDistributor
          userId={user.id}
          params={params}
          searchParams={searchParams}
          warehouses={warehouses}
          pdfUrl={pdfUrl}
        />
      );

    case USER_ROLES.DISTRIBUTOR_SALES_REP:
      return (
        <StoreProgramDetailDistributor
          userId={user.id}
          params={params}
          searchParams={searchParams}
          isSalesRep={true}
          pdfUrl={pdfUrl}
        />
      );
  }
};

export default StoreProgramDetailPage;
