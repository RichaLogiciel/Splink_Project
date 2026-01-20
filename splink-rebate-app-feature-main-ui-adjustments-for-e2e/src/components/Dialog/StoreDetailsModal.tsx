// Import Core functionality/component
// Import Core functionality/component
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Disclosure
} from "@headlessui/react";
import Image from "next/image";

// Import Components
import ManufacturerAvatar from "@/components/Avatar/ManufacturerAvatar";
import DynamicSemiPieChart from "@/components/SemiPieChartCustom/DynamicSemiPieChart";
import React, { useEffect, useMemo, useRef, useState } from "react";
// import { useRouter, useSearchParams } from "next/navigation";

// Import Util functions
import { calcPercentage } from "@/utils/calculations";
import { formatNumber } from "@/utils/numberFormatter";

// Chevron icon for accordion - using SVG directly
const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M19.5 8.25l-7.5 7.5-7.5-7.5"
    />
  </svg>
);

// Sorting mode flag: Set to true for Option 2 (prioritize programs with purchases)
// Set to false for Option 1 (sort all programs by completion regardless of purchases)
const SORT_BY_PURCHASE_ONLY = true; // Change this flag to switch between sorting modes

// AccordionItem Component - Renders PieWithoutLabel outside Disclosure to prevent remounting
interface AccordionItemProps {
  programKey: string | number;
  programName: string;
  tiers: ManufacturerTierDetail[];
  tierCounts: { completed: number; total: number };
  isOpen: boolean;
  setOpenProgramIds: React.Dispatch<React.SetStateAction<Set<string | number>>>;
  accordionCloseRefs: React.MutableRefObject<Map<string | number, () => void>>;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  pieChart: React.ReactNode;
  renderTierCard: (
    tierDetail: ManufacturerTierDetail,
    tierIndex: number
  ) => React.ReactNode;
  manufacturerData: Manufacturer | null;
  isParent: boolean;
}

