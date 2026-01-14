// Import Core functionality/component
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import React from "react";

// Import Components
import Avatar from "@/components/Avatar/RepAvatar";
import BackButton from "@/components/Buttons/BackButton";
import Card from "@/components/Card/";
import DashboardCard from "@/components/Elements/DashboardCard";
import Row from "@/components/Row/";
import StoreDetailTable from "@/components/Table/StoreDetailTable";

// Import Utils
import { formatNumber } from "@/utils/numberFormatter";

// Import Types
import {
  StoreDetails as StoreDetailsType,
  StoreTableData
} from "@/types/StoreTypes";

// Import Images
import CartIcon from "@/assets/icons/cartIcon.svg";
import GreenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import storeIcon from "@/assets/icons/storeIcon.svg";

import ProgramTimelineOptionSelector from "@/components/OptionSelector/ProgramTimelineOptionSelector";
import StoreNavigationTabs from "@/components/StoreNavigationTabs";
import { APP_ROUTES } from "@/configs/routes";
import { apiServerClient } from "@/lib/axiosServer";
import {
  getProgramTimelineQueryParam,
  isDistributorFeatureEnabled
} from "@/utils/helper";
import SpiffEarningStoreDetails from "@/views/SalesRep/spiffEarningStoreDetails";
import { USER_ROLES } from "@/configs/roles";
import { getV2ApiUrl, shouldUseV2Api } from "@/utils/urlHelper";
import { getUserServer } from "@/utils/getUserServer";
import { SHOW_ENABLED_DSD_DISTRIBUTOR_IDS } from "@/utils/constants";
import {
  extractManufacturerIds,
  fetchStoreAgreementsBulkServer,
  transformBulkAgreementsToAgreementInfo
} from "@/utils/agreementsAPIServer";

// Import Mock JSON file file system based on ID
async function fetchStoreDetails(
  id: string,
  programTimeline?: string,
  isChainStore?: boolean,
  userRole?: string
): Promise<{ store: StoreTableData; agreementInfo?: any[] }> {
  try {
    // Step 1: Fetch store details first (with programs)
    let storeData: StoreTableData;
    let serverProvidedAgreementInfo: any[] | undefined;

    if (shouldUseV2Api(userRole)) {
      const url = getV2ApiUrl(
        `/store/details/${id}?programTimeline=${programTimeline}&isChainStore=${isChainStore}&isInternal=true`
      );

      const { data } = await apiServerClient.get(url);

      storeData = data?.stores?.[0];
      serverProvidedAgreementInfo = data?.agreementInfo;
    } else {
      const url = `/store/${id}?programTimeline=${programTimeline}&isChainStore=${isChainStore}`;

      const { data } = await apiServerClient.get(url);

      storeData = data?.stores?.[0];
      serverProvidedAgreementInfo = data?.agreementInfo;
    }

    // Step 2: If server didn't provide agreementInfo, fetch it using bulk endpoint
    let agreementInfo = serverProvidedAgreementInfo;

    if (!agreementInfo || agreementInfo.length === 0) {
      // Extract manufacturer IDs from programData
      const manufacturerIds = extractManufacturerIds(
        storeData?.programData || {}
      );

      if (manufacturerIds.length > 0) {
        console.log(
          "[fetchStoreDetails] Fetching agreements for manufacturers:",
          manufacturerIds
        );
        // Fetch agreements for all manufacturers in bulk
        const { enrollments, availableAgreements } =
          await fetchStoreAgreementsBulkServer(
            id,
            manufacturerIds,
            programTimeline
          );

        // Transform to AgreementInfo[] format
        agreementInfo = transformBulkAgreementsToAgreementInfo(
          enrollments,
          availableAgreements
        );
      } else {
        console.warn(
          "[fetchStoreDetails] No manufacturers found in programData"
        );
        // No manufacturers, return empty agreementInfo
        agreementInfo = [];
      }
    } else {
      console.log("[fetchStoreDetails] Using server-provided agreementInfo");
    }

    console.log(
      "[fetchStoreDetails] Final agreementInfo being returned:",
      agreementInfo
    );

    return {
      store: storeData,
      agreementInfo
    };
  } catch (error) {
    notFound();
  }
}

export const metadata: Metadata = {
  title: "Store Details",
  description: "View store details"
};

