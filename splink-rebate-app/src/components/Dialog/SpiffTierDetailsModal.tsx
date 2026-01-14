// Import Core functionality/component
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

// Import Components
import ManufacturerAvatar from "@/components/Avatar/ManufacturerAvatar";
import DynamicSemiPieChart from "@/components/SemiPieChartCustom/DynamicSemiPieChart";
// import { useRouter, useSearchParams } from "next/navigation";

// Import Util functions

// Import Types
import {
  CategorizedProducts,
  ManufacturerTierDetail,
  SpiffEarningStoreManufacturerDetail
} from "@/types/StoreTypes";

// Import Static Data Modifications

// Import Images
import bulbIcon from "@/assets/icons/bulbIcon.svg";
import GreenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import PinkStoreIcon from "@/assets/icons/pinkStoreIcon.svg";
import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import { apiClient } from "@/lib/axiosClient";
import { calcPercentage } from "@/utils/calculations";
import { PROGRESS_COLORS } from "@/utils/constants";
import { getUserClient } from "@/utils/getUserClient";
import { formatNumber } from "@/utils/numberFormatter";
import { isDistributorSalesRep } from "@/utils/rolesConditions";
import CategorizedTabProductList from "../Elements/CategorizedTabProductList";
import TruncatedParagraph from "../Elements/TruncatedParagraph";
import Loader from "../Loader";

interface SpiffTierDetailsModalProps {
  isOpen: boolean;
  setIsOpen: (val: boolean) => void;
  manufacturerData: SpiffEarningStoreManufacturerDetail;
  programDetailId: number;
  storeId: string;
  isInternal?: boolean;
}

interface SPIFFOpportunityTierDetails {
  programId: number;
  programDetailId: number;
  overview: string;
  rebateAmount: number;
  startDate: string;
  endDate: string;
}

export interface SPIFFOpportunityModalData {
  totalSpiffEarning: number;
  totalSpiffEarningOpp: number;
  graphText: string;
  quantitySold?: number;
  quantityType?: string;
  maxValue?: number;
  achivedValue?: number;
  achivedValueType?: string;

  tierDetails: SPIFFOpportunityTierDetails[];
  storeTierDetails?: ManufacturerTierDetail[];

  categorizedProducts: CategorizedProducts;
  filteredProducts?: any[];
}

