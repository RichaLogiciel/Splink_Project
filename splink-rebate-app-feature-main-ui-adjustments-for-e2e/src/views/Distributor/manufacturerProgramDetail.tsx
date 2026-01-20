// Import core functionality
import Image from "next/image";
import Link from "next/link";
import {
  getManufacturerProgramDetails,
  getProgramPdfUrl
} from "./programDetailAPIs";

// Import Components
import ManufacturerAvatar from "@/components/Avatar/ManufacturerAvatar";
import Card from "@/components/Card";
import DashboardCard from "@/components/Elements/DashboardCard";
import DistributorProgramTable from "@/components/Table/DistributorProgramTable";

// Import Utils
import { formatNumber } from "@/utils/numberFormatter";

// Import Types
import { DistributorProgramDetail } from "@/types/ProgramTypes";

// Import Images
import { fetchManagerWarehouseList } from "@/app/app/DashboardAPIs";
import cartIcon from "@/assets/icons/cartIcon.svg";
import greenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import groupUsersIcon from "@/assets/icons/groupUsersIcon.svg";
import leftArrowIcon from "@/assets/icons/leftArrowIcon.svg";
import CategorizedTabProductList from "@/components/Elements/CategorizedTabProductList";
import { ViewProgramPdfButton } from "@/components/Elements/ViewProgramPdfButton";
import RetailerProgramTable from "@/components/Table/RetailerProgramTable";
import WarehouseSelectFilter from "@/components/WarehouseSelectFilter";
import { APP_ROUTES } from "@/configs/routes";
import { getUserServer } from "@/utils/getUserServer";
import {
  getProgramTimelineQueryParam,
  getUrlWithQueryParam,
  isWarehouseFeatureEnabled
} from "@/utils/helper";
import {
  isDistributorAdmin,
  isDistributorAdminAndExecutive,
  isDistributorGeneralManager
} from "@/utils/rolesConditions";

interface ManufacturerProgramDetailProps {
  params: { id: string }; // Capture dynamic route parameter
  searchParams: { [key: string]: string }; // Capture query parameters
}

