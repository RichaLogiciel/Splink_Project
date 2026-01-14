export const dynamic = "force-dynamic";

// Import Core functionality/component
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import React from "react";

// Import Types
import {
  SpiffEarningStoreDetail,
  StoreDetails as StoreDetailsType
} from "@/types/StoreTypes";

// Import Images
import GreenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import leftArrowIcon from "@/assets/icons/leftArrowIcon.svg";
import storeIcon from "@/assets/icons/storeIcon.svg";

import Avatar from "@/components/Avatar";
import Card from "@/components/Card";
import SingleSPIFFOpportunities from "@/components/Card/SingleSPIFFOpportunities";
import DashboardCard from "@/components/Elements/DashboardCard";
import Row from "@/components/Row";
import { Tab, Tabs } from "@/components/Tabs/Tabs";
import { APP_ROUTES } from "@/configs/routes";
import { apiServerClient } from "@/lib/axiosServer";
import { SPIFF_OPPORTUNITIES_FEATURE } from "@/utils/constants";
import { getUserServer } from "@/utils/getUserServer";
import { getFullName } from "@/utils/helper";
import { formatNumber } from "@/utils/numberFormatter";

// Import Static Data Modifications

async function fetchStoreDetails(
  id: string,
  isInternal = false,
  programTimeline?: string
) {
  try {
    const queryParams = new URLSearchParams({
      isInternal: isInternal.toString()
    });

    if (programTimeline) {
      queryParams.append("programTimeline", programTimeline);
    }

    const url = `/sales-rep/store/${id}?${queryParams.toString()}`;

    const res: any = await apiServerClient.get(url);

    if (res.status == "success") {
      return res.data;
    } else {
      return {};
    }
  } catch (error) {
    console.log("fetchStoreDetails error", error);
    return {};
  }
}

export const metadata: Metadata = {
  title: "SPIFF Details",
  description: "View SPIFF details"
};

const StoreDetails: React.FC<StoreDetailsType> = async ({
  params,
  searchParams,
  IsSalesRepStoreSpecificDetails
}) => {
  const { id } = params;
  const { isInternal = false, programTimeline } = searchParams;

  const StoreDetails: SpiffEarningStoreDetail = await fetchStoreDetails(
    id,
    isInternal,
    programTimeline
  );

  const user = getUserServer();

  if (!SPIFF_OPPORTUNITIES_FEATURE) {
    return (
      <h4 className="font-semibold text-highlighted-color">
        SPIFF Opportunities Feature is not enabled
      </h4>
    );
  }

  const spiffEarningValue = StoreDetails?.totalSpiffEarning || 0;
  const spiffEarning = spiffEarningValue.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  const renderHeader = () => {
    return (
      <div className="mb-7 flex justify-between flex-col sm:flex-row gap-4 sm:items-center">
        <div className="flex items-center justify-between">
          <div className="icons flex">
            <Link
              className="w-6 items-center p-1.5"
              href={
                isInternal
                  ? `${APP_ROUTES.storeInternal}`
                  : `${APP_ROUTES.storeSpiff}`
              }
            >
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
              {StoreDetails.name}
            </h2>
            {/* <h4 className="text-heading-very-light text-xs">Birmingham, AL</h4> */}
          </div>
        </div>
        <div className="store-reps grid place-items-end sm:block">
          <Avatar
            user={{
              name: getFullName(user?.firstName, user?.lastName)
            }}
          />
          <p className="text-right text-heading-very-light text-xs font-semibold">
            Sales Rep
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="storeDetails font-inter">
      {!IsSalesRepStoreSpecificDetails && <>{renderHeader()}</>}
      <Row className="flex-wrap flex-col sm:flex-row gap-[1rem] sm:gap-[1.5rem]">
        <DashboardCard
          label={isInternal ? "Earnings" : "My SPIFF Earnings"}
          isFlexible={true}
          icon={GreenDollarIcon.src}
          value={
            isInternal && spiffEarningValue === 0 ? "N/A" : `$${spiffEarning}`
          }
          id="my-spiff-earnings"
        />
        <DashboardCard
          label={
            isInternal
              ? "Open Internal Initiatives"
              : "SPIFF Programs Available"
          }
          isFlexible={true}
          icon={storeIcon.src}
          value={StoreDetails?.totalAvailablePrograms?.toString() ?? "0"}
          id="spiff-programs-available"
        />
      </Row>

      <Card className="mt-4 sm:mt-6 w-full p-[0]">
        <div className="storeDetailTable text-left text-sm text-filter-light font-medium font-inter">
          <Tabs paddingY={"py"}>
            <Tab
              label={isInternal ? "Open Initiatives" : "SPIFF Opportunities"}
            >
              <SingleSPIFFOpportunities
                embedded
                data={StoreDetails?.manufacturers ?? []}
                storeId={id}
              />
            </Tab>
          </Tabs>
        </div>
      </Card>
    </div>
  );
};

export default StoreDetails;
