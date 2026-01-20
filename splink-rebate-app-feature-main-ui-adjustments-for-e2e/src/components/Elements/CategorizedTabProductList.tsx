"use client";

import { MESSAGES } from "@/configs/messages";
import { CategorizedProducts, ManufacturerProduct } from "@/types/StoreTypes";
import { useMemo, useState } from "react";
import ProductsList from "../Product/ProductsList";
import { Tab, Tabs } from "../Tabs/Tabs";

export interface CategorizedTabProductListType {
  categorizedProducts: CategorizedProducts;
  tabSearchParamKey: string;
  className?: string;
  resetTabs?: boolean | null;
  showPurchasedProductsButton?: boolean;
  showWishlists?: boolean;
  displayLabels?: boolean;
  showDistributorCode?: boolean;
  showUpcCode?: boolean;
  canSortCategorizedProducts?: boolean;
  hideUpcCodeOnPurchasedShow?: boolean;
  allPurchasedProducts?: ManufacturerProduct[];
  emptyListMessage?: string;
  storeId?: string;
  externalStoreId?: string;
  cartItems?: any[];
  manufacturerId?: string;
  showAddIcon?: boolean;
  isShowGreyBg?: boolean;
}

function CategorizedTabProductList({
  categorizedProducts,
  tabSearchParamKey,
  className = "mt-6 border rounded-lg p-2.5 sm:p-4",
  resetTabs,
  showPurchasedProductsButton = false,
  showWishlists = false,
  displayLabels = true,
  showDistributorCode = true,
  showUpcCode = false,
  canSortCategorizedProducts = true,
  hideUpcCodeOnPurchasedShow = false,
  allPurchasedProducts,
  emptyListMessage,
  storeId,
  externalStoreId,
  manufacturerId,
  showAddIcon = true,
  isShowGreyBg = true
}: CategorizedTabProductListType) {
  const [showPurchasedProducts, setShowPurchasedProducts] = useState(false);

  const handleShowPurchasedProducts = () => {
    setShowPurchasedProducts(!showPurchasedProducts);
  };

  // Sort categorizedProducts by number of required products in descending order
  const sortedCategorizedProducts = useMemo(() => {
    if (canSortCategorizedProducts == false) return categorizedProducts;
    if (!categorizedProducts) return {};

    // Create an array of entries, only filtering out those without a key
    const validEntries = Object.entries(categorizedProducts).filter(
      ([key]) => key && key.trim() !== ""
    );

    // Sort by required products count (descending) and place flex categories at end
    validEntries.sort(([keyA, a], [keyB, b]) => {
      const aIsFlex =
        keyA.toLowerCase() === "flex" ||
        keyA.toLowerCase() === "recommended flex";
      const bIsFlex =
        keyB.toLowerCase() === "flex" ||
        keyB.toLowerCase() === "recommended flex";

      if (aIsFlex && !bIsFlex) return 1;
      if (!aIsFlex && bIsFlex) return -1;
      return (
        (b.requiredProducts?.length || 0) - (a.requiredProducts?.length || 0)
      );
    });

    // Convert back to object
    return validEntries.reduce((acc, [key, value]) => {
      acc[key] = value;
      return acc;
    }, {} as CategorizedProducts);
  }, [categorizedProducts]);

  return (
    <div className={className}>
      <Tabs
        contentClass="pt-[18px] pb-[0]"
        labelContainerClass="gap-[16px] text-heading-light"
        labelClass="text-xs"
        className="py-[0px] px-[0px]"
        tabSearchParamKey={tabSearchParamKey}
        defaultTab={0}
        selectedTab={
          !showPurchasedProducts && allPurchasedProducts ? 0 : undefined
        }
        resetTabs={resetTabs}
        disableRouterPush
        showPurchasedProductsButton={showPurchasedProductsButton}
        showPurchasedProducts={showPurchasedProducts}
        handleShowPurchasedProducts={handleShowPurchasedProducts}
        displayLabels={displayLabels}
      >
        {Object.keys(sortedCategorizedProducts || {})
          .sort((aEntry, bEntry) => {
            const a: any = sortedCategorizedProducts[aEntry];
            const b: any = sortedCategorizedProducts[bEntry];
            const orderA = a?.sortOrder ?? 0;
            const orderB = b?.sortOrder ?? 0;
            return orderA - orderB;
          })
          .map((label, i) => {
            const tierDetail = sortedCategorizedProducts
              ? sortedCategorizedProducts?.[label]
              : "";

            const message =
              !showPurchasedProducts &&
              typeof tierDetail === "object" &&
              tierDetail !== null &&
              "note" in tierDetail
                ? tierDetail?.note
                : undefined;

            const requiredProducts =
              typeof tierDetail === "object" &&
              tierDetail !== null &&
              "requiredProducts" in tierDetail
                ? tierDetail?.requiredProducts
                : [];
            const purchasedProducts =
              typeof tierDetail === "object" &&
              tierDetail !== null &&
              "purchasedProducts" in tierDetail
                ? tierDetail?.purchasedProducts?.map((pro) => ({
                    ...pro,
                    isPurchased: true
                  }))
                : [];
            const allProducts = showPurchasedProducts
              ? purchasedProducts
              : requiredProducts;

            return (
              <Tab label={label?.replaceAll("_", " ")} key={`${label}-${i}`}>
                <>
                  {showPurchasedProductsButton && (
                    <p className="text-highlighted-color text-[10px] -mt-2.5 mb-2.5 italic">
                      {showPurchasedProducts
                        ? MESSAGES.PRODUCT_LIST_PURCHASED_DESCRIPTION
                        : MESSAGES.PRODUCT_LIST_NON_PURCHASED_DESCRIPTION}
                    </p>
                  )}
                  {message ? (
                    <p className="text-filter-light text-base font-medium">
                      {message}
                    </p>
                  ) : (
                    <ProductsList
                      showWishlists={showWishlists}
                      isInPopup
                      products={allProducts}
                      showDistributorCode={
                        showDistributorCode
                          ? hideUpcCodeOnPurchasedShow
                            ? showPurchasedProducts
                            : true
                          : false
                      }
                      showUpcCode={
                        showUpcCode
                          ? hideUpcCodeOnPurchasedShow
                            ? !showPurchasedProducts
                            : true
                          : false
                      }
                      emptyListMessage={
                        emptyListMessage
                          ? emptyListMessage
                          : showPurchasedProducts
                            ? MESSAGES.NOT_ALL_PRODUCTS_PURCHASED
                            : MESSAGES.ALL_PRODUCTS_PURCHASED.replace(
                                "{0}",
                                label?.replace("_", " ")
                              )
                      }
                      showProductsIcon={showPurchasedProductsButton}
                      showAddIcon={showAddIcon}
                      storeId={storeId}
                      manufacturerId={manufacturerId}
                      isShowGreyBg={isShowGreyBg}
                    />
                  )}
                </>
              </Tab>
            );
          })}
        {showPurchasedProductsButton &&
          showPurchasedProducts &&
          allPurchasedProducts && (
            <Tab label={"All Products"} key={`All Products`}>
              <>
                {showPurchasedProductsButton && (
                  <p className="text-highlighted-color text-[10px] -mt-2.5 mb-2.5 italic">
                    {showPurchasedProducts
                      ? MESSAGES.PRODUCT_LIST_PURCHASED_DESCRIPTION
                      : MESSAGES.PRODUCT_LIST_NON_PURCHASED_DESCRIPTION}
                  </p>
                )}
                <ProductsList
                  showWishlists={false}
                  isInPopup
                  products={
                    allPurchasedProducts?.map((pro: any) => ({
                      ...pro,
                      isPurchased: true
                    })) ?? []
                  }
                  emptyListMessage={
                    emptyListMessage
                      ? emptyListMessage
                      : MESSAGES.NOT_PURCHASED_ANY_PRODUCTS
                  }
                  showUpcCode={
                    showUpcCode
                      ? hideUpcCodeOnPurchasedShow
                        ? !showPurchasedProducts
                        : true
                      : false
                  }
                  showDistributorCode={
                    showDistributorCode
                      ? hideUpcCodeOnPurchasedShow
                        ? showPurchasedProducts
                        : true
                      : false
                  }
                  showProductsIcon={showPurchasedProductsButton}
                  storeId={externalStoreId || storeId}
                  manufacturerId={manufacturerId}
                  isShowGreyBg={isShowGreyBg}
                />
              </>
            </Tab>
          )}
      </Tabs>
    </div>
  );
}

export default CategorizedTabProductList;
