// Import Core functionality/component
import { useEffect, useState } from "react";

// Import Components
import StoreDetailsModal from "@/components/Dialog/StoreDetailsModal";
import TierDetailModal from "@/components/Dialog/TierDetailModal";

// Import Types
import {
  StoreDetailsModalProps,
  TierDetailsModalData
} from "@/types/StoreTypes";
import { getUserClient } from "@/utils/getUserClient";
import { formateRebate } from "@/utils/helper";
import { isDistributor } from "@/utils/rolesConditions";

const StoreProgramDetailsModal: React.FC<StoreDetailsModalProps> = ({
  isOpen,
  setIsOpen,
  data,
  tierIndex = null,
  setTierIndex,
  modalDetailAPICallDisable = false
}) => {
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [modalShowBackArrow, setModalShowBackArrow] = useState(false);
  const [tierDetails, setTierDetails] = useState<TierDetailsModalData | null>(
    null
  );

  const user = getUserClient();
  const showDistributorCode = isDistributor(user?.role || "");

  const handleTierClick = (index: number, tierName: string) => {
    const selectedTier = data?.manufacturer?.tierDetails?.find(
      (tier) => tier.title === tierName
    );

    const tierCompliance = data?.allCompliances.find(
      (c: any) => c.programDetailId === selectedTier?.programDetailId
    );
    const earnedRebate = tierCompliance?.isQualified
      ? tierCompliance.earnedRebate
      : 0;

    if (selectedTier) {
      const newTierDetails: TierDetailsModalData = {
        totalPotentialSavings: formateRebate(undefined, selectedTier),
        // totalPotentialSavings:
        //   String(selectedTier.totalPotentialSavings ?? 0) ?? 0,
        overview: selectedTier.overview ?? "",
        additionalInfo: selectedTier.description ?? "",
        title: selectedTier.title,
        products: data?.manufacturer?.additionalInfo?.recommendedProducts ?? [],
        purchasedProducts:
          data?.manufacturer?.additionalInfo?.purchasedProducts ?? [],
        progressAchieved: selectedTier.progressAchieved ?? [],
        graph: selectedTier.graph ?? undefined,
        rebate_amount: selectedTier.rebate_amount,
        rebate_percentage: selectedTier.rebate_percentage,
        rebate_type: selectedTier.rebate_type,
        categorizedProducts: selectedTier.categorizedProducts,
        earnedRebate: earnedRebate,
        totalOppSavings: selectedTier.totalOppSavings,
        isRebateBasedOnListPrice: selectedTier?.isRebateBasedOnListPrice
      };

      if (selectedTier.SKU) {
        newTierDetails.skus = {
          total: selectedTier.SKU.total,
          completed: selectedTier.SKU.completed
        };
      }

      setTierDetails(newTierDetails);
      setIsDetailOpen(true);
      setIsOpen(false);
      if (typeof tierIndex != "number" && isOpen) setModalShowBackArrow(true);
    }

    // setTierDetails(tierDetails);
  };

  useEffect(() => {
    if (typeof tierIndex == "number") {
      const tier = data?.manufacturer?.tierDetails?.[tierIndex];

      if (tier) {
        handleTierClick(tierIndex, tier.title);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tierIndex]);

  const handleTierClose = (val: boolean, openParentModal?: boolean) => {
    setIsDetailOpen(val);
    setModalShowBackArrow(val);
    if (setTierIndex) setTierIndex(undefined);

    if (openParentModal) {
      setIsOpen(true);
    }
  };

  return (
    <>
      <TierDetailModal
        isOpen={isDetailOpen}
        setIsOpen={handleTierClose}
        data={tierDetails}
        manfData={data.manufacturer}
        showBackArror={modalShowBackArrow}
        showCategorizedProducts
        isStoreEnrolled={data.isEnrolled}
        showPurchasedProductsButton
        canAddToWishlist
        showDistributorCode={showDistributorCode}
      />

      <StoreDetailsModal
        isOpen={isOpen}
        setIsOpen={setIsOpen}
        data={data}
        avtarCenter={true}
        setIsDetailOpen={handleTierClick}
        isStoreEnrolled={data.isEnrolled}
        storeId={String(data.manufacturer?.storeId)}
        modalDetailAPICallDisable={modalDetailAPICallDisable}
      />
    </>
  );
};
export default StoreProgramDetailsModal;
