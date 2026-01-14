// Import Components
import ExecutiveCard from "@/components/Card/ExecutiveCard";
import MySalesCard from "@/components/Card/MySalesCard";
import SalesRepEarningsCard from "@/components/Card/SalesRepEarningsCard";
import ClickTracker from "@/components/ClickTracker";
import DashboardToast from "@/components/Toast/DashboardToast";

// Import API Functions
import {
  fetchDistributorStoreEarnings,
  fetchExecutiveKeyMetrics,
  fetchExecutiveSalesRepEarnings,
  fetchManagerWarehouseList,
  // fetchExecutiveStoreProgram,
  fetchSalesRepStoresEnrollment,
  getVoidFillProgramsSummary
} from "@/app/app/DashboardAPIs";
import ListingDataTable from "@/components/Card/ListingDataTable";
import CustomDropdown from "@/components/Form/CustomDropdown";
import ProgramExpirationNotice from "@/components/ProgramExpirationNotice/ProgramExpirationNotice";
import WarehouseSelectFilter from "@/components/WarehouseSelectFilter";
import {
  CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS,
  DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS,
  DISTRIBUTOR_SHOW_ENROLLED_STORES_TILE,
  ENABLE_PROGRAM_EXPIRATION_NOTICE,
  MINIMAL_FEATURE_FOR_SALES_REP_MANAGER_IDS,
  STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
} from "@/utils/constants";
import { isDemo, isStaging } from "@/utils/environmentDetection";
import { getUserServer } from "@/utils/getUserServer";
import {
  isDistributorFeatureEnabled,
  isWarehouseFeatureEnabled
} from "@/utils/helper";
import { formatNumber } from "@/utils/numberFormatter";
import {
  getParentDistributorId,
  isDistributorAdmin,
  isDistributorAdminAndExecutive,
  isDistributorGeneralManager,
  isDistributorSalesRepManager
} from "@/utils/rolesConditions";
import EnrolledStoresCard from "./../../components/Card/EnrolledStoresCard";
import VoidFillProgramsSummaryCardWrapper from "./../../components/Card/VoidFillProgramsSummaryCardWrapper";

interface DashboardProps {
  searchParams: {
    programTimeline?: string;
    warehouseId: string;
    sort?: string;
    sortKey?: string;
    sortFor?: string;
  };
}

