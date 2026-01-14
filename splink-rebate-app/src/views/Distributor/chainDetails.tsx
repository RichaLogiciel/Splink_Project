// Import Core functionality/component
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";

// Import Components
import BackButton from "@/components/Buttons/BackButton";
import Card from "@/components/Card/";
import DashboardCard from "@/components/Elements/DashboardCard";
import Row from "@/components/Row/";
import StoreDetailTable from "@/components/Table/StoreDetailTable";

// Import Utils
import { getUserServer } from "@/utils/getUserServer";
import { formatNumber } from "@/utils/numberFormatter";

// Import Types
import { EnrolledProgram } from "@/types/StoreTypes";

interface ChainDetailsProps {
  params: { chainId: string };
  searchParams: {
    warehouseId?: string;
    programTimeline?: string;
    currentPage?: string;
    s?: string;
    sort?: string;
    sortKey?: string;
  };
}

// Import Configs
import { USER_ROLES } from "@/configs/roles";

// Import Images
import CartIcon from "@/assets/icons/cartIcon.svg";
import GreenDollarIcon from "@/assets/icons/greenDollarIcon.svg";

import ProgramTimelineOptionSelector from "@/components/OptionSelector/ProgramTimelineOptionSelector";
import { APP_ROUTES } from "@/configs/routes";
import { apiServerClient } from "@/lib/axiosServer";
import {
  getProgramTimelineQueryParam,
  getUrlWithQueryParam
} from "@/utils/helper";

interface StoreCompliance {
  storeId: number;
  storeName: string;
  isEnrolled: boolean;
  isCompliant: boolean;
  complianceStatus: string;
  earnedRebate: number;
  totalPurchaseVolume: number;
}

interface Manufacturer {
  id: number;
  name: string;
  logo: string;
  authorized: boolean;
}

interface Program {
  id: number;
  programId: number;
  programDetailId: number;
  name: string;
  programType: string;
  programHeader: string;
  tier: number;
  paymentTerms: string;
  startDate: string;
  endDate: string;
  manufacturer: {
    id: number;
    name: string;
    logo: string;
    authorized: boolean;
    chainDetals?: {
      totalPurchaseVolume?: number;
      totalEarnedRebate: number;
    };
  };
  rebateType: string;
  rebateAmount: number;
  rebatePercentage: number;
  overview: string;
  criteria: string;
  minSpend: number;
  minQty: number;
  maxQty: number;
  productsTags: string;
  rebateCalculation: string;
  storeCompliance: StoreCompliance[];
  totalStores: number;
  enrolledStores: number;
  compliantStores: number;
  compliancePercentage: number;
  totalEarnedRebate: number;
  totalPurchaseVolume: number;
  totalOppSaving?: number;
}

interface Store {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  externalStoreId: string;
  totalPrograms: number;
  enrolledPrograms: number;
  compliantPrograms: number;
  totalEarnedRebate: number;
  totalPurchaseVolume: number;
}

interface ManufacturerSummary {
  manufacturerId: number;
  manufacturerName: string;
  manufacturerLogo: string;
  authorized: boolean;
  totalPurchaseVolume: number;
  totalEarnedRebate: number;
  totalPrograms: number;
  enrolledPrograms: number;
  compliantPrograms: number;
  compliancePercentage: number;
  totalStores: number;
  enrolledStores: number;
  compliantStores: number;
}

interface Chain {
  id: number;
  name: string;
  totalStores: number;
  enrolledStores: number;
  compliantStores: number;
  compliancePercentage: number;
  totalEarnedRebate: number;
  totalPurchaseVolume: number;
  programs?: Program[];
  stores?: Store[];
  manufacturerSummaries?: ManufacturerSummary[];
}

