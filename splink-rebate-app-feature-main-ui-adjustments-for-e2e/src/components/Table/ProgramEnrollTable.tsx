"use client";
import React, { useMemo, useState } from "react";

// Import Components
import ManufacturerAvatar from "../Avatar/ManufacturerAvatar";
import ProgramTypeModal from "../Dialog/ProgramTypeModal";
import StoreDetailsModal from "../Dialog/StoreDetailsModal";
import TierDetailModal from "../Dialog/TierDetailModal";
// Import Util functions
import { apiClient } from "../../lib/axiosClient";
import { calcPercentage } from "../../utils/calculations";
import {
  formateRebate,
  isOrderAndCartFeatureEnabled
} from "../../utils/helper";
import { formatNumber } from "../../utils/numberFormatter";
import PieWithoutLabel from "../PieChartCustom/PieWithoutLabel";

// Import Types
import { MESSAGES } from "../../configs/messages";
import {
  EnrolledProgram,
  GroupedPrograms,
  ProgramEnrollTableProps,
  TierDetailsModalData
} from "../../types/StoreTypes";

// Import Constants
import Image from "next/image";
import greyInfoIcon from "../../assets/icons/greyInfoIcon.svg";
import Checkbox from "../../core-ui/Checkbox";
import { useWindowWidth } from "../../utils/clientHelper";
import { getUserClient } from "../../utils/getUserClient";
import {
  isDistributor,
  isDistributorSalesRep
} from "../../utils/rolesConditions";
import { ENTITY_TYPES_RESPONSE } from "../../views/Distributor/programConstants";

// Default data for the EnrolledProgram type
const defaultEnrolledProgram: EnrolledProgram = {
  manufacturer: {
    id: 1500,
    avatar: "",
    name: "",
    additionalInfo: {
      note: "No additional requirements",
      products: [
        {
          image: "",
          name: "",
          extraInfo: ""
        }
      ]
    },
    tierDetails: [
      {
        title: "",
        SKU: {
          completed: 0,
          total: 0
        }
      }
    ]
  },
  programCompliance: {
    total: 10,
    completed: 5
  },
  purchaseVolume: {
    amount: 1000,
    yoy: 10
  },
  totalSavings: {
    amount: 200,
    yoy: 5
  }
};

