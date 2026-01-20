"use client";

// Import Core functionality/component
import React, { useMemo, useState } from "react";

// Import Components
import AgreementSelectionModal from "../Dialog/AgreementSelectionModal";
import ProgramEnrollTable from "../Table/ProgramEnrollTable";
import { Tab, Tabs } from "../Tabs/Tabs";
import OrdersTable from "./OrdersTable";
import ProductsWishlistTable from "./ProductsWishlistTable";

// Import Types
import { toast } from "react-toastify";
import Button from "../../core-ui/Button";
import { EnrolledProgram, StoreDetailTableProps } from "../../types/StoreTypes";
import {
  Agreement,
  enrollStoreByAgreement,
  groupAgreementsByManufacturer,
  GroupedAgreement
} from "../../utils/agreementsAPI";
import { getUserClient } from "../../utils/getUserClient";

const StoreDetailTable: React.FC<StoreDetailTableProps> = ({
  programData,
  storeId,
  wishlist,
  orders,
  programTimeline,
  chainData,
  chainStoresData,
  isChainStoreProgram,
  storeTabOptions = "0",
  agreementInfo = []
}) => {
  // agreementInfo is now always populated server-side
  const effectiveAgreementInfo = agreementInfo;

  // Separate state for enrolled and unenrolled selections (manufacturer IDs)
  const [enrolledSelectedIds, setEnrolledSelectedIds] = useState<Set<number>>(
    new Set()
  );
  const [unenrolledSelectedIds, setUnenrolledSelectedIds] = useState<
    Set<number>
  >(new Set());

  // Track agreement selections per manufacturer: Map<manufacturerId, Set<agreementId>>
  const [enrolledManufacturerAgreements, setEnrolledManufacturerAgreements] =
    useState<Map<number, Set<number>>>(new Map());
  const [
    unenrolledManufacturerAgreements,
    setUnenrolledManufacturerAgreements
  ] = useState<Map<number, Set<number>>>(new Map());

  // Track which tab has active selections (only one at a time)
  const [activeSelectionTab, setActiveSelectionTab] = useState<
    "enrolled" | "unenrolled" | null
  >(null);

  // Manufacturer IDs that should show the pending spinner (persists across tab switches)
  const [processingManufacturerIds, setProcessingManufacturerIds] = useState<
    Set<number>
  >(new Set());

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<"enroll" | "unenroll">(
    "enroll"
  );
  const [groupedAgreements, setGroupedAgreements] = useState<
    GroupedAgreement[]
  >([]);
  const [selectedManufacturerIds, setSelectedManufacturerIds] = useState<
    number[]
  >([]);
  const [isLoadingAgreements, setIsLoadingAgreements] = useState(false);
  const [selectAllByDefault, setSelectAllByDefault] = useState(false);
  const [isSingleManufacturerModal, setIsSingleManufacturerModal] =
    useState(false);
  const [singleManufacturerId, setSingleManufacturerId] = useState<
    number | null
  >(null);
  const [preSelectedAgreementIds, setPreSelectedAgreementIds] = useState<
    Set<number>
  >(new Set());
  // Track if Done was clicked in single manufacturer modal (to avoid unchecking on close)
  const [singleManufacturerDoneClicked, setSingleManufacturerDoneClicked] =
    useState(false);
  // Track if bulk action modal was confirmed (to avoid unchecking on close)
  const [bulkActionConfirmed, setBulkActionConfirmed] = useState(false);
  // Store state before bulk modal opens to restore on cancel
  const [stateBeforeBulkModal, setStateBeforeBulkModal] = useState<{
    selectedIds: Set<number>;
    manufacturerAgreements: Map<number, Set<number>>;
    initialAgreementIds: Set<number>; // Track initial agreement IDs when modal opens
  } | null>(null);

  // Create manufacturer map from program data
  const manufacturerMap = useMemo(() => {
    const map = new Map<number, { id: number; name: string; logo: string }>();

    const addManufacturer = (program: EnrolledProgram) => {
      if (program.manufacturer?.id) {
        map.set(program.manufacturer.id, {
          id: program.manufacturer.id,
          name: program.manufacturer.name || "",
          logo: program.manufacturer.avatar || ""
        });
      }
    };

    programData.enrolledProgram.forEach(addManufacturer);
    programData.remainingProgram.forEach(addManufacturer);

    return map;
  }, [programData]);

  // Helper to get agreements for a manufacturer from agreementInfo
  const getAgreementsForManufacturer = (
    manufacturerId: number,
    action: "enroll" | "unenroll"
  ) => {
    const manufacturerAgreement = effectiveAgreementInfo.find(
      (info) => info.manufacturer_id === manufacturerId
    );

    if (!manufacturerAgreement) {
      return [];
    }

    // Filter by status based on action
    const filtered = manufacturerAgreement.agreementInfo.filter(
      (agreement: {
        status: string;
        id: number;
        name: string;
        endDate: string;
      }) => {
        const matches =
          action === "enroll"
            ? agreement.status === "available"
            : agreement.status === "enrolled";
        return matches;
      }
    );

    return filtered;
  };

  // Handler for program selection changes - enrolled tab
  const handleEnrolledSelectionChange = (
    manufacturerId: number,
    isSelected: boolean
  ) => {
    setUnenrolledSelectedIds(new Set()); // Clear other tab selections
    setUnenrolledManufacturerAgreements(new Map()); // Clear other tab agreement selections
    setActiveSelectionTab(isSelected ? "enrolled" : null);

    const agreements = getAgreementsForManufacturer(manufacturerId, "unenroll");
    const agreementCount = agreements.length;

    if (isSelected) {
      if (agreementCount === 1) {
        // Only one agreement, select it directly
        const agreementId = agreements[0].id;
        setEnrolledSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(manufacturerId);
          return newSet;
        });
        setEnrolledManufacturerAgreements((prev) => {
          const newMap = new Map(prev);
          newMap.set(manufacturerId, new Set([agreementId]));
          return newMap;
        });
      } else if (agreementCount > 1) {
        // Multiple agreements, open modal
        setEnrolledSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(manufacturerId);
          return newSet;
        });
        // Open modal for agreement selection
        handleManufacturerAgreementModal(manufacturerId, "unenroll");
      } else {
        // No agreements, just select the manufacturer
        setEnrolledSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(manufacturerId);
          return newSet;
        });
      }
    } else {
      // Deselect
      setEnrolledSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(manufacturerId);
        if (newSet.size === 0) {
          setActiveSelectionTab(null);
        }
        return newSet;
      });
      setEnrolledManufacturerAgreements((prev) => {
        const newMap = new Map(prev);
        newMap.delete(manufacturerId);
        return newMap;
      });
    }
  };

  // Handler for program selection changes - unenrolled tab
  const handleUnenrolledSelectionChange = (
    manufacturerId: number,
    isSelected: boolean
  ) => {
    setEnrolledSelectedIds(new Set()); // Clear other tab selections
    setEnrolledManufacturerAgreements(new Map()); // Clear other tab agreement selections
    setActiveSelectionTab(isSelected ? "unenrolled" : null);

    const agreements = getAgreementsForManufacturer(manufacturerId, "enroll");
    const agreementCount = agreements.length;

    if (isSelected) {
      if (agreementCount === 1) {
        // Only one agreement, select it directly
        const agreementId = agreements[0].id;
        setUnenrolledSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(manufacturerId);
          return newSet;
        });
        setUnenrolledManufacturerAgreements((prev) => {
          const newMap = new Map(prev);
          newMap.set(manufacturerId, new Set([agreementId]));
          return newMap;
        });
      } else if (agreementCount > 1) {
        // Multiple agreements, open modal
        setUnenrolledSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(manufacturerId);
          return newSet;
        });
        // Open modal for agreement selection
        handleManufacturerAgreementModal(manufacturerId, "enroll");
      } else {
        // No agreements, just select the manufacturer
        setUnenrolledSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(manufacturerId);
          return newSet;
        });
      }
    } else {
      // Deselect
      setUnenrolledSelectedIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(manufacturerId);
        if (newSet.size === 0) {
          setActiveSelectionTab(null);
        }
        return newSet;
      });
      setUnenrolledManufacturerAgreements((prev) => {
        const newMap = new Map(prev);
        newMap.delete(manufacturerId);
        return newMap;
      });
    }
  };

  // Handler for opening modal when manufacturer has multiple agreements
  const handleManufacturerAgreementModal = async (
    manufacturerId: number,
    action: "enroll" | "unenroll"
  ) => {
    setGroupedAgreements([]);
    setSelectedManufacturerIds([manufacturerId]);
    setIsLoadingAgreements(false); // No need to show loader since we're using existing data
    setIsModalOpen(true);
    setModalAction(action);
    setIsSingleManufacturerModal(true);
    setSingleManufacturerId(manufacturerId);

    // For single manufacturer modal, always start with unchecked (no pre-selection)
    setPreSelectedAgreementIds(new Set());
    setSelectAllByDefault(false);

    try {
      // Use agreementInfo from API instead of fetching
      const manufacturer = manufacturerMap.get(manufacturerId);
      if (!manufacturer) {
        toast.error("Manufacturer not found");
        setIsModalOpen(false);
        return;
      }

      // Get agreements from effectiveAgreementInfo for this manufacturer
      const manufacturerAgreementData = effectiveAgreementInfo.find(
        (info) => info.manufacturer_id === manufacturerId
      );

      if (!manufacturerAgreementData) {
        toast.error("No agreements found for this manufacturer");
        setIsModalOpen(false);
        return;
      }

      // Filter by status based on action
      const filteredAgreements = manufacturerAgreementData.agreementInfo.filter(
        (agreement: {
          status: string;
          id: number;
          name: string;
          endDate: string;
        }) => {
          if (action === "enroll") {
            return agreement.status === "available";
          } else {
            return agreement.status === "enrolled";
          }
        }
      );

      // Transform to Agreement format
      const agreementsWithManufacturer: Agreement[] = filteredAgreements.map(
        (agreement: {
          status: string;
          id: number;
          name: string;
          endDate: string;
        }) => ({
          agreementId: agreement.id,
          agreementName: agreement.name,
          endDate: agreement.endDate,
          manufacturerId,
          manufacturerName: manufacturer.name,
          manufacturerLogo: manufacturer.logo
        })
      );

      const grouped = groupAgreementsByManufacturer(
        agreementsWithManufacturer,
        manufacturerMap
      );

      setGroupedAgreements(grouped);
    } catch (error) {
      toast.error("Failed to load agreements");
      setIsModalOpen(false);
    }
  };

  // Handler for Done button in single manufacturer modal
  const handleSingleManufacturerDone = (agreementIds: number[]) => {
    if (!singleManufacturerId) return;

    // Mark that Done was clicked (so onClose won't uncheck the row)
    setSingleManufacturerDoneClicked(true);

    const agreementIdsSet = new Set(agreementIds);

    // Ensure manufacturer checkbox is checked if agreements are selected
    if (agreementIdsSet.size > 0) {
      if (activeSelectionTab === "enrolled") {
        setEnrolledSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(singleManufacturerId);
          return newSet;
        });
      } else {
        setUnenrolledSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(singleManufacturerId);
          return newSet;
        });
      }
    }

    handleManufacturerAgreementChange(singleManufacturerId, agreementIdsSet);

    // If no agreements selected, deselect the manufacturer checkbox
    if (agreementIdsSet.size === 0) {
      if (activeSelectionTab === "enrolled") {
        setEnrolledSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(singleManufacturerId);
          return newSet;
        });
      } else {
        setUnenrolledSelectedIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(singleManufacturerId);
          return newSet;
        });
      }
    }

    // Reset modal state
    setIsSingleManufacturerModal(false);
    setSingleManufacturerId(null);
  };

  // Handler for agreement selection in modal (for single manufacturer)
  const handleManufacturerAgreementChange = (
    manufacturerId: number,
    agreementIds: Set<number>
  ) => {
    if (activeSelectionTab === "enrolled") {
      setEnrolledManufacturerAgreements((prev) => {
        const newMap = new Map(prev);
        if (agreementIds.size > 0) {
          newMap.set(manufacturerId, agreementIds);
          // Ensure manufacturer checkbox is checked when agreements are selected
          setEnrolledSelectedIds((prev) => {
            const newSet = new Set(prev);
            newSet.add(manufacturerId);
            return newSet;
          });
        } else {
          newMap.delete(manufacturerId);
          // Also deselect the manufacturer checkbox
          setEnrolledSelectedIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(manufacturerId);
            return newSet;
          });
        }
        return newMap;
      });
    } else {
      setUnenrolledManufacturerAgreements((prev) => {
        const newMap = new Map(prev);
        if (agreementIds.size > 0) {
          newMap.set(manufacturerId, agreementIds);
          // Ensure manufacturer checkbox is checked when agreements are selected
          setUnenrolledSelectedIds((prev) => {
            const newSet = new Set(prev);
            newSet.add(manufacturerId);
            return newSet;
          });
        } else {
          newMap.delete(manufacturerId);
          // Also deselect the manufacturer checkbox
          setUnenrolledSelectedIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(manufacturerId);
            return newSet;
          });
        }
        return newMap;
      });
    }
  };

  // Handler for Enroll Selected / Unenroll Selected button
  const handleBulkAction = async (action: "enroll" | "unenroll") => {
    const selectedManufacturerIdsList =
      action === "enroll"
        ? Array.from(unenrolledSelectedIds)
        : Array.from(enrolledSelectedIds);
    const manufacturerAgreementsMap =
      action === "enroll"
        ? unenrolledManufacturerAgreements
        : enrolledManufacturerAgreements;

    if (selectedManufacturerIdsList.length === 0) {
      toast.warning(`Please select at least one program to ${action}`);
      return;
    }

    // Collect pre-selected agreement IDs from manufacturerAgreementsMap
    const collectedPreSelectedIds = new Set<number>();
    selectedManufacturerIdsList.forEach((manufacturerId) => {
      const selectedAgreements = manufacturerAgreementsMap.get(manufacturerId);
      if (selectedAgreements) {
        selectedAgreements.forEach((agreementId) => {
          collectedPreSelectedIds.add(agreementId);
        });
      }
    });

    // Store state before opening modal (to restore on cancel)
    setStateBeforeBulkModal({
      selectedIds: new Set(selectedManufacturerIdsList),
      manufacturerAgreements: new Map(manufacturerAgreementsMap),
      initialAgreementIds: new Set(collectedPreSelectedIds) // Store initial agreement IDs
    });
    setBulkActionConfirmed(false);

    // Reset state before opening modal
    setGroupedAgreements([]);
    setSelectedManufacturerIds(selectedManufacturerIdsList);
    setIsLoadingAgreements(false); // No need to show loader since we're using existing data
    setIsModalOpen(true);
    setModalAction(action);
    // If there are pre-selected agreements, don't select all by default
    setPreSelectedAgreementIds(collectedPreSelectedIds);
    setSelectAllByDefault(collectedPreSelectedIds.size === 0);
    setIsSingleManufacturerModal(false);
    setSingleManufacturerId(null);

    try {
      // Use agreementInfo from API instead of fetching
      const agreementsByManufacturer: Agreement[] = [];

      selectedManufacturerIdsList.forEach((manufacturerId) => {
        const manufacturer = manufacturerMap.get(manufacturerId);

        if (!manufacturer) {
          return;
        }

        // Get agreements from agreementInfo for this manufacturer
        let manufacturerAgreementData = effectiveAgreementInfo.find(
          (info) => info.manufacturer_id === manufacturerId
        );

        if (!manufacturerAgreementData) {
          const looseMatch = effectiveAgreementInfo.find(
            (info) => info.manufacturer_id == manufacturerId
          );
          if (looseMatch) {
            manufacturerAgreementData = looseMatch;
          } else {
            return;
          }
        }

        // Filter by status based on action
        const filteredAgreements =
          manufacturerAgreementData.agreementInfo.filter((agreement) => {
            if (action === "enroll") {
              return agreement.status === "available";
            } else {
              return agreement.status === "enrolled";
            }
          });

        // Transform to Agreement format
        const transformedAgreements: Agreement[] = filteredAgreements.map(
          (agreement) => ({
            agreementId: agreement.id,
            agreementName: agreement.name,
            endDate: agreement.endDate,
            manufacturerId,
            manufacturerName: manufacturer.name,
            manufacturerLogo: manufacturer.logo
          })
        );

        // If user selected specific agreements for this manufacturer, show only those
        const selectedAgreementIds =
          manufacturerAgreementsMap.get(manufacturerId);

        if (selectedAgreementIds && selectedAgreementIds.size > 0) {
          // Filter to show only previously selected agreements
          const filtered = transformedAgreements.filter((agreement) =>
            selectedAgreementIds.has(agreement.agreementId)
          );
          agreementsByManufacturer.push(...filtered);
        } else {
          // Show all agreements for this manufacturer
          agreementsByManufacturer.push(...transformedAgreements);
        }
      });

      const grouped = groupAgreementsByManufacturer(
        agreementsByManufacturer,
        manufacturerMap
      );

      setGroupedAgreements(grouped);
    } catch (error) {
      toast.error("Failed to load agreements");
      setIsModalOpen(false);
    } finally {
      setIsLoadingAgreements(false);
    }
  };

  // Handler for modal confirm (enrollment/unenrollment)
  const handleModalConfirm = async (agreementIds: number[]) => {
    // Mark that bulk action was confirmed (so onClose won't restore state)
    if (!isSingleManufacturerModal) {
      setBulkActionConfirmed(true);
    }
    const userId = getUserClient()?.id;

    if (!storeId || !userId) {
      toast.error("Missing required information. Please refresh the page.");
      return;
    }

    const storeIds = [parseInt(storeId.toString(), 10)];

    if (isNaN(storeIds[0])) {
      toast.error("Invalid store ID");
      return;
    }

    const requestBody = {
      action: modalAction,
      agreementIds,
      storeIds,
      userId,
      reason: "Bulk enrollment via store details page"
    };

    const idsToProcess: number[] =
      isSingleManufacturerModal && singleManufacturerId
        ? [singleManufacturerId]
        : selectedManufacturerIds;

    try {
      // Start per-row spinners only after confirm
      if (idsToProcess.length) {
        setProcessingManufacturerIds(new Set(idsToProcess));
      }

      const response = await enrollStoreByAgreement(requestBody);

      if (response.success) {
        toast.success(
          `Successfully ${modalAction === "enroll" ? "enrolled in" : "unenrolled from"} ${agreementIds.length} agreement${
            agreementIds.length > 1 ? "s" : ""
          }`
        );

        // Update manufacturer agreement selections based on what was actually enrolled/unenrolled
        if (!isSingleManufacturerModal) {
          // For bulk action, update state based on selected agreements
          const manufacturerAgreementsMap =
            modalAction === "enroll"
              ? unenrolledManufacturerAgreements
              : enrolledManufacturerAgreements;

          const updatedMap = new Map(manufacturerAgreementsMap);
          selectedManufacturerIds.forEach((manufacturerId) => {
            // Get agreements for this manufacturer that were actually selected
            const manufacturerAgreements = groupedAgreements.find(
              (g) => g.manufacturerId === manufacturerId
            );
            if (manufacturerAgreements) {
              const selectedForManufacturer = new Set<number>();
              manufacturerAgreements.agreements.forEach((agreement) => {
                if (agreementIds.includes(agreement.agreementId)) {
                  selectedForManufacturer.add(agreement.agreementId);
                }
              });

              if (selectedForManufacturer.size > 0) {
                updatedMap.set(manufacturerId, selectedForManufacturer);
              } else {
                updatedMap.delete(manufacturerId);
                // Also deselect the manufacturer checkbox
                if (modalAction === "enroll") {
                  setUnenrolledSelectedIds((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(manufacturerId);
                    return newSet;
                  });
                } else {
                  setEnrolledSelectedIds((prev) => {
                    const newSet = new Set(prev);
                    newSet.delete(manufacturerId);
                    return newSet;
                  });
                }
              }
            }
          });

          if (modalAction === "enroll") {
            setUnenrolledManufacturerAgreements(updatedMap);
          } else {
            setEnrolledManufacturerAgreements(updatedMap);
          }
        }

        // Clear manufacturer selections (but keep agreement selections)
        setEnrolledSelectedIds(new Set());
        setUnenrolledSelectedIds(new Set());
        setActiveSelectionTab(null);
      } else {
        toast.error(
          response.message ||
            `Failed to ${modalAction} store. Please try again.`
        );
        // Clear optimistic spinner state on failure response
        if (idsToProcess.length) {
          setProcessingManufacturerIds((prev) => {
            const next = new Set(prev);
            idsToProcess.forEach((id) => next.delete(id));
            return next;
          });
        }
      }
    } catch (error: any) {
      console.error(`Error during ${modalAction}:`, error);
      const errorMessage =
        error?.error?.data ||
        error?.response?.data?.message ||
        (typeof error?.response?.data?.data === "string"
          ? error?.response?.data?.data
          : null) ||
        (typeof error?.data === "string" ? error?.data : null) ||
        error?.message ||
        `Unable to ${modalAction} store. Please try again.`;

      toast.error(errorMessage);
      // Clear optimistic spinner state on thrown error
      if (idsToProcess.length) {
        setProcessingManufacturerIds((prev) => {
          const next = new Set(prev);
          idsToProcess.forEach((id) => next.delete(id));
          return next;
        });
      }
    }
  };

  // Handler for Select All checkbox - toggle behavior
  const handleSelectAll = (isEnrolled: boolean) => {
    const programs = isEnrolled
      ? programData.enrolledProgram
      : programData.remainingProgram;
    const selectedIds = isEnrolled
      ? enrolledSelectedIds
      : unenrolledSelectedIds;

    // Check if all are currently selected
    const allSelected =
      programs.length > 0 &&
      programs.every(
        (p) => p.manufacturer?.id && selectedIds.has(p.manufacturer.id)
      ) &&
      selectedIds.size === programs.length;

    if (allSelected) {
      // Unselect all
      if (isEnrolled) {
        setEnrolledSelectedIds(new Set());
        setEnrolledManufacturerAgreements(new Map());
        setActiveSelectionTab(null);
      } else {
        setUnenrolledSelectedIds(new Set());
        setUnenrolledManufacturerAgreements(new Map());
        setActiveSelectionTab(null);
      }
    } else {
      // Select all
      const action = isEnrolled ? "unenroll" : "enroll";

      if (isEnrolled) {
        setUnenrolledSelectedIds(new Set());
        setUnenrolledManufacturerAgreements(new Map());
      } else {
        setEnrolledSelectedIds(new Set());
        setEnrolledManufacturerAgreements(new Map());
      }

      const allManufacturerIds = new Set<number>();
      const allAgreements = new Map<number, Set<number>>();

      programs.forEach((program) => {
        const manufacturerId = program.manufacturer?.id;
        if (manufacturerId) {
          allManufacturerIds.add(manufacturerId);
          const agreements = getAgreementsForManufacturer(
            manufacturerId,
            action
          );
          if (agreements.length > 0) {
            allAgreements.set(
              manufacturerId,
              new Set(
                agreements.map(
                  (a: {
                    id: number;
                    status: string;
                    name: string;
                    endDate: string;
                  }) => a.id
                )
              )
            );
          }
        }
      });

      if (isEnrolled) {
        setEnrolledSelectedIds(allManufacturerIds);
        setEnrolledManufacturerAgreements(allAgreements);
        setActiveSelectionTab("enrolled");
      } else {
        setUnenrolledSelectedIds(allManufacturerIds);
        setUnenrolledManufacturerAgreements(allAgreements);
        setActiveSelectionTab("unenrolled");
      }
    }
  };

  // Check if all programs are selected
  const isAllSelected = (isEnrolled: boolean) => {
    const programs = isEnrolled
      ? programData.enrolledProgram
      : programData.remainingProgram;
    const selectedIds = isEnrolled
      ? enrolledSelectedIds
      : unenrolledSelectedIds;

    if (programs.length === 0) return false;
    return (
      programs.every(
        (p) => p.manufacturer?.id && selectedIds.has(p.manufacturer.id)
      ) && selectedIds.size === programs.length
    );
  };

  const hasEnrolledSelections = enrolledSelectedIds.size > 0;
  const hasUnenrolledSelections = unenrolledSelectedIds.size > 0;

  // Only render if we're on the Store Opportunities tab (tab 0)
  if (storeTabOptions !== "0") {
    return null;
  }

  return (
    <div className="relative storeDetailTable text-left text-sm text-filter-light font-medium font-inter">
      <AgreementSelectionModal
        isOpen={isModalOpen}
        onClose={(finalSelectedAgreementIds) => {
          // If bulk action was confirmed, close immediately without state restoration
          if (bulkActionConfirmed) {
            setIsModalOpen(false);
            setBulkActionConfirmed(false);
            setStateBeforeBulkModal(null);
            setSingleManufacturerDoneClicked(false);
            setGroupedAgreements([]);
            setSelectedManufacturerIds([]);
            setSelectAllByDefault(false);
            setIsSingleManufacturerModal(false);
            setSingleManufacturerId(null);
            setPreSelectedAgreementIds(new Set());
            return;
          }

          // If bulk action modal was canceled (not confirmed), check if agreements were unchecked
          if (
            !isSingleManufacturerModal &&
            !bulkActionConfirmed &&
            stateBeforeBulkModal
          ) {
            const finalAgreementIds = finalSelectedAgreementIds
              ? new Set(finalSelectedAgreementIds)
              : new Set<number>();
            const initialAgreementIds =
              stateBeforeBulkModal.initialAgreementIds;

            // Check if any agreements were actually unchecked (compare sets)
            // If sets are equal, nothing changed - restore previous state
            const setsAreEqual =
              initialAgreementIds.size === finalAgreementIds.size &&
              Array.from(initialAgreementIds).every((id) =>
                finalAgreementIds.has(id)
              );

            if (setsAreEqual) {
              // No changes, restore previous state (keep rows checked)
              if (modalAction === "enroll") {
                setUnenrolledSelectedIds(stateBeforeBulkModal.selectedIds);
                setUnenrolledManufacturerAgreements(
                  stateBeforeBulkModal.manufacturerAgreements
                );
              } else {
                setEnrolledSelectedIds(stateBeforeBulkModal.selectedIds);
                setEnrolledManufacturerAgreements(
                  stateBeforeBulkModal.manufacturerAgreements
                );
              }
            } else {
              // Agreements were changed (unchecked), update state accordingly
              const manufacturerAgreementsMap =
                modalAction === "enroll"
                  ? unenrolledManufacturerAgreements
                  : enrolledManufacturerAgreements;

              const updatedMap = new Map(manufacturerAgreementsMap);
              const selectedIds = new Set(stateBeforeBulkModal.selectedIds);

              // Update agreement selections based on final selection
              stateBeforeBulkModal.selectedIds.forEach((manufacturerId) => {
                const manufacturerAgreements = groupedAgreements.find(
                  (g) => g.manufacturerId === manufacturerId
                );
                if (manufacturerAgreements) {
                  const selectedForManufacturer = new Set<number>();
                  manufacturerAgreements.agreements.forEach((agreement) => {
                    if (finalAgreementIds.has(agreement.agreementId)) {
                      selectedForManufacturer.add(agreement.agreementId);
                    }
                  });

                  if (selectedForManufacturer.size > 0) {
                    updatedMap.set(manufacturerId, selectedForManufacturer);
                  } else {
                    // No agreements selected for this manufacturer, uncheck the row
                    updatedMap.delete(manufacturerId);
                    selectedIds.delete(manufacturerId);
                  }
                }
              });

              // Update state
              if (modalAction === "enroll") {
                setUnenrolledSelectedIds(selectedIds);
                setUnenrolledManufacturerAgreements(updatedMap);
              } else {
                setEnrolledSelectedIds(selectedIds);
                setEnrolledManufacturerAgreements(updatedMap);
              }
            }
            setStateBeforeBulkModal(null);
          }

          // If single manufacturer modal was canceled (not Done), uncheck the row if no agreements were selected
          if (
            isSingleManufacturerModal &&
            singleManufacturerId &&
            !singleManufacturerDoneClicked
          ) {
            const manufacturerAgreementsMap =
              modalAction === "enroll"
                ? unenrolledManufacturerAgreements
                : enrolledManufacturerAgreements;
            const hasSelectedAgreements =
              manufacturerAgreementsMap.has(singleManufacturerId) &&
              (manufacturerAgreementsMap.get(singleManufacturerId)?.size ?? 0) >
                0;

            // If no agreements were selected, uncheck the manufacturer checkbox
            if (!hasSelectedAgreements) {
              if (modalAction === "enroll") {
                setUnenrolledSelectedIds((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(singleManufacturerId);
                  return newSet;
                });
              } else {
                setEnrolledSelectedIds((prev) => {
                  const newSet = new Set(prev);
                  newSet.delete(singleManufacturerId);
                  return newSet;
                });
              }
            }
          }

          // Reset flags
          setSingleManufacturerDoneClicked(false);
          setBulkActionConfirmed(false);

          setIsModalOpen(false);
          // Reset state when modal closes
          setGroupedAgreements([]);
          setSelectedManufacturerIds([]);
          setSelectAllByDefault(false);
          setIsSingleManufacturerModal(false);
          setSingleManufacturerId(null);
          setPreSelectedAgreementIds(new Set());
        }}
        groupedAgreements={groupedAgreements}
        selectedManufacturerIds={selectedManufacturerIds}
        action={modalAction}
        onConfirm={handleModalConfirm}
        isLoading={isLoadingAgreements}
        selectAllByDefault={selectAllByDefault}
        isSingleManufacturer={isSingleManufacturerModal}
        onDone={handleSingleManufacturerDone}
        manufacturerId={singleManufacturerId || undefined}
        preSelectedAgreementIds={preSelectedAgreementIds}
      />

      <Tabs paddingY={"py"} className="px-3.5" headerClass="flex-wrap">
        <Tab label="Programs Enrolled">
          {enrolledSelectedIds?.size && enrolledSelectedIds?.size > 0 ? (
            <div className="static sm:absolute top-3 right-4">
              <Button
                color="danger"
                size="sm"
                rounded={false}
                className="my-2 sm:mt-0 text-xs rounded md min-w-[120px] sm:min-w-[100px]"
                disabled={!hasEnrolledSelections}
                onClick={() => handleBulkAction("unenroll")}
              >
                {hasEnrolledSelections
                  ? `Unenroll Selected (${enrolledSelectedIds.size})`
                  : "Unenroll Selected"}
              </Button>
            </div>
          ) : null}
          <div className="overflow-visible sm:overflow-x-auto sm:overflow-y-scroll sm:max-h-[60vh]">
            <ProgramEnrollTable
              id="enrolled-programs-table"
              programs={programData.enrolledProgram}
              storeId={storeId}
              programTimeline={programTimeline}
              chainData={chainData}
              chainStoresData={chainStoresData}
              isChainStoreProgram={isChainStoreProgram}
              isEnrolled={true}
              showEnrollButton={false}
              showCheckboxes={true}
              selectedProgramIds={enrolledSelectedIds}
              onProgramSelectionChange={handleEnrolledSelectionChange}
              processingManufacturerIds={Array.from(processingManufacturerIds)}
              agreementInfo={effectiveAgreementInfo}
              manufacturerAgreementSelections={enrolledManufacturerAgreements}
              onManufacturerAgreementChange={handleManufacturerAgreementChange}
            />
          </div>
        </Tab>
        <Tab label="Programs Not Enrolled">
          <div className="static sm:absolute top-3 right-4">
            <Button
              color="success"
              size="sm"
              rounded={false}
              className="my-2 sm:mt-0 text-xs rounded md min-w-[120px] sm:min-w-[100px]"
              disabled={!hasUnenrolledSelections}
              onClick={() => handleBulkAction("enroll")}
            >
              {hasUnenrolledSelections
                ? `Enroll Selected (${unenrolledSelectedIds.size})`
                : "Enroll Selected"}
            </Button>
          </div>
          <div className="overflow-visible sm:overflow-x-auto sm:overflow-y-scroll sm:max-h-[60vh]">
            <ProgramEnrollTable
              id="unenrolled-programs-table"
              programs={programData.remainingProgram}
              storeId={storeId}
              savingsOpp={true}
              programTimeline={programTimeline}
              chainData={chainData}
              chainStoresData={chainStoresData}
              isChainStoreProgram={isChainStoreProgram}
              isEnrolled={false}
              showEnrollButton={false}
              showCheckboxes={true}
              selectedProgramIds={unenrolledSelectedIds}
              onProgramSelectionChange={handleUnenrolledSelectionChange}
              processingManufacturerIds={Array.from(processingManufacturerIds)}
              agreementInfo={effectiveAgreementInfo}
              manufacturerAgreementSelections={unenrolledManufacturerAgreements}
              onManufacturerAgreementChange={handleManufacturerAgreementChange}
            />
          </div>
        </Tab>
        {!!wishlist && (
          <Tab label="Store Wishlist">
            <div className="relative pb-4">
              <div className="overflow-x-auto">
                <ProductsWishlistTable
                  products={wishlist}
                  storeID={Number(storeId)}
                />
              </div>
            </div>
          </Tab>
        )}
        {!!orders && (
          <Tab label="Recent Orders">
            <div className="relative pb-4">
              <div className="overflow-x-auto">
                <OrdersTable ordersData={orders} />
              </div>
            </div>
          </Tab>
        )}
      </Tabs>
    </div>
  );
};

export default StoreDetailTable;