// Fetch chain details with programs
async function fetchChainDetails(
  chainId: string,
  distributorId: string,
  programTimeline?: string
): Promise<Chain> {
  const startTime = Date.now();

  try {
    // Use the new chain details endpoint
    let apiUrl = `/chain/${chainId}/details?distributorId=${distributorId}&includePrograms=true&includeStores=true&includeManufacturerSummaries=true`;
    if (programTimeline) {
      apiUrl += `&programTimeline=${programTimeline}`;
    }
    console.log("apiUrl", apiUrl);

    const { data } = await apiServerClient.get(apiUrl);

    // Handle the new response structure
    let chain: Chain | null = null;

    // Check if data has the expected structure (direct response without status wrapper)
    if (data?.id && data?.summary && data?.programs) {
      const apiData = data;

      // Transform the new response structure to match the existing Chain interface
      const enrolledPrograms = apiData.programs?.enrolled || [];
      const unenrolledPrograms = apiData.programs?.unenrolled || [];

      // Flatten enrolled programs with their tiers into individual Program objects
      const allPrograms: Program[] = [];
      const enrolledProgramsData: Program[] = [];
      const unenrolledProgramsData: Program[] = [];

      enrolledPrograms.forEach((program: any, index: number) => {
        if (program.tiers && program.tiers.length > 0) {
          program.tiers.forEach((tier: any, tierIndex: number) => {
            const compliantStores = tier.stores?.compliant?.length || 0;
            const nonCompliantStores = tier.stores?.nonCompliant?.length || 0;
            const totalTierStores = compliantStores + nonCompliantStores;

            console.log(`Tier ${tierIndex} stats:`, {
              compliantStores,
              nonCompliantStores,
              totalTierStores,
              rebateType: tier.rebateType,
              rebateAmount: tier.rebateAmount
            });

            enrolledProgramsData.push({
              id: program.id,
              programId: program.id,
              programDetailId: tier.programDetailId,
              name: program.name,
              programType: program.programType || "rebate",
              programHeader: program.programHeader || program.name,
              tier: tier.tier,
              paymentTerms: program.paymentTerms || "",
              startDate: program.startDate || "",
              endDate: program.endDate || "",
              manufacturer: {
                id: program.manufacturer?.id || 0,
                name: program.manufacturer?.name || "Unknown",
                logo: program.manufacturer?.logo || "",
                authorized: program.manufacturer?.authorized || false,
                chainDetals: data?.summary?.manufacturerWisePurchases
                  ? {
                      totalPurchaseVolume:
                        data?.summary?.manufacturerWisePurchases?.find(
                          (dt: any) =>
                            dt.manufacturer_id == program.manufacturer?.id
                        )?.total_purchase_volume,
                      totalEarnedRebate:
                        data?.summary?.manufacturerWisePurchases?.find(
                          (dt: any) =>
                            dt.manufacturer_id == program.manufacturer?.id
                        )?.total_earned_rebate
                    }
                  : undefined
              },
              rebateType: tier.rebateType || program.rebateType || "",
              rebateAmount:
                parseFloat(tier.rebateAmount) || program.rebateAmount || 0,
              rebatePercentage:
                tier.rebatePercentage || program.rebatePercentage || 0,
              overview: program.overview || "",
              criteria: program.criteria || "",
              minSpend: program.minSpend || 0,
              minQty: parseFloat(tier.minQty) || program.minQty || 0,
              maxQty: parseFloat(tier.maxQty) || program.maxQty || 0,
              productsTags: program.productsTags || "",
              rebateCalculation: program.rebateCalculation || "",
              storeCompliance: [
                ...(tier.stores?.compliant?.map((store: any) => ({
                  storeId: store.id,
                  storeName: store.name,
                  isEnrolled: true,
                  isCompliant: true,
                  complianceStatus: "compliant",
                  earnedRebate: 0,
                  totalPurchaseVolume: 0
                })) || []),
                ...(tier.stores?.nonCompliant?.map((store: any) => ({
                  storeId: store.id,
                  storeName: store.name,
                  isEnrolled: true,
                  isCompliant: false,
                  complianceStatus: "non-compliant",
                  earnedRebate: 0,
                  totalPurchaseVolume: 0
                })) || [])
              ],
              totalStores: totalTierStores,
              enrolledStores: totalTierStores,
              compliantStores: compliantStores,
              compliancePercentage:
                totalTierStores > 0
                  ? (compliantStores / totalTierStores) * 100
                  : 0,
              totalEarnedRebate: 0,
              totalPurchaseVolume: 0,
              totalOppSaving: tier.totalOppSaving
            } as Program);
          });
        } else {
          console.log(`Program ${index} has no tiers`);
        }
      });

      // Add unenrolled programs
      unenrolledPrograms.forEach((program: any, index: number) => {
        console.log(`Processing unenrolled program ${index}:`, program);
        unenrolledProgramsData.push({
          id: program.id,
          programId: program.id,
          programDetailId: 0,
          name: program.name,
          programType: program.programType || "rebate",
          programHeader: program.programHeader || program.name,
          tier: 1,
          paymentTerms: "",
          startDate: "",
          endDate: "",
          manufacturer: {
            id: program.manufacturer?.id || 0,
            name: program.manufacturer?.name || "Unknown",
            logo: program.manufacturer?.logo || "",
            authorized: program.manufacturer?.authorized || false,
            chainDetals: data?.summary?.manufacturerWisePurchases
              ? {
                  totalPurchaseVolume:
                    data?.summary?.manufacturerWisePurchases?.find(
                      (dt: any) =>
                        dt.manufacturer_id == program.manufacturer?.id
                    )?.total_purchase_volume,
                  totalEarnedRebate:
                    data?.summary?.manufacturerWisePurchases?.find(
                      (dt: any) =>
                        dt.manufacturer_id == program.manufacturer?.id
                    )?.total_earned_rebate
                }
              : undefined
          },
          rebateType: "",
          rebateAmount: 0,
          rebatePercentage: 0,
          overview: "",
          criteria: "",
          minSpend: 0,
          minQty: 0,
          maxQty: 0,
          productsTags: "",
          rebateCalculation: "",
          storeCompliance: [],
          totalStores: 0,
          enrolledStores: 0,
          compliantStores: 0,
          compliancePercentage: 0,
          totalEarnedRebate: 0,
          totalPurchaseVolume: 0,
          totalOppSaving: program.totalOppSaving
        } as Program);
      });

      console.log("Final transformed programs count:", allPrograms.length);
      console.log("Sample transformed program:", allPrograms[0]);

      chain = {
        id: apiData.id,
        name: apiData.name,
        totalStores: apiData.summary?.totalStores || 0,
        enrolledStores: apiData.summary?.enrolledStores || 0,
        compliantStores: apiData.summary?.compliantStores || 0,
        compliancePercentage: apiData.summary?.compliancePercentage || 0,
        totalEarnedRebate: apiData.summary?.totalEarnedRebate || 0,
        totalPurchaseVolume: apiData.summary?.totalPurchaseVolume || 0,
        programs: [...enrolledProgramsData, ...unenrolledProgramsData],
        enrolledPrograms: enrolledProgramsData,
        unenrolledPrograms: unenrolledProgramsData,
        stores: [],
        manufacturerSummaries: []
      } as Chain;

      console.log("Final chain object:", {
        id: chain.id,
        name: chain.name,
        totalStores: chain.totalStores,
        enrolledStores: chain.enrolledStores,
        compliantStores: chain.compliantStores,
        compliancePercentage: chain.compliancePercentage,
        totalEarnedRebate: chain.totalEarnedRebate,
        totalPurchaseVolume: chain.totalPurchaseVolume,
        programsCount: chain.programs?.length || 0
      });
      console.log("=== End Data Transformation Debug ===");
    } else {
      console.error("Unexpected chain response structure:", data);
      console.error("Available keys in response:", Object.keys(data || {}));
      notFound();
    }

    if (!chain) {
      console.error(`Chain with ID ${chainId} not found`);
      notFound();
    }

    const totalTime = Date.now() - startTime;
    console.log(`Chain details fetch completed in ${totalTime}ms`);

    return chain;
  } catch (error: any) {
    console.error("Error fetching chain details:", error);
    console.error("Error details:", {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });
    notFound();
  }
}