const SpiffTierDetailsModal: React.FC<SpiffTierDetailsModalProps> = ({
  isOpen,
  setIsOpen,
  manufacturerData,
  programDetailId,
  storeId,
  isInternal = false
}) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [data, setData] = useState<SPIFFOpportunityModalData | null>(null);

  const user = getUserClient();
  const isSalesRep = isDistributorSalesRep(user?.role ?? "");
  const searchParams = useSearchParams();
  const currentTab = Number(searchParams.get("storeDetailProductTab") ?? 0);

  const totalSpiffEarning =
    data?.totalSpiffEarning && data?.totalSpiffEarning > 0
      ? data?.totalSpiffEarning
      : 0;

  useEffect(() => {
    async function fetchStoreManufacturerDetails() {
      try {
        setIsLoading(true);

        const { data } = await apiClient.get(
          `/sales-rep/manufacturer/${manufacturerData.id}/store/${storeId}?programDetailId=${programDetailId}`
        );
        if (
          (isInternal || (!isInternal && currentTab === 1)) &&
          data?.storeTierDetails &&
          data.storeTierDetails.length > 0
        ) {
          // For internal initiatives or when tab option = 1, we need to modify the storeTierDetails structure
          data.storeTierDetails.forEach((tierDetail: any) => {
            if (tierDetail.categorizedProducts) {
              // Get the first key (e.g., "Tier I")
              const firstKey = Object.keys(tierDetail.categorizedProducts)[0];
              if (firstKey) {
                const tierProducts = tierDetail.categorizedProducts[firstKey];

                // Add unique internal codes for products with "NA"
                const purchasedProductsWithCodes =
                  tierProducts.purchasedProducts?.map(
                    (product: any, index: number) => ({
                      ...product,
                      internalCode:
                        product.internalCode === "NA"
                          ? `NA`
                          : product.internalCode
                    })
                  ) || [];

                const requiredProductsWithCodes =
                  tierProducts.requiredProducts?.map(
                    (product: any, index: number) => ({
                      ...product,
                      internalCode:
                        product.internalCode === "NA"
                          ? `NA`
                          : product.internalCode
                    })
                  ) || [];

                // Update the categorizedProducts structure
                tierDetail.categorizedProducts = {
                  [firstKey]: {
                    sortOrder: 0,
                    purchasedProducts: purchasedProductsWithCodes,
                    requiredProducts: requiredProductsWithCodes
                  },
                  "All Products": {
                    sortOrder: 1,
                    purchasedProducts: purchasedProductsWithCodes,
                    requiredProducts: requiredProductsWithCodes
                  }
                };
              }
            }
          });
        }
        // ========================================
        // INTERNAL INITIATIVES / TAB OPTION = 1 DATA MODIFICATION - END
        // ========================================

        // Set allPurchasedProducts for toggle functionality (works for all cases)
        const allPurchasedProducts: any[] = [];
        const seenProductIds = new Set(); // To track unique products

        // Get purchased products from storeTierDetails
        if (data?.storeTierDetails && data.storeTierDetails.length > 0) {
          data.storeTierDetails.forEach((tierDetail: any) => {
            if (tierDetail.categorizedProducts) {
              Object.values(tierDetail.categorizedProducts).forEach(
                (category: any) => {
                  if (category.purchasedProducts) {
                    category.purchasedProducts.forEach((product: any) => {
                      // Only add product if we haven't seen it before
                      if (!seenProductIds.has(product.id)) {
                        seenProductIds.add(product.id);
                        allPurchasedProducts.push(product);
                      }
                    });
                  }
                }
              );
            }
          });
        }

        // Also get purchased products from main categorizedProducts if it exists
        if (data?.categorizedProducts) {
          Object.values(data.categorizedProducts).forEach((category: any) => {
            if (category.purchasedProducts) {
              category.purchasedProducts.forEach((product: any) => {
                // Only add product if we haven't seen it before
                if (!seenProductIds.has(product.id)) {
                  seenProductIds.add(product.id);
                  allPurchasedProducts.push(product);
                }
              });
            }
          });
        }

        data.filteredProducts = allPurchasedProducts;

        setData(data);
      } catch (e) {
        console.error("error", e);
      } finally {
        setIsLoading(false);
      }
    }

    if (manufacturerData) {
      fetchStoreManufacturerDetails();
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manufacturerData]);

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="relative z-50"
      >
        {/* fixed inset-0 w-screen overflow-y-auto p-4 */}
        <div
          id="spiff-program-overview-modal"
          className="fixed inset-0 w-screen overflow-y-auto space-y-4 bg-black bg-opacity-20 p-4"
        >
          <div className="flex min-h-full items-center justify-center">
            <DialogPanel className="max-w-2xl w-full min-h-[250px] border bg-white p-4 sm:p-6 rounded-lg">
              <DialogTitle className="flex justify-between items-start sm:items-center ">
                <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
                  {
                    <span>
                      <ManufacturerAvatar
                        bold={true}
                        user={{
                          name: manufacturerData?.name,
                          logo: manufacturerData?.logo
                        }}
                        large={true}
                      />
                    </span>
                  }
                </div>
                <Image
                  onClick={() => setIsOpen(false)}
                  className="cursor-pointer"
                  src={popupCloseIcon.src}
                  alt="popupCloseIcon"
                  height={13}
                  width={13}
                />
              </DialogTitle>
              <Loader show={isLoading} className="relative bg-white mt-5" />
              {!isLoading && (
                <>
                  {!data?.storeTierDetails?.length &&
                    data?.tierDetails?.length &&
                    data?.tierDetails?.map(
                      (tierDetail: any, tierIndex: number) => {
                        return (
                          <div
                            key={`${tierIndex}-${tierDetail?.overview}`}
                            className="border rounded-lg p-3 mt-5 text-highlighted-color font-medium"
                          >
                            <span className="text-sm">Details: </span>
                            <span className="font-medium text-sm ">
                              {tierDetail.overview}
                            </span>
                          </div>
                        );
                      }
                    )}
                  <div className={`grid gap-4 grid-cols-1`}>
                    <div className="flex gap-2 justify-between">
                      <div
                        className={`mt-5 border rounded-lg p-3 ${data?.quantityType && data?.quantitySold !== undefined ? "w-full" : "w-full"}`}
                      >
                        <div className="flex gap-1.5 items-center">
                          <Image
                            height={19}
                            width={19}
                            src={GreenDollarIcon.src}
                            alt="Total Purchase Volume Icon"
                          />
                          <span className="text-sm font-medium text-highlighted-color">
                            My Earnings
                          </span>
                        </div>
                        <div
                          className={`flex items-center gap-6 mt-3 ${data?.maxValue ? "justify-start" : "justify-start"}`}
                        >
                          <p className="font-semibold text-lg">
                            {isInternal && totalSpiffEarning === 0
                              ? "N/A"
                              : `$${formatNumber(totalSpiffEarning, false)}`}
                          </p>
                          {/* {data?.maxValue && (
                            <div className="w-full">
                              <HorizontalProgressBar
                                className="max-w-full"
                                percentage={calcPercentage(
                                  data?.achivedValue || 0,
                                  data?.maxValue || 0
                                )}
                              />
                            </div>
                          )} */}
                          {/* {data?.totalSpiffEarningOpp && (
                            <p className="font-semibold text-heading-light text-lg">
                              ${formatNumber(data?.totalSpiffEarningOpp || 0)}
                            </p>
                          )} */}
                        </div>
                        {/* {data?.achivedValueType && (
                          <div className="mt-2 text-xs text-heading-light">
                            <span className="font-semibold text-sm text-highlighted-color mr-1">
                              {data?.achivedValue}
                              {data?.maxValue ? `/${data?.maxValue}` : ""}
                            </span>
                            {data?.achivedValueType} Acheived
                          </div>
                        )} */}
                      </div>
                      {data?.quantityType &&
                        data?.quantitySold !== undefined && (
                          <div
                            className={`mt-5 border rounded-lg p-3 ${data?.quantityType ? "w-1/2" : "w-full"}`}
                          >
                            <div className="flex gap-1.5 items-center">
                              <Image
                                height={19}
                                width={19}
                                src={PinkStoreIcon.src}
                                alt="Total Purchase Volume Icon"
                              />
                              <span className="text-sm font-medium text-highlighted-color capitalize">
                                {data?.quantityType}
                              </span>
                            </div>
                            <div className="flex items-start gap-6 mt-3 justify-start">
                              <p className="font-semibold text-lg">
                                {formatNumber(data?.quantitySold || 0)}
                              </p>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                  {!!data?.storeTierDetails?.length && (
                    <div
                      id="store-tiers"
                      className="grid grid-col-fit-[185px] gap-4 mt-6 max-h-60 [@media(min-height:600px)]:max-h-[25vh] [@media(min-height:800px)]:max-h-[30vh] overflow-y-auto pr-2.5 -mr-2.5"
                    >
                      {data?.storeTierDetails.map((tierDetail, tierIndex) => {
                        const completed =
                          (tierDetail?.SKU?.completed >
                            tierDetail?.SKU?.total &&
                          tierDetail?.SKU?.total != 0
                            ? tierDetail?.SKU?.total
                            : tierDetail?.SKU?.completed) ?? 0;
                        const total = tierDetail?.SKU?.total ?? 0;

                        const semiPieChartColor =
                          tierDetail.isProgramComplianceQualified
                            ? PROGRESS_COLORS.COMPLETED
                            : PROGRESS_COLORS.PENDING;
                        return (
                          <div
                            key={`${tierIndex}-${tierDetail.title}`}
                            className={`border rounded-lg p-3 flex flex-col justify-between`}
                          >
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-sm text-highlighted-color min-h-7">
                                {tierDetail.title}
                                {/* (
                                  {formateRebate(
                                    {},
                                    {
                                      rebate_type:
                                        tierDetail.rebate_type ??
                                        tierDetail.rebateType,
                                      rebate_amount:
                                        tierDetail.rebate_amount ??
                                        tierDetail.rebateAmount,
                                      rebate_percentage:
                                        tierDetail.rebate_percentage
                                    }
                                  )}
                                ) */}
                                {/* {!isAllProgramsBasedOnListPrice &&
                                  tierDetail?.isRebateBasedOnListPrice && (
                                    <span className="inline-block ml-[7px]">
                                      <CustomPopOver startFromLeft />
                                    </span>
                                  )} */}
                              </span>

                              <TruncatedParagraph
                                content={tierDetail?.overview || ""}
                              />
                            </div>
                            {!!tierDetail.SKU && !tierDetail?.graph && (
                              <div className="chart mt-3 cursor-pointer">
                                <DynamicSemiPieChart
                                  percentage={calcPercentage(completed, total)}
                                  title={`${formatNumber(completed)}/${formatNumber(total)}`}
                                  desc="SKUs"
                                  pieColor={semiPieChartColor}
                                  cx={100}
                                  height={90}
                                  width={210}
                                  textX={105}
                                />
                              </div>
                            )}

                            {tierDetail?.graph &&
                              Object.keys(tierDetail?.graph || {}).map(
                                (label) => {
                                  const graphData = tierDetail?.graph
                                    ? tierDetail?.graph[label]
                                    : "";
                                  let completed = 0;
                                  let total = 0;
                                  const dollarSign =
                                    label == "Spend" ? "$" : "";
                                  if (
                                    graphData &&
                                    graphData.completed !== undefined &&
                                    graphData.total !== undefined
                                  ) {
                                    completed =
                                      Number(graphData.completed) >
                                        Number(graphData.total) &&
                                      Number(graphData.total) != 0
                                        ? Math.round(Number(graphData.total))
                                        : Math.round(
                                            Number(graphData.completed)
                                          );
                                    total = Math.round(Number(graphData.total));
                                  }

                                  const semiPieChartColor =
                                    tierDetail.isProgramComplianceQualified
                                      ? PROGRESS_COLORS.COMPLETED
                                      : PROGRESS_COLORS.PENDING;
                                  return typeof graphData === "object" &&
                                    graphData.completed !== undefined &&
                                    graphData.total !== undefined ? (
                                    <div
                                      key={`tierDetail-${label}`}
                                      className="chart mt-3"
                                    >
                                      {total == 0 ? (
                                        <p className="font-bold text-lg mt-3">
                                          {completed}
                                          <span className="text-filter-light text-xs font-normal ml-1 capitalize">
                                            {label}
                                          </span>
                                        </p>
                                      ) : (
                                        <DynamicSemiPieChart
                                          percentage={calcPercentage(
                                            completed,
                                            total
                                          )}
                                          title={`${dollarSign + formatNumber(completed)}/${dollarSign + formatNumber(total)}`}
                                          desc={label}
                                          pieColor={semiPieChartColor}
                                          cx={100}
                                          height={90}
                                          width={210}
                                          textX={105}
                                        />
                                      )}
                                    </div>
                                  ) : null;
                                }
                              )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {data?.quantityType &&
                    data?.quantitySold !== undefined &&
                    data?.quantityType?.toLowerCase() == "pod" &&
                    !data?.categorizedProducts && (
                      <div className="flex gap-2 mt-5 bg-blue-bg p-2 rounded-md items-center">
                        <Image
                          src={bulbIcon.src}
                          alt="Total Purchase Volume Icon"
                          height={11}
                          width={11}
                        />
                        <span className="font-semibold text-xs text-heading-blue">
                          All products eligible for purchase. Pick any item you
                          like!
                        </span>
                      </div>
                    )}
                  {!!data?.categorizedProducts &&
                    !!Object.keys(data?.categorizedProducts || {})?.length && (
                      <CategorizedTabProductList
                        categorizedProducts={data?.categorizedProducts}
                        tabSearchParamKey={"storeDetailProductTab"}
                        resetTabs={!isOpen}
                        showPurchasedProductsButton={true}
                        showWishlists={false}
                        showDistributorCode={true}
                        showUpcCode={false}
                        storeId={storeId}
                        manufacturerId={manufacturerData.id.toString()}
                        showAddIcon={isSalesRep}
                        isShowGreyBg={false}
                        allPurchasedProducts={
                          data?.categorizedProducts &&
                          "All Products" in data.categorizedProducts
                            ? undefined
                            : data?.filteredProducts
                        }
                      />
                    )}
                </>
              )}
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </>
  );
};
export default SpiffTierDetailsModal;