const ProgramEnrollTable: React.FC<ProgramEnrollTableProps> = ({
  programs,
  displaySavingsColumn = true,
  savingsOpp = false,
  storeId,
  programTimeline,
  chainData,
  chainStoresData,
  isChainStoreProgram,
  isEnrolled,
  showEnrollButton,
  selectedProgramIds,
  onProgramSelectionChange,
  showCheckboxes = false,
  onAgreementSelection,
  onEllipsisClick,
  agreementInfo = [],
  manufacturerAgreementSelections,
  onManufacturerAgreementChange,
  onSelectAll,
  isSelectAllChecked = false,
  processingManufacturerIds,
  id = "enrolled-programs-table"
}) => {
  const windowWidth = useWindowWidth();
  const [expandedStore, setExpandedStore] = useState<number | null>(null);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const processingSet = useMemo(
    () => new Set(processingManufacturerIds ?? []),
    [processingManufacturerIds]
  );

  // Static pending icon component (hourglass)
  const PendingIcon = () => (
    <svg
      className="h-4 w-4 text-amber-500"
      fill="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M6 2v6h.01L6 8.01 10 12l-4 4 .01.01H6V22h12v-5.99h-.01L18 16l-4-4 4-3.99-.01-.01H18V2H6zm10 14.5V20H8v-3.5l4-4 4 4zm-4-5l-4-4V4h8v3.5l-4 4z" />
    </svg>
  );

  const [modalState, setModalState] = useState<boolean>(false);
  const [modalData, setModalData] = useState<EnrolledProgram>(
    defaultEnrolledProgram
  );
  const [modalAgreementIds, setModalAgreementIds] = useState<
    string | undefined
  >(undefined);

  const handlePopup = (data: EnrolledProgram) => {
    setModalData(data);

    // Get agreement IDs for this manufacturer from agreementInfo
    if (data?.manufacturer?.id && agreementInfo.length > 0) {
      const manufacturerAgreement = agreementInfo.find(
        (info) => info.manufacturer_id === data?.manufacturer?.id
      );

      if (manufacturerAgreement && manufacturerAgreement.agreementInfo) {
        // Get all agreement IDs (both enrolled and available)
        const agreementIds = manufacturerAgreement.agreementInfo.map(
          (agreement: { id: number }) => agreement.id
        );

        if (agreementIds.length > 0) {
          // Join with commas for API
          setModalAgreementIds(agreementIds.join(","));
        } else {
          setModalAgreementIds(undefined);
        }
      } else {
        setModalAgreementIds(undefined);
      }
    } else {
      setModalAgreementIds(undefined);
    }

    setModalState(true);
  };

  // tier details modal
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [tierDetails, setTierDetails] = useState<TierDetailsModalData | null>(
    null
  );
  const [programDetailsData, setProgramDetailsData] =
    useState<EnrolledProgram | null>(null);

  const [selectedManufacturer, setSelectedManufacturer] = useState<any>(null);
  const [isManfModalOpen, setIsManfModalOpen] = useState(false);
  const [selectedPrograms, setSelectedPrograms] = useState<any[]>([]);

  const user = getUserClient();
  const showDistributorCode = isDistributor(user?.role || "");

  // Helper function to get chain programs for a specific manufacturer
  const getChainProgramsForManufacturer = (manufacturerId: number) => {
    if (!chainData || !chainData.programs) {
      return [];
    }

    return chainData.programs.filter(
      (program: any) =>
        program.manufacturer && program.manufacturer.id === manufacturerId
    );
  };

  const getProgramDetails = async (
    manufacturerId: number,
    programId: number | undefined,
    programdetailId: number | undefined
  ) => {
    try {
      const { data }: { data: EnrolledProgram } = await apiClient(
        `/programs/details?type=${ENTITY_TYPES_RESPONSE.STORE}&manufacturerId=${manufacturerId}&programId=${programId}&programDetailId=${programdetailId}&forStore=${storeId}&programTimeline=${programTimeline}&ischainPrograms=${isChainStoreProgram}`
      );
      return data;
    } catch (error) {
      return null;
    }
  };

  const handleTierClick = async (index: number, tierName: string) => {
    const data = await getProgramDetails(
      modalData?.manufacturer?.id ?? 0,
      undefined,
      undefined
    );
    setProgramDetailsData(data);

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
        isRebateBasedOnListPrice: selectedTier?.isRebateBasedOnListPrice,
        fixed_rebate_amount: selectedTier?.fixed_rebate_amount
      };

      if (selectedTier.SKU) {
        newTierDetails.skus = {
          total: selectedTier.SKU.total,
          completed: selectedTier.SKU.completed
        };
      }
      setTierDetails(newTierDetails);
      setIsDetailOpen(true);
      setModalState(false);
    }
  };

  const handleTierClose = (val: boolean, openParentModal?: boolean) => {
    setIsDetailOpen(val);
    if (openParentModal) {
      setModalState(true);
    }
  };

  const isSalesRep = isDistributorSalesRep(user?.role ?? "");

  // Helper to check if programs is grouped
  const isGrouped =
    Array.isArray(programs) &&
    programs.length > 0 &&
    (programs[0] as any).manufacturer &&
    Array.isArray((programs[0] as any).programs);

  // Helper to get unique program ID
  const getProgramId = (program: EnrolledProgram, index: number): number => {
    // Use manufacturer.id as the unique identifier
    // If multiple programs from same manufacturer, use index as fallback
    return program.manufacturer?.id ?? index;
  };

  // Helper to handle checkbox change - no API calls, just toggle selection
  const handleCheckboxChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    program: EnrolledProgram,
    index: number
  ) => {
    e.stopPropagation(); // Prevent row click

    const programId = getProgramId(program, index);
    const isChecked = e.target.checked;

    if (onProgramSelectionChange) {
      onProgramSelectionChange(programId, isChecked);
    }
  };

  // Helper to check if program is selected
  const isProgramSelected = (
    program: EnrolledProgram,
    index: number
  ): boolean => {
    if (!selectedProgramIds || !program.manufacturer?.id) return false;
    const programId = getProgramId(program, index);
    return selectedProgramIds.has(programId);
  };

  // Helper to get agreement count for a manufacturer
  const getAgreementCount = (manufacturerId: number): number => {
    const manufacturerAgreement = agreementInfo.find(
      (info) => info.manufacturer_id === manufacturerId
    );

    if (!manufacturerAgreement) {
      return 0;
    }

    // Filter by status based on isEnrolled
    const filteredAgreements = manufacturerAgreement.agreementInfo.filter(
      (agreement) => {
        const matches = isEnrolled
          ? agreement.status === "enrolled"
          : agreement.status === "available";
        return matches;
      }
    );

    return filteredAgreements.length;
  };

  // Helper to get selected agreement count text for display beneath manufacturer name
  const getSelectedAgreementText = (
    manufacturerId: number
  ): string | undefined => {
    if (!manufacturerId) return undefined;
    if (!selectedProgramIds) return undefined;

    // Check if this manufacturer is selected
    const isSelected = selectedProgramIds.has(manufacturerId);
    if (!isSelected) {
      return undefined;
    }

    // Get total agreement count
    const totalCount = getAgreementCount(manufacturerId);
    if (totalCount === 0) {
      return undefined;
    }

    // Get selected agreement count
    const selectedAgreements =
      manufacturerAgreementSelections?.get(manufacturerId);
    const selectedCount = selectedAgreements?.size ?? 0;

    // Always show the count, even if 0 (user hasn't selected agreements in modal yet)
    return `${selectedCount}/${totalCount} selected`;
  };

  // Helper to get agreement count and "All selected" pill for "Agreements available" column
  const getAgreementSelectionDisplay = (
    manufacturerId: number
  ): { count: string; showAllSelected: boolean } => {
    const totalCount = getAgreementCount(manufacturerId);
    const isSelected = selectedProgramIds?.has(manufacturerId);

    if (!isSelected || totalCount < 2) {
      return { count: totalCount.toString(), showAllSelected: false };
    }

    // Get selected agreement count
    const selectedAgreements =
      manufacturerAgreementSelections?.get(manufacturerId);
    const selectedCount = selectedAgreements?.size ?? 0;

    // Show "All selected" pill if all agreements are selected
    const showAllSelected = selectedCount === totalCount && totalCount >= 2;

    return { count: totalCount.toString(), showAllSelected };
  };

  return (
    <>
      <StoreDetailsModal
        isOpen={modalState}
        setIsOpen={setModalState}
        data={modalData}
        storeId={storeId}
        isStoreEnrolled={!savingsOpp}
        setIsDetailOpen={handleTierClick}
        programTimeline={programTimeline}
        isChainPrograms={isChainStoreProgram}
        agreementId={modalAgreementIds}
      />
      <TierDetailModal
        isOpen={isDetailOpen}
        setIsOpen={handleTierClose}
        data={tierDetails}
        manfData={programDetailsData?.manufacturer}
        showBackArror={true}
        showPurchasedProductsButton
        showCategorizedProducts
        isStoreEnrolled={!savingsOpp}
        canAddToWishlist={isSalesRep}
        showDistributorCode={showDistributorCode}
        storeId={
          isSalesRep &&
          isOrderAndCartFeatureEnabled(user?.parentEntityId ?? undefined)
            ? storeId
            : undefined
        }
        manufacturerId={
          isSalesRep &&
          isOrderAndCartFeatureEnabled(user?.parentEntityId ?? undefined)
            ? modalData?.manufacturer?.id?.toString()
            : undefined
        }
      />
      {/* Manufacturer Modal for grouped view */}
      {isManfModalOpen && selectedManufacturer && (
        <ProgramTypeModal
          isOpen={isManfModalOpen}
          onClose={() => {
            setIsManfModalOpen(false);
            setSelectedManufacturer(null);
          }}
          manufacturerName={selectedManufacturer.name}
          programs={
            chainData
              ? getChainProgramsForManufacturer(selectedManufacturer.id)
              : selectedPrograms
          }
          chainData={chainData}
          ischainPrograms={isChainStoreProgram}
          programsDataKeyString={
            savingsOpp ? "unenrolledPrograms" : "enrolledPrograms"
          }
        />
      )}

      {/* Render grouped by manufacturer if grouped, else flat */}
      {isGrouped ? (
        (() => {
          // Note: manufacturerSummaries contains totals for ALL programs (enrolled + unenrolled)
          // but we need separate totals for enrolled vs unenrolled tabs, so we'll use manual aggregation
          // TODO: Update API to provide enrolledTotalPurchaseVolume, unenrolledTotalPurchaseVolume etc.

          // Use manual aggregation for both enrolled and unenrolled programs
          // This ensures we get accurate totals for the specific subset being displayed

          // Fallback: Aggregate all programs for each manufacturer into a single summary row
          // This is used for unenrolled programs or when manufacturerSummaries is not available
          const manufacturerMap = new Map();
          (programs as GroupedPrograms[]).forEach((group) => {
            const mId = group.manufacturer.id;
            if (!manufacturerMap.has(mId)) {
              manufacturerMap.set(mId, {
                manufacturer: group.manufacturer,
                completed: 0,
                total: 0,
                purchaseVolume: group?.chainDetail?.totalPurchaseVolume,
                estimatedEarnings: group?.chainDetail?.totalEarnedRebate,
                earningsOpp: 0,
                allPrograms: [],
                uniquePurchaseVolumes: new Set()
              });
            }
            group.programs.forEach((program) => {
              const entry = manufacturerMap.get(mId);
              // Sum compliance
              entry.completed += program.programCompliance?.completed ?? 0;
              entry.total += program.programCompliance?.total ?? 0;

              // For purchase volume, collect unique values to avoid double counting
              const programPurchaseVolume = program.purchaseVolume?.amount ?? 0;
              if (programPurchaseVolume > 0) {
                entry.uniquePurchaseVolumes.add(programPurchaseVolume);
              }

              // Sum estimated earnings
              entry.estimatedEarnings += program.totalSavings?.amount ?? 0;
              // Sum earnings opportunity (only if not fully compliant)
              if (
                program.programCompliance?.completed !==
                program.programCompliance?.total
              ) {
                entry.earningsOpp += program.totalOppSavings?.amount ?? 0;
              }
              entry.allPrograms.push(program);
            });
          });

          // Convert to array and calculate final purchase volume
          const summaryRows = Array.from(manufacturerMap.values()).map(
            (entry) => {
              // Use the maximum unique purchase volume (assuming they represent the same total)
              // or sum them if they appear to be truly different values
              const uniqueVolumes = Array.from(entry.uniquePurchaseVolumes);
              let finalPurchaseVolume = 0;

              if (uniqueVolumes.length === 1) {
                // Only one unique value, use it
                finalPurchaseVolume = uniqueVolumes[0] as number;
              } else if (uniqueVolumes.length > 1) {
                // Multiple unique values - use the maximum as it's likely the manufacturer total
                finalPurchaseVolume = Math.max(...(uniqueVolumes as number[]));
              }

              if (entry?.purchaseVolume)
                finalPurchaseVolume = entry?.purchaseVolume;

              return {
                manufacturer: entry.manufacturer,
                completed: entry.completed,
                total: entry.total,
                purchaseVolume: finalPurchaseVolume,
                estimatedEarnings: entry.estimatedEarnings,
                earningsOpp: entry.earningsOpp,
                allPrograms: entry.allPrograms
              };
            }
          );

          return (
            <div className="w-full">
              {/* Desktop Table View */}
              <table className="hidden md:table w-full border-collapse">
                <thead className="sticky top-0 bg-white z-[1] overflow-visible">
                  <tr className="text-left text-xs text-filter-light font-medium border-b">
                    {showCheckboxes && onSelectAll && (
                      <th className="pr-4 py-3 font-medium">
                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="select-all-programs-grouped"
                            checked={isSelectAllChecked}
                            onChange={(e) => {
                              e.stopPropagation();
                              if (onSelectAll) {
                                onSelectAll();
                              }
                            }}
                            className="w-5 h-5"
                          />
                          <div
                            className="relative inline-flex items-center overflow-visible"
                            onMouseEnter={() => setShowInfoTooltip(true)}
                            onMouseLeave={() => setShowInfoTooltip(false)}
                          >
                            <Image
                              src={greyInfoIcon.src}
                              alt="Info"
                              width={16}
                              height={16}
                              className="cursor-help"
                            />
                            {showInfoTooltip && (
                              <div className="absolute left-0 top-full mt-2 z-[99999] px-3 py-2 bg-gray-800 text-white text-xs rounded whitespace-nowrap shadow-lg pointer-events-none">
                                Select checkboxes to choose program agreements
                                for {isEnrolled ? "unenrollment" : "enrollment"}
                                <div className="absolute left-4 top-0 -translate-y-full border-4 border-transparent border-b-gray-800"></div>
                              </div>
                            )}
                          </div>
                        </div>
                      </th>
                    )}
                    {showCheckboxes && !onSelectAll && (
                      <th className="pr-4 py-3 font-medium w-12"></th>
                    )}
                    <th className="pr-4 py-3 font-medium">
                      <span>Manufacturer</span>
                    </th>
                    <th className="px-4 py-3 font-medium">
                      Program Compliance
                    </th>
                    <th className="px-4 py-3 font-medium">Purchase Volume</th>
                    <th className="px-4 py-3 font-medium">
                      Estimated Earnings
                    </th>
                    {!savingsOpp && (
                      <th className="px-4 py-3 font-medium">Earnings Opp.</th>
                    )}
                    <th className="px-4 py-3 font-medium">
                      {isEnrolled
                        ? "Agreements Enrolled"
                        : "Agreements Unenrolled"}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {summaryRows.map((row: any, index: number) => {
                    // Create a mock program object for the grouped row
                    const mockProgram: EnrolledProgram = {
                      manufacturer: row.manufacturer
                    };
                    const isSelected = isProgramSelected(mockProgram, index);
                    const manufacturerId = row.manufacturer?.id;
                    const isProcessing =
                      !!manufacturerId && processingSet.has(manufacturerId);
                    return (
                      <tr
                        key={`${index}-summary`}
                        onClick={() => {
                          setSelectedManufacturer(row.manufacturer);
                          setSelectedPrograms(row.allPrograms);
                          setIsManfModalOpen(true);
                        }}
                        style={
                          isSelected
                            ? { backgroundColor: "#f0fdf4" }
                            : undefined
                        }
                        className={`border-b cursor-pointer ${
                          isSelected ? "hover:bg-green-100" : "hover:bg-gray-50"
                        }`}
                      >
                        {showCheckboxes && (
                          <td
                            className="pr-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {isProcessing ? (
                              <div className="w-5 h-5 flex items-center">
                                <PendingIcon />
                              </div>
                            ) : (
                              <Checkbox
                                id={`checkbox-grouped-${index}`}
                                checked={isSelected}
                                onChange={(e) =>
                                  handleCheckboxChange(e, mockProgram, index)
                                }
                                className="w-5 h-5"
                              />
                            )}
                          </td>
                        )}
                        <td className="pr-4 py-3">
                          <ManufacturerAvatar
                            user={row.manufacturer}
                            subText={
                              row.manufacturer?.id
                                ? getSelectedAgreementText(row.manufacturer.id)
                                : undefined
                            }
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-4">
                            <PieWithoutLabel
                              style={{ width: "24px" }}
                              percentage={calcPercentage(
                                row.completed,
                                row.total
                              )}
                            />
                            <span>
                              <strong>{row.completed}</strong>/{row.total}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          ${formatNumber(row.purchaseVolume)}
                        </td>
                        <td className="px-4 py-3">
                          ${formatNumber(row.estimatedEarnings)}
                        </td>
                        {!savingsOpp && (
                          <td className="px-4 py-3">
                            {row.earningsOpp > 0
                              ? `$${formatNumber(row.earningsOpp)}`
                              : "$0"}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          {row.manufacturer?.id
                            ? (() => {
                                const { count, showAllSelected } =
                                  getAgreementSelectionDisplay(
                                    row.manufacturer.id
                                  );
                                return (
                                  <div className="flex items-center gap-2">
                                    <span>{count}</span>
                                    {showAllSelected && (
                                      <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                                        All selected
                                      </span>
                                    )}
                                  </div>
                                );
                              })()
                            : 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Mobile Card View for Grouped Programs */}
              <div className="md:hidden space-y-4">
                {summaryRows.map((row: any, index: number) => {
                  const mockProgram: EnrolledProgram = {
                    manufacturer: row.manufacturer
                  };
                  const isSelected = isProgramSelected(mockProgram, index);
                  const manufacturerId = row.manufacturer?.id;
                  const isProcessing =
                    !!manufacturerId && processingSet.has(manufacturerId);
                  return (
                    <div
                      key={`${index}-summary-mobile`}
                      style={
                        isSelected ? { backgroundColor: "#f0fdf4" } : undefined
                      }
                      className={`border border-gray-200 rounded-lg p-4 cursor-pointer ${
                        isSelected ? "hover:bg-green-100" : "hover:bg-gray-50"
                      }`}
                      onClick={() => {
                        setSelectedManufacturer(row.manufacturer);
                        setSelectedPrograms(row.allPrograms);
                        setIsManfModalOpen(true);
                      }}
                    >
                      <div className="flex items-center justify-between mb-3">
                        {showCheckboxes && (
                          <div onClick={(e) => e.stopPropagation()}>
                            {isProcessing ? (
                              <div className="w-5 h-5 flex items-center">
                                <PendingIcon />
                              </div>
                            ) : (
                              <Checkbox
                                id={`checkbox-grouped-mobile-${index}`}
                                checked={isSelected}
                                onChange={(e) =>
                                  handleCheckboxChange(e, mockProgram, index)
                                }
                                className="w-5 h-5"
                              />
                            )}
                          </div>
                        )}
                        <ManufacturerAvatar user={row.manufacturer} />
                        <div className="text-right">
                          <div className="text-sm font-medium text-green">
                            ${formatNumber(row.estimatedEarnings)}
                          </div>
                          {!savingsOpp && row.earningsOpp > 0 && (
                            <div className="text-xs text-heading-very-light">
                              Opp: ${formatNumber(row.earningsOpp)}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-heading-very-light">
                            Program Compliance
                          </span>
                          <div className="flex items-center gap-2">
                            <PieWithoutLabel
                              style={{ width: "20px" }}
                              percentage={calcPercentage(
                                row.completed,
                                row.total
                              )}
                            />
                            <span className="text-sm font-medium">
                              {row.completed}/{row.total}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-sm text-heading-very-light">
                            Purchase Volume
                          </span>
                          <span className="text-sm font-medium">
                            ${formatNumber(row.purchaseVolume)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()
      ) : (
        <div className="w-full">
          {/* Desktop Table View */}
          <table
            id={id}
            className="hidden md:table w-full border-collapse"
            style={{ tableLayout: "auto" }}
          >
            <thead className="sticky top-0 bg-white z-[1] overflow-visible">
              <tr className="text-left text-xs text-filter-light font-medium border-b">
                {showCheckboxes && onSelectAll && (
                  <th className="pr-4 py-3 font-medium w-[70px]">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all-programs"
                        checked={isSelectAllChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          if (onSelectAll) {
                            onSelectAll();
                          }
                        }}
                        className="w-5 h-5"
                      />
                      <div
                        className="relative inline-flex items-center overflow-visible"
                        onMouseEnter={() => setShowInfoTooltip(true)}
                        onMouseLeave={() => setShowInfoTooltip(false)}
                      >
                        <Image
                          src={greyInfoIcon.src}
                          alt="Info"
                          width={16}
                          height={16}
                          className="cursor-help"
                        />
                        {showInfoTooltip && (
                          <div className="absolute left-0 top-full mt-2 z-[99999] px-3 py-2 bg-gray-800 text-white text-xs rounded whitespace-nowrap shadow-lg pointer-events-none">
                            Select checkboxes to choose program agreements for{" "}
                            {isEnrolled ? "unenrollment" : "enrollment"}
                            <div className="absolute left-4 top-0 -translate-y-full border-4 border-transparent border-b-gray-800"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  </th>
                )}
                {showCheckboxes && !onSelectAll && (
                  <th className="pr-4 py-3 font-medium w-[70px]"></th>
                )}
                <th className="pr-4 py-3 font-medium">
                  <span>Manufacturer</span>
                </th>
                <th className="px-4 py-3 font-medium">Program Compliance</th>
                <th className="px-4 py-3 font-medium">
                  % Compliance to Next Tier
                </th>
                <th className="px-4 py-3 font-medium">Purchase Volume</th>
                <th className="px-4 py-3 font-medium">Estimated Earnings</th>
                {!savingsOpp && (
                  <th className="px-4 py-3 font-medium">Earnings Opp.</th>
                )}
                <th className="px-4 py-3 font-medium">
                  {isEnrolled ? "Agreements Enrolled" : "Agreements Unenrolled"}
                </th>
              </tr>
            </thead>
            <tbody>
              {programs?.length > 0 ? (
                programs.map((program, index) => {
                  const isSelected = isProgramSelected(program, index);
                  const manufacturerId = program.manufacturer?.id;
                  const isProcessing =
                    !!manufacturerId && processingSet.has(manufacturerId);
                  return (
                    <tr
                      key={`${index}-program`}
                      onClick={() => handlePopup(program)}
                      style={
                        isSelected ? { backgroundColor: "#f0fdf4" } : undefined
                      }
                      className={`border-b cursor-pointer ${
                        isSelected ? "hover:bg-green-100" : "hover:bg-gray-50"
                      }`}
                    >
                      {showCheckboxes && (
                        <td
                          className="pr-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isProcessing ? (
                            <div className="w-5 h-5 flex items-center">
                              <PendingIcon />
                            </div>
                          ) : (
                            <Checkbox
                              id={`checkbox-${index}`}
                              checked={isSelected}
                              onChange={(e) =>
                                handleCheckboxChange(e, program, index)
                              }
                              className="w-5 h-5"
                            />
                          )}
                        </td>
                      )}
                      <td className="pr-4 py-3">
                        {program.manufacturer && (
                          <ManufacturerAvatar
                            user={program.manufacturer}
                            subText={getSelectedAgreementText(
                              program.manufacturer.id
                            )}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-4">
                          <PieWithoutLabel
                            style={{ width: "24px" }}
                            percentage={calcPercentage(
                              program?.programCompliance?.completed ?? 0,
                              program?.programCompliance?.total ?? 1
                            )}
                          ></PieWithoutLabel>
                          <span>
                            <strong>
                              {program.programCompliance?.completed}
                            </strong>
                            /{program.programCompliance?.total}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {program?.programCompliance?.completed ==
                        program?.programCompliance?.total
                          ? "N/A"
                          : `${program?.nearComplianceData?.highestCompliancePercentage ?? 0}%`}
                      </td>
                      <td className="px-4 py-3">
                        ${formatNumber(program.purchaseVolume?.amount ?? 0)}
                      </td>
                      <td className="px-4 py-3">
                        ${formatNumber(program.totalSavings?.amount ?? 0)}
                      </td>
                      {!savingsOpp && (
                        <td className="px-4 py-3">
                          {program?.programCompliance?.completed ==
                          program?.programCompliance?.total
                            ? "N/A"
                            : (program.totalOppSavings?.amount ?? 0) > 0
                              ? `$${formatNumber(program.totalOppSavings?.amount ?? 0)}`
                              : "$0"}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        {program.manufacturer?.id
                          ? (() => {
                              const { count, showAllSelected } =
                                getAgreementSelectionDisplay(
                                  program.manufacturer.id
                                );
                              return (
                                <div className="flex items-center gap-2">
                                  <span>{count}</span>
                                  {showAllSelected && (
                                    <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                                      All selected
                                    </span>
                                  )}
                                </div>
                              );
                            })()
                          : 0}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={
                      showCheckboxes ? (savingsOpp ? 7 : 8) : savingsOpp ? 6 : 7
                    }
                    className="text-center py-8 text-gray-500"
                  >
                    {MESSAGES.NO_RECORDS_FOUND}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Mobile Card View for Flat Programs */}
          <div className="md:hidden space-y-4">
            {programs?.length > 0 ? (
              programs.map((program, index) => {
                const isSelected = isProgramSelected(program, index);
                const manufacturerId = program.manufacturer?.id;
                const isProcessing =
                  !!manufacturerId && processingSet.has(manufacturerId);
                return (
                  <div
                    key={`${index}-program-mobile`}
                    style={
                      isSelected ? { backgroundColor: "#f0fdf4" } : undefined
                    }
                    className={`border border-gray-200 rounded-lg p-4 cursor-pointer ${
                      isSelected ? "hover:bg-green-100" : "hover:bg-gray-50"
                    }`}
                    onClick={() => handlePopup(program)}
                  >
                    <div className="flex items-center justify-between mb-3">
                      {showCheckboxes && (
                        <div onClick={(e) => e.stopPropagation()}>
                          {isProcessing ? (
                            <div className="w-5 h-5 flex items-center">
                              <PendingIcon />
                            </div>
                          ) : (
                            <Checkbox
                              id={`checkbox-mobile-${index}`}
                              checked={isSelected}
                              onChange={(e) =>
                                handleCheckboxChange(e, program, index)
                              }
                              className="w-5 h-5"
                            />
                          )}
                        </div>
                      )}
                      {program.manufacturer && (
                        <ManufacturerAvatar user={program.manufacturer} />
                      )}
                      <div className="text-right">
                        <div className="text-sm font-medium text-green">
                          ${formatNumber(program.totalSavings?.amount ?? 0)}
                        </div>
                        {!savingsOpp &&
                          program?.programCompliance?.completed !==
                            program?.programCompliance?.total &&
                          (program.totalOppSavings?.amount ?? 0) > 0 && (
                            <div className="text-xs text-heading-very-light">
                              Opp: $
                              {formatNumber(
                                program.totalOppSavings?.amount ?? 0
                              )}
                            </div>
                          )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-heading-very-light">
                          Program Compliance
                        </span>
                        <div className="flex items-center gap-2">
                          <PieWithoutLabel
                            style={{ width: "20px" }}
                            percentage={calcPercentage(
                              program?.programCompliance?.completed ?? 0,
                              program?.programCompliance?.total ?? 1
                            )}
                          />
                          <span className="text-sm font-medium">
                            {program.programCompliance?.completed}/
                            {program.programCompliance?.total}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-heading-very-light">
                          Purchase Volume
                        </span>
                        <span className="text-sm font-medium">
                          ${formatNumber(program.purchaseVolume?.amount ?? 0)}
                        </span>
                      </div>

                      {program?.programCompliance?.completed !==
                        program?.programCompliance?.total && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-heading-very-light">
                            % to Next Tier
                          </span>
                          <span className="text-sm font-medium">
                            {program?.nearComplianceData
                              ?.highestCompliancePercentage ?? 0}
                            %
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-heading-very-light">
                          {isEnrolled
                            ? "Agreements Enrolled"
                            : "Agreements Unenrolled"}
                        </span>
                        <span className="text-sm font-medium">
                          {program.manufacturer?.id
                            ? (() => {
                                const { count, showAllSelected } =
                                  getAgreementSelectionDisplay(
                                    program.manufacturer.id
                                  );
                                return (
                                  <div className="flex items-center gap-2">
                                    <span>{count}</span>
                                    {showAllSelected && (
                                      <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                                        All selected
                                      </span>
                                    )}
                                  </div>
                                );
                              })()
                            : 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-gray-500">
                {MESSAGES.NO_RECORDS_FOUND}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ProgramEnrollTable;
