"use client";

// Import core functionality

// Import Components
import { ViewProgramPdfButton } from "@/components/Elements/ViewProgramPdfButton";
import StoreProgramDetailDashboardCards from "@/components/StoreProgramDetail/StoreProgramDetailDashboardCards";
import StoreProgramDetailHeader from "@/components/StoreProgramDetail/StoreProgramDetailHeader";
import StoreProgramDetailLoading from "@/components/StoreProgramDetail/StoreProgramDetailLoading";
import StoreProgramDetailTabs from "@/components/StoreProgramDetail/StoreProgramDetailTabs";

// Import Utils
import { CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS } from "@/utils/constants";
import { getUserClient } from "@/utils/getUserClient";
import { isDistributorFeatureEnabled } from "@/utils/helper";

import GenerateCsvBtn from "@/components/Elements/GenerateCsvBtn";
import SelectBox from "@/components/Form/SelectBox";
import WarehouseSelectFilter from "@/components/WarehouseSelectFilter";
import { APP_ROUTES } from "@/configs/routes";
import { apiClient } from "@/lib/axiosClient";
import { trackEvent } from "@/lib/mixpanelClient";
import {
  buildAgreementOptions,
  buildProgramIdToAgreementIdsMap,
  DEFAULT_AGREEMENT_VALUE,
  filterAgreementsWithPrograms,
  filterProgramsByAgreement
} from "@/utils/agreementHelper";
import {
  getProgramTimelineQueryParam,
  getUrlWithQueryParam
} from "@/utils/helper";
import { calculateComplianceTotals } from "@/utils/programComplianceHelper";
import {
  isDistributorAdmin,
  isDistributorGeneralManager,
  isDistributorSalesRepManager
} from "@/utils/rolesConditions";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-toastify";
import {
  getRetailerProgramDetails,
  getRetailerProgramsComplianceDetails,
  getStoresListing
} from "./programDetailAPIsClient";

