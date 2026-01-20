// Import Core functionality/component
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import React from "react";

// Import Components
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
import CartIcon from "@/assets/icons/greenCartIcon.svg";
import GreenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import leftArrowIcon from "@/assets/icons/leftArrowIcon.svg";
import storeIcon from "@/assets/icons/storeIcon.svg";

import Avatar from "@/components/Avatar";
import CartIconButton from "@/components/Cart/CartIconButton";
import ProgramTimelineOptionSelector from "@/components/OptionSelector/ProgramTimelineOptionSelector";
import StoreNavigationTabs from "@/components/StoreNavigationTabs";
import { USER_ROLES } from "@/configs/roles";
import { APP_ROUTES } from "@/configs/routes";
import { apiServerClient } from "@/lib/axiosServer";
import {
  extractManufacturerIds,
  fetchStoreAgreementsBulkServer,
  transformBulkAgreementsToAgreementInfo
} from "@/utils/agreementsAPIServer";
import { SHOW_ENABLED_DSD_DISTRIBUTOR_IDS } from "@/utils/constants";
import { enableOrderingFeatureServer } from "@/utils/featureHelperServer";
import { getUserServer } from "@/utils/getUserServer";
import {
  getProgramTimelineQueryParam,
  isDistributorFeatureEnabled,
  isOrderAndCartFeatureEnabled
} from "@/utils/helper";
import { getV2ApiUrl, shouldUseV2Api } from "@/utils/urlHelper";
import SpiffEarningStoreDetails from "./spiffEarningStoreDetails";

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
      const { data } = await apiServerClient.get(
        `/store/${id}?programTimeline=${programTimeline}&isChainStore=${isChainStore}`
      );

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
        // Fetch agreements for all manufacturers in bulk
        const programTimelineParam =
          getProgramTimelineQueryParam(programTimeline);
        const { enrollments, availableAgreements } =
          await fetchStoreAgreementsBulkServer(
            id,
            manufacturerIds,
            programTimelineParam
          );

        // Transform to AgreementInfo[] format
        agreementInfo = transformBulkAgreementsToAgreementInfo(
          enrollments,
          availableAgreements
        );
      } else {
        // No manufacturers, return empty agreementInfo
        agreementInfo = [];
      }
    }

    return {
      store: storeData,
      agreementInfo
    };
  } catch (error) {
    notFound();
  }
}

async function fetchStoreWishlist(id: string) {
  try {
    const res: any = await apiServerClient.get(`/wishlist/store/${id}`);

    if (res.status == "success") {
      return res.data;
    } else {
      notFound();
    }
  } catch {
    notFound();
  }
}

async function fetchStoreOrders(id: string) {
  try {
    const res: any = await apiServerClient.get(
      `/orders?entityId=${id}&entityType=STORE`
    );

    if (res.status == "success") {
      return res.data;
    } else {
      notFound();
    }
  } catch {
    notFound();
  }
}

async function fetchCartItems(storeId: string) {
  try {
    const res: any = await apiServerClient.get("/cart/items/by-entity", {
      params: {
        entityId: storeId,
        entityType: USER_ROLES.STORE
      }
    });
    if (res.status == "success") {
      return res.data;
    } else {
      notFound();
    }
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
  const { id } = params;
  const { programTimeline, chainId, store_tab_options = "0" } = searchParams;
  const isChainStore = chainId ? true : false;
  const user = getUserServer();
  const userRole = user?.role;
  const { store: StoreDetails, agreementInfo } = await fetchStoreDetails(
    id,
    getProgramTimelineQueryParam(programTimeline),
    isChainStore,
    userRole
  );

  const ORDERING_FEATURE_ENABLED = user?.associatedUserId
    ? enableOrderingFeatureServer(
        user.associatedUserId,
        user.parentEntityId ?? undefined,
        user.primaryWarehouseId ?? undefined
      )
    : false;

  // const StoreWishlist: WishlistProducts[] = await fetchStoreWishlist(id);

  // Check if Annual Purchase Volume should be used instead of Purchase Volume
  const showAnnualPurchaseVolume = isDistributorFeatureEnabled(
    user.parentEntityId,
    SHOW_ENABLED_DSD_DISTRIBUTOR_IDS
  );

  // Determine which purchase volume to display
  const purchaseVolumeAmount = showAnnualPurchaseVolume
    ? (StoreDetails?.salesData?.annualPurchaseVolume?.amount ??
      StoreDetails?.salesData?.purchaseVolume?.amount)
    : StoreDetails?.salesData?.purchaseVolume?.amount;

  const orders: any[] =
    isOrderAndCartFeatureEnabled(user?.parentEntityId ?? undefined) &&
    ORDERING_FEATURE_ENABLED
      ? await fetchStoreOrders(id)
      : undefined;

  // Only show tabs for DISTRIBUTOR_SALES_REP
  const showTabs = user?.role === USER_ROLES.DISTRIBUTOR_SALES_REP;

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
            <Link className="w-6 items-center p-1.5" href={getBackUrl()}>
              <Image
                src={leftArrowIcon.src}
                width={8}
                height={14}
                alt="leftArrowIcon"
              />
            </Link>
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
        <div className="flex gap-4 items-center">
          {showTabs && store_tab_options === "0" && (
            <ProgramTimelineOptionSelector />
          )}
          {/* <ProgramTimelineOptionSelector /> */}
          <div className="store-reps grid place-items-end sm:block">
            {isOrderAndCartFeatureEnabled(user?.parentEntityId ?? undefined) &&
            ORDERING_FEATURE_ENABLED ? (
              <CartIconButton storeId={id} />
            ) : (
              <>
                <Avatar user={StoreDetails.storeInfo.rep} />
                <p className="text-right text-heading-very-light text-xs font-semibold">
                  Sales Rep
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {showTabs && <StoreNavigationTabs showTabsForSalesRep={true} />}

      {store_tab_options === "0" && (
        <>
          <Row className="flex-wrap flex-col sm:flex-row gap-[1rem] sm:gap-[1.5rem]">
            <DashboardCard
              label="Purchase Volume"
              isFlexible={true}
              icon={CartIcon.src}
              value={`$${formatNumber(purchaseVolumeAmount || 0)}`}
              id="purchase-volume"
            />
            <DashboardCard
              label="Estimated Earnings"
              isFlexible={true}
              icon={GreenDollarIcon.src}
              value={`$${formatNumber(StoreDetails?.salesData.totalSavings.amount || 0)}`}
              id="estimated-earnings"
            />
            <DashboardCard
              label="Enrolled Programs"
              isFlexible={true}
              icon={storeIcon.src}
              value={`${StoreDetails?.programData.enrolledProgram.length || 0}/${
                (StoreDetails?.programData.enrolledProgram.length || 0) +
                (StoreDetails?.programData.remainingProgram.length || 0)
              }`}
              id="enrolled-programs"
            />
          </Row>

          <Card className="mt-4 sm:mt-6 w-full p-[0]">
            <StoreDetailTable
              programData={StoreDetails?.programData}
              storeId={id}
              orders={orders}
              programTimeline={getProgramTimelineQueryParam(programTimeline)}
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
