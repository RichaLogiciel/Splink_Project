// Import Components
import Row from "@/components/Row";
import DashboardToast from "@/components/Toast/DashboardToast";

// Import API Functions
import {
  fetchDistributorSpiffSummaryForEarnings,
  fetchExecutiveSalesRepKeyMetrics,
  fetchSalesRepAllSPIFFOpportunities,
  fetchSalesRepStoresEnrollment,
  getVoidFillProgramsSummary,
  transformDistributorSpiffToEarningsFormat
} from "@/app/app/DashboardAPIs";
import AllSPIFFOpportunities from "@/components/Card/AllSPIFFOpportunities";
import EnrolledStoresCard from "@/components/Card/EnrolledStoresCard";
import SalesRepEarningsOverviewCard from "@/components/Card/SalesRepEarningsOverviewCard";
import TopKeyMetricsCard from "@/components/Card/TopKeyMetricsCard";
import VoidFillProgramsSummaryCardWrapper from "@/components/Card/VoidFillProgramsSummaryCardWrapper";
import CustomDropdown from "@/components/Form/CustomDropdown";
import ProgramExpirationNotice from "@/components/ProgramExpirationNotice/ProgramExpirationNotice";
import { NearComplianceStoreData } from "@/types/StoreTypes";
import {
  CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS,
  DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS,
  ENABLE_PROGRAM_EXPIRATION_NOTICE,
  SPIFF_OPPORTUNITIES_FEATURE,
  SPIFFS_ENABLED_FOR_DISTRIBUTOR_IDS,
  STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
} from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import { isDistributorFeatureEnabled } from "@/utils/helper";
import CompliancesInsightsTable from "./compliancesInsightsTable";
import {
  fetchAuthorizedManufacturers,
  fetchSalesRepStoresNearToCompliance
} from "./dashboardAPIs";