const DashboardDistributor = async ({ searchParams }: DashboardProps) => {
  let errorFlag = false;
  const {
    sort = "",
    sortKey = "",
    warehouseId = "",
    sortFor = "",
    programTimeline = ""
  } = searchParams;

  const user = await getUserServer();
  const isGeneralManager = isDistributorGeneralManager(user.role);
  const isAdmin = isDistributorAdmin(user.role);
  const isSalesRepManager = isDistributorSalesRepManager(user.role);

  const isAdminOrExecutive = isDistributorAdminAndExecutive(user.role);

  // Get Distributor Admin ID for Flags
  const distributorAdminId = getParentDistributorId(user?.role ?? "", user);

  // Treat General Managers like Admins for distributorId calculation
  const distributorId =
    isAdmin || isGeneralManager ? user?.associatedUserId : user?.parentEntityId;

  // Check if default upcoming is enabled for distributor
  const defaultUpcomingEnabled = isDistributorFeatureEnabled(
    distributorAdminId,
    DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  const defaultProgramTimeline =
    programTimeline || (defaultUpcomingEnabled ? "Upcoming" : "Current");

  // Warehouse List API call (conditional) - execute after main API calls
  let warehouses = [];

  const warehouseFeatureEnabled = isWarehouseFeatureEnabled(distributorAdminId);
  if (warehouseFeatureEnabled && (isGeneralManager || isAdminOrExecutive)) {
    const warehouseData = await fetchManagerWarehouseList();

    // Handle different API response structures
    if (Array.isArray(warehouseData)) {
      warehouses = warehouseData;
    } else if (warehouseData?.warehouses) {
      // Handle structure: { warehouses: { assigned: [], unassigned: [] } }
      warehouses = [
        ...(warehouseData.warehouses?.assigned || []),
        ...(warehouseData.warehouses?.unassigned || [])
      ];
    } else if (warehouseData?.assigned || warehouseData?.unassigned) {
      // Handle structure: { assigned: [], unassigned: [] }
      warehouses = [
        ...(warehouseData.assigned || []),
        ...(warehouseData.unassigned || [])
      ];
    } else {
      warehouses = [];
    }
  }

  // Determine default warehouse ID
  let defaultWarehouseId = "";
  if (warehouseFeatureEnabled) {
    if (searchParams?.warehouseId) {
      defaultWarehouseId = searchParams.warehouseId;
    } else if (
      (isGeneralManager || isSalesRepManager) &&
      warehouses.length === 1
    ) {
      defaultWarehouseId = warehouses[0]?.id || "";
    }
  }

  // Execute all API calls concurrently using Promise.all
  const [
    keyMetricsResponse,
    salesRepEarningsResponse,
    distributorStoreEarnings,
    salesRepStoresEnrollmentRes
  ] = await Promise.all([
    fetchExecutiveKeyMetrics(defaultWarehouseId, defaultProgramTimeline),
    fetchExecutiveSalesRepEarnings({
      warehouseId: defaultWarehouseId,
      ...(sort && sortKey && sortFor === "salesRepEarnings"
        ? { sort, sortKey }
        : {}),
      programTimeline: defaultProgramTimeline
    }),
    fetchDistributorStoreEarnings({
      ...(sort && sortKey && sortFor === "distributorStoreEarnings"
        ? { sort, sortKey }
        : {}),
      warehouseId: defaultWarehouseId,
      programTimeline: defaultProgramTimeline
    }),
    fetchSalesRepStoresEnrollment({
      warehouseId: defaultWarehouseId,
      programTimeline: defaultProgramTimeline
    })
  ]);

  // Determine chain programs flag based on env and user role
  // Treat General Managers like Admins (use associatedUserId)
  const distributorIdForChainEnv = isDistributorSalesRepManager(user.role)
    ? user?.parentEntityId
    : user?.associatedUserId;
  const chainProgramsEnabled = isDistributorFeatureEnabled(
    distributorIdForChainEnv,
    CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  // Collect all sales rep IDs into a single array
  const salesRepIds: number[] = salesRepEarningsResponse.salesRepData
    .map((salesRep: any) => salesRep.salesRepId)
    .filter((id: any) => id != null);

  // Call Void/Fill Programs Summary API
  const voidFillProgramsSummary = await getVoidFillProgramsSummary({
    salesRepIds,
    excludeChainStore: chainProgramsEnabled ? false : undefined,
    warehouseId: defaultWarehouseId,
    programTimeline: defaultProgramTimeline
  });

  // Prepare sales rep options for filters
  const salesRepOptions = salesRepEarningsResponse.salesRepData.map(
    (salesRep: any) => ({
      value: salesRep.salesRepId.toString(),
      label: salesRep.name
    })
  );

  // Prepare warehouse options from API response
  const warehouseOptions =
    voidFillProgramsSummary?.warehouseIds?.map((warehouse: any) => ({
      value: warehouse.warehouseId.toString(),
      label: warehouse.warehouseName
    })) || [];

  // Prepare program options from API response
  const programOptions =
    voidFillProgramsSummary?.programs?.map((program: any) => ({
      value: program.programId.toString(),
      label: program.programName
    })) || [];

  // Calculate distributor ID for warehouse feature check
  // Use parentEntityId for Sales Rep Manager, associatedUserId for Admin or General Manager
  const distributorIdForWarehouseRaw = isSalesRepManager
    ? user?.parentEntityId
    : isAdmin || isGeneralManager
      ? user?.associatedUserId
      : distributorId;

  const isSalesRepManagerMinimal =
    isSalesRepManager &&
    isDistributorFeatureEnabled(
      isSalesRepManager ? user?.associatedUserId : distributorAdminId,
      MINIMAL_FEATURE_FOR_SALES_REP_MANAGER_IDS
    );

  const storeProgrammingEnabled = isDistributorFeatureEnabled(
    distributorAdminId,
    STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  if (!(keyMetricsResponse && salesRepEarningsResponse)) {
    errorFlag = true;
  }

  // TEMPORARY FOR STAGING
  // Add Earning Amount for Alcohal Demo - Sales Rep Manager
  if (isStaging && distributorAdminId == 55) {
    keyMetricsResponse.salesRepManagerTotalEarnings = 500;
  }

  // TEMPORARY FOR DEMO
  // Add Earning Amount for Alcohal Demo - Sales Rep Manager
  if (isDemo && isSalesRepManager && user.associatedUserId == 605) {
    keyMetricsResponse.salesRepManagerTotalEarnings = 250;
  }

  // Calculate distinct store IDs from sales rep data
  const distinctStoreIds = new Set<number>();
  if (salesRepEarningsResponse?.salesRepData) {
    salesRepEarningsResponse.salesRepData.forEach((rep: any) => {
      if (rep.storeIds && Array.isArray(rep.storeIds)) {
        rep.storeIds.forEach((id: any) => {
          if (id != null) distinctStoreIds.add(Number(id));
        });
      }
    });
  }
  const distinctStoreCount =
    distinctStoreIds.size > 0
      ? distinctStoreIds.size
      : (keyMetricsResponse?.storesCount ?? 0);

  // Program Timeline Options
  const programTimelineOptions = [
    {
      value: "Upcoming",
      label: "Upcoming"
    },
    {
      value: "Current",
      label: "Current"
    },
    {
      value: "Historical",
      label: "Historic"
    }
  ];

  return (
    <ClickTracker viewName="Distributor Dashboard">
      {ENABLE_PROGRAM_EXPIRATION_NOTICE && (
        <ProgramExpirationNotice messageType="WARNING" />
      )}
      {errorFlag && <DashboardToast showToast={errorFlag} />}
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
        <div className="text-lg font-semibold">Executive Dashboard</div>
        <div className="flex items-center gap-4">
          {warehouseFeatureEnabled && !isGeneralManager && (
            <WarehouseSelectFilter
              isManager={isAdminOrExecutive}
              warehouses={warehouses}
            />
          )}

          <CustomDropdown
            classes="min-w-[130px] px-4 py-1.5 text-left bg-white border border-border-gray rounded outline-none text-sm"
            defaultValue={defaultProgramTimeline}
            options={programTimelineOptions}
            queryParamKey="programTimeline"
          />
        </div>
      </div>

      <ExecutiveCard
        showCsvDownloadButton={isAdmin || isGeneralManager}
        totalSavings={`$${formatNumber(keyMetricsResponse?.totalSavings ?? 0)}`}
        totalPurchaseVolume={keyMetricsResponse?.totalPurchaseVolume}
        storesEnrolledInProgramsCount={
          keyMetricsResponse?.enrolledStoreCount ?? 0
        }
        relevantPurchaseVolume={keyMetricsResponse?.relevantPurchaseVolume}
        showEnrolledStoresTile={DISTRIBUTOR_SHOW_ENROLLED_STORES_TILE}
        storesCount={keyMetricsResponse?.storesCount}
        activeStoresCount={keyMetricsResponse?.activeStoresProgramsEnrolled}
        manufacturersCount={keyMetricsResponse?.manufacturersCount}
        salesRepTotalEarnings={keyMetricsResponse?.salesRepTotalEarnings}
        salesRepManagerTotalEarnings={
          keyMetricsResponse?.salesRepManagerTotalEarnings
        }
      />

      <div className="charts-container grid grid-col-fit-[365px] gap-6 mb-6">
        {storeProgrammingEnabled &&
        DISTRIBUTOR_SHOW_ENROLLED_STORES_TILE &&
        !isSalesRepManagerMinimal ? (
          <ListingDataTable
            data={distributorStoreEarnings?.stores || []}
            cardLabel={"Top Stores Earnings"}
            totalEarningOrSales={`$${formatNumber(distributorStoreEarnings?.totalEarnings ?? 0)}`}
            tableHeadings={{ column_1: "Stores", column_2: "Earnings" }}
            isLargeCardLabel
          />
        ) : (
          !isSalesRepManagerMinimal && (
            <MySalesCard role={user?.role} warehouseId={warehouseId} />
          )
        )}

        {storeProgrammingEnabled && !isSalesRepManagerMinimal && (
          <EnrolledStoresCard
            items={salesRepStoresEnrollmentRes}
            totalStores={keyMetricsResponse?.storesCount}
            warehouseId={warehouseId}
            itemSpecificTotalCount
          />
        )}
      </div>

      {(salesRepEarningsResponse?.salesRepData?.length > 0 ||
        voidFillProgramsSummary?.voidFillDetails?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6">
          {salesRepEarningsResponse?.salesRepData?.length > 0 && (
            <SalesRepEarningsCard
              totalSalesReps={salesRepEarningsResponse?.totalSalesReps}
              totalEarnings={salesRepEarningsResponse?.totalEarnings}
              salesRepData={salesRepEarningsResponse?.salesRepData}
              totalStores={distinctStoreCount}
              showDownloadCsvBtn={isAdmin || isGeneralManager}
              salesRepManagerTotalEarnings={
                keyMetricsResponse?.salesRepManagerTotalEarnings
              }
            />
          )}
          {voidFillProgramsSummary?.voidFillDetails?.length > 0 && (
            <VoidFillProgramsSummaryCardWrapper
              initialData={voidFillProgramsSummary?.voidFillDetails || []}
              salesRepOptions={salesRepOptions}
              warehouseOptions={warehouseOptions}
              programOptions={programOptions}
              initialSalesRepIds={salesRepIds}
              initialWarehouseId={defaultWarehouseId}
              initialExcludeChainStore={chainProgramsEnabled ? false : true}
              initialProgramTimeline={defaultProgramTimeline}
              allowWarehouseFilter={false}
            />
          )}
        </div>
      )}
      {/* <div className="charts-container grid lg:grid-col-fit-[340px] gap-6">
        <StoreProgramOverviewCard
          fullWidth
          topPerformingPrograms={storeProgramResponse?.topPerformingPrograms}
          bottomPerformingPrograms={
            storeProgramResponse?.bottomPerformingPrograms
          }
        />
      </div> */}
    </ClickTracker>
  );
};

export default DashboardDistributor;
