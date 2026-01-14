// Import Core functionality/component
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";

// Import Components
import ProductsList from "@/components/Product/ProductsList";
import { Tab, Tabs } from "@/components/Tabs/Tabs";

// Import Types
import { TierDetailsModalProps } from "@/types/StoreTypes";

// Import Images
import GreenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import leftArrowIcon from "@/assets/icons/leftArrowIcon.svg";
import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import { getUserClient } from "@/utils/getUserClient";
import {
  formateRebate,
  getRangeFromCommaString,
  isOrderAndCartFeatureEnabled
} from "@/utils/helper";
import { formatNumber } from "@/utils/numberFormatter";
import {
  isDistributorSalesRep,
  isManufacturer,
  isManufacturerAccountManager,
  isManufacturerExecutive
} from "@/utils/rolesConditions";
import ManufacturerAvatar from "../Avatar/ManufacturerAvatar";
import CategorizedTabProductList from "../Elements/CategorizedTabProductList";
import Loader from "../Loader";
import CustomPopOver from "../Popovers/CustomPopOver";
import EstimatedSavingsWarningPopOver from "../Popovers/EstimatedSavingsWarning";
// import bulbIcon from "@/assets/icons/bulbIcon.svg";

const TierDetailModal: React.FC<TierDetailsModalProps> = ({
  isOpen,
  setIsOpen,
  data,
  showBackArror,
  isLoading,
  manfData,
  skuLabel = "SKUs",
  skuTitleLabel = "Progress Track",
  showPurchasedProductsButton = false,
  showCategorizedProducts = false,
  isStoreEnrolled = false,
  formatEarnedRebate = true,
  addStoreIntialToTitle = false,
  canAddToWishlist = false,
  customEarningLabel,
  showDistributorCode = false,
  showStoreCompliance = true,
  showProductsUpcCode = false,
  hideProductsUpcCodeOnPurchasedShow = false,
  allPurchasedProducts,
  id = "tier-detail-modal",
  storeId,
  externalStoreId,
  manufacturerId,
  showRebateRange,
  storeName
}) => {
  const totalRebate = showRebateRange ? data?.rebateRange : data?.totalRebate;

  const user = getUserClient();
  // Always return true for manufacturer users to prevent grey backgrounds
  const isManufacturerUser =
    isManufacturer(user?.role || "") ||
    isManufacturerExecutive(user?.role || "") ||
    isManufacturerAccountManager(user?.role || "");

  const isAuthorized = isManufacturerUser
    ? true
    : manfData?.authorized == false
      ? false
      : true;
  const isOrderFeatureEnabled = isDistributorSalesRep(user?.role ?? "")
    ? isOrderAndCartFeatureEnabled(user?.parentEntityId)
    : undefined;

  const renderProgressText = (text: string | unknown) => {
    const sText = String(text);
    const regex = /^(\d+\/\d+)\s*(.*)$/;
    const match = sText.match(regex);

    if (match) {
      const numericPart = match[1];
      const remainingText = match[2].trim();
      return (
        <>
          <strong className="font-bold">{numericPart}</strong>
          <span className="text-sm opacity-90">
            {remainingText && ` ${remainingText}`}
          </span>
        </>
      );
    }
    return <>{sText}</>;
  };

  const getSavingsLabel = (isStoreOppLabel: boolean = false) => {
    {
      customEarningLabel
        ? customEarningLabel
        : (addStoreIntialToTitle ? "Store " : "Total ") + "Estimated Earnings";
    }

    let label = "";
    if (addStoreIntialToTitle) {
      label = "Store ";
    } else {
      label = "Total ";
    }

    if (customEarningLabel) return customEarningLabel;

    // if (isStoreEnrolled == false) {
    //   label += "Potential Earnings";
    if (isStoreOppLabel) {
      label += "Earnings Opp.";
    } else {
      label += "Estimated Earnings";
    }
    return label;
  };

  const getRebateAmountVal = (isEarningOpp: boolean = true) => {
    let val = "";
    if (data?.rebateRange && showRebateRange) val = data?.rebateRange;

    if (!val && data?.totalOppSavings?.amount !== undefined && isEarningOpp) {
      const amount = data?.totalOppSavings?.amount ?? 0;
      val = formatEarnedRebate
        ? parseFloat(amount.toString()).toFixed(1)
        : amount.toString();
    }

    if (!val && data?.earnedRebate !== undefined) {
      const amount = data?.earnedRebate ?? 0;
      val = formatEarnedRebate
        ? parseFloat(amount.toString()).toFixed(1)
        : amount.toString();
    }

    if (val?.includes("$") || val?.includes("%")) {
      return val;
    }

    return val ? "$" + val : "$0.0";
  };

  // Set the max width of the dialog panel based on the number of product categories
  let productCategories = Object.keys(data?.categorizedProducts || {}).length;
  productCategories = productCategories >= 3 ? 4 : 2;

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={() => setIsOpen(false)}
        className="relative z-50"
      >
        {/* fixed inset-0 w-screen overflow-y-auto p-4 */}
        <div
          id={id}
          className="fixed inset-0 w-screen overflow-y-auto space-y-4 bg-black bg-opacity-20 p-4"
        >
          <div className="flex min-h-full items-center justify-center">
            <Loader
              show={isLoading ?? false}
              className="relative bg-transparent mt-6"
            />

            {!isLoading && (
              <DialogPanel
                className={`max-w-${productCategories}xl w-full border bg-white p-4 sm:p-6 rounded-lg`}
              >
                <DialogTitle className="flex justify-between">
                  <div className="flex justify-start items-center gap-4">
                    {showBackArror && (
                      <>
                        <Image
                          onClick={() => setIsOpen(false, true)}
                          className="cursor-pointer"
                          src={leftArrowIcon.src}
                          alt="leftGreyArrowIcon"
                          height={16}
                          width={8}
                        />
                        <div className="seperator min-h-3 w-[1px] bg-theme-light-gray border-gray"></div>
                      </>
                    )}
                    {manfData && (
                      <div className="flex flex-col">
                        <ManufacturerAvatar
                          bold={true}
                          user={manfData}
                          large={true}
                          center={false}
                        />
                      </div>
                    )}
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
                {(storeName || storeId) && (
                  <div className="mt-3 mb-3">
                    <span className="text-sm font-medium text-heading-light">
                      {storeName || ""}
                      {storeName && storeId && " "}
                      {storeId && (
                        <span className="text-heading-very-light">
                          ({storeId})
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {!!data?.overview && (
                  <div className="flex flex-col gap-1 text-medium text-highlighted-color mb-6">
                    <p className="font-semibold text-lg">
                      {data?.title} (
                      {totalRebate ||
                        (data?.fixed_rebate_amount
                          ? getRangeFromCommaString(data?.fixed_rebate_amount)
                          : formateRebate(
                              {},
                              {
                                rebate_type: data?.rebate_type,
                                rebate_amount: data?.rebate_amount,
                                rebate_percentage: data?.rebate_percentage
                              }
                            ))}
                      )
                    </p>

                    {data?.overview}
                  </div>
                )}

                {showStoreCompliance && (
                  <div className="grid gap-4 grid-cols-2">
                    {(!!data?.skus ||
                      data?.progressAchieved?.length ||
                      data?.graph) && (
                      <div
                        id="sku-title-card"
                        className="border rounded-lg p-3"
                      >
                        <div className="flex gap-1.5 items-center">
                          <span className="text-sm font-medium text-highlighted-color">
                            {skuTitleLabel}
                          </span>
                        </div>

                        {data?.skus && !data?.graph && (
                          <p className="text-lg mt-3">
                            {data?.skus.completed > data?.skus.total &&
                            data?.skus.total != 0
                              ? formatNumber(data?.skus.total)
                              : formatNumber(data?.skus.completed)}
                            {"/"}
                            {formatNumber(data?.skus.total)}
                            <span className="text-filter-light text-xs font-normal ml-1">
                              {skuLabel}
                            </span>
                          </p>
                        )}

                        {!data?.progressAchieved?.length &&
                          data?.graph &&
                          Object.keys(data?.graph || {}).map((label) => {
                            const graphData = data?.graph
                              ? data?.graph[label]
                              : "";

                            let completed: number | string = 0;
                            let total: number | string = 0;
                            const dollarSign = label == "Spend" ? "$" : "";
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
                                  : Math.round(Number(graphData.completed));
                              total = Math.round(Number(graphData.total));

                              completed = dollarSign + formatNumber(completed);
                              total = dollarSign + formatNumber(total);
                            }
                            return typeof graphData === "object" &&
                              graphData.completed !== undefined &&
                              graphData.total !== undefined ? (
                              <p className="text-lg mt-3">
                                {completed}
                                {total != 0 ? "/" : ""}
                                {total != 0 ? total : ""}
                                <span className="text-filter-light text-xs font-normal ml-1 capitalize">
                                  {label}
                                </span>
                              </p>
                            ) : null;
                          })}

                        {!!data?.progressAchieved?.length && (
                          <div className="mt-3 flex gap-x-2.5 gap-y-1.5 flex-wrap overflow-y-auto pr-2 -mr-2 max-h-20">
                            {data?.progressAchieved.map((item, index) => {
                              if (Array.isArray(item) && item.length > 0) {
                                return (
                                  <p
                                    key={`tier-detail-${index}`}
                                    className="text-lg"
                                  >
                                    {renderProgressText(item[0])}
                                    {item[1] && (
                                      <span className="text-filter-light text-xs font-normal ml-1">
                                        {(String(item[1]) || "")
                                          ?.trim()
                                          ?.replace(/[^a-zA-Z0-9&]/g, " ")}
                                      </span>
                                    )}
                                  </p>
                                );
                              } else {
                                const singleItemText = String(item);
                                const regex = /^(\d+\/\d+)\s*(.*)$/;
                                const match = singleItemText.match(regex);

                                if (match) {
                                  return (
                                    <p
                                      key={`tier-detail-${index}`}
                                      className="text-lg"
                                    >
                                      {renderProgressText(singleItemText)}
                                    </p>
                                  );
                                } else {
                                  return (
                                    <p
                                      key={`tier-detail-${index}`}
                                      className="text-lg font-bold"
                                    >
                                      {renderProgressText(singleItemText)}
                                    </p>
                                  );
                                }
                              }
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    <div id="rebate-card" className="border rounded-lg p-3">
                      <div className="flex gap-1.5 items-center">
                        <Image
                          height={19}
                          width={19}
                          src={GreenDollarIcon.src}
                          alt="Total Estimated Earnings Icon"
                        />
                        <span className="text-sm font-medium text-highlighted-color">
                          {getSavingsLabel(!data?.earnedRebate)}
                        </span>
                      </div>

                      {isAuthorized ? (
                        <span className="flex items-center  mt-3">
                          <p className="font-bold text-lg">
                            {getRebateAmountVal(!data?.earnedRebate)}
                          </p>
                          {data?.isRebateBasedOnListPrice && (
                            <span className="inline-block ml-[7px]">
                              <CustomPopOver startFromLeft />
                            </span>
                          )}
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5 mt-3">
                          <span className="flex items-center">
                            <p className="font-bold text-lg">
                              {getRebateAmountVal(!data?.earnedRebate)}
                            </p>
                            {data?.isRebateBasedOnListPrice && (
                              <span className="inline-block ml-[7px]">
                                <CustomPopOver startFromLeft />
                              </span>
                            )}
                          </span>
                          <EstimatedSavingsWarningPopOver />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* <div className="additionalNote mt-3 bg-heading-blue bg-opacity-10 rounded-md p-3">
                <div className="flex items-center gap-2">
                  <Image
                    height={15}
                    width={10.5}
                    src={bulbIcon.src}
                    alt="bulbIcon"
                  />
                  <div className="text-heading-blue font-semibold text-xs">
                    <span>
                      {data?.additionalInfo ||
                        "No additional information available"}
                    </span>
                  </div>
                </div>
              </div> */}

                {/* Orginal Condition */}
                {/* {data?.products && ( */}

                {true /* // For demo purposes only */ &&
                  !showCategorizedProducts && (
                    <div className="mt-6 border rounded-lg p-4">
                      <Tabs
                        contentClass="pt-[18px] pb-[0]"
                        labelContainerClass="gap-[16px] text-heading-light"
                        labelClass="text-xs"
                        className="py-[0px] px-[0px]"
                        defaultTab={0}
                        resetTabs={!isOpen}
                      >
                        <Tab label="Recommended Products">
                          <ProductsList
                            isInPopup
                            products={data?.products ?? []}
                          />
                        </Tab>
                        <Tab label="Purchased Products">
                          <ProductsList
                            isInPopup
                            products={data?.purchasedProducts ?? []}
                            showWishlists={canAddToWishlist}
                          />
                        </Tab>
                      </Tabs>
                    </div>
                  )}

                {showCategorizedProducts &&
                  !!data?.categorizedProducts &&
                  !!Object.keys(data?.categorizedProducts || {})?.length && (
                    <CategorizedTabProductList
                      categorizedProducts={data?.categorizedProducts}
                      tabSearchParamKey={"storeDetailProductTab"}
                      resetTabs={!isOpen}
                      showPurchasedProductsButton={showPurchasedProductsButton}
                      showWishlists={canAddToWishlist}
                      showDistributorCode={showDistributorCode}
                      showUpcCode={showProductsUpcCode}
                      hideUpcCodeOnPurchasedShow={
                        hideProductsUpcCodeOnPurchasedShow
                      }
                      allPurchasedProducts={
                        allPurchasedProducts
                          ? allPurchasedProducts
                          : data?.purchasedProducts
                      }
                      storeId={storeId || undefined}
                      externalStoreId={
                        isOrderFeatureEnabled ? externalStoreId : undefined
                      }
                      manufacturerId={
                        isOrderFeatureEnabled ? manufacturerId : undefined
                      }
                      showAddIcon={canAddToWishlist}
                      isShowGreyBg={!isManufacturerUser}
                    />
                  )}
              </DialogPanel>
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
};
export default TierDetailModal;
