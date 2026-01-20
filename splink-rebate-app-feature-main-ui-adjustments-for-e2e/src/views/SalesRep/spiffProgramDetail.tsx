// Import core functionality
import Image from "next/image";
import Link from "next/link";
import {
  fetchSpiffProgramDetailsV2,
  getManufacturerProgramDetails,
  getProgramPdfUrl
} from "../Distributor/programDetailAPIs";
import { mapSpiffV2DetailDataToProgramDetail } from "./spiffProgramsApiDataHelpers";

// Import Components
import ManufacturerAvatar from "@/components/Avatar/ManufacturerAvatar";
import Card from "@/components/Card";
import RecommendedProductsCard from "@/components/Card/RecommendedProductsCard";
import DashboardCard from "@/components/Elements/DashboardCard";
import VoidFillCSVButton from "@/components/Elements/VoidFillCSVButton";
import SalesRepProgramTable from "@/components/Table/SalesRepProgramTable";
import WarehouseSelectFilter from "@/components/WarehouseSelectFilter";

// Import Utils
import { getUserServer } from "@/utils/getUserServer";
import { formatNumber } from "@/utils/numberFormatter";
import {
  getParentDistributorId,
  isDistributorAdmin,
  isDistributorAdminAndExecutive,
  isDistributorGeneralManager,
  isDistributorSalesRep,
  isDistributorSalesRepManager
} from "@/utils/rolesConditions";

// Import Types
import { DistributorProgramDetail } from "@/types/ProgramTypes";

// Import Images
import { getVoidFillProgramsSummary } from "@/app/app/DashboardAPIs";
import greenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import leftArrowIcon from "@/assets/icons/leftArrowIcon.svg";
import pinkStoreIcon from "@/assets/icons/pinkStoreIcon.svg";
import VoidFillProgramsSummaryCardWrapper from "@/components/Card/VoidFillProgramsSummaryCardWrapper";
import { ViewProgramPdfButton } from "@/components/Elements/ViewProgramPdfButton";
import { APP_ROUTES } from "@/configs/routes";
import {
  CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS,
  DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS
} from "@/utils/constants";
import { isStaging } from "@/utils/environmentDetection";
import {
  getProgramTimelineQueryParam,
  getUrlWithQueryParam,
  isDistributorFeatureEnabled
} from "@/utils/helper";
import { filterDuplicatePrograms } from "@/utils/programHelper";
import CustomDropdown from "../../components/Form/CustomDropdown";
import { fetchSalesRepsForSalesRepManager } from "../Distributor/chainsAPIs";
import { ENTITY_TYPES_RESPONSE } from "../Distributor/programConstants";
import { fetchSalesReps } from "../Distributor/storeAPIs";

interface SpiffProgramDetailProps {
  params: { id: string };
  searchParams: { [key: string]: string };
  warehouses?: any[];
}

