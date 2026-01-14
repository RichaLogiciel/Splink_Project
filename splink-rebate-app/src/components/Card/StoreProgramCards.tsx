"use client";
// Import Core/Packages
import { useState } from "react";

// Import Components
import ManufacturerAvatar from "@/components/Avatar/ManufacturerAvatar";
import StoreDetailsModal from "@/components/Dialog/DashboardStoreDetailsModal";
import ProgramSaleInfo from "@/components/Elements/ProgramSaleInfo";
import StoreProgramInfo from "@/components/Elements/StoreProgramInfo";
import Card from "./index";

// Import Utils
import { getNumericDateString } from "@/utils/dateHelper";
import { formatNumber } from "@/utils/numberFormatter";

// Import Types
import { MESSAGES } from "@/configs/messages";
import { apiClient } from "@/lib/axiosClient";
import { DistributorProgram, ProgramListingCard } from "@/types/ProgramTypes";
import {
  EnrolledProgram,
  ProgramStoresListingDataProps
} from "@/types/StoreTypes";
import { getUserClient } from "@/utils/getUserClient";
import { getProgramTimelineQueryParam } from "@/utils/helper";
import { isChain } from "@/utils/rolesConditions";
import { ENTITY_TYPES_RESPONSE } from "@/views/Distributor/programConstants";
import { useSearchParams } from "next/navigation";
import ProgramStoresListingModal from "../Dialog/ProgramStoresListingModal";

interface ProgramCardProps {
  data: ProgramListingCard[];
  popupData?: ProgramListingCard;
  userId?: number;
  stores?: { name: string; id: number }[];
  savingLabel?: string;
  selectedStoreId?: string;
}