export type SalesRepDashboardProps = {
  searchParams?: { [key: string]: string };
};
const Dashboard = async ({ searchParams }: SalesRepDashboardProps) => {
  let errorFlag = false;
  // API requests
  const user = getUserServer();
  const distributorId = user?.parentEntityId ?? user?.associatedUserId ?? null;

  // Check if default upcoming is enabled for distributor
  const defaultUpcomingEnabled = isDistributorFeatureEnabled(
    distributorId,
    DEFAULT_UPCOMING_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  const programTimeline =
    searchParams?.programTimeline ||
    (defaultUpcomingEnabled ? "Upcoming" : "Current");

  const storeProgrammingEnabled = isDistributorFeatureEnabled(
    distributorId,
    STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
  );
  const spiffsEnabled = isDistributorFeatureEnabled(
    distributorId,
    SPIFFS_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  // Get sales rep ID for void fill programs summary
  const salesRepId = user?.associatedUserId;
  const salesRepIds = salesRepId ? [salesRepId] : [];

  // Determine chain programs flag based on distributor ID
  const chainProgramsEnabled = isDistributorFeatureEnabled(
    distributorId,
    CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  const [
    keyMetricsResponse,
    salesRepStoresEnrollmentRes,
    manufacturers,
    response,
    salesRepEarningsResponse,
    salesRepAllSPIFFOpportunities,
    voidFillProgramsSummary
  ] = await Promise.all([
    fetchExecutiveSalesRepKeyMetrics(programTimeline),
    fetchSalesRepStoresEnrollment({ programTimeline }),
    fetchAuthorizedManufacturers(programTimeline),
    fetchSalesRepStoresNearToCompliance({
      searchQuery: searchParams?.searchQuery,
      manufacturerId: searchParams?.manufacturerId || "",
      programTimeline: programTimeline
    }),
    transformDistributorSpiffToEarningsFormat(
      await fetchDistributorSpiffSummaryForEarnings({ programTimeline })
    ),
    fetchSalesRepAllSPIFFOpportunities(programTimeline),
    getVoidFillProgramsSummary({
      salesRepIds,
      excludeChainStore: chainProgramsEnabled ? false : undefined,
      programTimeline
    })
  ]);

  // const salesRepEarningsResponse = distributorSpiffData;

  const stores = (response?.stores as NearComplianceStoreData[]) || [];

  // Prepare sales rep options (only the current sales rep)
  const salesRepOptions = salesRepId
    ? [
        {
          value: salesRepId.toString(),
          label:
            `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
            user?.name ||
            "Sales Rep"
        }
      ]
    : [];

  // Prepare warehouse options from API response
  const warehouseOptions =
    voidFillProgramsSummary?.warehouseIds?.map((warehouse: any) => ({
      value: warehouse.warehouseId.toString(),
      label: warehouse.warehouseName
    })) || [];

  // Prepare program options from API response
  const programOptions =
    voidFillProgramsSummary?.programs?.length > 0
      ? voidFillProgramsSummary?.programs?.map((program: any) => ({
          value: program.programId.toString(),
          label: program.programName
        }))
      : [];

  if (!(keyMetricsResponse && salesRepEarningsResponse && response))
    errorFlag = true;

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
    <>
      {ENABLE_PROGRAM_EXPIRATION_NOTICE && (
        <ProgramExpirationNotice messageType="WARNING" />
      )}
      {errorFlag && <DashboardToast showToast={errorFlag} />}
      <div className="mb-4 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap">
        <div className="text-lg font-semibold">Sales Rep Dashboard</div>
        <CustomDropdown
          classes="min-w-[130px] px-4 py-1.5 text-left bg-white border border-border-gray rounded outline-none text-sm"
          defaultValue={programTimeline}
          options={programTimelineOptions}
          queryParamKey="programTimeline"
        />
      </div>

      <TopKeyMetricsCard
        totalSavings={keyMetricsResponse?.totalEarning}
        storesCount={keyMetricsResponse?.totalStores}
        totalStoreProgram={keyMetricsResponse?.totalStoreProgram}
        totalActiveStores={keyMetricsResponse?.totalActiveStores}
        pendingPayoutEarning={keyMetricsResponse?.pendingPayoutEarning}
        showStoreProgramsCard={storeProgrammingEnabled}
        showCurrentEarningsCard={spiffsEnabled}
      />
      {SPIFF_OPPORTUNITIES_FEATURE &&
        spiffsEnabled &&
        (salesRepAllSPIFFOpportunities?.length > 0 ||
          (storeProgrammingEnabled &&
            voidFillProgramsSummary?.voidFillDetails?.length > 0)) && (
          <div className="grid grid-cols-1 xl:grid-cols-[repeat(auto-fit,minmax(400px,1fr))] xl:gap-6">
            {salesRepAllSPIFFOpportunities?.length > 0 && (
              <AllSPIFFOpportunities
                data={salesRepAllSPIFFOpportunities?.map((item) => ({
                  ...item
                }))}
              />
            )}

            {storeProgrammingEnabled &&
              voidFillProgramsSummary?.voidFillDetails?.length > 0 && (
                <div className="mb-6 w-full">
                  <VoidFillProgramsSummaryCardWrapper
                    initialData={voidFillProgramsSummary?.voidFillDetails || []}
                    salesRepOptions={salesRepOptions}
                    warehouseOptions={warehouseOptions}
                    programOptions={programOptions}
                    initialSalesRepIds={salesRepIds}
                    initialWarehouseId=""
                    initialExcludeChainStore={
                      chainProgramsEnabled ? false : true
                    }
                    hideSalesRepFilter={true}
                    initialProgramTimeline={programTimeline}
                  />
                </div>
              )}
          </div>
        )}
      {storeProgrammingEnabled && (
        <CompliancesInsightsTable
          storesData={stores as NearComplianceStoreData[]}
          manufacturers={manufacturers}
        />
      )}
      <div className="flex flex-col lg:flex-row gap-6 w-full">
        {storeProgrammingEnabled && (
          <Row className="flex-col w-full">
            <EnrolledStoresCard
              largeHeight
              items={salesRepStoresEnrollmentRes}
              totalStores={keyMetricsResponse?.totalStores || 0}
              itemSpecificTotalCount
            />
          </Row>
        )}
        {!SPIFF_OPPORTUNITIES_FEATURE && spiffsEnabled && (
          <SalesRepEarningsOverviewCard earnings={salesRepEarningsResponse} />
        )}
      </div>
    </>
  );
};

export default Dashboard;