const AccordionItem = React.memo<AccordionItemProps>(
  ({
    programKey,
    programName,
    tiers,
    tierCounts,
    isOpen,
    setOpenProgramIds,
    accordionCloseRefs,
    scrollContainerRef,
    pieChart,
    renderTierCard,
    manufacturerData,
    isParent
  }) => {
    const user = getUserClient();
    const isManufacturerUser = isManufacturer(user?.role || "");
    console.log("isManufacturerUser", isManufacturerUser);

    console.log("---programname---", programName);

    // Use isOpen directly for defaultOpen to ensure it reflects the current state
    // This ensures accordions start open when openProgramIds includes them
    const [hasInitialized, setHasInitialized] = React.useState(false);

    // Ref to store the close function from Disclosure render prop
    const closeRef = React.useRef<(() => void) | null>(null);

    // Mark as initialized after first render
    React.useEffect(() => {
      setHasInitialized(true);
    }, []);

    // Sync internal state with external state - close accordion if isOpen becomes false
    // Note: We don't programmatically open because Headless UI doesn't provide an open() function
    // The accordion will start in the correct state via defaultOpen, and users can toggle it
    React.useEffect(() => {
      if (!isOpen && closeRef.current && hasInitialized) {
        // External state says closed, but internal might be open - close it
        closeRef.current();
      }
    }, [isOpen, hasInitialized]);

    // Use defaultOpen with isOpen value to ensure correct initial state
    // Key is stable (programKey) so component won't remount unnecessarily
    return (
      <Disclosure
        as="div"
        defaultOpen={isOpen}
        key={programKey}
        data-accordion-key={programKey}
      >
        {({ open, close }) => {
          // Update ref with close function and store in accordionCloseRefs
          closeRef.current = close;
          accordionCloseRefs.current.set(programKey, close);

          return (
            <>
              <Disclosure.Button
                onClick={() => {
                  const wasOpen = open;

                  setOpenProgramIds((prev) => {
                    const newSet = new Set(prev);
                    if (!open) {
                      newSet.add(programKey);
                    } else {
                      newSet.delete(programKey);
                    }
                    return newSet;
                  });

                  // Scroll to accordion immediately on click (before panel expands/collapses)
                  // Use requestAnimationFrame to ensure DOM is ready
                  requestAnimationFrame(() => {
                    setTimeout(
                      () => {
                        if (scrollContainerRef.current) {
                          const container = scrollContainerRef.current;
                          const accordionElement = container.querySelector(
                            `[data-accordion-key="${programKey}"]`
                          ) as HTMLElement;

                          if (accordionElement) {
                            const containerRect =
                              container.getBoundingClientRect();
                            const accordionRect =
                              accordionElement.getBoundingClientRect();
                            const visualOffset =
                              accordionRect.top - containerRect.top;
                            const targetScrollTop =
                              container.scrollTop + visualOffset;

                            container.scrollTo({
                              top: targetScrollTop
                              // behavior: "smooth"
                            });
                          }
                        }
                      },
                      wasOpen ? 0 : 0
                    ); // Small delay when opening to account for panel expansion
                  });
                }}
                className={`flex w-full justify-between items-center rounded-lg px-4 py-3 border text-left text-sm font-medium  focus:outline-none accordion-button ${tierCounts.completed === tierCounts.total ? "border-green bg-[#22c55e0d] text-green" : "bg-gray-50 hover:bg-gray-100 text-heading-light"} ${isParent ? "parent-program" : ""}`}
              >
                <span className="text-sm font-semibold">{programName}</span>
                <div className="flex items-center gap-2">
                  {/* Pre-rendered Pie Chart to prevent remounting */}
                  {pieChart}
                  <span
                    className={`text-xs font-semibold ${tierCounts.completed === tierCounts.total ? "text-green" : "text-heading-very-light"}`}
                  >
                    {tierCounts.completed}/{tierCounts.total}
                  </span>
                  <ChevronDownIcon
                    className={`${
                      open ? "rotate-180 transform" : ""
                    } h-5 w-5 text-heading-light transition-transform`}
                  />
                </div>
              </Disclosure.Button>
              <Disclosure.Panel
                className={`px-2 sm:px-3 pt-2 sm:pt-4 pb-2 ${tierCounts.completed === tierCounts.total ? "bg-light-green/5" : ""}`}
              >
                <div className="grid grid-col-fit-[185px] gap-4">
                  {tiers.map((tierDetail, tierIndex) => {
                    // Calculate the original index in the full tierDetails array
                    const originalIndex =
                      manufacturerData?.tierDetails?.findIndex(
                        (td) => td === tierDetail
                      ) ?? -1;
                    return renderTierCard(
                      tierDetail,
                      originalIndex >= 0 ? originalIndex : tierIndex
                    );
                  })}
                </div>
              </Disclosure.Panel>
            </>
          );
        }}
      </Disclosure>
    );
  }
);

AccordionItem.displayName = "AccordionItem";

// ProgramsAccordionSection Component - Encapsulates all accordion logic to prevent parent re-renders
interface ProgramsAccordionSectionProps {
  groupedPrograms: Map<string | number, ManufacturerTierDetail[]>;
  programTierCounts: Map<string | number, { completed: number; total: number }>;
  shouldShowAccordions: boolean;
  pieCharts: Map<string | number, React.ReactNode>;
  renderTierCard: (
    tierDetail: ManufacturerTierDetail,
    tierIndex: number
  ) => React.ReactNode;
  manufacturerData: Manufacturer | null;
  extractProgramName: (title: string) => string;
  sortedPrograms: Array<[string | number, ManufacturerTierDetail[]]>;
}