// Transform chain data to match StoreTableData format for StoreDetailTable
function transformChainToStoreData(chain: Chain) {
  console.log("=== Transform Chain to Store Data Debug ===");
  console.log("Chain programs count:", chain.programs?.length || 0);
  console.log("Sample programs:", chain.programs?.slice(0, 2));

  // Transform programs to match EnrolledProgram format
  const transformProgram = (program: Program) => ({
    manufacturer: {
      id: program.manufacturer.id,
      avatar: program.manufacturer.logo,
      name: program.manufacturer.name,
      authorized: program.manufacturer.authorized
    },
    programCompliance: {
      total: program.totalStores,
      completed: program.compliantStores
    },
    purchaseVolume: {
      amount: program.totalPurchaseVolume || 0
    },
    totalSavings: {
      amount: program.totalEarnedRebate || 0
    },
    totalOppSavings: {
      amount: program.totalOppSaving || 0
    },
    isEnrolled: program.enrolledStores > 0
  });

  // Helper to group programs by manufacturer id
  function groupByManufacturer(
    programs: Program[],
    filterFn: (p: Program) => boolean
  ) {
    console.log("Grouping programs, input count:", programs.length);
    const filteredPrograms = programs.filter(filterFn);
    console.log("After filter, count:", filteredPrograms.length);
    console.log("Filtered programs sample:", filteredPrograms.slice(0, 2));

    const groups: {
      [manufacturerId: number]: {
        manufacturer: Manufacturer;
        chainDetail: any;
        programs: EnrolledProgram[];
      };
    } = {};

    filteredPrograms.forEach((program) => {
      const mId = program.manufacturer.id;
      console.log(
        `Program ${program.name} manufacturer ID: ${mId}, name: ${program.manufacturer.name}`
      );
      if (!groups[mId]) {
        groups[mId] = {
          manufacturer: {
            id: program.manufacturer.id,
            avatar: program.manufacturer.logo,
            name: program.manufacturer.name,
            authorized: program.manufacturer.authorized
          } as any,
          chainDetail: {
            totalPurchaseVolume:
              program.manufacturer?.chainDetals?.totalPurchaseVolume || 0,
            totalEarnedRebate:
              program.manufacturer?.chainDetals?.totalEarnedRebate || 0
          },
          programs: []
        };
      }
      groups[mId].programs.push(transformProgram(program));
    });

    console.log("Groups created:", Object.keys(groups));
    console.log("Group values:", Object.values(groups));
    return Object.values(groups);
  }

  const enrolledPrograms = groupByManufacturer(
    chain.programs || [],
    (p) => p.enrolledStores > 0
  ) as any;

  const remainingPrograms = groupByManufacturer(
    chain.programs || [],
    (p) => p.enrolledStores === 0
  ) as any;

  console.log("Final enrolled programs:", enrolledPrograms);
  console.log("Final remaining programs:", remainingPrograms);
  console.log("=== End Transform Chain to Store Data Debug ===");

  return {
    id: chain.id.toString(),
    externalStoreId: chain.id.toString(),
    userInfo: {
      id: chain.id,
      status: "ACTIVE"
    },
    storeInfo: {
      name: chain.name,
      location: `${chain.totalStores} stores`,
      rep: null
    },
    salesData: {
      purchaseVolume: {
        amount: chain.totalPurchaseVolume || 0
      },
      totalSavings: {
        amount: chain.totalEarnedRebate || 0
      },
      purchasedSkus: []
    },
    programData: {
      enrolledProgram: enrolledPrograms,
      remainingProgram: remainingPrograms,
      completedPrograms: chain.compliantStores || 0,
      totalEnrolled: chain.totalStores || 0
    },
    chainId: chain.id,
    chainNames: chain.name,
    compliancePercentage: chain.compliancePercentage || 0,
    compliantStores: chain.compliantStores || 0,
    totalStores: chain.totalStores || 0
  };
}