const SpiffProgramDetail = async ({
  params,
  searchParams,
  warehouses = []
}: SpiffProgramDetailProps) => {
  const { id } = params;
  const {
    manufacturerName,
    programTimeline,
    isInternal,
    warehouseId,
    salesRepId
  } = searchParams;
  const isInternalInitiative = isInternal === "true";
  const manufacturerId = Number(id);

  const user = getUserServer();
  const isSalesRepManager = isDistributorSalesRepManager(user.role);
  const isSalesRep = isDistributorSalesRep(user.role);
  const isGeneralManager = isDistributorGeneralManager(user.role);
  const isDistributorAdminRole = isDistributorAdmin(user.role);

  const distributorId = getParentDistributorId(user.role, user);
  const isDistributorView =
    isDistributorAdminRole ||
    isDistributorAdminAndExecutive(user.role) ||
    isDistributorGeneralManager(user.role);
  const isManagerOrAdmin =
    isDistributorGeneralManager(user.role) ||
    isDistributorAdminAndExecutive(user.role) ||
    isSalesRepManager;

  // Check if default upcoming is enabled for distributor
  const defaultUpcomingEnabled = isDistributorFeatureEnabled(
    distributorId,
    DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  const defaultProgramTimeline =
    searchParams?.programTimeline ||
    (defaultUpcomingEnabled ? "Upcoming" : "Current");

  const entityType = isDistributorView
    ? ENTITY_TYPES_RESPONSE.DISTRIBUTOR
    : ENTITY_TYPES_RESPONSE.SALES_REP;

  // Get Sales Reps for Sales Rep Manager or Distributor Admin
  let salesReps: any[] = [];
  if (isSalesRepManager) {
    salesReps = await fetchSalesRepsForSalesRepManager(
      user?.associatedUserId,
      user?.parentEntityId ?? "",
      warehouseId ? warehouseId : ""
    );
  } else {
    const salesRepsData = await fetchSalesReps(
      distributorId,
      user,
      warehouseId ? warehouseId : ""
    );
    salesReps = salesRepsData?.salesReps || [];
  }

  // Prepare sales rep options for filters
  const salesRepOptions =
    salesReps.length > 0
      ? salesReps
          ?.filter(
            (salesRep: any) =>
              salesRep && salesRep.associatedUserId && salesRep.name
          )
          ?.map((salesRep: any) => ({
            value: salesRep.associatedUserId.toString(),
            label: salesRep.name
          })) || []
      : [];

  // Sort and add "All Sales Reps" option
  if (salesRepOptions && salesRepOptions.length > 0) {
    salesRepOptions.sort((a: any, b: any) =>
      (a.label || "").localeCompare(b.label || "")
    );
    // TODO: UNCOMMENT ONLY IF SHOWING SALES REP ON THE TOP RIGHT
    salesRepOptions.unshift({ value: "", label: "All Sales Reps" });
  }

  // Determine chain programs flag based on env and user role
  const distributorIdForChainEnv =
    isDistributorSalesRepManager(user.role) || isDistributorAdminRole
      ? user?.parentEntityId
      : user?.associatedUserId;
  const chainProgramsEnabled = isDistributorFeatureEnabled(
    distributorIdForChainEnv,
    CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  // Fetch void fill summary (filtered by manufacturer) and SPIFF program details concurrently
  const [voidFillProgramsSummary, apiV2Data] = await Promise.all([
    isSalesRep
      ? null
      : getVoidFillProgramsSummary({
          salesRepIds: salesRepId
            ? [Number(salesRepId)]
            : salesReps.length > 0 && salesRepOptions.length > 0
              ? salesRepOptions
                  .filter((salesRep: any) => salesRep.value !== "")
                  .map((salesRep: any) => Number(salesRep.value))
              : [],
          excludeChainStore: chainProgramsEnabled ? false : undefined,
          warehouseId: warehouseId || undefined,
          manufacturerId: manufacturerId,
          programTimeline: defaultProgramTimeline
        }),
    fetchSpiffProgramDetailsV2({
      manufacturerId,
      type: entityType,
      warehouseId,
      programTimeline: getProgramTimelineQueryParam(defaultProgramTimeline),
      isInternal: isInternalInitiative
    }) as any
  ]);

  // Map V2 data to expected format
  const apiData: DistributorProgramDetail | null = apiV2Data
    ? mapSpiffV2DetailDataToProgramDetail(apiV2Data)
    : await getManufacturerProgramDetails({
        manufacturerId,
        type: entityType,
        programTimeline: getProgramTimelineQueryParam(programTimeline),
        isInternal: isInternalInitiative
      });

  // Prepare program options from API response
  const programOptions =
    apiData?.programs.salesRep
      ?.filter((program: any) => program.criteria === "VOID_FILL")
      ?.map((program: any) => ({
        value: program.id,
        label: program.programName || program.programLine
      })) || [];

  // Prepare warehouse options from API response
  const warehouseOptions =
    voidFillProgramsSummary?.warehouseIds?.map((warehouse: any) => ({
      value: warehouse.warehouseId.toString(),
      label: warehouse.warehouseName
    })) || [];

  const isAuthorized = apiData?.manufacturer?.authorized;

  // Filter out duplicate programs
  if (apiData?.programs?.salesRep) {
    apiData.programs.salesRep = filterDuplicatePrograms(
      apiData.programs.salesRep
    );
  }

  const aggregatedCategorizedProducts: { [key: string]: any } = {};

  if (apiData?.programs?.salesRep) {
    (apiData.programs.salesRep as any[]).forEach((program) => {
      if (program.categorizedProducts) {
        for (const category in program.categorizedProducts) {
          const categoryData = program.categorizedProducts[category];
          if (!aggregatedCategorizedProducts[category]) {
            aggregatedCategorizedProducts[category] = {
              ...categoryData,
              requiredProducts: []
            };
          }
          if (categoryData && Array.isArray(categoryData.requiredProducts)) {
            aggregatedCategorizedProducts[category].requiredProducts.push(
              ...categoryData.requiredProducts
            );
          }
        }
      }
    });

    for (const category in aggregatedCategorizedProducts) {
      const seen = new Set();
      aggregatedCategorizedProducts[category].requiredProducts =
        aggregatedCategorizedProducts[category].requiredProducts.filter(
          (product: any) => {
            if (!product || !product.id) return false;
            const duplicate = seen.has(product.id);
            seen.add(product.id);
            return !duplicate;
          }
        );
    }
  }

  if (apiData?.manufacturer) {
    apiData.manufacturer.name = "SPIFF Program Details";
  }

  // TEMPORARY FOR STAGING
  // Add $ amount to Heineken Internal
  if (isInternalInitiative && isStaging && manufacturerId == 519) {
    if (!apiData) return;
    apiData.salesData.totalSalesRepSpiff.amount = 121;
  }

  const spiffEarning = formatNumber(
    apiData?.salesData.totalSalesRepSpiff.amount ?? 0
  );

  // Aggregate voids from all SPIFF sales rep programs
  const totalVoidsFilled = (apiData?.programs?.salesRep ?? []).reduce(
    (acc: number, prg: any) => acc + (Number(prg?.void_filled) || 0),
    0
  );
  const totalVoids = (apiData?.programs?.salesRep ?? []).reduce(
    (acc: number, prg: any) => acc + (Number(prg?.total_void) || 0),
    0
  );
  const voidsFilledDisplay = `${formatNumber(totalVoidsFilled)} / ${formatNumber(totalVoids)}`;

  // Show voids card only when any SPIFF program has VOID_FILL criteria
  // and at least one of total_void or void_filled is not null/0
  const hasVoidFill = (apiData?.programs?.salesRep ?? []).some(
    (prg: any) => (prg?.criteria || "").toUpperCase() === "VOID_FILL"
  );
  // && (totalVoidsFilled > 0 || totalVoids > 0);

  // Fetch PDF URL server-side (only for Current or Upcoming timelines)
  let pdfUrl: string | null = null;
  if (programTimeline === "Current" || programTimeline === "Upcoming") {
    try {
      const pdfResult = await getProgramPdfUrl(
        manufacturerId,
        programTimeline as "Current" | "Upcoming",
        "SPIFF"
      );
      pdfUrl = pdfResult.program_pdf;
    } catch (error) {
      console.error("Error fetching program PDF URL:", error);
      pdfUrl = null;
    }
  }

  return (
    <div data-testid="spiff-program-detail" id="spiff-program-detail">
      <div className="mb-4 flex justify-between gap-4 w-full items-center flex-wrap sm:flex-nowrap">
        <div className="flex items-center w-full justify-between flex-wrap sm:flex-nowrap gap-2">
          <div className="flex items-center">
            <div className="icons flex">
              <Link
                prefetch
                className="w-6 items-center p-1.5"
                href={getUrlWithQueryParam(
                  isInternalInitiative
                    ? APP_ROUTES.programsSpiffInternal
                    : APP_ROUTES.programsSpiff,
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
                  name: "SPIFF Program Details",
                  avatar: ""
                }
              }
              imageClass="w-[48px] h-[48px]"
            />
          </div>
          {!isDistributorGeneralManager(user.role) && (
            <WarehouseSelectFilter
              isManager={isManagerOrAdmin}
              warehouses={warehouses ?? []}
            />
          )}
        </div>
        <ViewProgramPdfButton
          manufacturerId={manufacturerId}
          programTimeline={programTimeline}
          programType="SPIFF"
          pdfUrl={pdfUrl}
        />
        {/* TOP SALES REPS DROPDOWN */}
        {!isSalesRep && salesReps.length > 0 && salesRepOptions.length > 0 && (
          <CustomDropdown
            classes="min-w-[230px] px-4 py-1.5 text-left bg-white border border-border-gray rounded outline-none text-sm"
            options={salesRepOptions}
            value={salesRepOptions[0]?.value || ""}
            queryParamKey="salesRepId"
          />
        )}
        {isDistributorAdmin(user.role) && (
          <VoidFillCSVButton
            manufacturerId={manufacturerId}
            manufacturerName={manufacturerName}
          />
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-[1rem] sm:gap-[1.5rem]">
        <DashboardCard
          fullWidth
          label={isDistributorView ? "Total Rep Earnings" : "My Earnings"}
          icon={greenDollarIcon.src}
          value={
            isInternalInitiative && spiffEarning == "0"
              ? "N/A"
              : `$${spiffEarning}`
          }
          showEstimatedWarning={!isAuthorized}
          id="my-earnings-card"
        />
        {hasVoidFill &&
          !isDistributorAdmin(user.role) &&
          (isSalesRepManager || isGeneralManager ? (
            <DashboardCard
              fullWidth
              label="My Earnings"
              icon={greenDollarIcon.src}
              value="$0"
              id="voids-filled-card"
            />
          ) : (
            isSalesRep && (
              <DashboardCard
                fullWidth
                label="Voids Filled"
                icon={pinkStoreIcon.src}
                value={voidsFilledDisplay}
                id="voids-filled-card"
              />
            )
          ))}
      </div>

      <Card className="my-4 sm:mt-6 w-full p-6">
        <h3 className="text-base font-medium tracking-[0.15rem] uppercase">
          SPIFF Program Details
        </h3>
        <SalesRepProgramTable
          id="sales-rep-program-table"
          programs={apiData?.programs.salesRep ?? []}
        />
      </Card>

      {!isSalesRep && hasVoidFill && (
        <VoidFillProgramsSummaryCardWrapper
          hideMetadataFilter={true}
          initialData={voidFillProgramsSummary?.voidFillDetails || []}
          salesRepOptions={salesRepOptions}
          warehouseOptions={warehouseOptions}
          programOptions={programOptions}
          initialSalesRepIds={salesRepId ? [Number(salesRepId)] : []}
          initialWarehouseId={warehouseId}
          initialExcludeChainStore={chainProgramsEnabled ? false : true}
          manufacturerId={manufacturerId}
          allowWarehouseFilter={false}
        />
      )}

      <RecommendedProductsCard
        manufacturerId={manufacturerId}
        programsType={entityType}
        title="Recommended Products"
        showSpiffProducts={true}
      />
    </div>
  );
};

export default SpiffProgramDetail;