const ProgramsAccordionSection = React.memo<ProgramsAccordionSectionProps>(
  ({
    groupedPrograms,
    programTierCounts,
    shouldShowAccordions,
    pieCharts,
    renderTierCard,
    manufacturerData,
    extractProgramName,
    sortedPrograms
  }) => {
    // Initialize accordion state - incomplete accordions open by default, completed ones closed
    // Compute initial state synchronously so AccordionItems get correct isOpen value on first render
    const getInitialOpenProgramIds = (): Set<string | number> => {
      if (!manufacturerData?.tierDetails?.length || !shouldShowAccordions) {
        return new Set();
      }
      // Only incomplete programs open by default, completed programs stay closed
      const incompleteProgramKeys = Array.from(groupedPrograms.keys()).filter(
        (programKey) => {
          const tierCounts = programTierCounts.get(programKey) || {
            completed: 0,
            total: 0
          };
          // Program is incomplete if not all tiers are completed
          return tierCounts.completed !== tierCounts.total;
        }
      );
      return new Set(incompleteProgramKeys);
    };

    const [openProgramIds, setOpenProgramIds] = useState<Set<string | number>>(
      getInitialOpenProgramIds
    );
    // Track if we've initialized with data to force remount of AccordionItems when data loads
    const [hasInitialized, setHasInitialized] = useState(false);
    const accordionCloseRefs = useRef(new Map<string | number, () => void>());
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Update accordion state when data changes
    useEffect(() => {
      if (!manufacturerData?.tierDetails?.length) {
        setOpenProgramIds(new Set());
        setHasInitialized(false);
        return;
      }

      if (!shouldShowAccordions) {
        // No accordions, so no open state needed
        setOpenProgramIds(new Set());
        setHasInitialized(false);
      } else {
        // Only incomplete programs open by default, completed programs stay closed
        const incompleteProgramKeys = Array.from(groupedPrograms.keys()).filter(
          (programKey) => {
            const tierCounts = programTierCounts.get(programKey) || {
              completed: 0,
              total: 0
            };
            // Program is incomplete if not all tiers are completed
            return tierCounts.completed !== tierCounts.total;
          }
        );
        setOpenProgramIds(new Set(incompleteProgramKeys));
        // Mark as initialized to force remount of AccordionItems with correct defaultOpen
        if (!hasInitialized && incompleteProgramKeys.length > 0) {
          setHasInitialized(true);
        }
      }
    }, [
      manufacturerData?.tierDetails,
      groupedPrograms,
      programTierCounts,
      shouldShowAccordions,
      hasInitialized
    ]);

    if (!shouldShowAccordions) {
      // No accordion: render tiers directly (1 program OR 2 programs with <= 3 tiers)
      // Flatten sortedPrograms to get all tiers in sorted order
      const sortedTiers = sortedPrograms.flatMap(([, tiers]) => tiers);
      return (
        <div className="grid grid-col-fit-[185px] gap-4 max-h-60 [@media(min-height:600px)]:max-h-[50vh] [@media(min-height:800px)]:max-h-[50vh] overflow-y-auto pr-2.5 -mr-2.5">
          {sortedTiers.map((tierDetail, tierIndex) => {
            // Find original index for proper tier card rendering
            const originalIndex =
              manufacturerData?.tierDetails?.findIndex(
                (td) => td === tierDetail
              ) ?? tierIndex;
            return renderTierCard(tierDetail, originalIndex);
          })}
        </div>
      );
    }

    // Multiple programs: render with accordions
    return (
      <div
        ref={scrollContainerRef}
        className="space-y-2 max-h-60 [@media(min-height:600px)]:max-h-[50vh] [@media(min-height:800px)]:max-h-[50vh] overflow-y-auto pr-2.5 -mr-2.5"
      >
        {sortedPrograms.map(([programKey, tiers]) => {
          // Get program name for display
          const programName =
            typeof programKey === "number"
              ? extractProgramName(tiers[0]?.title || "")
              : programKey;
          const isOpen = openProgramIds.has(programKey);
          // Get tier counts for this program
          const tierCounts = programTierCounts.get(programKey) || {
            completed: 0,
            total: 0
          };
          // Get pre-rendered pie chart
          const pieChart = pieCharts.get(programKey) || null;

          // Check if this is a parent program
          const programId =
            typeof programKey === "number" ? programKey : tiers[0]?.programId;
          const hasSelfDependency = tiers.some(
            (tier) => tier.dependency_program_id === programId
          );
          const isDependencyOfOther = sortedPrograms.some(
            ([otherKey, otherTiers]) => {
              if (otherKey === programKey) {
                return false;
              }
              return otherTiers.some(
                (tier) => tier.dependency_program_id === programId
              );
            }
          );
          const isParent = hasSelfDependency || isDependencyOfOther;

          return (
            <AccordionItem
              key={`${programKey}-${hasInitialized ? "init" : "loading"}`}
              programKey={programKey}
              programName={programName}
              tiers={tiers}
              tierCounts={tierCounts}
              isOpen={isOpen}
              setOpenProgramIds={setOpenProgramIds}
              accordionCloseRefs={accordionCloseRefs}
              scrollContainerRef={scrollContainerRef}
              pieChart={pieChart}
              renderTierCard={renderTierCard}
              manufacturerData={manufacturerData}
              isParent={isParent}
            />
          );
        })}
      </div>
    );
  }
);