export const metadata: Metadata = {
  title: "Chain Program Details",
  description: "View chain program compliance and details"
};

const ChainDetails: React.FC<ChainDetailsProps> = async ({
  params,
  searchParams
}) => {
  const { chainId } = params as { chainId: string };
  const programTimeline = getProgramTimelineQueryParam(
    searchParams?.programTimeline
  );

  // Get user and determine distributor ID
  const user = getUserServer();

  let distributorId: string | null = null;

  switch (user?.role) {
    case USER_ROLES.DISTRIBUTOR_ADMIN:
      distributorId = user.associatedUserId?.toString() || null;
      break;
    case USER_ROLES.DISTRIBUTOR_EXECUTIVE:
    case USER_ROLES.DISTRIBUTOR_GENERAL_MANAGER:
    case USER_ROLES.DISTRIBUTOR_SALES_REP:
    case USER_ROLES.DISTRIBUTOR_SALES_MANAGER:
      distributorId = user.parentEntityId?.toString() || null;
      break;
    default:
      console.error("User role not supported for chain details:", user?.role);
      notFound();
  }

  if (!distributorId) {
    console.error("No distributor ID found for user:", user);
    notFound();
  }

  const chainDetails: Chain = await fetchChainDetails(
    chainId,
    distributorId,
    programTimeline
  );

  // Transform chain data to match StoreTableData format
  const chainStoreData = transformChainToStoreData(chainDetails);

  return (
    <div className="chainDetails font-inter">
      <div className="mb-7 flex justify-between flex-col sm:flex-row gap-4 sm:items-center">
        <div className="flex items-center justify-between">
          <div className="icons flex">
            <BackButton
              link={getUrlWithQueryParam(
                APP_ROUTES.storeChains,
                "programTimeline",
                programTimeline
              )}
              bypassHistory
            />
            <div className="seperater min-h-7 border ml-3 mr-5 border-border-gray"></div>
          </div>

          <div className="chain-info text-right sm:text-left">
            <h2 className="text-lg font-semibold text-highlighted-color">
              {chainDetails.name}
            </h2>
            <h4 className="text-heading-very-light text-xs">
              {chainDetails.totalStores} Stores •{" "}
              {chainDetails.programs?.length || 0} Programs
            </h4>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          <ProgramTimelineOptionSelector />
        </div>
      </div>

      <Row className="flex-wrap flex-col sm:flex-row gap-[1rem] sm:gap-[1.5rem]">
        <DashboardCard
          label="Total Purchase Volume"
          isFlexible={true}
          icon={CartIcon.src}
          value={`$${formatNumber(chainDetails.totalPurchaseVolume)}`}
          id="total-purchase-volume"
        />
        <DashboardCard
          label="Total Earned Rebate"
          isFlexible={true}
          icon={GreenDollarIcon.src}
          value={`$${formatNumber(chainDetails.totalEarnedRebate)}`}
          id="total-earned-rebate"
        />
        {/* <DashboardCard
          label="Store Compliance"
          isFlexible={true}
          icon={storeIcon.src}
          value={`${chainDetails.compliantStores || 0}/${chainDetails.totalStores || 0} (${(chainDetails.compliancePercentage || 0).toFixed(1)}%)`}
          id="store-compliance"
        /> */}
      </Row>

      <Card className="mt-4 sm:mt-6 w-full p-[0]">
        <StoreDetailTable
          programData={chainStoreData.programData}
          storeId={chainId}
          programTimeline={programTimeline}
          chainData={chainDetails}
          chainStoresData={{ stores: [chainDetails] }}
        />
      </Card>
    </div>
  );
};

export default ChainDetails;
