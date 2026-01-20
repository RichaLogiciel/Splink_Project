"use client";

// Import Core functionality/component
import { USER_STATUS } from "@/configs/status";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";

import { cancelUserInvite } from "@/app/app/users/API";
import dotsIcon from "@/assets/icons/3DotsIcon.svg";

// Import Components
import InviteNewChainModal from "@/components/Dialog/InviteNewChainModal";
import InviteNewStoreModal from "@/components/Dialog/InviteNewStoreModal";
import { getUserClient } from "@/utils/getUserClient";

import AgreementSelectionDialog from "@/components/Dialog/AgreementSelectionDialog";
import ConfirmWishlistItemDelete from "@/components/Dialog/ConfirmWishlistItemDelete";
import Avatar from "../Avatar/RepAvatar";
import HorizontalProgressBar from "../Progress/HorizontalProgressBar";
import SegmentedProgressBar from "../Progress/SegmentedProgressBar";
import Pagination from "./Pagination";

// Import Util functions
import { calcPercentage } from "../../utils/calculations";
import {
  DEPRECATE_STORE_INVITE_FEATURE,
  STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
} from "../../utils/constants";
import {
  formateRebate,
  generateQueryString,
  getFullName,
  getUrlWithQueryParam,
  isDistributorFeatureEnabled,
  isEmptyString
} from "../../utils/helper";
import { formatNumber } from "../../utils/numberFormatter";

import {
  EnrolledProgram,
  StoreProfileDetails,
  TierDetailsModalData
} from "@/types/StoreTypes";
// Import Contants
import {
  CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS,
  DEFAULT_PAGE_SIZE,
  DISTRIBUTOR_SALESREP_UPDATE,
  PAGINATION_PAGE_QUERY_PARAMS,
  SORT_KEYS
} from "@/utils/constants";

// Import Types
import {
  StoreEnrollmentStatusValue,
  StoreListingApiResType,
  StoreTableData
} from "../../types/StoreTypes";

// Import Images
import greyInfoIcon from "@/assets/icons/greyInfoIcon.svg";
import { MESSAGES } from "@/configs/messages";
import { apiClient } from "@/lib/axiosClient";
import { useWindowWidth } from "@/utils/clientHelper";
import {
  isChain,
  isDistributor,
  isDistributorAdminAndExecutive,
  isDistributorSalesRep as isDistributorSalesRepFn,
  isManufacturer,
  isManufacturerAccountManager,
  isManufacturerExecutive
} from "@/utils/rolesConditions";
import { ENTITY_TYPES_RESPONSE } from "@/views/Distributor/programConstants";

import Checkbox from "@/core-ui/Checkbox";
import sortIcon from "../../assets/icons/sortIcon.svg";
import sortIconDefault from "../../assets/icons/sortIconDefault.svg";
import sortIconDesc from "../../assets/icons/sortIconDesc.svg";
import AssignStoreSalesRepModal from "../Dialog/AssignStoreSalesRepModal";
import StoreDetailsModal from "../Dialog/StoreDetailsModal";
import TierDetailModal from "../Dialog/TierDetailModal";
import SelectFilter from "../SelectFilter";

const isDistributorAdmin = async (role: string) => {
  const { isDistributorAdmin } = await import("@/utils/rolesConditions");
  return isDistributorAdmin(role);
};
const isDistributorExecutive = async (role: string) => {
  const { isDistributorExecutive } = await import("@/utils/rolesConditions");
  return isDistributorExecutive(role);
};
const isDistributorSalesRep = async (role: string) => {
  const { isDistributorSalesRep } = await import("@/utils/rolesConditions");
  return isDistributorSalesRep(role);
};

interface SortableHeaderProps {
  label?: string;
  sortKey?: keyof typeof SORT_KEYS;
  customLabel?: string;
  customKey?: string;
  sort: Record<string, string>;
  className?: string;
  handleSortChange: (key: string) => void;
}

