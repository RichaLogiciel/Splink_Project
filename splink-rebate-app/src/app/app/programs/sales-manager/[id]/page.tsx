// Import core functionality
import Image from "next/image";
import Link from "next/link";

// Import Components
import ManufacturerAvatar from "@/components/Avatar/ManufacturerAvatar";
import Card from "@/components/Card";
import RecommendedProductsCard from "@/components/Card/RecommendedProductsCard";
import DashboardCard from "@/components/Elements/DashboardCard";
import SalesManagerProgramTable from "@/components/Table/SalesManagerProgramTable";

// Import Utils
import { formatNumber } from "@/utils/numberFormatter";
import {
  isDistributorAdminAndExecutive,
  isDistributorSalesRepManager
} from "@/utils/rolesConditions";

// Import Types

// Import Images
import greenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import leftArrowIcon from "@/assets/icons/leftArrowIcon.svg";
import { APP_ROUTES } from "@/configs/routes";
import { getUserServer } from "@/utils/getUserServer";
import { getUrlWithQueryParam } from "@/utils/helper";
import { ENTITY_TYPES_RESPONSE } from "@/views/Distributor/programConstants";
import { fetchSalesManagerProgramsByManufacturer } from "@/views/Distributor/programsApi";

interface SalesManagerProgramDetailProps {
  params: { id: string };
  searchParams: { [key: string]: string };
}

const SalesManagerProgramDetail = async ({
  params,
  searchParams
}: SalesManagerProgramDetailProps) => {
  const { programTimeline, isInternal } = searchParams;
  const isInternalInitiative = isInternal === "true";

  const user = getUserServer();

  // Access control - only allow Distributor Admin, Distributor Executive, and Sales Rep Manager
  const hasAccess = isDistributorAdminAndExecutive(user?.role ?? "");
  if (!hasAccess) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Access Denied
          </h1>
          <p className="text-gray-600">Unauthorized to access this page.</p>
        </div>
      </div>
    );
  }

  const isSalesManager = isDistributorSalesRepManager(user?.role ?? "");

  // Use static data instead of API call
  // const apiData: DistributorProgramDetail | null = hariboProgramDetail;
  const apiData = await fetchSalesManagerProgramsByManufacturer(
    programTimeline,
    isInternalInitiative,
    Number(params.id) // Manufacturer ID
  );

  console.log(JSON.stringify(apiData, null, 2));
  const salesManagerEarning = formatNumber(
    apiData?.salesData.totalSavings.amount ?? 0
  );

  return (
    <div
      data-testid="sales-manager-program-detail"
      id="sales-manager-program-detail"
    >
      <div className="mb-4 flex justify-between gap-4 w-full">
        <div className="flex items-center">
          <div className="icons flex">
            <Link
              prefetch
              className="w-6 items-center p-1.5"
              href={getUrlWithQueryParam(
                isInternalInitiative
                  ? APP_ROUTES.programsSpiffInternal
                  : "/app/programs/sales-manager",
                "programTimeline",
                programTimeline
              )}
            >
              <Image
                src={leftArrowIcon.src}
                width={8}
                height={14}
                alt="leftArrowIcon"
              />
            </Link>
            <div className="seperater min-h-7 border ml-3 mr-4 border-border-gray"></div>
          </div>
          <ManufacturerAvatar
            large
            bold
            user={
              apiData?.manufacturer ?? {
                name: "Sales Manager Program Details",
                avatar: apiData.logo ?? ""
              }
            }
            imageClass="w-[48px] h-[48px]"
          />
        </div>
      </div>
      <div className="flex flex-col md:flex-row gap-[1rem] sm:gap-[1.5rem]">
        <DashboardCard
          fullWidth
          label={isSalesManager ? "My Earnings" : "Total Manager Earnings"}
          icon={greenDollarIcon.src}
          value={
            isInternalInitiative && salesManagerEarning == "0"
              ? "N/A"
              : `$${salesManagerEarning}`
          }
          showEstimatedWarning={!apiData?.manufacturer?.authorized}
          id="my-earnings-card"
        />
      </div>

      <Card className="mt-4 sm:mt-6 w-full p-6">
        <h3 className="text-base font-medium tracking-[0.15rem] uppercase">
          Sales Manager Program Details
        </h3>
        <SalesManagerProgramTable
          id="sales-manager-program-table"
          programs={apiData?.programs ?? []}
        />
      </Card>
      <RecommendedProductsCard
        manufacturerId={72}
        programsType={ENTITY_TYPES_RESPONSE.DISTRIBUTOR}
        title="Recommended Products"
        showSpiffProducts={true}
      />
    </div>
  );
};

export default SalesManagerProgramDetail;