const StoreDetails: React.FC<StoreDetailsType> = async ({
  params,
  searchParams
}) => {
  const user = getUserServer();
  const userRole = user?.role;

  const { id } = params;
  const { chainId, store_tab_options = "0" } = searchParams;
  const isChainStore = chainId ? true : false;
  const programTimeline = getProgramTimelineQueryParam(
    searchParams?.programTimeline
  );
  const { store: StoreDetails, agreementInfo } = await fetchStoreDetails(
    id,
    programTimeline,
    isChainStore,
    userRole
  );

  // const yoy: number | undefined = StoreDetails.salesData.purchaseVolume.yoy;
  // const savingYoy: number | undefined = StoreDetails.salesData.totalSavings.yoy;

  // Check if Annual Purchase Volume should be used instead of Purchase Volume
  const showAnnualPurchaseVolume = isDistributorFeatureEnabled(
    userRole === USER_ROLES.DISTRIBUTOR_ADMIN
      ? user.associatedUserId
      : user.parentEntityId,
    SHOW_ENABLED_DSD_DISTRIBUTOR_IDS
  );

  // Determine which purchase volume to display
  const purchaseVolumeAmount = showAnnualPurchaseVolume
    ? (StoreDetails.salesData.annualPurchaseVolume?.amount ??
      StoreDetails.salesData.purchaseVolume.amount)
    : StoreDetails.salesData.purchaseVolume.amount;

  // Construct back URL preserving all query parameters except store-specific ones
  const getBackUrl = () => {
    const queryParams = new URLSearchParams();

    Object.entries(searchParams).forEach(([key, value]) => {
      // Skip store-specific parameters but keep all others (sorting, filtering, etc.)
      if (!["store_tab_options"].includes(key)) {
        if (typeof value === "string") {
          queryParams.set(key, value);
        } else if (Array.isArray(value)) {
          queryParams.set(key, value[value.length - 1]);
        }
      }
    });

    // Determine base route based on context
    const baseRoute = chainId ? APP_ROUTES.storeChains : APP_ROUTES.store;

    // Return URL with preserved parameters
    return queryParams.toString()
      ? `${baseRoute}?${queryParams.toString()}`
      : baseRoute;
  };

  return (
    <div className="storeDetails font-inter">
      <div className="mb-2 flex justify-between flex-col sm:flex-row gap-4 sm:items-center">
        <div className="flex items-center justify-between">
          <div className="icons flex">
            <BackButton link={getBackUrl()} bypassHistory />
            <div className="seperater min-h-7 border ml-3 mr-5 border-border-gray"></div>
          </div>

          <div className="store-info text-right sm:text-left">
            <h2 className="text-lg font-semibold text-highlighted-color">
              {StoreDetails.storeInfo.name}
            </h2>
            <h4 className="text-heading-very-light text-xs">
              {StoreDetails.storeInfo.location}
            </h4>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3">
          {store_tab_options === "0" && <ProgramTimelineOptionSelector />}
          <div className="store-reps grid place-items-end sm:block">
            <Avatar user={StoreDetails.storeInfo.rep} />
            <p className="text-right text-heading-very-light text-xs font-semibold">
              Sales Rep
            </p>
          </div>
        </div>
      </div>

      <StoreNavigationTabs showTabsForSalesRep={true} />

      {store_tab_options === "0" && (
        <>
          <Row className="flex-wrap flex-col sm:flex-row gap-[1rem] sm:gap-[1.5rem]">
            <DashboardCard
              label="Purchase Volume"
              isFlexible={true}
              icon={CartIcon.src}
              value={`$${formatNumber(purchaseVolumeAmount)}`}
              id="purchase-volume"
              // yoyValue={yoy}
            />
            <DashboardCard
              label="Estimated Earnings"
              isFlexible={true}
              icon={GreenDollarIcon.src}
              value={`$${formatNumber(StoreDetails.salesData.totalSavings.amount)}`}
              // yoyValue={savingYoy}
              id="estimated-earnings"
            />
            <DashboardCard
              label="Enrolled Programs"
              isFlexible={true}
              icon={storeIcon.src}
              value={`${StoreDetails.programData.enrolledProgram.length}/${
                StoreDetails.programData.enrolledProgram.length +
                StoreDetails.programData.remainingProgram.length
              }`}
              id="enrolled-programs"
            />
            {/* <DashboardCard
          label="Total Saving opp."
          icon={orangeDollarIcon.src}
          value={`${formatNumber(
            StoreDetails.salesData.totalOppSavings.amount
          )}`}
            /> */}
          </Row>

          <Card className="mt-4 sm:mt-6 w-full p-[0]">
            <StoreDetailTable
              programData={StoreDetails.programData}
              storeId={id}
              programTimeline={programTimeline}
              isChainStoreProgram={isChainStore}
              storeTabOptions={store_tab_options}
              agreementInfo={agreementInfo}
            />
          </Card>
        </>
      )}

      {(store_tab_options === "1" || store_tab_options === "2") && (
        <SpiffEarningStoreDetails
          params={params}
          searchParams={searchParams}
          IsSalesRepStoreSpecificDetails={true}
        />
      )}
    </div>
  );
};

export default StoreDetails;