const StoreTable: React.FC<StoreListingApiResType> = ({
  stores: storesData,
  currentPage,
  totalPages,
  totalStores,
  pageVariable = PAGINATION_PAGE_QUERY_PARAMS.PAGE,
  manufacturerId,
  manufacturerName,
  manufacturerLogo,
  isDistributorStores = false,
  isStoresPrograms = false,
  isStoreEnrolled,
  isSalesRep = false,
  canInvite = false,
  isPrograms = false,
  enablePurchaseSorting = false,
  isAuthorizedManufacturer,
  showEarningOpportunity,
  salesReps,
  id = "store-table",
  showEnrollButton = false,
  selectedWarehouseId,
  programTimeline,
  isChainsView = false,
  chainStoresData = null,
  disableChainExpansion = false,
  isChainProgramsView = false,
  isIndependentStores = false,
  showNearToCompliancePercentage,
  programIds,
  onDataRefresh,
  isLoadingTable = false,
  showAnnualPurchaseVolume = false,
  showCheckbox = false,
  selectedStores = [],
  setSelectedStores,
  onSingleStoreEnroll,
  processingStoreIds = [],
  agreementId
}) => {
  const router = useRouter();
  const [storeData, setStoreData] = useState(storesData);
  const [isLoading, setIsLoading] = useState(false);
  const [showInfoTooltip, setShowInfoTooltip] = useState(false);
  const searchParams = useSearchParams(); // Get the current search parameters
  // Get the existing search parameters from the URL

  const windowWidth = useWindowWidth();
  const user = getUserClient();
  const isChainAdmin = isChain(user?.role ?? "");
  // isDistributor includes: DISTRIBUTOR_ADMIN, DISTRIBUTOR_EXECUTIVE, DISTRIBUTOR_SALES_REP,
  // DISTRIBUTOR_GENERAL_MANAGER, DISTRIBUTOR_SALES_MANAGER
  const isDistributorUser = isDistributor(user?.role ?? "");
  // Hide Actions column for all distributor roles (admin, executive, sales rep, general manager, sales manager)
  // in program details view (isStoresPrograms or isPrograms indicates we're in the program details view)
  const shouldHideActions =
    isDistributorUser && (isStoresPrograms || isPrograms);

  // Determine if chain information should be shown based on feature flag
  const shouldShowChainInfo = !isDistributorFeatureEnabled(
    user?.parentEntityId ?? user?.associatedUserId ?? null,
    CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  const canChangeStoreSalesRep =
    isDistributorAdminAndExecutive(user?.role ?? "") &&
    DISTRIBUTOR_SALESREP_UPDATE;

  // Trigger loading state when external loading prop changes (from search or data fetch)
  useEffect(() => {
    setIsLoading(isLoadingTable);
  }, [isLoadingTable]);

  // Temporary fix to show loading state when new data arrives
  useEffect(() => {
    if (storesData) {
      setStoreData(storesData);
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  }, [storesData]);

  const processingStoreIdSet = useMemo(
    () => new Set(processingStoreIds),
    [processingStoreIds]
  );

  const manufacturer: {
    isCurrentUser: boolean;
    id?: number;
    logo?: string;
    name?: string;
  } = useMemo(() => {
    const isManufacturerUser: boolean = isManufacturer(user?.role || "");

    if (user && isManufacturerUser) {
      if (
        isManufacturerExecutive(user?.role) ||
        isManufacturerAccountManager(user?.role)
      ) {
        return {
          id: user.parentEntityId as number,
          name: user.name || getFullName(user.firstName, user.lastName),
          logo: user.logo,
          isCurrentUser: !!(user && isManufacturerUser)
        };
      }

      return {
        id: user.associatedUserId,
        name: user.name || getFullName(user.firstName, user.lastName),
        logo: user.logo,
        isCurrentUser: !!(user && isManufacturerUser)
      };
    }

    return {
      id: manufacturerId,
      name: manufacturerName,
      logo: manufacturerLogo,
      isCurrentUser: !!(user && isManufacturerUser)
    };
  }, [user, manufacturerId, manufacturerName, manufacturerLogo]);

  const isInviteDisabled = useMemo(() => {
    return user?.role && isDistributorSalesRepFn(user?.role) ? true : false;
  }, [user]);

  // Check if any store has totalEnrolled > 0 (for showing Program Compliance column)
  const hasAnyStoreWithEnrollments = useMemo(() => {
    if (!isDistributorStores) return true; // Always show for non-manufacturer stores
    return (
      storeData?.some((store) => store.programData?.totalEnrolled > 0) ?? false
    );
  }, [storeData, isDistributorStores]);

  const params = new URLSearchParams(searchParams.toString());
  const [sort, setSort] = useState<Record<string, string>>(() => {
    const initialSort = params.get(SORT_KEYS.SORT);
    const initialPurchaseSort = params.get(SORT_KEYS.PURCHASE_VOLUME_SORT);
    const initialAnnualPurchaseVolumeSort = params.get(
      SORT_KEYS.ANNUAL_PURCHASE_VOLUME_SORT
    );

    if (initialSort) return { [SORT_KEYS.SORT]: initialSort };
    if (initialPurchaseSort)
      return { [SORT_KEYS.PURCHASE_VOLUME_SORT]: initialPurchaseSort };
    if (initialAnnualPurchaseVolumeSort)
      return {
        [SORT_KEYS.ANNUAL_PURCHASE_VOLUME_SORT]: initialAnnualPurchaseVolumeSort
      };

    return { [SORT_KEYS.SORT]: "ASC" };
  });

  const [storeProfileDetails, setStoreProfileDetails] =
    useState<StoreProfileDetails>({});

  const [isInviteStorePopupOpen, setIsInviteStorePopupOpen] = useState(false);
  const [isInviteChainPopupOpen, setIsInviteChainPopupOpen] = useState(false);

  const [selectedStoreData, setSelectedStore] = useState<StoreTableData | null>(
    null
  );
  const [selectedChainDetails, setSelectedChainDetails] = useState<any>({});
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [openDropdown, setOpenDropdown] = useState<number | null>(null);
  const [userIndex, setUserIndex] = useState<number>(-1);
  const [chainId, setchainId] = useState<number>(-1);
  const [storeToReassign, setStoreToReassign] = useState<StoreTableData | null>(
    null
  );
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Type assertion to ensure event.target is treated as an Element
      const target = event.target as Element;

      // Check if the click is outside the dropdown and the icon button
      if (
        dropdownRef.current &&
        target.tagName != "BUTTON" &&
        target.tagName != "TD" &&
        target.tagName != "IMG"
      )
        setOpenDropdown(null); // Close the dropdown
    };
    document.addEventListener("click", handleClickOutside);

    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const resStartNum =
    currentPage == 1 ? currentPage : DEFAULT_PAGE_SIZE * (currentPage - 1) + 1;
  const resEndNum =
    currentPage * DEFAULT_PAGE_SIZE > totalStores
      ? totalStores
      : currentPage * DEFAULT_PAGE_SIZE;

  const handleSortChange = (key: string = SORT_KEYS.SORT) => {
    const sortDescFirstFor = [
      SORT_KEYS.PURCHASE_VOLUME_SORT,
      SORT_KEYS.ANNUAL_PURCHASE_VOLUME_SORT,
      SORT_KEYS.SKUS,
      SORT_KEYS.PROGRAM_COMPLIANCE,
      SORT_KEYS.ESTIMATED_SAVINGS,
      SORT_KEYS.SAVINGS_Opp,
      SORT_KEYS.NEAR_COMPLIANCE_PERCENTAGE
    ];
    let sortVal;
    if (sortDescFirstFor.includes(key)) {
      sortVal = key in sort && sort?.[key] === "DESC" ? "ASC" : "DESC";
    } else {
      sortVal = key in sort && sort?.[key] === "ASC" ? "DESC" : "ASC";
    }

    setSort({ [key]: sortVal });
    setIsLoading(true); // Set loading state when sorting changes

    // Read current searchParams directly to avoid stale values
    const currentParams = new URLSearchParams(searchParams.toString());
    const updatedQuery = generateQueryString(currentParams, {
      sort: sortVal,
      sortKey: key,
      [pageVariable]: 1,
      s: searchParams.get("s"),
      chainId: searchParams.get("chainId"),
      dtId: searchParams.get("dtId"),
      srId: searchParams.get("srId")
    });

    // Push the search query to the router
    router.push(`${location.pathname}?${updatedQuery}`);
  };

  const handleInvite = (store: any, chainId: number) => {
    setStoreProfileDetails({
      id: store?.id,
      storeName: store?.storeInfo?.name || ""
    });
    if (chainId > 0) {
      setSelectedChainDetails({ id: chainId, name: store.chainNames });
      setIsInviteChainPopupOpen(true);
    } else {
      setIsInviteStorePopupOpen(true);
    }
  };

  const onInvitationSent = () => {
    const index = storeData.findIndex(
      (item: any) => item.id == storeProfileDetails.id
    );

    if (storeData[index]?.userInfo?.status) {
      storeData[index].userInfo.status = "INVITATION_SENT";
    }

    setIsInviteChainPopupOpen(false);
    setIsInviteStorePopupOpen(false);
  };

  const openStoreModal = (store: StoreTableData) => {
    setSelectedStore(store);
    setIsModalOpen(true);
  };

  const isShowInviteBtn = (store: any) => {
    if (
      !isDistributorAdmin(user?.role || "") &&
      !isDistributorExecutive(user?.role || "") &&
      !isDistributorSalesRep(user?.role || "") &&
      !isChainAdmin
    ) {
      return false;
    }

    if (
      store?.userInfo?.status == USER_STATUS.INVITATION_PENDING ||
      (isChainAdmin && store?.userInfo?.status == USER_STATUS.CHAIN_ACTIVE)
    ) {
      return true;
    }

    return false;
  };

  const onCancelInviteConfirm = async () => {
    const isChainUser = chainId != -1;
    if (userIndex != -1 || isChainUser) {
      try {
        const userId =
          isChainUser && !isChainAdmin
            ? chainId
            : storeData[userIndex]?.userInfo?.id;

        const res = await cancelUserInvite(
          userId,
          isChainUser ? chainId : undefined
        );
        toast.success(
          res?.message || "Invitations have been successfully canceled."
        );
        router.refresh();
      } catch (error: any) {
        toast.error(
          error?.message ||
            "Unable to cancel the invitation. Please try again later."
        );
      } finally {
        setUserIndex(-1);
        setchainId(-1);
      }

      setIsDeleteModalOpen(false);
      return;
    }

    setIsDeleteModalOpen(false);
    toast.error(
      "User Information Retrieval Failed for Invitation Cancellation."
    );
  };

  // Toggles the dropdown for the given index
  const toggleDropdown = (index: number) => (evt: React.MouseEvent<any>) => {
    evt.stopPropagation();
    setOpenDropdown((prev) => (prev === index ? null : index));
  };

  const handleInviteCancel = (index: number, chainId?: number) => () => {
    if (chainId) {
      setchainId(chainId);
    } else {
      setUserIndex(index);
    }

    setIsDeleteModalOpen(true);
  };

  const getSavingsLabel = (
    isDistributorStores?: boolean,
    isStoreEnrolled?: boolean,
    isEarningOpp?: boolean
  ) => {
    if (isDistributorStores) {
      return "Skus";
    } else if (isEarningOpp) {
      return "Earnings Opp.";
    } else {
      return "Store Earnings";
    }
  };

  const getSavingsOrderKey = (
    isDistributorStores?: boolean,
    isStoreEnrolled?: boolean,
    isEarningOpp?: boolean
  ) => {
    if (isDistributorStores) {
      return SORT_KEYS.SKUS;
    } else if (isEarningOpp) {
      return SORT_KEYS.SAVINGS_Opp;
    } else {
      return SORT_KEYS.ESTIMATED_SAVINGS;
    }
  };

  const [expandedStore, setExpandedStore] = useState<string | null>(null);
  const [expandedChain, setExpandedChain] = useState<string | null>(
    chainId > 0 ? chainId.toString() : null
  );
  const [chainStores, setChainStores] = useState<{
    [chainId: string]: StoreTableData[];
  }>({});
  const [loadingChainStores, setLoadingChainStores] = useState<{
    [chainId: string]: boolean;
  }>({});

  // tier details
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [tierDetails, setTierDetails] = useState<TierDetailsModalData | null>(
    null
  );
  const [programDetailsData, setProgramDetailsData] =
    useState<EnrolledProgram | null>(null);
  const [storeNameFromAPI, setStoreNameFromAPI] = useState<string | undefined>(
    undefined
  );
  const [externalStoreIdFromAPI, setExternalStoreIdFromAPI] = useState<
    string | undefined
  >(undefined);

  // Agreement selection dialog state
  const [isAgreementDialogOpen, setIsAgreementDialogOpen] = useState(false);
  const [selectedStoreForEnrollment, setSelectedStoreForEnrollment] =
    useState<StoreTableData | null>(null);
  const [enrollmentAction, setEnrollmentAction] = useState<
    "enroll" | "unenroll"
  >("enroll");

  const getProgramDetails = async (
    manufacturerId: number,
    programId: number | undefined,
    programdetailId: number | undefined
  ) => {
    try {
      const { data }: { data: EnrolledProgram } = await apiClient(
        `/programs/details?type=${ENTITY_TYPES_RESPONSE.STORE}&manufacturerId=${manufacturerId}&programId=${programId}&programDetailId=${programdetailId}&forStore=${selectedStoreData?.id}
        &warehouseId=${selectedWarehouseId}&programTimeline=${programTimeline}`
      );
      return data;
    } catch (error) {
      return null;
    }
  };

  const handleTierClick = async (index: number, tierName: string) => {
    const data = await getProgramDetails(
      manufacturer.id ?? 0,
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
        fixed_rebate_amount: selectedTier.fixed_rebate_amount
      };

      if (selectedTier.SKU) {
        newTierDetails.skus = {
          total: selectedTier.SKU.total,
          completed: selectedTier.SKU.completed
        };
      }
      setTierDetails(newTierDetails);
      setIsDetailOpen(true);
      setIsModalOpen(false);
      // if (typeof tierIndex != "number" && isOpen) setModalShowBackArrow(true);
    }

    // setTierDetails(tierDetails);
  };
  const handleTierClose = (val: boolean, openParentModal?: boolean) => {
    setIsDetailOpen(val);
    if (openParentModal) {
      setIsModalOpen(true);
    }
  };

  // Handle enrollment/unenrollment API calls
  const handleEnrollmentAction = async (store: StoreTableData) => {
    // Determine action based on current enrollment state
    const action = isStoreEnrolled ? "unenroll" : "enroll";

    // Get Current URL with Params
    const currentUrlWithParams = window.location.href;

    // Validation - check if programIds are available
    if (!programIds || programIds.length === 0) {
      toast.warning("No programs available for enrollment");
      return;
    }

    // Validation - check required fields
    if (!manufacturerId) {
      toast.error("Manufacturer information is missing");
      return;
    }

    if (!store.id) {
      toast.error("Store information is missing");
      return;
    }

    try {
      const requestBody = {
        action,
        manufacturerId,
        storeId: parseInt(store.id),
        programIds: [...programIds] // ALL available program IDs
      };

      const response = await apiClient.post(
        "/store/manual-enrollment",
        requestBody
      );

      if (response.data.success) {
        toast.success(
          action === "enroll"
            ? "Store successfully enrolled in the program"
            : "Store successfully unenrolled from the program"
        );

        // Trigger data refresh from parent component
        if (onDataRefresh) {
          try {
            // Small delay to ensure the enrollment change is processed
            await new Promise((resolve) => setTimeout(resolve, 100));
            onDataRefresh();
          } catch (error) {
            console.error("Error triggering data refresh:", error);
            // Continue with redirect if refresh fails
          }
        }

        // Refresh the page to show updated enrollment status
        // Set the "tab" query parameter to 2 in the current URL
        const url = new URL(currentUrlWithParams);
        url.searchParams.set("tab", action == "enroll" ? "2" : "1");
        url.searchParams.set("clearCache", "true");
        url.searchParams.set("random", new Date().getTime().toString());

        // Push the updated URL to the router
        router.push(url.pathname + "?" + url.searchParams.toString());
      } else {
        toast.error(response.data?.message || `Failed to ${action} store`);
      }
    } catch (error: any) {
      console.error(`Error during ${action}:`, error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        `Unable to ${action} store. Please try again.`;
      toast.error(errorMessage);
    }
  };

  // Handle agreement-based enrollment/unenrollment for sales reps
  const handleAgreementEnroll = async (agreementIds: number[]) => {
    const currentUser = getUserClient();
    if (!selectedStoreForEnrollment || !manufacturerId || !currentUser?.id) {
      toast.error(`Missing required information for ${enrollmentAction}`);
      return;
    }

    if (agreementIds.length === 0) {
      toast.error("Please select at least one agreement");
      return;
    }

    const storeId = selectedStoreForEnrollment.id;
    if (!storeId) {
      toast.error("Store ID is missing");
      return;
    }

    try {
      const storeIds = [parseInt(storeId.toString(), 10)];

      if (isNaN(storeIds[0])) {
        toast.error("Invalid store ID");
        return;
      }

      const response = await apiClient.post("/store/enroll-by-agreement", {
        action: enrollmentAction,
        agreementIds,
        storeIds,
        userId: currentUser.id
      });

      if (response.data?.success !== false) {
        toast.success(
          `Successfully ${enrollmentAction === "enroll" ? "enrolled in" : "unenrolled from"} ${agreementIds.length} agreement${
            agreementIds.length > 1 ? "s" : ""
          }`
        );

        // Trigger data refresh from parent component
        if (onDataRefresh) {
          try {
            await new Promise((resolve) => setTimeout(resolve, 100));
            onDataRefresh();
          } catch (error) {
            console.error("Error triggering data refresh:", error);
          }
        }

        // Refresh the page to show updated enrollment status
        const currentUrlWithParams = window.location.href;
        const url = new URL(currentUrlWithParams);
        url.searchParams.set("tab", enrollmentAction === "enroll" ? "2" : "1");
        url.searchParams.set("clearCache", "true");
        url.searchParams.set("random", new Date().getTime().toString());
        router.push(url.pathname + "?" + url.searchParams.toString());
      } else {
        toast.error(
          response.data?.message ||
            `Failed to ${enrollmentAction} store. Please try again.`
        );
      }
    } catch (error: any) {
      console.error(`Error during ${enrollmentAction}:`, error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        `Unable to ${enrollmentAction} store. Please try again.`;
      toast.error(errorMessage);
    }
  };

  // Handle enroll/unenroll button click - use bulk enrollment flow if callback provided
  const handleEnrollButtonClick = (
    e: React.MouseEvent,
    store: StoreTableData
  ) => {
    e.stopPropagation();

    // If onSingleStoreEnroll callback is provided, use bulk enrollment flow
    if (onSingleStoreEnroll) {
      const action = isStoreEnrolled ? "unenroll" : "enroll";
      onSingleStoreEnroll(store.id, action);
      return;
    }

    // Otherwise, use existing flow for sales reps or legacy behavior
    if (isSalesRep) {
      // For sales reps, open agreement selection dialog for both enroll and unenroll
      setSelectedStoreForEnrollment(store);
      setEnrollmentAction(isStoreEnrolled ? "unenroll" : "enroll");
      setIsAgreementDialogOpen(true);
    } else {
      // For non-sales reps, use existing enrollment action
      handleEnrollmentAction(store);
    }
  };

  // Function to fetch stores for a specific chain
  const fetchChainStores = async (chainId: string) => {
    if (chainStores[chainId]) {
      // If we already have the stores for this chain, just toggle expansion
      setExpandedChain(expandedChain === chainId ? null : chainId);
      return;
    }

    // If we have chain stores data available, use it instead of making an API call
    if (chainStoresData && chainStoresData.stores) {
      const chainData = chainStoresData.stores.find(
        (chain: any) => chain.id.toString() === chainId
      );

      // Check if chain data exists and has stores
      if (chainData && chainData.stores && Array.isArray(chainData.stores)) {
        // Transform the stores data to match StoreTableData format
        const transformedStores: StoreTableData[] = chainData.stores.map(
          (store: any) => ({
            id: store.id.toString(),
            externalStoreId: store.externalStoreId || "",
            userInfo: {
              id: store.id,
              status: "ACTIVE"
            },
            storeInfo: {
              name: store.name,
              location: store.address || "",
              rep: null
            },
            salesData: {
              purchaseVolume: {
                amount: store.totalPurchaseVolume || 0
              },
              totalSavings: {
                amount: store.totalEarnedRebate || 0
              },
              totalOppSavings: {
                amount: 0 // This might need to be calculated differently
              },
              purchasedSkus: []
            },
            programData: {
              enrolledProgram: [],
              remainingProgram: [],
              completedPrograms: store.compliantPrograms || 0,
              totalEnrolled: store.enrolledPrograms || 0,
              isEnrolled: store.enrolledPrograms > 0
            },
            chainId: store.chainId || chainData.id,
            chainNames: chainData.name || ""
          })
        );

        setChainStores((prev) => ({ ...prev, [chainId]: transformedStores }));
        setExpandedChain(chainId);
        return;
      } else {
        // Chain data exists but doesn't have stores array - need to fetch from API
        console.log("Chain data found but no stores array, fetching from API");
      }
    }

    // Fallback to API call if chain stores data is not available
    try {
      setLoadingChainStores((prev) => ({ ...prev, [chainId]: true }));

      // Try multiple endpoints for chain stores
      let data;
      try {
        // First try the optimized endpoint with manufacturerId parameter
        const response = await apiClient.get(`/chain/${chainId}/stores`, {
          params: {
            manufacturerId: manufacturerId
          }
        });
        data = response.data;
      } catch (endpointError) {
        console.warn(
          "Primary endpoint failed, trying alternative:",
          endpointError
        );
        try {
          // Fallback to alternative endpoint with manufacturerId
          const response = await apiClient.get(
            `/chain/get-stores?chainId=${chainId}&manufacturerId=${manufacturerId}`
          );
          data = response.data;
        } catch (secondError) {
          console.warn(
            "Second endpoint failed, trying third alternative:",
            secondError
          );
          // Third fallback - try the general chain stores endpoint with manufacturerId
          const response = await apiClient.get(
            `/chain/get-stores?manufacturerId=${manufacturerId}`
          );
          data = response.data;
        }
      }

      // Extract stores array from the response structure
      let storesArray = [];
      if (data && data.data && Array.isArray(data.data.stores)) {
        storesArray = data.data.stores;
      } else if (Array.isArray(data)) {
        storesArray = data;
      } else if (data && Array.isArray(data.stores)) {
        storesArray = data.stores;
      } else {
        console.error("Invalid data format received:", data);
        console.log("Available keys in data:", Object.keys(data || {}));
        console.log("Attempting to create mock data for chain:", chainId);

        // Create mock data as fallback
        const mockStores: StoreTableData[] = [
          {
            id: "mock-1",
            externalStoreId: "",
            userInfo: {
              id: 1,
              status: "ACTIVE"
            },
            storeInfo: {
              name: "Store data unavailable",
              location: "Please try again later",
              rep: null as any
            },
            salesData: {
              purchaseVolume: {
                amount: 0
              },
              totalSavings: {
                amount: 0
              },
              totalOppSavings: {
                amount: 0
              },
              purchasedSkus: []
            },
            programData: {
              enrolledProgram: [],
              remainingProgram: [],
              completedPrograms: 0,
              totalEnrolled: 0,
              isEnrolled: false
            },
            chainId: parseInt(chainId),
            chainNames: "Unknown"
          }
        ];

        setChainStores((prev) => ({ ...prev, [chainId]: mockStores }));
        console.log("using chain ID", chainId);
        setExpandedChain(chainId);
        toast.error("Unable to load store details. Please try again later.");
        return;
      }

      // Transform the stores data to match StoreTableData format
      const transformedStores: StoreTableData[] = storesArray.map(
        (store: any) => ({
          id: store.id?.toString() || store.storeId?.toString() || "",
          externalStoreId: store.externalStoreId || store.externalId || "",
          userInfo: {
            id: store.id || store.storeId,
            status: store.userInfo?.status || store.status || "ACTIVE"
          },
          storeInfo: {
            name: store.name || store.storeName || "Unknown Store",
            location: store.location || store.address || "",
            rep: store.rep || null
          },
          salesData: {
            purchaseVolume: {
              amount: store.purchaseVolume || store.totalPurchaseVolume || 0
            },
            totalSavings: {
              amount: store.totalSavings || store.totalEarnedRebate || 0
            },
            totalOppSavings: {
              amount:
                store.totalOppSavings || store?.totalRebateOpportunity || 0
            },
            purchasedSkus: store.purchasedSkus || []
          },
          programData: {
            enrolledProgram: store.enrolledProgram || [],
            remainingProgram: store.remainingProgram || [],
            completedPrograms: store.completedPrograms || 0,
            totalEnrolled: store.totalEnrolled || 0,
            isEnrolled: store.isEnrolled || false
          },
          chainId: store.chainId || 0,
          chainNames: store.chainNames || ""
        })
      );

      setChainStores((prev) => ({ ...prev, [chainId]: transformedStores }));
      setExpandedChain(chainId);
    } catch (error: any) {
      console.error("Error fetching chain stores:", error);
      console.error("Chain ID:", chainId);
      console.error("Error details:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      toast.error("Failed to load stores for this chain");
    } finally {
      setLoadingChainStores((prev) => ({ ...prev, [chainId]: false }));
    }
  };

  useEffect(() => {
    if (chainId > 0) {
      fetchChainStores(chainId.toString());
    }
  }, [chainId]);

  const navigateToStore = (
    storeId: string,
    programTimeline?: string,
    chainId?: string
  ) => {
    // Create a new URLSearchParams object with current search parameters
    const queryParams = new URLSearchParams(searchParams.toString());

    // Add or update programTimeline if provided
    if (programTimeline) {
      queryParams.set("programTimeline", programTimeline);
    }

    // Add or update chainId if provided
    if (chainId) {
      queryParams.set("chainId", chainId);
    }

    // Check if store programming is enabled for this distributor
    const user = getUserClient();
    const distributorId =
      user?.parentEntityId ?? user?.associatedUserId ?? null;
    const isStoreProgrammingEnabled = isDistributorFeatureEnabled(
      distributorId,
      STORE_PROGRAMMING_ENABLED_FOR_DISTRIBUTOR_IDS
    );

    // If store programming is not enabled, default to tab 1
    if (!isStoreProgrammingEnabled) {
      queryParams.set("store_tab_options", "1");
    }

    // Construct the final URL with all preserved parameters
    const finalUrl = `/app/store/${storeId}?${queryParams.toString()}`;
    router.push(finalUrl);
  };

  const getSortIconSrc = (sort: string) => {
    let src = sortIconDefault.src;

    if (sort === "ASC") {
      src = sortIcon.src;
    } else if (sort === "DESC") {
      src = sortIconDesc.src;
    }
    return src;
  };
  const SortableHeader: React.FC<SortableHeaderProps> = ({
    label,
    sortKey,
    customLabel,
    customKey,
    sort,
    className = "font-semibold px-2 sm:px-4 cursor-pointer",
    handleSortChange
  }) => {
    const key = customKey || (sortKey ? SORT_KEYS[sortKey] : "");

    return (
      <th className={className} onClick={() => handleSortChange(key)}>
        <span className="inline mr-2">{customLabel || label}</span>
        <Image
          className="storeSortIcon inline"
          src={getSortIconSrc(sort?.[key])}
          alt="sort icon"
          width={7}
          height={10}
        />
      </th>
    );
  };

  const handleChangeSalesRepClick = (store: StoreTableData) => () => {
    setStoreToReassign((prev) => (prev && prev.id === store.id ? null : store));
  };

  // Checkbox helper functions
  const currentPageStoreIds = useMemo(() => {
    return storeData.map((store) => store.id);
  }, [storeData]);

  const isStoreSelected = (storeId: string) => {
    return selectedStores.includes(storeId);
  };

  const handleStoreCheckboxChange = (
    storeId: string,
    checked: boolean,
    e?: React.ChangeEvent<HTMLInputElement> | React.MouseEvent
  ) => {
    if (e) {
      e.stopPropagation();
    }
    if (!setSelectedStores) return;

    if (checked) {
      // Add store to selection
      setSelectedStores([...selectedStores, storeId]);
    } else {
      // Remove store from selection
      setSelectedStores(selectedStores.filter((id) => id !== storeId));
    }
  };

  const handleSelectAllChange = (
    checked: boolean,
    e?: React.ChangeEvent<HTMLInputElement> | React.MouseEvent
  ) => {
    if (e) {
      e.stopPropagation();
    }
    if (!setSelectedStores) return;

    if (checked) {
      // Add all current page stores to selection
      const newSelection = Array.from(
        new Set([...selectedStores, ...currentPageStoreIds])
      );
      setSelectedStores(newSelection);
    } else {
      // Remove all current page stores from selection
      setSelectedStores(
        selectedStores.filter((id) => !currentPageStoreIds.includes(id))
      );
    }
  };

  // Calculate select all checkbox state
  const selectAllState = useMemo(() => {
    if (!showCheckbox || currentPageStoreIds.length === 0) {
      return { checked: false, indeterminate: false };
    }

    const selectedCount = currentPageStoreIds.filter((id) =>
      selectedStores.includes(id)
    ).length;

    if (selectedCount === 0) {
      return { checked: false, indeterminate: false };
    } else if (selectedCount === currentPageStoreIds.length) {
      return { checked: true, indeterminate: false };
    } else {
      return { checked: false, indeterminate: true };
    }
  }, [showCheckbox, currentPageStoreIds, selectedStores]);

  const showDistributorCode = isDistributor(user?.role || "");
  const isManufacturerAcc = isManufacturer(user?.role || "");

  const isTabView = windowWidth > 640 && windowWidth <= 991;

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

  // Helper function to render enrollment status indicator
  // Returns the indicator component, or null if checkbox should be shown
  const renderEnrollmentStatusIndicator = (
    enrollmentStatus: StoreEnrollmentStatusValue | undefined,
    storeId: string
  ): React.ReactNode => {
    // Only show indicators on program details pages when showCheckbox is true
    if (!isStoresPrograms || !showCheckbox) {
      return null;
    }

    // Check if store is currently being processed (enroll/unenroll action just triggered)
    // This takes priority - show static pending icon when processing
    if (processingStoreIdSet.has(storeId)) {
      return (
        <div className="flex items-center">
          <PendingIcon />
        </div>
      );
    }

    // Only show indicators if there's an actual enrollmentStatus from the API
    if (!enrollmentStatus) {
      // No status - show normal checkbox
      return null;
    }

    // Show appropriate indicator based on enrollmentStatus
    if (enrollmentStatus === "processing") {
      return (
        <div className="flex items-center">
          <PendingIcon />
        </div>
      );
    }

    if (enrollmentStatus === "failed") {
      return (
        <div className="flex items-center">
          <span className="text-red-600 text-lg font-bold">×</span>
        </div>
      );
    }

    if (enrollmentStatus === "succeeded") {
      // Show checkbox for succeeded status
      return null;
    }

    // Fallback - show normal checkbox
    return null;
  };

  return (
    <>
      {/* {isDistributorStores && (
        <ManufacturerStoreDetailsModal
          isOpen={!!selectedStoreData}
          setIsOpen={() => {
            setSelectedStore(null);
          }}
          data={selectedStoreData}
        />
      )} */}
      {selectedStoreData && (
        <>
          <StoreDetailsModal
            isOpen={isModalOpen}
            setIsOpen={setIsModalOpen}
            data={
              {
                manufacturer: {
                  id: manufacturer.id,
                  avatar: manufacturer.logo,
                  name: manufacturer.name,
                  authorized: isAuthorizedManufacturer
                },
                purchaseVolume: {
                  amount:
                    selectedStoreData?.salesData?.purchaseVolume?.amount ?? 0
                },
                totalSavings: {
                  amount:
                    selectedStoreData?.salesData?.totalSavings?.amount ?? 0
                },
                totalOppSavings: {
                  amount:
                    selectedStoreData?.salesData?.totalOppSavings?.amount ?? 0
                }
              } as EnrolledProgram
            }
            storeId={selectedStoreData.id.toString()}
            isStoreEnrolled={
              manufacturer.isCurrentUser
                ? selectedStoreData?.programData?.isEnrolled
                : isStoreEnrolled
            }
            setIsDetailOpen={handleTierClick}
            addStoreIntialToTitle={!!manufacturerId}
            selectedWarehouseId={selectedWarehouseId}
            programTimeline={programTimeline}
            isChainPrograms={isChainProgramsView}
            onStoreInfoUpdate={(storeName, externalStoreId) => {
              setStoreNameFromAPI(storeName);
              setExternalStoreIdFromAPI(externalStoreId);
            }}
            agreementId={agreementId}
          />
          <TierDetailModal
            isOpen={isDetailOpen}
            setIsOpen={handleTierClose}
            data={tierDetails}
            manfData={{
              ...programDetailsData?.manufacturer,
              authorized: isAuthorizedManufacturer
            }}
            showBackArror={true}
            showCategorizedProducts
            showPurchasedProductsButton
            isStoreEnrolled={
              manufacturer.isCurrentUser
                ? selectedStoreData?.programData?.isEnrolled
                : isStoreEnrolled
            }
            addStoreIntialToTitle={!!manufacturerId}
            canAddToWishlist={isSalesRep}
            showDistributorCode={showDistributorCode}
            storeId={selectedStoreData?.id?.toString()}
            externalStoreId={
              externalStoreIdFromAPI ||
              (selectedStoreData?.externalStoreId
                ? String(selectedStoreData.externalStoreId)
                : undefined)
            }
            storeName={storeNameFromAPI || selectedStoreData?.storeInfo?.name}
            manufacturerId={
              isSalesRep && manufacturerId
                ? manufacturerId?.toString()
                : undefined
            }
          />
        </>
      )}
      <div
        id={id}
        className={`relative storeTable text-left text-sm text-filter-light font-medium font-inter transition-opacity duration-300 ${
          isLoading ? "opacity-50 pointer-events-none" : "opacity-100"
        }`}
      >
        {isLoading && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green"></div>
          </div>
        )}
        {windowWidth > 991 ? (
          <div className="overflow-x-auto overflow-y-scroll max-h-[60vh]">
            <table className="w-full border-collapse xl:table-fixed">
              <thead className="h-11 border-b text-heading-very-light text-xs sticky top-0 bg-white z-[1]">
                <tr>
                  {showCheckbox && (
                    <th className="font-semibold sm:pl-2 xl:pl-4 w-[64px]">
                      <div className="flex items-center">
                        <Checkbox
                          id={`checkbox-select-all`}
                          checked={selectAllState.checked}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            handleSelectAllChange(e.target.checked)
                          }
                          className="w-4 h-4"
                          aria-label="Select all stores"
                        />
                        <div
                          className="relative flex items-center overflow-visible"
                          onMouseEnter={() => setShowInfoTooltip(true)}
                          onMouseLeave={() => setShowInfoTooltip(false)}
                        >
                          <Image
                            src={greyInfoIcon.src}
                            alt="Info"
                            width={14}
                            height={14}
                            className="cursor-help"
                          />
                          {showInfoTooltip && (
                            <div className="absolute left-0 top-full mt-2 z-[99999] px-3 py-2 bg-gray-800 text-white text-xs rounded whitespace-nowrap shadow-lg pointer-events-none">
                              Select checkboxes to choose program agreements for{" "}
                              {isStoreEnrolled ? "unenrollment" : "enrollment"}
                              <div className="absolute left-4 top-0 -translate-y-full border-4 border-transparent border-b-gray-800"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </th>
                  )}
                  <SortableHeader
                    className="font-semibold px-2 sm:px-4 cursor-pointer w-64"
                    label={isChainsView ? "Chain" : "Store"}
                    sortKey="SORT"
                    sort={sort}
                    handleSortChange={handleSortChange}
                  />

                  {!isChainAdmin &&
                    !isChainsView &&
                    (shouldShowChainInfo || !isIndependentStores) && (
                      <SortableHeader
                        className="font-semibold px-2 sm:px-4 w-32 cursor-pointer"
                        label="Chain"
                        sortKey="CHAIN"
                        sort={sort}
                        handleSortChange={handleSortChange}
                      />
                    )}

                  <th
                    className={
                      enablePurchaseSorting
                        ? "font-semibold px-2 sm:px-2 cursor-pointer w-36"
                        : "font-semibold px-2 sm:px-4 w-36"
                    }
                    onClick={() =>
                      handleSortChange(
                        showAnnualPurchaseVolume
                          ? SORT_KEYS.ANNUAL_PURCHASE_VOLUME_SORT
                          : SORT_KEYS.PURCHASE_VOLUME_SORT
                      )
                    }
                  >
                    {enablePurchaseSorting ? (
                      <span className="inline mr-2">Purchase Volume</span>
                    ) : (
                      "Purchase Volume"
                    )}
                    {enablePurchaseSorting && (
                      <Image
                        className="storeSortIcon inline"
                        src={getSortIconSrc(
                          sort?.[
                            showAnnualPurchaseVolume
                              ? SORT_KEYS.ANNUAL_PURCHASE_VOLUME_SORT
                              : SORT_KEYS.PURCHASE_VOLUME_SORT
                          ]
                        )}
                        alt="sort icon"
                        width={7}
                        height={10}
                      />
                    )}
                  </th>

                  <SortableHeader
                    className="font-semibold px-2 sm:px-4 w-40 cursor-pointer"
                    customLabel={getSavingsLabel(
                      isDistributorStores,
                      isStoreEnrolled
                    )}
                    customKey={getSavingsOrderKey(
                      isDistributorStores,
                      isStoreEnrolled
                    )}
                    sort={sort}
                    handleSortChange={handleSortChange}
                  />
                  {isChainsView && (
                    <SortableHeader
                      className="font-semibold px-2 sm:px-4 w-32 cursor-pointer"
                      label="Store Count"
                      sortKey="STORE_COUNT_SORT"
                      sort={sort}
                      handleSortChange={handleSortChange}
                    />
                  )}
                  {showEarningOpportunity ? (
                    <SortableHeader
                      className="font-semibold px-2 sm:px-4 w-40 cursor-pointer"
                      customLabel={getSavingsLabel(
                        isDistributorStores,
                        isStoreEnrolled,
                        true
                      )}
                      customKey={getSavingsOrderKey(
                        isDistributorStores,
                        isStoreEnrolled,
                        true
                      )}
                      sort={sort}
                      handleSortChange={handleSortChange}
                    />
                  ) : null}
                  {showNearToCompliancePercentage && (
                    <SortableHeader
                      className="font-semibold px-2 sm:px-4 w-40 lg:w-48 cursor-pointer whitespace-nowrap"
                      label="% Compliance to Next Tier"
                      sortKey="NEAR_COMPLIANCE_PERCENTAGE"
                      sort={sort}
                      handleSortChange={handleSortChange}
                    />
                  )}
                  {/* Program Compliance column */}
                  {!isChainsView && hasAnyStoreWithEnrollments && (
                    <SortableHeader
                      className="font-semibold px-2 sm:px-4 w-36 lg:w-48 cursor-pointer"
                      label="Program Compliance"
                      sortKey="PROGRAM_COMPLIANCE"
                      sort={sort}
                      handleSortChange={handleSortChange}
                    />
                  )}
                  {/* Sales Rep column header - after Program Compliance */}
                  {!isSalesRep && !isChainAdmin && !isChainsView && (
                    <th
                      className={`font-semibold px-2 sm:px-4 ${!isSalesRep && !isChainAdmin ? "w-60" : !isChainAdmin ? "w-44" : "w-24"} cursor-pointer`}
                      onClick={() =>
                        !isSalesRep
                          ? handleSortChange(
                              isDistributorStores
                                ? SORT_KEYS.DISTRIBUTOR
                                : SORT_KEYS.SALES_REP
                            )
                          : null
                      }
                    >
                      {!isChainAdmin && (
                        <span className="inline mr-2">
                          {isDistributorStores ? "Distributor" : "Sales Rep"}
                        </span>
                      )}
                      {!isSalesRep && (
                        <Image
                          className="storeSortIcon inline"
                          src={getSortIconSrc(
                            sort?.[
                              isDistributorStores
                                ? SORT_KEYS.DISTRIBUTOR
                                : SORT_KEYS.SALES_REP
                            ]
                          )}
                          alt="sort icon"
                          width={7}
                          height={10}
                        />
                      )}
                    </th>
                  )}
                  {showEnrollButton &&
                    !isDistributorSalesRepFn(user?.role || "") &&
                    !shouldHideActions && (
                      <th className="font-semibold px-2 sm:px-4 w-24">
                        Action
                      </th>
                    )}
                  {canInvite && !isSalesRep && !shouldHideActions && (
                    <>
                      {!DEPRECATE_STORE_INVITE_FEATURE && (
                        <th className="w-20">Status</th>
                      )}
                      <th className="w-16 text-center">Action</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {storeData?.length > 0 ? (
                  storeData.map((store, index) => (
                    <React.Fragment key={`${index}-${store.id}`}>
                      <tr
                        onClick={() => {
                          // Add logging for state here
                          console.log("StoreTable onClick state:", {
                            isChainAdmin,
                            isStoresPrograms,
                            isDistributorStores,
                            isChainsView,
                            expandedChain,
                            storeId: store.id,
                            programTimeline
                          });

                          if (isChainAdmin) return;

                          // Prevent navigation if compliance is 0/0 for manufacturer stores tab
                          if (isDistributorStores) {
                            const hasZeroCompliance =
                              store.programData.completedPrograms === 0 &&
                              store.programData.totalEnrolled === 0;
                            if (hasZeroCompliance) {
                              return;
                            }
                            openStoreModal(store);
                            return;
                          }

                          if (isStoresPrograms) {
                            openStoreModal(store);
                            return;
                          }
                          //  else if (isDistributorStores) {
                          //   setSelectedStore(store);
                          // }
                          else if (isChainsView) {
                            // If expansion is disabled, do nothing
                            if (disableChainExpansion) {
                              return;
                            }
                            // If chain is already expanded, route to chain overview
                            if (expandedChain === store.id) {
                              router.push(
                                getUrlWithQueryParam(
                                  `/app/store/chains/${store.id}`,
                                  "programTimeline",
                                  programTimeline
                                )
                              );
                            } else {
                              // Expand chain to show stores
                              fetchChainStores(store.id);
                            }
                          } else if (isChainProgramsView) {
                            // For chain programs view, always open modal for stores
                            openStoreModal(store);
                          } else {
                            navigateToStore(
                              store.id,
                              programTimeline,
                              isChainsView && expandedChain
                                ? expandedChain
                                : undefined
                            );
                          }
                        }}
                        className={`border-b cursor-pointer align-middle ${isStoreSelected(store.id) ? "bg-[#f0fdf4]" : "hover:bg-gray-50"}`}
                      >
                        {showCheckbox && (
                          <td
                            className="px-2 sm:pl-4 py-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {(() => {
                              const indicator = renderEnrollmentStatusIndicator(
                                store.enrollmentStatus,
                                store.id
                              );
                              if (indicator === null) {
                                // Show normal checkbox when status is undefined
                                return (
                                  <input
                                    type="checkbox"
                                    checked={isStoreSelected(store.id)}
                                    onChange={(e) =>
                                      handleStoreCheckboxChange(
                                        store.id,
                                        e.target.checked,
                                        e
                                      )
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    className="cursor-pointer"
                                    aria-label={`Select ${store.storeInfo.name}`}
                                  />
                                );
                              }
                              // Show indicator (processing, failed, or empty div for succeeded)
                              return indicator;
                            })()}
                          </td>
                        )}
                        <td className="px-2 sm:px-4 py-3">
                          <div className="min-h-10 flex flex-col justify-center">
                            <div className="flex items-center gap-2">
                              {isChainsView && !disableChainExpansion && (
                                <span className="text-black text-xs">
                                  {expandedChain === store.id ? "▼" : "▶"}
                                </span>
                              )}
                              <p className="font-medium break-words break-before-all overflow-hidden text-ellipsis hover:text-green">
                                {store.storeInfo.name}
                              </p>
                            </div>
                            {!isChainsView &&
                              store?.externalStoreId &&
                              !isEmptyString(
                                store?.externalStoreId as string
                              ) && (
                                <span className="block text-xs text-heading-very-light font-medium">
                                  {store.externalStoreId}
                                </span>
                              )}
                          </div>
                        </td>
                        {/* Chain column */}
                        {!isChainAdmin &&
                          !isChainsView &&
                          (shouldShowChainInfo || !isIndependentStores) && (
                            <td className="px-2 sm:px-4 py-3">
                              <p className="break-words break-before-all overflow-hidden text-ellipsis">
                                {store.chainNames == "None"
                                  ? ""
                                  : store.chainNames}
                              </p>
                            </td>
                          )}
                        <td className="px-2 sm:px-4 py-3 w-32">
                          $
                          {formatNumber(
                            showAnnualPurchaseVolume
                              ? (store.salesData.annualPurchaseVolume?.amount ??
                                  store.salesData.purchaseVolume.amount)
                              : store.salesData.purchaseVolume.amount
                          )}
                        </td>
                        <td className="px-2 sm:px-4 py-3 w-32">
                          {isDistributorStores
                            ? store.salesData.purchasedSkus?.length
                            : "$" +
                              formatNumber(store.salesData.totalSavings.amount)}
                        </td>
                        {isChainsView && (
                          <td className="px-2 sm:px-4 py-3 w-32">
                            {store.totalStores || 0}
                          </td>
                        )}
                        {showEarningOpportunity ? (
                          <td className="px-2 sm:px-4 py-3 w-32">
                            {store.programData.completedPrograms !=
                            store.programData.totalEnrolled
                              ? "$" +
                                formatNumber(
                                  store?.salesData?.totalOppSavings?.amount ?? 0
                                )
                              : "N/A"}
                          </td>
                        ) : null}
                        {showNearToCompliancePercentage && (
                          <td className="px-2 sm:px-4 py-3 w-32">
                            {store?.programData?.completedPrograms ==
                            store?.programData?.totalEnrolled
                              ? "N/A"
                              : `${store?.nearComplianceData?.highestCompliancePercentage ?? 0}%`}
                          </td>
                        )}
                        {/* Program Compliance column */}
                        {!isChainsView && hasAnyStoreWithEnrollments && (
                          <td className="px-2 sm:px-4 py-3 programCompliance">
                            <div className="flex items-center gap-4">
                              <div className="hidden lg:block w-32 Graph">
                                {isDistributorStores ? (
                                  <SegmentedProgressBar
                                    completed={
                                      store.programData.completedPrograms
                                    }
                                    total={store.programData.totalEnrolled}
                                  />
                                ) : (
                                  <HorizontalProgressBar
                                    percentage={
                                      calcPercentage(
                                        store.programData.completedPrograms,
                                        store.programData.totalEnrolled
                                      ) || 0
                                    }
                                  />
                                )}
                              </div>
                              <span>
                                <strong>
                                  {store.programData.completedPrograms}
                                </strong>
                                /{store.programData.totalEnrolled}
                              </span>
                            </div>
                          </td>
                        )}
                        {/* Sales Rep column - after Program Compliance */}
                        {!isSalesRep && !isChainAdmin && !isChainsView && (
                          <td
                            className={`px-2 sm:px-4 py-3 storeAvatar ${canInvite && "flex"} ${
                              !isSalesRep && canInvite
                                ? "justify-between"
                                : "justify-end"
                            } items-center gap-2.5 min-h-[76px]`}
                          >
                            {!isSalesRep &&
                              !isChainAdmin &&
                              (isDistributorStores ||
                                store.storeInfo.rep?.name) && (
                                <div>
                                  <Avatar
                                    user={
                                      isDistributorStores
                                        ? store.storeInfo?.distributor
                                        : store.storeInfo.rep
                                    }
                                  />
                                </div>
                              )}
                          </td>
                        )}
                        {showEnrollButton &&
                          !isDistributorSalesRepFn(user?.role || "") &&
                          !shouldHideActions && (
                            <td className="px-2 sm:px-4 py-3">
                              <button
                                type="button"
                                className="bg-green text-white py-1.5 px-3 text-xs rounded hover:opacity-80"
                                onClick={(e) =>
                                  handleEnrollButtonClick(e, store)
                                }
                              >
                                {isStoreEnrolled ? "Unenroll" : "Enroll"}
                              </button>
                            </td>
                          )}
                        {canInvite && !isSalesRep && !shouldHideActions && (
                          <>
                            {!DEPRECATE_STORE_INVITE_FEATURE && (
                              <td>
                                <div className="w-max text-right">
                                  {isShowInviteBtn(store) && canInvite && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (!isInviteDisabled) {
                                          handleInvite(
                                            store,
                                            isChainAdmin ? 0 : store.chainId
                                          );
                                        }
                                      }}
                                      className="bg-green text-white py-1.5 px-3 text-xs rounded hover:opacity-80 disabled:bg-gray-300"
                                      disabled={isInviteDisabled}
                                    >
                                      Invite
                                    </button>
                                  )}

                                  {[
                                    USER_STATUS.INVITATION_SENT,
                                    USER_STATUS.CHAIN_INVITATION_SENT
                                  ].includes(store?.userInfo?.status) &&
                                    canInvite && (
                                      <span className="text-[#B7931E] bg-[#836F0033] text-xs w-max block py-1.5 px-3 rounded">
                                        Invitation Sent
                                      </span>
                                    )}

                                  {[
                                    USER_STATUS.ACTIVE,
                                    !isChainAdmin
                                      ? USER_STATUS.CHAIN_ACTIVE
                                      : ""
                                  ].includes(store?.userInfo?.status) &&
                                    canInvite && (
                                      <span className="text-xs w-max block py-1.5 px-3 text-[#068458] bg-[#008355] bg-opacity-20 rounded">
                                        Active
                                      </span>
                                    )}
                                </div>
                              </td>
                            )}
                            <td
                              className="px-2 sm:px-4 py-4 text-center align-middle"
                              onClick={toggleDropdown(index)}
                            >
                              <div className="relative">
                                <Image
                                  className="inline-block"
                                  alt="Action Icon"
                                  width={16}
                                  height={2}
                                  src={dotsIcon.src}
                                />
                                {/* Dropdown Menu */}
                                {openDropdown === index && canInvite && (
                                  <div
                                    ref={dropdownRef}
                                    className="absolute left-0 mt-2 w-48 bg-white border rounded shadow-lg z-10 cursor-default translate-x-[-80%] translate-y-[-20%]"
                                  >
                                    <ul className="py-1">
                                      {!canChangeStoreSalesRep &&
                                        [
                                          USER_STATUS.INVITATION_PENDING,
                                          USER_STATUS.ACTIVE,
                                          USER_STATUS.CHAIN_ACTIVE
                                        ].includes(store?.userInfo?.status) && (
                                          <li className={`px-4 py-2`}>
                                            <span className="text-heading-very-light">
                                              No actions available at the moment
                                            </span>
                                          </li>
                                        )}
                                      {canChangeStoreSalesRep && (
                                        <li>
                                          <button
                                            onClick={handleChangeSalesRepClick(
                                              store
                                            )}
                                            className="px-4 py-2 w-full text-center text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                                          >
                                            Change Sales Rep
                                          </button>
                                        </li>
                                      )}
                                      {/* Show Cancel button only when Invitation sent */}
                                      {[
                                        USER_STATUS.INVITATION_SENT,
                                        USER_STATUS.CHAIN_INVITATION_SENT
                                      ].includes(store?.userInfo?.status) &&
                                        !DEPRECATE_STORE_INVITE_FEATURE && (
                                          <li>
                                            <button
                                              onClick={handleInviteCancel(
                                                index,
                                                !isChainAdmin
                                                  ? store.chainId
                                                  : undefined
                                              )}
                                              className="px-4 py-2 w-full text-center text-sm text-gray-700 hover:bg-gray-100 px-2 py-1 rounded transition-colors"
                                            >
                                              Cancel Invite
                                            </button>
                                          </li>
                                        )}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </td>
                          </>
                        )}
                      </tr>
                      {/* Expanded stores for chains view */}
                      {isChainsView && expandedChain === store.id && (
                        <>
                          {loadingChainStores[store.id] ? (
                            <tr>
                              <td
                                colSpan={
                                  canInvite && !isSalesRep && !shouldHideActions
                                    ? 8
                                    : 7
                                }
                                className="px-2 sm:px-4 py-3"
                              >
                                <div className="flex justify-center items-center py-4">
                                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green"></div>
                                  <span className="ml-2 text-sm text-gray-600">
                                    Loading stores...
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ) : chainStores[store.id] ? (
                            chainStores[store.id].map(
                              (storeItem, storeIndex) => (
                                <tr
                                  key={`store-${storeItem.id}-${storeIndex}`}
                                  className="border-b bg-white hover:bg-gray-50"
                                >
                                  {showCheckbox && (
                                    <td
                                      className="px-2 sm:px-4 py-3"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {(() => {
                                        const indicator =
                                          renderEnrollmentStatusIndicator(
                                            storeItem.enrollmentStatus,
                                            storeItem.id
                                          );
                                        if (indicator === null) {
                                          // Show normal checkbox when status is undefined
                                          return (
                                            <input
                                              type="checkbox"
                                              checked={isStoreSelected(
                                                storeItem.id
                                              )}
                                              onChange={(e) =>
                                                handleStoreCheckboxChange(
                                                  storeItem.id,
                                                  e.target.checked,
                                                  e
                                                )
                                              }
                                              onClick={(e) =>
                                                e.stopPropagation()
                                              }
                                              className="cursor-pointer"
                                              aria-label={`Select ${storeItem.storeInfo.name}`}
                                            />
                                          );
                                        }
                                        // Show indicator (processing, failed, or empty div for succeeded)
                                        return indicator;
                                      })()}
                                    </td>
                                  )}
                                  <td className="px-2 sm:px-4 py-3">
                                    <div className="min-h-10 flex flex-col justify-center pl-8">
                                      <p
                                        className="font-medium break-words break-before-all overflow-hidden text-ellipsis cursor-pointer hover:text-green"
                                        onClick={(e) => {
                                          e.stopPropagation();

                                          // Prevent navigation if compliance is 0/0 for manufacturer stores tab
                                          if (isDistributorStores) {
                                            const hasZeroCompliance =
                                              storeItem.programData
                                                .completedPrograms === 0 &&
                                              storeItem.programData
                                                .totalEnrolled === 0;
                                            if (hasZeroCompliance) {
                                              return;
                                            }
                                          }

                                          if (isChainProgramsView) {
                                            openStoreModal(storeItem);
                                          } else {
                                            navigateToStore(
                                              storeItem.id,
                                              programTimeline,
                                              store.id // Pass the chain ID as context
                                            );
                                          }
                                        }}
                                      >
                                        {storeItem.storeInfo.name}
                                      </p>
                                      {storeItem?.externalStoreId &&
                                        !isEmptyString(
                                          storeItem?.externalStoreId as string
                                        ) && (
                                          <span className="block text-xs text-heading-very-light font-medium">
                                            {storeItem.externalStoreId}
                                          </span>
                                        )}
                                    </div>
                                  </td>
                                  <td className="px-2 sm:px-4 py-3 w-32">
                                    $
                                    {formatNumber(
                                      showAnnualPurchaseVolume
                                        ? (storeItem.salesData
                                            .annualPurchaseVolume?.amount ??
                                            storeItem.salesData.purchaseVolume
                                              .amount)
                                        : storeItem.salesData.purchaseVolume
                                            .amount
                                    )}
                                  </td>
                                  <td className="px-2 sm:px-4 py-3 w-32">
                                    {isDistributorStores
                                      ? storeItem.salesData.purchasedSkus
                                          ?.length
                                      : "$" +
                                        formatNumber(
                                          storeItem.salesData.totalSavings
                                            .amount
                                        )}
                                  </td>
                                  {showEarningOpportunity ? (
                                    <td className="px-2 sm:px-4 py-3 w-32">
                                      {storeItem.programData
                                        .completedPrograms !=
                                      storeItem.programData.totalEnrolled
                                        ? "$" +
                                          formatNumber(
                                            storeItem?.salesData
                                              ?.totalOppSavings?.amount ?? 0
                                          )
                                        : "N/A"}
                                    </td>
                                  ) : null}
                                  {/* Program Compliance column for expanded chain stores */}
                                  {!isChainsView &&
                                    hasAnyStoreWithEnrollments && (
                                      <td className="px-2 sm:px-4 py-3 programCompliance">
                                        <div className="flex items-center gap-4">
                                          <div className="hidden lg:block w-32 Graph">
                                            {isDistributorStores ? (
                                              <SegmentedProgressBar
                                                completed={
                                                  storeItem.programData
                                                    .completedPrograms
                                                }
                                                total={
                                                  storeItem.programData
                                                    .totalEnrolled
                                                }
                                              />
                                            ) : (
                                              <HorizontalProgressBar
                                                percentage={
                                                  calcPercentage(
                                                    storeItem.programData
                                                      .completedPrograms,
                                                    storeItem.programData
                                                      .totalEnrolled
                                                  ) || 0
                                                }
                                              />
                                            )}
                                          </div>
                                          <span>
                                            <strong>
                                              {
                                                storeItem.programData
                                                  .completedPrograms
                                              }
                                            </strong>
                                            /
                                            {
                                              storeItem.programData
                                                .totalEnrolled
                                            }
                                          </span>
                                        </div>
                                      </td>
                                    )}
                                  {isChainsView && (
                                    <td className="px-2 sm:px-4 py-3 w-32"></td>
                                  )}
                                  {!isSalesRep &&
                                    !isChainAdmin &&
                                    !isChainsView && (
                                      <td className="px-2 sm:px-4 py-3 storeAvatar">
                                        {!isSalesRep &&
                                          !isChainAdmin &&
                                          (isDistributorStores ||
                                            storeItem.storeInfo.rep?.name) && (
                                            <div>
                                              <Avatar
                                                user={
                                                  isDistributorStores
                                                    ? storeItem.storeInfo
                                                        ?.distributor
                                                    : storeItem.storeInfo.rep
                                                }
                                              />
                                            </div>
                                          )}
                                      </td>
                                    )}
                                  {showEnrollButton &&
                                    !isDistributorSalesRepFn(
                                      user?.role || ""
                                    ) && (
                                      <td className="px-2 sm:px-4 py-3">
                                        <button
                                          type="button"
                                          className="bg-green text-white py-1.5 px-3 text-xs rounded hover:opacity-80"
                                          onClick={(e) =>
                                            handleEnrollButtonClick(
                                              e,
                                              storeItem
                                            )
                                          }
                                        >
                                          {isStoreEnrolled
                                            ? "Unenroll"
                                            : "Enroll"}
                                        </button>
                                      </td>
                                    )}
                                  {canInvite && !isSalesRep && (
                                    <>
                                      <td></td>
                                      <td></td>
                                    </>
                                  )}
                                </tr>
                              )
                            )
                          ) : null}
                        </>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr className="border-b">
                    <td
                      className="px-2 sm:px-4 py-3"
                      colSpan={
                        (canInvite && !isSalesRep && !shouldHideActions
                          ? 8
                          : 7) + (showCheckbox ? 1 : 0)
                      }
                    >
                      <p className="text-center">
                        {isStoresPrograms
                          ? !isStoreEnrolled
                            ? MESSAGES.NOT_ENROLLED_STORES_NOT_FOUND
                            : MESSAGES.ENROLLED_STORES_NOT_FOUND
                          : MESSAGES.NO_RECORDS_FOUND}
                        &nbsp; If you believe this is incorrect, please contact
                        us at&nbsp;
                        <a href="mailto:help@splinktechnlogies.com">
                          help@splinktechnlogies.com
                        </a>
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div
            id={`${id}-table`}
            className={`my-4 pt-4 text-sm -mx-4 bg-common-bg -mb-4 ${!canInvite && !isSalesRep ? "mt-4 md:mt-8" : "mt-2 md:-mt-5"} ${isManufacturerAcc && "mt-0 md:-mt-10"}`}
          >
            <div className="flex gap-4 mb-4 mx-2">
              <label className="text-filter-light text-xs w-full font-medium flex flex-col gap-2">
                Sort By
                <SelectFilter
                  queryParam="sortKey"
                  options={Object.entries(SORT_KEYS).map(([key, value]) => ({
                    value,
                    label:
                      key == "SORT"
                        ? "Store Name"
                        : key
                            .split("_")
                            .map(
                              (word) =>
                                word.charAt(0).toUpperCase() +
                                word.slice(1).toLowerCase()
                            )
                            .join(" ")
                  }))}
                  className="outline-none rounded p-3 border border-border-gray flex-1"
                />
              </label>
              <label className="text-filter-light text-xs w-full font-medium flex flex-col gap-2">
                Sort Order
                <SelectFilter
                  queryParam="sort"
                  options={[
                    {
                      value: "DESC",
                      label: "DESC"
                    },
                    {
                      value: "ASC",
                      label: "ASC"
                    }
                  ]}
                  className="outline-none rounded p-3 border border-border-gray flex-1"
                />
              </label>
            </div>
            {storeData?.length > 0 ? (
              storeData.map((store, index) => (
                <div
                  key={`${store.id}-${store.storeInfo.name}`}
                  className="shadow rounded-lg py-3 px-4 bg-white mb-3"
                >
                  <div
                    className="flex justify-between items-center font-medium cursor-pointer gap-3"
                    onClick={() =>
                      setExpandedStore(
                        expandedStore == store.id ? null : store.id
                      )
                    }
                  >
                    <div className="title flex gap-2 items-center">
                      {showCheckbox && (
                        <>
                          {(() => {
                            const indicator = renderEnrollmentStatusIndicator(
                              store.enrollmentStatus,
                              store.id
                            );
                            if (indicator === null) {
                              // Show normal checkbox when status is undefined
                              return (
                                <input
                                  type="checkbox"
                                  checked={isStoreSelected(store.id)}
                                  onChange={(e) =>
                                    handleStoreCheckboxChange(
                                      store.id,
                                      e.target.checked,
                                      e
                                    )
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedStore(
                                      expandedStore == store.id
                                        ? null
                                        : store.id
                                    );
                                  }}
                                  className="cursor-pointer"
                                  aria-label={`Select ${store.storeInfo?.name}`}
                                />
                              );
                            }
                            // Show indicator (processing, failed, or empty div for succeeded)
                            return indicator;
                          })()}
                        </>
                      )}
                      <span className="text-xl">
                        {expandedStore === store.id ? "-" : "+"}
                      </span>
                      <h4 className="text-base text-highlighted-color">
                        {store.storeInfo?.name}
                      </h4>
                    </div>

                    <div className="flex gap-2">
                      {isTabView && !isSalesRep && (
                        <div className="isDistributorOrSalesRepStores flex items-center gap-2">
                          <span className="text-filter-light text-xs font-medium align-middle mt-1">
                            {!isSalesRep &&
                              (isDistributorStores
                                ? "Distributor:"
                                : "Sales Rep:")}
                          </span>
                          <div className="mt-1 text-highlighted-color font-semibold">
                            {!isSalesRep &&
                              !isChainAdmin &&
                              (isDistributorStores ||
                                store.storeInfo.rep?.name) && (
                                <div>
                                  <Avatar
                                    user={
                                      isDistributorStores
                                        ? store.storeInfo?.distributor
                                        : store.storeInfo.rep
                                    }
                                  />
                                </div>
                              )}
                          </div>
                        </div>
                      )}
                      {canInvite && !isSalesRep && !shouldHideActions && (
                        <button
                          className="p-4 text-center align-middle"
                          onClick={toggleDropdown(index)}
                        >
                          <Image
                            className="inline-block"
                            alt="Action Icon"
                            width={16}
                            height={2}
                            src={dotsIcon.src}
                          />
                          {/* Dropdown Menu */}
                          {openDropdown === index &&
                            canInvite &&
                            !isSalesRep &&
                            !shouldHideActions && (
                              <div
                                ref={dropdownRef}
                                className="absolute right-0 mt-2 w-48 bg-white border rounded shadow-lg z-10 cursor-default"
                              >
                                <ul className="py-1">
                                  <li className="px-4 py-2">
                                    {[
                                      USER_STATUS.INVITATION_PENDING,
                                      USER_STATUS.ACTIVE,
                                      USER_STATUS.CHAIN_ACTIVE
                                    ].includes(store?.userInfo?.status) && (
                                      <span className="text-heading-very-light">
                                        No actions available at the moment
                                      </span>
                                    )}
                                    {/* Show Cancel button only when Invitation sent */}
                                    {[
                                      USER_STATUS.INVITATION_SENT,
                                      USER_STATUS.CHAIN_INVITATION_SENT
                                    ].includes(store?.userInfo?.status) && (
                                      <button
                                        className="w-full py-2 bg-danger hover:opacity-90 text-white"
                                        onClick={handleInviteCancel(
                                          index,
                                          !isChainAdmin
                                            ? store.chainId
                                            : undefined
                                        )}
                                      >
                                        Cancel
                                      </button>
                                    )}
                                  </li>
                                </ul>
                              </div>
                            )}
                        </button>
                      )}
                    </div>
                  </div>
                  {expandedStore === store.id && (
                    <div className="tabContent">
                      {!isChainAdmin &&
                        !isChainsView &&
                        (shouldShowChainInfo ||
                          store.chainNames !== "None") && (
                          <div className="chain mt-4">
                            <>
                              <span className="text-filter-light text-xs font-medium">
                                Chain
                              </span>
                              <p className="mt-1 text-highlighted-color font-semibold">
                                {store.chainNames}
                              </p>{" "}
                            </>
                          </div>
                        )}
                      <div className="mt-4 flex justify-between flex-wrap gap-4 text-gray-700">
                        <div className="purchaseVolume">
                          <span className="text-filter-light text-xs font-medium">
                            Purchase Volume
                          </span>
                          <p className="mt-1 text-highlighted-color font-semibold">
                            $
                            {formatNumber(
                              showAnnualPurchaseVolume
                                ? (store.salesData.annualPurchaseVolume
                                    ?.amount ??
                                    store.salesData.purchaseVolume.amount)
                                : store.salesData.purchaseVolume.amount
                            )}
                          </p>
                        </div>
                        <div className="savingLabel">
                          <span className="text-filter-light text-xs font-medium">
                            {getSavingsLabel(
                              isDistributorStores,
                              isStoreEnrolled
                            )}
                          </span>
                          <p className="mt-1 text-highlighted-color font-semibold">
                            {isDistributorStores
                              ? store.salesData.purchasedSkus?.length
                              : "$" +
                                formatNumber(
                                  store.salesData.totalSavings.amount
                                )}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex justify-between flex-wrap gap-4 text-gray-700 mb-2">
                        {!isTabView && (
                          <div className="isDistributorOrSalesRepStores">
                            <span className="text-filter-light text-xs font-medium">
                              {!isSalesRep &&
                                (isDistributorStores
                                  ? "Distributor"
                                  : "Sales Rep")}
                            </span>
                            <p className="mt-1 text-highlighted-color font-semibold">
                              {!isSalesRep &&
                                !isChainAdmin &&
                                (isDistributorStores ||
                                  store.storeInfo.rep?.name) && (
                                  <Avatar
                                    user={
                                      isDistributorStores
                                        ? store.storeInfo?.distributor
                                        : store.storeInfo.rep
                                    }
                                  />
                                )}
                            </p>
                          </div>
                        )}
                        {canInvite &&
                          !isSalesRep &&
                          !DEPRECATE_STORE_INVITE_FEATURE && (
                            <div className="status">
                              <div className="isDistributorOrSalesRepStores">
                                <span className="text-filter-light text-xs font-medium">
                                  Status
                                </span>
                                <div className="mt-1 text-highlighted-color font-semibold">
                                  <div className="w-max text-right">
                                    {isShowInviteBtn(store) &&
                                      !DEPRECATE_STORE_INVITE_FEATURE &&
                                      canInvite &&
                                      !isSalesRep && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (!isInviteDisabled) {
                                              handleInvite(
                                                store,
                                                isChainAdmin ? 0 : store.chainId
                                              );
                                            }
                                          }}
                                          className="bg-green text-white py-1.5 px-3 text-xs rounded hover:opacity-80 disabled:bg-gray-300"
                                          disabled={isInviteDisabled}
                                        >
                                          Invite
                                        </button>
                                      )}

                                    {[
                                      USER_STATUS.INVITATION_SENT,
                                      USER_STATUS.CHAIN_INVITATION_SENT
                                    ].includes(store?.userInfo?.status) &&
                                      canInvite &&
                                      !isSalesRep && (
                                        <span className="text-[#B7931E] bg-[#836F0033] text-xs w-max block py-1.5 px-3 rounded">
                                          Invitation Sent
                                        </span>
                                      )}

                                    {[
                                      USER_STATUS.ACTIVE,
                                      !isChainAdmin
                                        ? USER_STATUS.CHAIN_ACTIVE
                                        : ""
                                    ].includes(store?.userInfo?.status) &&
                                      canInvite &&
                                      !isSalesRep && (
                                        <span className="text-xs w-max block py-1.5 px-3 text-[#068458] bg-[#008355] bg-opacity-20 rounded">
                                          Active
                                        </span>
                                      )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        {showEnrollButton && !shouldHideActions && (
                          <div className="w-full">
                            <button
                              type="button"
                              className="bg-green text-white py-1.5 px-3 text-xs rounded hover:opacity-80"
                              onClick={(e) => handleEnrollButtonClick(e, store)}
                            >
                              {isStoreEnrolled ? "Unenroll" : "Enroll"}
                            </button>
                          </div>
                        )}
                        {!isChainAdmin && (
                          <div className="my-3 flex justify-between flex-wrap gap-4 text-green font-medium w-full sm:w-auto">
                            <button
                              onClick={() => {
                                if (isChainAdmin) return;
                                if (isStoresPrograms || isDistributorStores) {
                                  openStoreModal(store);
                                } else if (isChainProgramsView) {
                                  // For chain programs view, always open modal for stores
                                  openStoreModal(store);
                                } else if (isChainsView) {
                                  // Navigate to chain details page
                                  router.push(`/app/store/chains/${store.id}`);
                                } else {
                                  navigateToStore(
                                    store.id,
                                    programTimeline,
                                    isChainsView && expandedChain
                                      ? expandedChain
                                      : undefined
                                  );
                                }
                              }}
                            >
                              More Details
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-center font-medium text-heading-very-light text-sm p-4">
                {isStoresPrograms
                  ? !isStoreEnrolled
                    ? MESSAGES.NOT_ENROLLED_STORES_NOT_FOUND
                    : MESSAGES.ENROLLED_STORES_NOT_FOUND
                  : MESSAGES.NO_RECORDS_FOUND}
                &nbsp; If you believe this is incorrect, please contact us
                at&nbsp;
                <a href="mailto:help@splinktechnlogies.com">
                  help@splinktechnlogies.com
                </a>
              </p>
            )}
          </div>
        )}
        {storeData?.length > 0 && (
          <div className="table-footer mt-10 mb-3">
            <div className="flex gap-4 justify-between items-center flex-col sm:flex-row">
              <span className="font-light">
                Showing
                <strong className="font-medium">
                  {` ${resStartNum} - ${resEndNum}`} of {totalStores}
                </strong>
              </span>
              <Pagination
                totalPages={totalPages}
                currentPage={currentPage}
                onPageChange={(page) => {
                  // Read current searchParams directly to avoid stale values
                  const currentParams = new URLSearchParams(
                    searchParams.toString()
                  );
                  const updatedQuery = generateQueryString(currentParams, {
                    [pageVariable]: page,
                    sort: searchParams.get("sort"),
                    s: searchParams.get("s"),
                    chainId: searchParams.get("chainId"),
                    dtId: searchParams.get("dtId"),
                    srId: searchParams.get("srId")
                  });

                  router.push(`${location.pathname}?${updatedQuery}`);
                }}
              />
            </div>
          </div>
        )}
      </div>
      <InviteNewStoreModal
        storeDetails={storeProfileDetails}
        isOpen={isInviteStorePopupOpen}
        onSuccess={onInvitationSent}
        onClose={(val: boolean) => setIsInviteStorePopupOpen(val)}
      />
      <InviteNewChainModal
        chainDetails={selectedChainDetails}
        isOpen={isInviteChainPopupOpen}
        onSuccess={onInvitationSent}
        onClose={(val: boolean) => setIsInviteChainPopupOpen(val)}
      />
      <ConfirmWishlistItemDelete
        title="Confirm Invitation Cancellation"
        message="Are you sure you want to cancel this invitation?"
        isOpen={isDeleteModalOpen}
        onConfirm={onCancelInviteConfirm}
        onClose={() => setIsDeleteModalOpen(false)}
      />
      <AssignStoreSalesRepModal
        store={storeToReassign}
        isOpen={storeToReassign ? true : false}
        onClose={() => {
          setStoreToReassign(null);
        }}
        onUpdate={(salesRepId: number, salesRepName: string) => {
          const st = {
            ...storeToReassign,
            storeInfo: {
              ...storeToReassign?.storeInfo,
              rep: {
                ...storeToReassign?.storeInfo?.rep,
                associatedUserId: salesRepId,
                name: salesRepName
              }
            }
          };
          setStoreData((prev) =>
            prev.map((store: StoreTableData) =>
              st.id == store.id ? (st as StoreTableData) : store
            )
          );
          setStoreToReassign(st as StoreTableData);
        }}
        salesReps={salesReps ?? []}
      />

      {/* Agreement Selection Dialog */}
      {selectedStoreForEnrollment && manufacturerId && (
        <AgreementSelectionDialog
          isOpen={isAgreementDialogOpen}
          onClose={() => {
            setIsAgreementDialogOpen(false);
            setSelectedStoreForEnrollment(null);
          }}
          manufacturerId={manufacturerId}
          storeId={selectedStoreForEnrollment.id}
          action={enrollmentAction}
          onEnroll={handleAgreementEnroll}
        />
      )}
    </>
  );
};

export default StoreTable;
