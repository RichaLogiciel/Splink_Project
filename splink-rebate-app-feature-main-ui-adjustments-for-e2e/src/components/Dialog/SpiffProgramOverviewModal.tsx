// Import Core functionality/component
import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import Image from "next/image";

// Import Components
import ManufacturerAvatar from "@/components/Avatar/ManufacturerAvatar";
import { useEffect, useMemo, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation";

// Import Util functions
import { formatNumber } from "@/utils/numberFormatter";

// Import Types
import {
  Manufacturer,
  ManufacturerTierDetail,
  StoreDetailsModalProps
} from "@/types/StoreTypes";

// Import Images
import bulbIcon from "@/assets/icons/bulbIcon.svg";
import GreenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import { USER_ROLES } from "@/configs/roles";
import { apiClient } from "@/lib/axiosClient";
import { getNumericDateString } from "@/utils/dateHelper";
import { getUserClient } from "@/utils/getUserClient";
import Loader from "../Loader";
import CustomPopOver from "../Popovers/CustomPopOver";
import EstimatedSavingsWarningPopOver from "../Popovers/EstimatedSavingsWarning";

interface SpiffProgramOverviewModalProps extends StoreDetailsModalProps {
  showTierModal?: boolean;
  programDates?: {
    startDate: string;
    endDate: string;
  };
}

const SpiffProgramOverviewModal: React.FC<SpiffProgramOverviewModalProps> = ({
  isOpen,
  setIsOpen,
  data,
  avtarCenter = false,
  setIsDetailOpen,
  storeId,
  isStoreEnrolled = false,
  modalDetailAPICallDisable = false,
  hideIncrementalEarnings = false,
  id = "spiff-program-overview-modal",
  showTierModal = false,
  programDates
}) => {
  const user = getUserClient();
  const { manufacturer, totalSavings, totalOppSavings } = data;
  const [manufacturerData, setManufacturerData] = useState<Manufacturer | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const isAllCompliancesCompleted = useMemo(() => {
    return manufacturerData?.tierDetails?.every(
      (pro: ManufacturerTierDetail) => pro.isProgramComplianceQualified
    );
  }, [manufacturerData]);

  const isAllProgramsBasedOnListPrice = useMemo(() => {
    return manufacturerData?.tierDetails?.every(
      (pro: ManufacturerTierDetail) => pro.isRebateBasedOnListPrice
    );
  }, [manufacturerData]);

  const [isTierDetailsOpen, setIsTierDetailsOpen] = useState(false);
  const [selectedTier, setSelectedTier] =
    useState<ManufacturerTierDetail | null>(null);

  // Helper function to generate unique key for tier comparison
  const getTierKey = (tier: ManufacturerTierDetail) => {
    return `${tier.title}-${tier.overview}-${tier.rebateAmount}-${tier.rebateType}`;
  };

  // Common function to filter unique tiers and remove test tiers
  const filterUniqueTiers = (tiers: ManufacturerTierDetail[]) => {
    return tiers.filter(
      (
        tier: ManufacturerTierDetail,
        index: number,
        self: ManufacturerTierDetail[]
      ) => {
        const tierKey = getTierKey(tier);
        const firstIndex = self.findIndex((t) => getTierKey(t) === tierKey);
        return (
          index === firstIndex && !tier.title?.toLowerCase().includes("test")
        );
      }
    );
  };

  useEffect(() => {
    // Import Mock JSON file file system based on ID
    async function fetchStoreManufacturerDetails(
      id: string,
      manufacturerId: number
    ) {
      try {
        setIsLoading(true);

        const { data: unfilteredData } = await apiClient.get(
          `/store/${id}/manufacture/${manufacturerId}?isEnrolledPrograms=${isStoreEnrolled == true}`
        );

        const uniqueTiers = filterUniqueTiers(
          unfilteredData.filter.tierDetails
        );

        const data = {
          ...unfilteredData,
          filter: {
            ...unfilteredData.filter,
            tierDetails: uniqueTiers
          }
        };

        setManufacturerData({
          ...data.filter
        });
      } catch (e) {
        console.error("error", e);
        setManufacturerData(null);
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchSalesRepProgramDetails(manufacturerId: number) {
      try {
        setIsLoading(true);

        if (!user) {
          return;
        }
        const { data: unfilteredData } = await apiClient.get(
          `/sales-rep/${user.associatedUserId}/manufacture/${manufacturerId}`
        );

        // Apply the same filtering logic
        const uniqueTiers = filterUniqueTiers(unfilteredData.tierDetails);
        const data = {
          ...unfilteredData,
          tierDetails: uniqueTiers
        };

        setManufacturerData({
          ...data
        });
      } catch (e) {
        console.error("error", e);
        setManufacturerData(null);
      } finally {
        setIsLoading(false);
      }
    }

    if (
      isOpen &&
      storeId &&
      data?.manufacturer?.id &&
      !modalDetailAPICallDisable
    ) {
      fetchStoreManufacturerDetails(storeId, data?.manufacturer?.id);
    } else if (
      isOpen &&
      user &&
      user.role == USER_ROLES.DISTRIBUTOR_SALES_REP
    ) {
      fetchSalesRepProgramDetails(manufacturer?.id ?? 0);
    }

    if (modalDetailAPICallDisable && manufacturer) {
      setManufacturerData(manufacturer);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, modalDetailAPICallDisable]);

  const isAuthorized = data.manufacturer?.authorized == false ? false : true;

  const getRebateAmountVal = (isEarning: boolean = true) => {
    if (
      totalOppSavings?.amount !== undefined &&
      totalOppSavings?.amount >= 0 &&
      !isEarning
    )
      return formatNumber(totalOppSavings.amount - (totalSavings?.amount ?? 0));

    if (totalSavings?.amount !== undefined && totalSavings?.amount >= 0)
      return formatNumber(totalSavings.amount, !showTierModal);

    return "";
  };

  return (
    <>
      <Dialog
        open={isOpen}
        onClose={() => {
          setIsOpen(false);
          setIsTierDetailsOpen(false);
        }}
        className="relative z-50"
      >
        {/* fixed inset-0 w-screen overflow-y-auto p-4 */}
        <div
          id={id}
          className={`fixed inset-0 w-screen overflow-y-auto space-y-4 bg-black bg-opacity-20 p-4 ${isTierDetailsOpen ? "hidden" : ""}`}
        >
          <div className="flex min-h-full items-center justify-center">
            <DialogPanel className="max-w-2xl w-full min-h-[250px] border bg-white p-4 sm:p-6 rounded-lg">
              <DialogTitle className="flex justify-between items-start sm:items-center">
                {manufacturer && (
                  <div className="flex items-center flex-wrap sm:flex-nowrap gap-2">
                    <ManufacturerAvatar
                      bold={true}
                      user={manufacturer}
                      large={true}
                      center={avtarCenter}
                    />
                    {programDates?.startDate && programDates?.endDate && (
                      <div className="flex items-center text-[13px] text-highlighted-color mt-1">
                        (
                        <span className="font-medium">
                          <span className="font-medium mr-1">Duration:</span>
                          {getNumericDateString(programDates?.startDate)}
                        </span>
                        <span className="font-normal mx-1">-</span>
                        <span className="font-medium">
                          {getNumericDateString(programDates?.endDate)}
                        </span>
                        )
                      </div>
                    )}
                  </div>
                )}
                <Image
                  onClick={() => setIsOpen(false)}
                  className="cursor-pointer"
                  src={popupCloseIcon.src}
                  alt="popupCloseIcon"
                  height={13}
                  width={13}
                />
              </DialogTitle>
              <div
                className={`grid gap-4 ${hideIncrementalEarnings ? "grid-cols-1" : "grid-cols-2"}`}
              >
                <div className="mt-5 border rounded-lg p-3">
                  <div className="flex gap-1.5 items-center">
                    <Image
                      height={19}
                      width={19}
                      src={GreenDollarIcon.src}
                      alt="Total Purchase Volume Icon"
                    />
                    <span className="text-sm font-medium text-heading-light">
                      My Earnings
                    </span>
                  </div>
                  {isAuthorized ? (
                    <span className="flex items-center mt-3">
                      <p className="font-bold text-lg">
                        ${getRebateAmountVal()}
                      </p>
                      {isAllProgramsBasedOnListPrice && (
                        <span className="inline-block ml-[7px]">
                          <CustomPopOver startFromLeft />
                        </span>
                      )}
                    </span>
                  ) : (
                    <div className="flex items-center gap-1.5 mt-3">
                      <span className="flex items-center">
                        <p className="font-bold text-lg">
                          ${getRebateAmountVal()}
                        </p>
                        {isAllProgramsBasedOnListPrice && (
                          <span className="inline-block ml-[7px]">
                            <CustomPopOver startFromLeft />
                          </span>
                        )}
                      </span>
                      <EstimatedSavingsWarningPopOver />
                    </div>
                  )}
                </div>
                {!hideIncrementalEarnings && (
                  <div className="mt-5 border rounded-lg p-3">
                    <div className="flex gap-1.5 items-center">
                      <span className="text-sm font-medium text-heading-light">
                        Earnings Opportunity
                      </span>
                    </div>
                    {isAuthorized ? (
                      <span className="flex items-center  mt-3">
                        <p className="font-bold text-lg">
                          {data.totalOppSavings?.amount}
                        </p>
                        {isAllProgramsBasedOnListPrice && (
                          <span className="inline-block ml-[7px]">
                            <CustomPopOver startFromLeft />
                          </span>
                        )}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1.5 mt-3">
                        <span className="flex items-center">
                          <p className="font-bold text-lg">
                            {data.totalOppSavings?.amount}
                          </p>
                          {isAllProgramsBasedOnListPrice && (
                            <span className="inline-block ml-[7px]">
                              <CustomPopOver startFromLeft />
                            </span>
                          )}
                        </span>
                        <EstimatedSavingsWarningPopOver />
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* {programDates?.startDate && programDates?.endDate && (
                <div className="border rounded-lg p-3 flex items-center gap-6 text-sm mt-5">
                  <p className="font-medium">
                    Start Date:
                    <span className="font-normal ml-1">
                      {getNumericDateString(programDates?.startDate)}
                    </span>
                  </p>
                  <p className="font-medium">
                    End Date:
                    <span className="font-normal ml-1">
                      {getNumericDateString(programDates?.endDate)}
                    </span>
                  </p>
                </div>
              )} */}
              <Loader show={isLoading} className="relative bg-white mt-6" />

              {!isLoading && !!manufacturerData?.tierDetails?.length && (
                <>
                  <div
                    id="store-tiers"
                    className="grid grid-col-fit-[185px] gap-4 mt-5 max-h-60 [@media(min-height:600px)]:max-h-[25vh] [@media(min-height:800px)]:max-h-[30vh] overflow-y-auto pr-2.5 -mr-2.5"
                  >
                    {manufacturerData?.tierDetails.map(
                      (tierDetail, tierIndex) => {
                        return (
                          <div
                            onClick={() => {
                              if (showTierModal) {
                                setSelectedTier(tierDetail);
                                setIsTierDetailsOpen(true);
                              }
                            }}
                            key={`${tierIndex}-${tierDetail.title}`}
                            className={`border rounded-lg p-3 ${showTierModal && "cursor-pointer"} flex flex-col justify-between`}
                          >
                            <div className="flex flex-col gap-1">
                              <span className="font-medium text-sm text-highlighted-color">
                                {tierDetail.overview}
                              </span>
                              {/* <span className="font-medium text-sm text-highlighted-color">
                                {tierDetail.title?.replaceAll("SPIFF - ", "")} -
                                Earn
                                <span className="mx-1 inline-block">
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
                                </span>
                                per store compliance
                                {!isAllProgramsBasedOnListPrice &&
                                  tierDetail?.isRebateBasedOnListPrice && (
                                    <span className="inline-block ml-[7px]">
                                      <CustomPopOver startFromLeft />
                                    </span>
                                  )}
                              </span> */}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                  {manufacturerData?.tierDetails.length > 0 &&
                  data?.totalSavings?.amount &&
                  data?.totalSavings?.amount > 0 ? (
                    <div className="flex gap-2 mt-5 bg-blue-bg p-2 rounded-md items-center">
                      <Image
                        src={bulbIcon.src}
                        alt="Total Purchase Volume Icon"
                        height={11}
                        width={11}
                      />
                      <span className="font-semibold text-xs text-heading-blue">
                        You are eligible to earn this SPIFF across all stores
                      </span>
                    </div>
                  ) : null}
                </>
              )}
            </DialogPanel>
          </div>
        </div>
      </Dialog>
      {/* {showTierModal && (
        <SpiffTierDetailsModal
          isOpen={isTierDetailsOpen}
          setIsOpen={setIsTierDetailsOpen}
          data={data}
          manufacturerData={manufacturerData}
          category={category}
        />
      )} */}
    </>
  );
};
export default SpiffProgramOverviewModal;