interface ManufacturerProgramDetailProps {
  userId: number;
  params: { id: string }; // Capture dynamic route parameter
  searchParams: { [key: string]: string }; // Capture query parameters,
  isSalesRep?: boolean;
  warehouses?: any[];
  pdfUrl?: string | null;
}
const StoreProgramDetailPage = ({
  params,
  searchParams,
  isSalesRep = false,
  warehouses,
  pdfUrl
}: ManufacturerProgramDetailProps) => {
  const [cache, setCache] = useState<any>({});

  const { id } = params;
  const {
    manufacturerName,
    s: searchQuery,
    enrolledPage,
    notEnrolledPage,
    sort,
    sortKey,
    warehouseId,
    isInternal
  } = searchParams;

  const programTimeline = getProgramTimelineQueryParam(
    searchParams?.programTimeline
  );
  const isInternalInitiative = searchParams?.isInternal === "true";
  const clearCache = searchParams?.clearCache === "true";
  const manufacturerId = Number(id);
  const [apiData, setApiData] = useState<any>();
  const [programStoreCompliancesDetail, setProgramStoreCompliancesDetail] =
    useState<any>();
  const [enrolledProgram, setEnrolledProgram] = useState<any>({});
  const [agreements, setAgreements] = useState<any[]>([]);
  const [selectedAgreementId, setSelectedAgreementId] = useState<string>(
    DEFAULT_AGREEMENT_VALUE
  );
  const [unenrolledProgram, setUnenrolledProgram] = useState<any>({});
  const [categorizedProducts, setCategorizedProducts] = useState({});
  const [loadingCategorizedProducts, setLoadingCategorizedProducts] =
    useState(false);
  const [loadingRetailerProgramDetails, setLoadingRetailerProgramDetails] =
    useState(false);
  const [
    loadingRetailerProgramComplianceDetails,
    setLoadingRetailerProgramComplianceDetails
  ] = useState(false);
  const [loadingStoresListing, setLoadingStoresListing] = useState(false);

  // State for selected stores for bulk enrollment
  const [selectedEnrolledStores, setSelectedEnrolledStores] = useState<
    string[]
  >([]);
  const [selectedUnenrolledStores, setSelectedUnenrolledStores] = useState<
    string[]
  >([]);
  // Store IDs that should show the pending spinner (persists across tab switches)
  const [processingStoreIds, setProcessingStoreIds] = useState<Set<string>>(
    new Set()
  );
  const [isBulkEnrollmentDialogOpen, setIsBulkEnrollmentDialogOpen] =
    useState(false);
  const [bulkEnrollmentAction, setBulkEnrollmentAction] = useState<
    "enroll" | "unenroll"
  >("enroll");
  const [isBulkEnrollmentLoading, setIsBulkEnrollmentLoading] = useState(false);

  // Track initial mount to distinguish between initial load and subsequent changes
  const isInitialMount = useRef(true);

  // Get user to check distributor ID for feature flag
  const user = getUserClient();
  const isAdmin = isDistributorAdmin(user?.role || "");
  const isSalesRepManager = isDistributorSalesRepManager(user?.role || "");
  const isGeneralManager = isDistributorGeneralManager(user?.role || "");
  const distributorId = user?.parentEntityId ?? user?.associatedUserId ?? null;

  const isChainProgramsEnabled = isDistributorFeatureEnabled(
    distributorId,
    CHAIN_PROGRAMS_ENABLED_FOR_DISTRIBUTOR_IDS
  );

  // Fetch function
  const fetchRetailerProgramDetails = async () => {
    try {
      setLoadingRetailerProgramDetails(true);

      const cacheKey = `fetchRetailerProgramDetails-${manufacturerId}-${searchQuery}-${enrolledPage}-${notEnrolledPage}-${sort}-${sortKey}-${warehouseId}-${programTimeline}-internal-${isInternalInitiative}-${isChainProgramsEnabled}`;
      if (cache[cacheKey] && !clearCache) {
        setApiData(cache[cacheKey].storeProgramDetail);
        setLoadingRetailerProgramDetails(false);
        return;
      }

      // Replace with your API endpoint
      const data = await getRetailerProgramDetails(
        manufacturerId,
        "STORE",
        searchQuery,
        Number(enrolledPage ?? 1),
        Number(notEnrolledPage ?? 1),
        sort,
        sortKey,
        warehouseId,
        programTimeline,
        isInternalInitiative,
        isChainProgramsEnabled,
        clearCache
      );

      // Update state with fetched data
      setApiData(data.storeProgramDetail);

      // Track program view
      if (data.storeProgramDetail?.programs?.retailer?.length > 0) {
        const program = data.storeProgramDetail.programs.retailer[0];
        trackEvent("View Program Details", {
          programName: program.type,
          manufacturerId: manufacturerId,
          manufacturerName: manufacturerName,
          programType: program.type,
          rebateType: program.rebateType,
          totalStores: enrolledProgram?.totalStores || 0,
          enrolledStores: enrolledProgram?.stores?.length || 0,
          rebate: program.rebate,
          storeCompliance: program.storeCompliance
        });
      }

      // Cache the response
      setCache((prevCache: any) => ({
        ...prevCache,
        [cacheKey]: data
      }));
    } catch (error) {
      console.error("Error fetching retailer program details:", error);
    } finally {
      setLoadingRetailerProgramDetails(false);
    }
  };

  const fetchRetailerProgramComplianceDetails = async () => {
    try {
      setLoadingRetailerProgramComplianceDetails(true);

      const cacheKey = `fetchRetailerProgramComplianceDetails-${manufacturerId}-${warehouseId}-${programTimeline}-internal-${isInternalInitiative}-${isChainProgramsEnabled}-${searchQuery}-${enrolledPage}-${notEnrolledPage}-${sort}-${sortKey}`;
      if (cache[cacheKey] && !clearCache) {
        setProgramStoreCompliancesDetail(cache[cacheKey]);
        setLoadingRetailerProgramComplianceDetails(false);
        return;
      }

      // Replace with your API endpoint
      const data = await getRetailerProgramsComplianceDetails(
        manufacturerId,
        warehouseId,
        programTimeline,
        isInternalInitiative,
        isChainProgramsEnabled,
        clearCache
      );

      // Update state with fetched data
      setProgramStoreCompliancesDetail(data);

      // Cache the response
      setCache((prevCache: any) => ({
        ...prevCache,
        [cacheKey]: data
      }));
    } catch (error) {
      // Set empty array as fallback to prevent undefined errors
      setProgramStoreCompliancesDetail([]);
    } finally {
      setLoadingRetailerProgramComplianceDetails(false);
    }
  };

  const fetchStoresListing = async (firstTimeLoading = true) => {
    try {
      if (firstTimeLoading) {
        setLoadingStoresListing(true);
      }

      // Only include agreementId in cache key and API call if it's not the default value
      const agreementIdForCache =
        selectedAgreementId && selectedAgreementId !== DEFAULT_AGREEMENT_VALUE
          ? selectedAgreementId
          : "";
      const cacheKey = `fetchStoresListing-${manufacturerId}-${searchQuery}-${enrolledPage}-${notEnrolledPage}-${sort}-${sortKey}-${warehouseId}-${programTimeline}-${agreementIdForCache}`;
      if (cache[cacheKey] && !clearCache) {
        setEnrolledProgram(cache[cacheKey].enrolledProgram);
        setUnenrolledProgram(cache[cacheKey].unenrolledProgram);
        return;
      }

      const agreementId =
        selectedAgreementId && selectedAgreementId !== DEFAULT_AGREEMENT_VALUE
          ? selectedAgreementId
          : undefined;
      const data = await getStoresListing(
        manufacturerId,
        searchQuery,
        Number(enrolledPage ?? 1),
        Number(notEnrolledPage ?? 1),
        sort,
        sortKey,
        undefined,
        warehouseId,
        getProgramTimelineQueryParam(programTimeline),
        isInternalInitiative,
        isChainProgramsEnabled,
        clearCache,
        agreementId
      );
      setEnrolledProgram(data.enrolledProgram);
      setUnenrolledProgram(data.unenrolledProgram);

      // Clear processing spinner once backend status is present
      const enrolledStores = (data as any)?.enrolledProgram?.stores || [];
      const unenrolledStores = (data as any)?.unenrolledProgram?.stores || [];
      const storesWithStatus: string[] = [
        ...enrolledStores,
        ...unenrolledStores
      ]
        .filter((s: any) => !!s?.enrollmentStatus)
        .map((s: any) => String(s.id));
      if (storesWithStatus.length) {
        setProcessingStoreIds((prev) => {
          const next = new Set(prev);
          storesWithStatus.forEach((id) => next.delete(id));
          return next;
        });
      }

      // Cache the response
      setCache((prevCache: any) => ({
        ...prevCache,
        [cacheKey]: data
      }));
    } catch (error) {
      console.error("Error fetching stores listing:", error);
    } finally {
      if (firstTimeLoading) {
        setLoadingStoresListing(false);
      }
    }
  };

  const fetchCategorizedProducts = async (
    manufacturerId: number,
    programsType: string
  ) => {
    try {
      setLoadingCategorizedProducts(true);

      const programTimelineQueryParam =
        getProgramTimelineQueryParam(programTimeline);

      const url = `/programs/categorized-products?type=${programsType}&manufacturerId=${manufacturerId}&programTimeline=${programTimelineQueryParam}&warehouseId=${warehouseId}`;

      const cacheKey = url;
      if (cache[cacheKey] && !clearCache) {
        setCategorizedProducts(cache[cacheKey]);
        setLoadingCategorizedProducts(false);
        return;
      }

      const { data } = await apiClient.get(url);
      setCategorizedProducts(data);

      // Cache the response
      setCache((prevCache: any) => ({
        ...prevCache,
        [cacheKey]: data
      }));

      return data;
    } catch (error) {
      throw new Error("Failed to fetch retailer program details");
    } finally {
      setLoadingCategorizedProducts(false);
    }
  };

  const fetchAgreements = async () => {
    try {
      // Build URL with timeline parameter
      let url = `/agreements?manufacturerId=${manufacturerId}`;
      if (programTimeline) {
        url += `&timeline=${programTimeline}`;
      }

      const response = await apiClient.get(url);

      const agreementsData = response?.data?.agreements || [];

      setAgreements(agreementsData);

      // Auto-select agreement based on priority
      if (agreementsData.length > 0) {
        const uniqueAgreements = new Map<number, string>();
        agreementsData.forEach((agreement: any) => {
          if (!uniqueAgreements.has(agreement.agreementId)) {
            uniqueAgreements.set(
              agreement.agreementId,
              agreement.agreementName
            );
          }
        });

        if (uniqueAgreements.size === 1) {
          // If only one agreement, select it
          const agreementId = Array.from(uniqueAgreements.keys())[0];
          setSelectedAgreementId(String(agreementId));
        } else if (uniqueAgreements.size > 1) {
          // If multiple agreements, find one with "Retail" in the name
          const retailAgreement = Array.from(uniqueAgreements.entries()).find(
            ([, name]) => name.toLowerCase().includes("retail")
          );

          if (retailAgreement) {
            setSelectedAgreementId(String(retailAgreement[0]));
          } else {
            // If no "Retail" agreement found, select the first one
            const firstAgreementId = Array.from(uniqueAgreements.keys())[0];
            setSelectedAgreementId(String(firstAgreementId));
          }
        }
      }
    } catch (error) {
      setAgreements([]);
    }
  };

  useEffect(() => {
    Promise.all([
      fetchCategorizedProducts(manufacturerId, "STORE"),
      fetchRetailerProgramDetails(),
      fetchRetailerProgramComplianceDetails(),
      fetchAgreements()
    ]);
  }, [warehouseId, programTimeline, manufacturerId, distributorId]);

  // We're no longer merging the data - we'll calculate totals directly in the render function

  // Handle bulk enrollment/unenrollment
  const handleBulkEnrollment = async () => {
    const selectedStores =
      bulkEnrollmentAction === "enroll"
        ? selectedUnenrolledStores
        : selectedEnrolledStores;

    if (selectedStores.length === 0) {
      toast.error("Please select at least one store");
      return;
    }

    if (!agreements || agreements.length === 0) {
      toast.error("No agreements available for this manufacturer");
      return;
    }

    // Extract agreement IDs based on selectedAgreementId
    let agreementIds: number[];
    if (
      selectedAgreementId &&
      selectedAgreementId !== DEFAULT_AGREEMENT_VALUE
    ) {
      agreementIds = Array.from(
        new Set(
          agreements
            .filter(
              (agreement) =>
                agreement.agreementId.toString() === selectedAgreementId
            )
            .map((agreement) => agreement.agreementId)
        )
      );
    } else {
      agreementIds = Array.from(
        new Set(agreements.map((agreement) => agreement.agreementId))
      );
    }

    if (agreementIds.length === 0) {
      toast.error("No agreements available for enrollment");
      return;
    }

    if (!user?.id) {
      toast.error("User information is missing");
      return;
    }

    // Start per-store pending spinners only after confirm
    setProcessingStoreIds(new Set(selectedStores));
    setIsBulkEnrollmentLoading(true);

    try {
      const storeIds = selectedStores.map((id) => parseInt(id, 10));

      const response = await apiClient.post("/store/enroll-by-agreement", {
        action: bulkEnrollmentAction,
        agreementIds,
        storeIds,
        userId: user.id
      });

      if (response.data?.success !== false) {
        // const message =
        // response.data?.data?.message ||
        // response.data?.message ||
        // `Your request to ${bulkEnrollmentAction === "enroll" ? "enroll" : "unenroll"} ${selectedStores.length} store${selectedStores.length > 1 ? "s" : ""} has been added to the queue.`;
        // toast.success(message);
        toast.success(
          `We've received your ${bulkEnrollmentAction === "enroll" ? "enrollment" : "unenrollment"} request and it will be processed within 24 hours.`
        );

        // Clear selected stores
        if (bulkEnrollmentAction === "enroll") {
          setSelectedUnenrolledStores([]);
        } else {
          setSelectedEnrolledStores([]);
        }

        // Close dialog
        setIsBulkEnrollmentDialogOpen(false);

        // Refresh data
        await Promise.all([
          fetchStoresListing(true),
          fetchRetailerProgramDetails()
        ]);

        // Optionally navigate to appropriate tab
        // The data refresh will update the UI automatically
      } else {
        toast.error(
          response.data?.message ||
            `Failed to ${bulkEnrollmentAction} stores. Please try again.`
        );
        // Clear optimistic processing state on failure response
        setProcessingStoreIds((prev) => {
          const next = new Set(prev);
          selectedStores.forEach((id) => next.delete(id));
          return next;
        });
      }
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        `Unable to ${bulkEnrollmentAction} stores. Please try again.`;
      toast.error(errorMessage);
      // Clear optimistic processing state on thrown error
      setProcessingStoreIds((prev) => {
        const next = new Set(prev);
        selectedStores.forEach((id) => next.delete(id));
        return next;
      });
    } finally {
      setIsBulkEnrollmentLoading(false);
    }
  };

  // Open bulk enrollment dialog
  const openBulkEnrollmentDialog = (action: "enroll" | "unenroll") => {
    const selectedStores =
      action === "enroll" ? selectedUnenrolledStores : selectedEnrolledStores;

    if (selectedStores.length === 0) {
      toast.warning("Please select at least one store");
      return;
    }

    setBulkEnrollmentAction(action);
    setIsBulkEnrollmentDialogOpen(true);
  };

  // Handle single store enrollment/unenrollment (from individual Enroll/Unenroll buttons)
  const handleSingleStoreEnroll = (
    storeId: string,
    action: "enroll" | "unenroll"
  ) => {
    // Select the store first
    if (action === "enroll") {
      setSelectedUnenrolledStores([storeId]);
    } else {
      setSelectedEnrolledStores([storeId]);
    }

    // Open the bulk enrollment dialog
    setBulkEnrollmentAction(action);
    setIsBulkEnrollmentDialogOpen(true);
  };

  useEffect(() => {
    if (isInitialMount.current) {
      // Initial mount: show loading state
      fetchStoresListing(true);
      isInitialMount.current = false;
    } else {
      // Subsequent changes (sorting, pagination, etc.): don't show loading
      fetchStoresListing(false);
    }
  }, [params, searchParams, selectedAgreementId]);

  const isAuthorized =
    apiData?.manufacturer?.authorized == false ? false : true;

  // Use the helper functions from programComplianceHelper.ts

  // Process agreements data to create lookup maps
  const programIdToAgreementsMap = useMemo(() => {
    if (!agreements || agreements.length === 0) {
      return new Map<number, number[]>();
    }
    return buildProgramIdToAgreementIdsMap(agreements);
  }, [agreements]);

  // Filter programs based on selected agreement
  const retailerPrograms = apiData?.programs?.retailer || [];

  const agreementOptions = useMemo(() => {
    if (!agreements || agreements.length === 0) {
      return [];
    }

    // Filter out agreements that don't have any programs
    const retailerProgramsList = apiData?.programs?.retailer || [];
    const agreementsWithPrograms = filterAgreementsWithPrograms(
      agreements,
      retailerProgramsList
    );

    return buildAgreementOptions(agreementsWithPrograms);
  }, [agreements, apiData?.programs?.retailer]);

  // Auto-select first agreement when options are loaded
  useEffect(() => {
    if (
      agreementOptions.length > 0 &&
      selectedAgreementId === DEFAULT_AGREEMENT_VALUE
    ) {
      setSelectedAgreementId(agreementOptions[0].value);
    }
  }, [agreementOptions, selectedAgreementId]);

  const filteredRetailerPrograms = useMemo(() => {
    return filterProgramsByAgreement(
      retailerPrograms,
      selectedAgreementId,
      programIdToAgreementsMap
    );
  }, [retailerPrograms, selectedAgreementId, programIdToAgreementsMap]);

  // Calculate totals once per render using filtered programs
  const { totalProgramEnrollments, totalProgramCompliances } =
    calculateComplianceTotals(
      filteredRetailerPrograms,
      programStoreCompliancesDetail || []
    );

  // Extract programIds from filtered retailer programs for StoreTable
  const programIds = useMemo(
    () => filteredRetailerPrograms.map((program: any) => program.id) || [],
    [filteredRetailerPrograms]
  );

  const totalStores = useMemo(
    () =>
      Number(enrolledProgram?.totalStores ?? "0") +
      Number(unenrolledProgram?.totalStores ?? ""),
    [enrolledProgram?.totalStores, unenrolledProgram?.totalStores]
  );

  const totalEnrolledStores = useMemo(
    () => Number(enrolledProgram?.totalStores ?? "0"),
    [enrolledProgram?.totalStores]
  );

  // Check if all critical data is loaded
  const isLoading =
    loadingRetailerProgramDetails ||
    loadingRetailerProgramComplianceDetails ||
    loadingCategorizedProducts ||
    loadingStoresListing;

  // Show full page loading skeleton until all data is loaded
  if (isLoading) {
    return (
      <StoreProgramDetailLoading
        showWarehouseFilter={!isSalesRepManager && !isGeneralManager}
        warehouses={warehouses}
        isSalesRepManager={isSalesRepManager}
      />
    );
  }

  const backUrl = getUrlWithQueryParam(
    `${isInternalInitiative ? APP_ROUTES.storeProgramsInternal : APP_ROUTES.storePrograms}`,
    "programTimeline",
    programTimeline
  );

  return (
    <div id="store-program-detail" data-testid="store-program-detail">
      <StoreProgramDetailHeader
        manufacturer={
          apiData?.manufacturer ?? {
            name: "Store Program Details",
            avatar: ""
          }
        }
        backUrl={backUrl}
        warehouseFilter={
          !isSalesRepManager && !isGeneralManager ? (
            <WarehouseSelectFilter
              isManager={warehouses ? true : false}
              warehouses={warehouses ?? []}
            />
          ) : undefined
        }
      />

      <StoreProgramDetailDashboardCards
        salesData={
          apiData?.salesData ?? {
            purchaseVolume: { amount: 0 },
            totalSavings: { amount: 0 }
          }
        }
        totalEnrolledStores={totalEnrolledStores}
        totalStores={totalStores}
        totalProgramEnrollments={totalProgramEnrollments}
        totalProgramCompliances={totalProgramCompliances}
        isAuthorized={isAuthorized}
        cardCount={4}
      />

      {/* Select Agreement */}
      {(() => {
        if (!agreements || agreements.length === 0) {
          return null;
        }

        // Check if there's only one agreement option after filtering
        const hasSingleAgreement = agreementOptions.length === 1;
        const singleAgreementName = hasSingleAgreement
          ? agreementOptions[0].label
          : null;

        return (
          <div className="flex flex-col sm:flex-row gap-3 sm:items-center mb-4 sm:mb-0 mt-4">
            {hasSingleAgreement ? (
              <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
                <span className="text-sm font-medium text-heading-light">
                  Viewing Agreement:
                </span>
                <div className="rounded-md outline-none pl-3 pr-9 border-border-gray border max-w-full text-sm font-medium text-heading-light px-2 py-1.5 bg-gray-50 cursor-disabled select-none">
                  {singleAgreementName}
                </div>
              </div>
            ) : (
              <>
                <label
                  htmlFor="agreement-select"
                  className="text-sm font-medium text-heading-light"
                >
                  Select Agreement:
                </label>
                <SelectBox
                  id="agreement-select"
                  options={agreementOptions}
                  value={selectedAgreementId}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                    setSelectedAgreementId(e.target.value);
                  }}
                  className="text-sm font-medium text-heading-light px-2 py-1.5"
                  placeholder="Select Agreement"
                />
              </>
            )}
          </div>
        );
      })()}

      <StoreProgramDetailTabs
        retailerPrograms={filteredRetailerPrograms}
        programStoreCompliancesDetail={programStoreCompliancesDetail || []}
        enrolledProgram={enrolledProgram}
        unenrolledProgram={unenrolledProgram}
        manufacturerId={manufacturerId}
        manufacturerName={manufacturerName}
        manufacturerLogo={apiData?.manufacturer?.avatar}
        programTimeline={getProgramTimelineQueryParam(programTimeline)}
        isSalesRep={isSalesRep}
        isAdmin={isAdmin}
        showBulkEnrollment={true}
        bulkEnrollmentProps={{
          selectedEnrolledStores,
          selectedUnenrolledStores,
          setSelectedEnrolledStores,
          setSelectedUnenrolledStores,
          onBulkEnroll: openBulkEnrollmentDialog,
          onClearEnrolled: () => setSelectedEnrolledStores([]),
          onClearUnenrolled: () => setSelectedUnenrolledStores([]),
          onSingleStoreEnroll: handleSingleStoreEnroll,
          agreements,
          isBulkEnrollmentDialogOpen,
          onCloseDialog: () => setIsBulkEnrollmentDialogOpen(false),
          onConfirmBulkEnrollment: handleBulkEnrollment,
          bulkEnrollmentAction,
          isBulkEnrollmentLoading,
          selectedAgreementId,
          retailerPrograms
        }}
        processingStoreIds={Array.from(processingStoreIds)}
        categorizedProducts={categorizedProducts}
        pdfButton={
          <div className="flex items-center gap-3 ml-0 sm:ml-auto">
            {isAdmin ? (
              <GenerateCsvBtn
                manufacturerId={manufacturerId}
                manufacturerName={manufacturerName}
                programTimeline={programTimeline}
              />
            ) : null}
            <ViewProgramPdfButton
              manufacturerId={manufacturerId}
              programTimeline={programTimeline}
              programType="STORE"
              pdfUrl={pdfUrl}
            />
          </div>
        }
        programIds={programIds}
        isLoadingTable={loadingStoresListing}
        isAuthorizedManufacturer={apiData?.manufacturer?.authorized}
        isIndependentStores={isChainProgramsEnabled}
        searchQuery={searchQuery}
        warehouseId={warehouseId}
        isInternal={isInternalInitiative}
        sort={sort}
        sortKey={sortKey}
        user={user}
        loadingRetailerProgramComplianceDetails={
          loadingRetailerProgramComplianceDetails
        }
      />
    </div>
  );
};

export default StoreProgramDetailPage;