const ManufacturerProgramDetail = async ({
  params,
  searchParams
}: ManufacturerProgramDetailProps) => {
  const user = getUserServer();

  const { id } = params;
  const warehouseId = searchParams?.warehouseId;
  const programTimeline = getProgramTimelineQueryParam(
    searchParams?.programTimeline
  );

  const isManager = isDistributorGeneralManager(user.role);

  const isAdminOrExecutive = isDistributorAdminAndExecutive(user.role);
  const distributorId = isDistributorAdmin(user.role)
    ? user?.associatedUserId
    : user?.parentEntityId;

  const manufacturerId = Number(id);

  const apiData: DistributorProgramDetail | null =
    await getManufacturerProgramDetails({
      manufacturerId,
      type: "DISTRIBUTOR",
      warehouseId,
      programTimeline
    });

  const isAuthorized = apiData?.manufacturer?.authorized;
  const warehouses =
    isWarehouseFeatureEnabled(distributorId) &&
    (isManager || isAdminOrExecutive)
      ? await fetchManagerWarehouseList()
      : [];

  // Temporary fix for 10% YoY growth
  if (
    user?.associatedUserId == 166 &&
    isDistributorAdmin(user.role) &&
    manufacturerId == 136 &&
    apiData?.salesData
  ) {
    apiData.salesData.purchaseVolume.amount = 1011101.25;
  }

  // Fetch PDF URL server-side (only for Current or Upcoming timelines)
  let pdfUrl: string | null = null;
  if (programTimeline === "Current" || programTimeline === "Upcoming") {
    try {
      const pdfResult = await getProgramPdfUrl(
        manufacturerId,
        programTimeline as "Current" | "Upcoming",
        "DISTRIBUTOR"
      );
      pdfUrl = pdfResult.program_pdf;
    } catch (error) {
      console.error("Error fetching program PDF URL:", error);
      pdfUrl = null;
    }
  }

  return (
    <div
      data-testid="manufacturer-program-detail"
      id="manufacturer-program-detail"
    >
      <div className="mb-4 flex justify-between gap-4 w-full">
        <div className="flex items-center">
          <div className="icons flex">
            <Link
              prefetch
              className="w-6 items-center p-1.5"
              href={getUrlWithQueryParam(
                APP_ROUTES.programs,
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
                name: "Distributor Program Details",
                avatar: ""
              }
            }
            imageClass="w-[48px] h-[48px]"
          />
        </div>
        <WarehouseSelectFilter
          isManager={isManager || isAdminOrExecutive}
          warehouses={warehouses ?? []}
        />
        <ViewProgramPdfButton
          manufacturerId={manufacturerId}
          programTimeline={programTimeline}
          programType="DISTRIBUTOR"
          pdfUrl={pdfUrl}
        />
      </div>
      <div className="flex flex-col md:flex-row gap-[1rem] sm:gap-[1.5rem]">
        <DashboardCard
          fullWidth
          label="Purchase Volume"
          icon={cartIcon.src}
          value={`$${formatNumber(
            apiData?.salesData.purchaseVolume.amount ?? 0
          )}`}
          yoyValue={apiData?.salesData.purchaseVolume.yoy}
          id="purchase-volume-card"
        />
        {!isManager && (
          <DashboardCard
            fullWidth
            label="Estimated Earnings"
            icon={greenDollarIcon.src}
            value={
              isAdminOrExecutive && warehouseId
                ? "NA"
                : `$${formatNumber(
                    apiData?.salesData.totalSavings.amount ?? 0
                  )}`
            }
            yoyValue={apiData?.salesData.totalSavings.yoy}
            showEstimatedWarning={!isAuthorized}
            id="estimated-earnings-card"
          />
        )}
        {/* <DashboardCard
          label="Total Saving opp."
          icon={orangeDollarIcon.src}
          value={`$${formatNumber(
            apiData?.salesData.totalOppSavings.amount ?? 0
          )}`}
        /> */}
        <DashboardCard
          fullWidth
          label="Sales Rep SPIFFS"
          icon={groupUsersIcon.src}
          value={`$${formatNumber(
            apiData?.salesData.totalSalesRepSpiff.amount ?? 0
          )}`}
          id="sales-rep-spiffs-card"
        />
      </div>

      <Card className="mt-4 sm:mt-6 w-full p-6">
        <h3 className="text-base font-medium tracking-[0.15rem] uppercase">
          Distributor Program Details
        </h3>
        <DistributorProgramTable
          id="distributor-program-table"
          showEstimatedWarning={false}
          manufacturerId={manufacturerId}
          programs={apiData?.programs.distributor ?? []}
          totalPurchaseVolume={apiData?.salesData.purchaseVolume.amount ?? 0}
          allPurchasedProducts={apiData?.purchasedProducts}
          showEstimatedEarning={!isManager}
          showSavingsNotApplicable={
            isAdminOrExecutive && warehouseId ? true : false
          }
          warehouses={warehouses ?? []}
          warehouseId={warehouseId}
        />
      </Card>

      <Card className="mt-4 sm:mt-6 w-full p-6">
        <h3 className="text-base font-medium tracking-[0.15rem] uppercase">
          Retailer Program - Product Breakdown
        </h3>
        <RetailerProgramTable
          programs={apiData?.programs?.retailer ?? []}
          manufacturerData={{
            ...apiData?.manufacturer,
            name: apiData?.manufacturer?.nameValue ?? "",
            avatar: apiData?.manufacturer?.avatar ?? ""
          }}
          showPurchasedProductsButton
          showStoreCompliance={false}
          showProductsUpcCode
          hideProductsUpcCodeOnPurchasedShow
          allPurchasedProducts={apiData?.purchasedProducts}
          id="retailer-program-table"
        />
      </Card>

      {/* <Card className="mt-4 sm:mt-6 w-full p-6">
        <h3 className="text-base font-medium tracking-[0.15rem] uppercase">
          Sales Rep Program Details
        </h3>
        <SalesRepProgramTable
          id="sales-rep-program-table"
          programs={apiData?.programs.salesRep ?? []}
        />
      </Card> */}

      <Card className="mt-4 sm:mt-6 w-full p-6">
        <h3 className="text-base mb-4 font-medium tracking-[0.15rem] uppercase">
          Recommended Products
        </h3>

        {!!apiData?.categorizedProducts &&
          !!Object.keys(apiData?.categorizedProducts || {})?.length && (
            <CategorizedTabProductList
              categorizedProducts={apiData?.categorizedProducts}
              className=""
              tabSearchParamKey={"programOverviewProductTab"}
            />
          )}
      </Card>
    </div>
  );
};

export default ManufacturerProgramDetail;