ProgramsAccordionSection.displayName = "ProgramsAccordionSection";

// Import Types
import {
  Manufacturer,
  ManufacturerTierDetail,
  StoreDetailsModalProps
} from "@/types/StoreTypes";

// Import Images
import GreenDollarIcon from "@/assets/icons/greenDollarIcon.svg";
import popupCloseIcon from "@/assets/icons/popupCloseIcon.svg";
import TruncatedParagraph from "@/components/Elements/TruncatedParagraph";
import { USER_ROLES } from "@/configs/roles";
import { apiClient } from "@/lib/axiosClient";
import { PROGRESS_COLORS } from "@/utils/constants";
import { getUserClient } from "@/utils/getUserClient";
import { formateRebate, getRangeFromCommaString } from "@/utils/helper";
import { isManufacturer } from "@/utils/rolesConditions";
import { useSearchParams } from "next/navigation";
import Loader from "../Loader";
import CustomPopOver from "../Popovers/CustomPopOver";
import EstimatedSavingsWarningPopOver from "../Popovers/EstimatedSavingsWarning";

const StoreDetailsModal: React.FC<StoreDetailsModalProps> = ({
  isOpen,
  setIsOpen,
  data,
  avtarCenter = false,
  setIsDetailOpen,
  storeId,
  isStoreEnrolled = false,
  modalDetailAPICallDisable = false,
  addStoreIntialToTitle = false,
  hideIncrementalEarnings = false,
  id = "store-details-modal",
  selectedWarehouseId,
  programTimeline,
  isChainPrograms = false,
  onStoreInfoUpdate,
  agreementId
}) => {
  const user = getUserClient();
  const searchParams = useSearchParams();
  const isInternal = searchParams.get("isInternal") === "true";

  const { manufacturer, totalSavings, totalOppSavings } = data;
  const [manufacturerData, setManufacturerData] = useState<Manufacturer | null>(
    null
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [storeName, setStoreName] = useState<string>("");
  const [externalStoreId, setExternalStoreId] = useState<string>("");

  const isAllCompliancesCompleted = useMemo(() => {
    // If manufacturerData is not loaded yet, return false to prevent layout shift
    if (!manufacturerData?.tierDetails) {
      return false;
    }
    return manufacturerData.tierDetails.every(
      (pro: ManufacturerTierDetail) => pro.isProgramComplianceQualified
    );
  }, [manufacturerData]);

  const isAllProgramsBasedOnListPrice = useMemo(() => {
    // If manufacturerData is not loaded yet, return false to prevent layout shift
    if (!manufacturerData?.tierDetails) {
      return false;
    }
    return manufacturerData.tierDetails.every(
      (pro: ManufacturerTierDetail) => pro.isRebateBasedOnListPrice
    );
  }, [manufacturerData]);

  // Helper function to extract program name from tier title
  const extractProgramName = (title: string): string => {
    // Remove " - Tier X" suffix if present
    const tierMatch = title.match(/^(.+?)\s*-\s*Tier\s+\d+$/i);
    if (tierMatch) {
      return tierMatch[1].trim();
    }
    // If no tier suffix, return the full title as program name
    return title.trim();
  };

  // Sort tierDetails to move Display programs to the end for manufacturer users
  const sortedTierDetails = useMemo(() => {
    if (!manufacturerData?.tierDetails?.length) {
      return [];
    }

    const isManufacturerUser = isManufacturer(user?.role || "");

    // If not manufacturer user or only one program, return as is with original indices
    if (!isManufacturerUser || manufacturerData.tierDetails.length <= 1) {
      return manufacturerData.tierDetails.map((tier, index) => ({
        ...tier,
        _originalIndex: index
      }));
    }

    // Group tiers by program name to check if there are multiple programs
    const programNames = new Set(
      manufacturerData.tierDetails.map((tier) => extractProgramName(tier.title))
    );

    // Only sort if there are multiple programs
    if (programNames.size <= 1) {
      return manufacturerData.tierDetails.map((tier, index) => ({
        ...tier,
        _originalIndex: index
      }));
    }

    // Sort: Display programs go to the end, preserving original index
    return [...manufacturerData.tierDetails]
      .map((tier, index) => ({ ...tier, _originalIndex: index }))
      .sort((a, b) => {
        const aProgramName = extractProgramName(a.title);
        const bProgramName = extractProgramName(b.title);
        const aIsDisplay = aProgramName.toLowerCase().includes("display");
        const bIsDisplay = bProgramName.toLowerCase().includes("display");

        // If both are Display or both are not Display, maintain original order
        if (aIsDisplay === bIsDisplay) {
          return 0;
        }

        // Display programs go to the end
        if (aIsDisplay) {
          return 1; // A is Display, move it to end
        }
        return -1; // B is Display, move it to end
      });
  }, [manufacturerData?.tierDetails, user?.role]);

  useEffect(() => {
    // Reset loading state when modal opens
    if (isOpen) {
      setIsLoading(true);
    }

    // Import Mock JSON file file system based on ID
    async function fetchStoreManufacturerDetails(
      id: string,
      manufacturerId: number
    ) {
      try {
        setIsLoading(true);

        // Build agreementId query parameter
        let agreementIdParam = "";
        if (agreementId !== undefined && agreementId !== null) {
          if (Array.isArray(agreementId)) {
            // Multiple agreement IDs - join with commas
            agreementIdParam = `&agreementId=${agreementId.join(",")}`;
          } else if (
            typeof agreementId === "string" &&
            agreementId.includes(",")
          ) {
            // Already comma-separated string
            agreementIdParam = `&agreementId=${agreementId}`;
          } else {
            // Single agreement ID
            agreementIdParam = `&agreementId=${agreementId}`;
          }
        }

        const { data } = await apiClient.get(
          `/store/${id}/manufacture/${manufacturerId}?isEnrolledPrograms=${isStoreEnrolled == true}&warehouseId=${selectedWarehouseId}&programTimeline=${programTimeline}&isInternal=${isInternal}${isChainPrograms ? "&isChainPrograms=true" : ""}${agreementIdParam}`
        );

        // if (res.status == "success") {
        setManufacturerData({
          ...data
        });

        // Set store name and external store ID
        if (data.storeName) {
          setStoreName(data.storeName);
        }
        if (data.externalStoreId) {
          setExternalStoreId(data.externalStoreId);
        }

        // Pass storeName and externalStoreId to parent component
        if (onStoreInfoUpdate) {
          onStoreInfoUpdate(data.storeName, data.externalStoreId);
        }

        // }
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
        const { data } = await apiClient.get(
          `/sales-rep/${user.associatedUserId}/manufacture/${manufacturerId}`
        );
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
      setIsLoading(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isOpen,
    storeId,
    data?.manufacturer?.id,
    isStoreEnrolled,
    selectedWarehouseId,
    programTimeline,
    isInternal,
    isChainPrograms
  ]);

  const getSavingsLabel = (isStoreOppLabel: boolean = false) => {
    let label = "";
    if (addStoreIntialToTitle) {
      label = "Store ";
    }

    // if (isStoreEnrolled == false) {
    //   label += "Potential Earnings";
    if (isStoreOppLabel) {
      label += "Incremental Earnings Opp.";
    } else {
      label += "Estimated Earnings";
    }
    return label;
  };

  const isAuthorized = useMemo(() => {
    // Return a consistent value during loading to prevent layout shifts
    if (isLoading) {
      return true;
    }
    return data.manufacturer?.authorized !== false;
  }, [data.manufacturer?.authorized, isLoading]);

  const getRebateAmountVal = (isEarning: boolean = true) => {
    // Return a consistent value during loading to prevent layout shifts
    // If totalSavings is 0, return incremental earnings as 0.0
    // if (
    //   isLoading ||
    //   ((totalSavings?.amount ?? 0) == 0 &&
    //     !isAllCompliancesCompleted &&
    //     !hideIncrementalEarnings)
    // ) {
    //   return "0.0";
    // } // this is not working as expected

    if (
      totalOppSavings?.amount !== undefined &&
      totalOppSavings?.amount >= 0 &&
      !isEarning
    ) {
      // return totalOppSavings.amount.toFixed(1);
      // return (totalOppSavings.amount - (totalSavings?.amount ?? 0)).toFixed(1);
      const incrementalAmount =
        totalOppSavings.amount - (totalSavings?.amount ?? 0);
      return incrementalAmount > 0 ? incrementalAmount.toFixed(1) : "0.0";
    }

    if (totalSavings?.amount !== undefined && totalSavings?.amount >= 0)
      return totalSavings.amount.toFixed(1);

    return "0.0";
  };

  // Common modal wrapper component
  const ModalWrapper = ({ children }: { children: React.ReactNode }) => (
    <Dialog
      open={isOpen}
      onClose={() => setIsOpen(false)}
      className="relative z-50"
    >
      <div
        id={id}
        className="fixed inset-0 w-screen overflow-y-auto space-y-4 bg-black bg-opacity-20 p-4"
      >
        <div className="flex min-h-full items-center justify-center">
          <DialogPanel className="max-w-2xl w-full min-h-[400px] border bg-white p-6 rounded-lg">
            <DialogTitle className="flex justify-between items-start">
              <div className="flex flex-col">
                {manufacturer && (
                  <ManufacturerAvatar
                    bold={true}
                    user={manufacturer}
                    large={true}
                    center={avtarCenter}
                  />
                )}
                {!isLoading && (storeName || externalStoreId) && (
                  <div className="mt-3 ml-1">
                    <p className="text-sm font-medium text-heading-light">
                      Store: {storeName}
                      {externalStoreId && (
                        <span className="text-xs text-heading-very-light ml-1">
                          ({externalStoreId})
                        </span>
                      )}
                    </p>
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
            {children}
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );

  // Loading state content
  if (isLoading) {
    return (
      <ModalWrapper>
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader show={true} className="relative bg-white" />
        </div>
      </ModalWrapper>
    );
  }

  // Main content when not loading
  return (
    <ModalWrapper>
      {/* Earnings Grid */}
      <div
        className={`grid gap-4 transition-all duration-300 ${isAllCompliancesCompleted || hideIncrementalEarnings ? "grid-cols-1" : "grid-cols-2"}`}
      >
        {/* Estimated Earnings */}
        <div id="estimated-earnings" className="mt-6 border rounded-lg p-3">
          <div className="flex gap-1.5 items-center">
            <Image
              height={19}
              width={19}
              src={GreenDollarIcon.src}
              alt="Total Purchase Volume Icon"
            />
            <span className="text-sm font-medium text-heading-light">
              {getSavingsLabel()}
            </span>
          </div>
          {isAuthorized ? (
            <span className="flex items-center mt-3">
              <p className="font-bold text-lg">${getRebateAmountVal()}</p>
              {isAllProgramsBasedOnListPrice && (
                <span className="inline-block ml-[7px]">
                  <CustomPopOver startFromLeft />
                </span>
              )}
            </span>
          ) : (
            <div className="flex items-center gap-1.5 mt-3">
              <span className="flex items-center">
                <p className="font-bold text-lg">${getRebateAmountVal()}</p>
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

        {/* Incremental Earnings */}
        {!isAllCompliancesCompleted && !hideIncrementalEarnings && (
          <div id="incremental-earnings" className="mt-6 border rounded-lg p-3">
            <div className="flex gap-1.5 items-center">
              <Image
                height={19}
                width={19}
                src={GreenDollarIcon.src}
                alt="Total Purchase Volume Icon"
              />
              <span className="text-sm font-medium text-heading-light">
                {getSavingsLabel(true)}
              </span>
            </div>
            <span className="flex items-center mt-3">
              <p className="font-bold text-lg">${getRebateAmountVal(false)}</p>
              {isAllProgramsBasedOnListPrice && (
                <span className="inline-block ml-[7px]">
                  <CustomPopOver startFromLeft />
                </span>
              )}
            </span>
          </div>
        )}
      </div>

      {/* Tier Details */}
      {!!sortedTierDetails?.length && (
        <div
          id="store-tiers"
          className="grid grid-col-fit-[185px] gap-4 mt-6 max-h-60 [@media(min-height:600px)]:max-h-[50vh] [@media(min-height:800px)]:max-h-[50vh] overflow-y-auto pr-2.5 -mr-2.5"
        >
          {sortedTierDetails.map((tierDetail, tierIndex) => {
            const completed =
              (tierDetail?.SKU?.completed > tierDetail?.SKU?.total &&
              tierDetail?.SKU?.total != 0
                ? tierDetail?.SKU?.total
                : tierDetail?.SKU?.completed) ?? 0;
            const total = tierDetail?.SKU?.total ?? 0;

            const semiPieChartColor = tierDetail.isProgramComplianceQualified
              ? PROGRESS_COLORS.COMPLETED
              : PROGRESS_COLORS.PENDING;

            // Use original index if available, otherwise use current index
            const originalIndex =
              (tierDetail as any)._originalIndex ?? tierIndex;

            return (
              <div
                onClick={() => {
                  setIsDetailOpen
                    ? setIsDetailOpen(originalIndex, tierDetail.title)
                    : null;
                }}
                key={`${originalIndex}-${tierDetail.title}`}
                className={`border rounded-lg p-3 ${setIsDetailOpen && "cursor-pointer"} flex flex-col justify-between ${!!tierDetail.SKU || !!tierDetail?.graph?.SKUs || !!tierDetail?.graph?.Quantity || !!tierDetail?.graph?.Spend ? "cat-sku-card" : ""}`}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-medium text-sm text-highlighted-color min-h-7">
                    {tierDetail.title} (
                    {tierDetail.fixed_rebate_amount
                      ? getRangeFromCommaString(tierDetail?.fixed_rebate_amount)
                      : formateRebate(
                          {},
                          {
                            rebate_type:
                              tierDetail.rebate_type ?? tierDetail.rebateType,
                            rebate_amount:
                              tierDetail.rebate_amount ??
                              tierDetail.rebateAmount,
                            rebate_percentage: tierDetail.rebate_percentage
                          }
                        )}
                    )
                    {!isAllProgramsBasedOnListPrice &&
                      tierDetail?.isRebateBasedOnListPrice && (
                        <span className="inline-block ml-[7px]">
                          <CustomPopOver startFromLeft />
                        </span>
                      )}
                  </span>

                  <TruncatedParagraph content={tierDetail?.overview || ""} />
                </div>

                {/* SKU Chart */}
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

                {/* Graph Charts */}
                {tierDetail?.graph &&
                  Object.keys(tierDetail?.graph || {}).map((label) => {
                    const graphData = tierDetail?.graph
                      ? tierDetail?.graph[label]
                      : "";
                    let completed = 0;
                    let total = 0;
                    const dollarSign = label == "Spend" ? "$" : "";

                    if (
                      graphData &&
                      graphData.completed !== undefined &&
                      graphData.total !== undefined
                    ) {
                      completed =
                        Number(graphData.completed) > Number(graphData.total) &&
                        Number(graphData.total) != 0
                          ? Math.round(Number(graphData.total))
                          : Math.round(Number(graphData.completed));
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
                        className="chart mt-3 cursor-pointer"
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
                            percentage={calcPercentage(completed, total)}
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
                  })}
              </div>
            );
          })}
        </div>
      )}
    </ModalWrapper>
  );
};
export default StoreDetailsModal;