const ProgramCard: React.FC<ProgramCardProps> = ({
  data,
  stores,
  savingLabel,
  selectedStoreId
}) => {
  const [modalState, setModalState] = useState<boolean>(false);
  const [modalData, setModalData] = useState<EnrolledProgram>({});
  const [listingModalData, setListingModalData] =
    useState<ProgramStoresListingDataProps | null>(null);
  const [tierIndex, setTierIndex] = useState<number | undefined>(undefined);
  const user = getUserClient();
  const isChainUser = isChain(user?.role ?? "");
  const searchParams = useSearchParams();
  const programTimeline = getProgramTimelineQueryParam(
    searchParams.get("programTimeline") ?? ""
  );

  const openDetailsModal = (data: EnrolledProgram) => {
    setModalData(data);
    setModalState(true);
  };

  const getProgramDetails = async (
    manufacturerId: number,
    programId: number | undefined,
    programdetailId: number | undefined,
    storeId?: number | string
  ) => {
    try {
      const { data }: { data: EnrolledProgram } = await apiClient(
        `/programs/details?type=${ENTITY_TYPES_RESPONSE.STORE}&manufacturerId=${manufacturerId}&programId=${programId}&programDetailId=${programdetailId}&forStore=${storeId}&programTimeline=${programTimeline}`
      );
      console.log("api here");
      // eslint-disable-next-line prettier/prettier
      console.log(
        `/programs/details?type=${ENTITY_TYPES_RESPONSE.STORE}&manufacturerId=${manufacturerId}&programId=${programId}&programDetailId=${programdetailId}&forStore=${storeId}`
      );

      return data;
    } catch (error) {
      return null;
    }
  };

  const onClickCard = async (
    manufacturerId: number,
    index: number | undefined,
    programId?: number | undefined,
    programdetailId?: number | undefined,
    storeId?: number
  ) => {
    const data = await getProgramDetails(
      manufacturerId,
      programId,
      programdetailId,
      selectedStoreId ?? storeId
    );

    if (data) {
      setListingModalData(null);
      openDetailsModal(data);
      if (typeof index == "number") setTierIndex(index);
    }
  };

  const viewTierDetails =
    (
      manufacturerId: number,
      index: number,
      programId?: number,
      programdetailId?: number
    ) =>
    (evt: any) => {
      evt.stopPropagation();
      onClickCard(manufacturerId, index, programId, programdetailId);
    };

  const getSavingLabel = (isEnrolled?: boolean) => {
    if (savingLabel) return savingLabel;
    // if (isEnrolled) return "Estimated Earnings";
    return "Estimated Earnings";
  };

  const viewStoresListing =
    (
      programTitle: string,
      manufacturerId: number,
      programIndex: number,
      programId: number,
      programDetailId: number,
      completedComplianceEntityIds?: number[]
    ) =>
    (evt: any) => {
      evt.stopPropagation();

      setListingModalData({
        programTitle,
        programDetailId,
        programId,
        manufacturerId,
        programIndex,
        completedComplianceEntityIds
      });
    };

  return (
    <div className={`grid ${data?.length ? "gap-5 grid-col-[360px]" : ""}`}>
      <StoreDetailsModal
        isOpen={modalState}
        setIsOpen={setModalState}
        data={modalData}
        tierIndex={tierIndex}
        setTierIndex={setTierIndex}
        modalDetailAPICallDisable={true}
      />

      <ProgramStoresListingModal
        data={listingModalData}
        stores={stores}
        onClose={() => {
          setListingModalData(null);
        }}
        viewDetails={(data) => {
          onClickCard(
            data.manufacturerId,
            data.programIndex,
            data.programId,
            data.programDetailId,
            data.storeId
          );
        }}
      />

      {data?.length ? (
        data?.map((store: ProgramListingCard, index) => (
          <Card
            key={`store-card-${index}`}
            onClick={() => {
              if (store.manufacturer?.id && !isChainUser)
                onClickCard(store.manufacturer.id, undefined);
            }}
            className={`min-w-full sm:min-h-80 ${!isChainUser ? "cursor-pointer" : ""}`}
          >
            <div className="flex items-center justify-between">
              {/* Manufacturer Avatar */}
              <ManufacturerAvatar
                large={true}
                user={store.manufacturer}
                imageClass="w-[52px] h-[52px]"
                subText={
                  store.programs?.length > 0 &&
                  store.programs[0].startDate &&
                  store.programs[0].endDate
                    ? `${getNumericDateString(store.programs[0].startDate)} - ${getNumericDateString(store.programs[0].endDate)}`
                    : undefined
                }
              />
            </div>
            {/* Sale Info */}
            <ProgramSaleInfo
              totalSavings={formatNumber(
                store.salesData?.totalSavings?.amount ?? 0
              )}
              savingLabel={getSavingLabel(store.isEnrolled)}
              showEstimatedWarning={store?.manufacturer?.authorized == false}
              totalSavingsOpportunity={
                store?.programs?.some(
                  (pr: DistributorProgram) => !pr.complianceStatus
                )
                  ? formatNumber(store.salesData?.totalOppSavings?.amount ?? 0)
                  : undefined
              }
            />

            {/* Programs */}
            {store.programs?.length && store.programs?.length > 0 ? (
              <div className="mt-4 mb-2 max-h-48 overflow-y-auto">
                {store.programs?.map((program, index) => (
                  <StoreProgramInfo
                    key={index}
                    label={program.additionalInfo.title}
                    showIcon={program.complianceStatus}
                    showValue={false}
                    value={
                      isChainUser && !selectedStoreId
                        ? `${program.completedComplianceEntityIds?.length}/${stores?.length}`
                        : ""
                    }
                    isChainUser={isChainUser && !selectedStoreId}
                    viewTierDetails={
                      isChainUser && !selectedStoreId
                        ? viewStoresListing(
                            program.additionalInfo.title,
                            store.manufacturer.id as number,
                            index,
                            program.id,
                            program.programDetailId,
                            program.completedComplianceEntityIds
                          )
                        : viewTierDetails(
                            store.manufacturer.id as number,
                            index,
                            program.id,
                            program.programDetailId
                          )
                    }
                    showCustomPopOver={program?.isRebateBasedOnListPrice}
                  />
                ))}
              </div>
            ) : null}
          </Card>
        ))
      ) : (
        <Card className="w-full">
          <div
            id="distributor-programs"
            className="flex flex-wrap gap-4 w-full"
          >
            <p className="text-center w-full text-heading-very-light text-sm">
              {MESSAGES.NO_RECORDS_FOUND}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default ProgramCard;
