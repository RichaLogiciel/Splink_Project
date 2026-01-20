import { USER_ROLES } from "@/configs/roles";
import { getUserServer } from "@/utils/getUserServer";
import ManufacturerProgramDetail from "@/views/Distributor/manufacturerProgramDetail";

export const dynamic = "force-dynamic";

interface ManufacturerProgramDetailPageProps {
  params: { id: string }; // Capture dynamic route parameter
  searchParams: { [key: string]: string }; // Capture query parameters
}

const ManufacturerProgramDetailPage = async ({
  params,
  searchParams
}: ManufacturerProgramDetailPageProps) => {
  const user = getUserServer();

  switch (user?.role) {
    case USER_ROLES.DISTRIBUTOR_ADMIN:
    case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
    case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
      return (
        <ManufacturerProgramDetail
          params={params}
          searchParams={searchParams}
        />
      );
  }
};

export default ManufacturerProgramDetailPage;
