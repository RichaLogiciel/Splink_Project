"use client";

import Card from "@/components/Card";
import RecommendedProducts from "@/components/skeletons/RecommendedProducts";
import { USER_ROLES } from "@/configs/roles";
import { apiClient } from "@/lib/axiosClient";
import { getUserClient } from "@/utils/getUserClient";
import { getProgramTimelineQueryParam } from "@/utils/helper";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import CategorizedTabProductList from "../Elements/CategorizedTabProductList";

interface RecommendedProductsCardProps {
  manufacturerId: number;
  programsType: string;
  initialCategorizedProducts?: { [key: string]: any };
  title?: string;
  showSpiffProducts?: boolean;
  showAddIcon?: boolean;
}
const RecommendedProductsCard = ({
  manufacturerId,
  programsType,
  initialCategorizedProducts,
  title = "Recommended Products",
  showSpiffProducts = false,
  showAddIcon = false
}: RecommendedProductsCardProps) => {
  const [categorizedProducts, setCategorizedProducts] = useState(
    initialCategorizedProducts || {}
  );
  const [loading, setLoading] = useState(!initialCategorizedProducts);
  const searchParams = useSearchParams();
  const user = getUserClient();

  // Fetch SPIFF products
  const fetchSpiffProducts = async () => {
    const programTimeline = getProgramTimelineQueryParam(
      searchParams.get("programTimeline") || ""
    );
    const isInternalInitiative =
      searchParams.get("isInternalInitiative") === "true";
    const entityId =
      user?.role === USER_ROLES.DISTRIBUTOR_ADMIN
        ? user?.associatedUserId
        : user?.parentEntityId;
    try {
      setLoading(true);
      const url = `/programs/spiff-products?manufacturerId=${manufacturerId}&programTimeline=${programTimeline}&isInternalInitiative=${isInternalInitiative}&entityId=${entityId}`;

      const { data } = await apiClient.get(url);
      setCategorizedProducts(data);
      return data;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch spiff products");
    } finally {
      setLoading(false);
    }
  };

  // Extract programTimeline to properly track changes
  const programTimeline = searchParams.get("programTimeline") || "";

  // Fetch categorized products
  const fetchCategorizedProducts = async (
    manufacturerId: number,
    programsType: string
  ) => {
    try {
      setLoading(true);
      const programTimelineQueryParam =
        getProgramTimelineQueryParam(programTimeline);
      const url = `/programs/categorized-products?type=${programsType}&manufacturerId=${manufacturerId}&programTimeline=${programTimelineQueryParam}`;
      const { data } = await apiClient.get(url);
      setCategorizedProducts(data);
      console.log("fetchCategorizedProducts data", data);
      return data;
    } catch (error) {
      console.error(error);
      throw new Error("Failed to fetch retailer program details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showSpiffProducts) {
      fetchSpiffProducts();
    } else {
      // Always fetch when programTimeline changes, even if initial data is provided
      fetchCategorizedProducts(manufacturerId, programsType);
    }
  }, [manufacturerId, programsType, showSpiffProducts, programTimeline]);
  return (
    <>
      {loading ? (
        <RecommendedProducts />
      ) : (
        <Card className="w-full p-6 mt-6 relative">
          <h3 className="text-filter-light mb-4 text-base font-medium tracking-[0.15rem] uppercase">
            {title}
          </h3>
          {!!categorizedProducts &&
            !!Object.keys(categorizedProducts || {})?.length && (
              <CategorizedTabProductList
                categorizedProducts={categorizedProducts}
                className=""
                tabSearchParamKey={"programOverviewProductTab"}
                showAddIcon={showAddIcon}
              />
            )}
        </Card>
      )}
    </>
  );
};

export default RecommendedProductsCard;
