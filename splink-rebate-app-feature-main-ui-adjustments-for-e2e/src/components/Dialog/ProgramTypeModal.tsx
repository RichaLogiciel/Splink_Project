import { USER_ROLES } from "@/configs/roles";
import { apiClient } from "@/lib/axiosClient";
import { getUserClient } from "@/utils/getUserClient";
import { Dialog, Transition } from "@headlessui/react";
import { useSearchParams } from "next/navigation";
import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import TierDetailModal from "./TierDetailModal";

interface ProgramTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  manufacturerName: string;
  programs: any[];
  chainData: any;
  ischainPrograms?: boolean;
  programsDataKeyString?: string;
}

const ProgramTypeModal: React.FC<ProgramTypeModalProps> = ({
  isOpen,
  onClose,
  manufacturerName,
  programs,
  chainData,
  ischainPrograms = false,
  programsDataKeyString
}) => {
  const [selectedTier, setSelectedTier] = useState<any>(null);
  const [showStoreCompliance, setShowStoreCompliance] =
    useState<boolean>(false);
  const [selectedStore, setSelectedStore] = useState<any>(null);
  const [manufacturerData, setManufacturerData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showTierDetail, setShowTierDetail] = useState<boolean>(false);
  const [storeSearch, setStoreSearch] = useState("");
  const [compliancesData, setCompliancesData] = useState<any>(null);

  // Use ref to track the last fetched combination to prevent duplicate calls
  const lastFetchedRef = useRef<string>("");

  const user = getUserClient();
  const searchParams = useSearchParams();
  const isInternal = searchParams.get("isInternal") === "true";

  // Get chain programs for a specific manufacturer
  const getChainProgramsForManufacturer = (manufacturerName: string) => {
    // Handle both possible data structures
    const programsArray =
      chainData?.chains?.[0]?.programs || programsDataKeyString
        ? chainData?.[`${programsDataKeyString}`]
        : chainData?.programs;

    if (!programsArray) return [];

    const filtered = programsArray.filter((program: any) => {
      // Try both possible data structures
      const manfName = program.manufacturerName || program.manufacturer?.name;
      return manfName === manufacturerName;
    });

    return filtered;
  };

  const chainPrograms = getChainProgramsForManufacturer(manufacturerName);

  // Get manufacturer info
  const getManufacturerInfo = () => {
    if (!chainPrograms.length) return null;
    const program = chainPrograms[0];
    return {
      name: program.manufacturerName || program.manufacturer?.name,
      logo: program.manufacturerLogo || program.manufacturer?.logo,
      id: program.manufacturerId || program.manufacturer?.id
    };
  };

  const manufacturerInfo = getManufacturerInfo();

  const handleViewDetails = (program: any) => {
    setSelectedTier(program);
    setShowStoreCompliance(true);
  };

  const handleStoreViewDetails = (store: any) => {
    // Clear previous data and cache to ensure fresh API call
    setManufacturerData(null);
    lastFetchedRef.current = `fresh-${Date.now()}`; // Force fresh call with timestamp

    // Hide the store compliance modal and show the tier detail modal
    setShowStoreCompliance(false);
    setSelectedStore(store);
    setShowTierDetail(true);
  };

  const closeStoreDetailsModal = () => {
    setShowStoreCompliance(false);
    setSelectedTier(null);
  };

  const closeTierDetailModal = () => {
    setShowTierDetail(false);
    setSelectedStore(null);
    setManufacturerData(null);
  };

  // Fetch manufacturer details when store is selected
  useEffect(() => {
    console.log(
      "useEffect triggered - selectedStore:",
      selectedStore,
      "selectedTier:",
      selectedTier,
      "showTierDetail:",
      showTierDetail
    );

    if (!selectedStore || !selectedTier || !showTierDetail) {
      console.log("useEffect early return - missing data");
      return;
    }

    const fetchKey = `${selectedStore.storeId}-${selectedTier.manufacturerId || selectedTier.manufacturer?.id}`;
    console.log("fetchKey:", fetchKey);

    if (lastFetchedRef.current === fetchKey) {
      console.log("useEffect early return - already fetched this key");
      return;
    }

    // Add timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log("API call timeout - setting loading to false");
      setIsLoading(false);
    }, 10000); // 10 second timeout

    async function fetchStoreManufacturerDetails(
      storeId: string,
      manufacturerId: number
    ) {
      try {
        setIsLoading(true);
        lastFetchedRef.current = fetchKey;

        const params = new URLSearchParams({
          type: "CHAIN",
          manufacturerId: manufacturerId.toString(),
          programId: selectedTier.programId?.toString() || "",
          programDetailId: selectedTier.programDetailId?.toString() || "",
          forStore: storeId,
          programTimeline: "Current"
        });

        const response = await apiClient.get(
          `/programs/details?${params.toString()}&ischainPrograms=${ischainPrograms}`
        );

        console.log("API response data:", response.data);
        console.log(
          "API response.data.manufacturer:",
          response.data?.manufacturer
        );
        console.log(
          "API response.data.manufacturer.tierDetails:",
          response.data?.manufacturer?.tierDetails
        );
        console.log(
          "Full response structure:",
          JSON.stringify(response.data, null, 2)
        );

        // Check if the data structure is different than expected
        if (response.data?.tierDetails) {
          console.log("Found tierDetails at root level");
          setManufacturerData({
            ...response.data,
            tierDetails: response.data.tierDetails
          });
        } else if (response.data?.manufacturer?.tierDetails) {
          console.log("Found tierDetails under manufacturer");
          setManufacturerData(response.data.manufacturer);
        } else {
          console.log("No tierDetails found, setting raw data");
          setManufacturerData(response.data);
        }

        setCompliancesData(response.data?.allCompliances);
      } catch (error) {
        console.error("Error fetching manufacturer details:", error);
        setManufacturerData(null);
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchSalesRepProgramDetails(manufacturerId: number) {
      try {
        setIsLoading(true);
        lastFetchedRef.current = fetchKey;

        const response = await apiClient.get(
          `/sales-rep/program/${manufacturerId}`
        );

        console.log("Sales rep API response data:", response.data);
        console.log(
          "Sales rep API response.data.tierDetails:",
          response.data?.tierDetails
        );
        setManufacturerData(response.data);
      } catch (error) {
        console.error("Error fetching manufacturer details:", error);
        setManufacturerData(null);
      } finally {
        setIsLoading(false);
      }
    }

    if (user?.role === USER_ROLES.DISTRIBUTOR_SALES_REP) {
      const manufacturerId =
        selectedTier.manufacturerId || selectedTier.manufacturer?.id;
      fetchSalesRepProgramDetails(manufacturerId);
    } else {
      const storeId = selectedStore.storeId;
      const manufacturerId =
        selectedTier.manufacturerId || selectedTier.manufacturer?.id;
      fetchStoreManufacturerDetails(storeId, manufacturerId);
    }
  }, [selectedStore, selectedTier, showTierDetail, user]);

  // Find the specific tier details for the selected program
  const getSelectedTierDetails = () => {
    console.log("getSelectedTierDetails called with:", {
      manufacturerData,
      selectedTier,
      compliancesData
    });

    // If we don't have manufacturerData yet, create a basic tier detail from selectedTier
    if (!manufacturerData && selectedTier) {
      console.log(
        "No manufacturerData yet, creating basic tier detail from selectedTier"
      );
      return {
        ...selectedTier,
        tierDetails: [selectedTier], // Use the selectedTier as the tier detail
        earnedRebate: 0
      };
    }

    // If we have manufacturerData with tierDetails, use that
    if (manufacturerData?.tierDetails && selectedTier) {
      console.log("Using manufacturerData.tierDetails");

      // Find the tier that matches the selected program
      const tierDetail = manufacturerData.tierDetails.find(
        (tier: any) => tier.programDetailId === selectedTier.programDetailId
      );

      if (!tierDetail) {
        console.log("No matching tierDetail found, returning null");
        return null;
      }

      // Find the compliance data that matches with the selected program detail id
      const tierCompliance = compliancesData?.find(
        (c: any) => c.programDetailId === selectedTier?.programDetailId
      );
      const earnedRebate = tierCompliance?.isQualified
        ? tierCompliance.earnedRebate
        : 0;

      tierDetail.earnedRebate = earnedRebate;
      return tierDetail;
    }

    // Fallback: return selectedTier if no other data is available
    if (selectedTier) {
      console.log("Fallback: returning selectedTier as tier detail");
      return {
        ...selectedTier,
        earnedRebate: 0
      };
    }

    console.log("No data available, returning null");
    return null;
  };

  const selectedTierDetail = getSelectedTierDetails();

  // Debug logging
  console.log("Debug - manufacturerData:", manufacturerData);
  console.log("Debug - selectedTier:", selectedTier);
  console.log("Debug - selectedTierDetail:", selectedTierDetail);
  console.log("Debug - isLoading:", isLoading);

  // Filtered store compliance list
  const filteredStoreCompliance = useMemo(() => {
    if (!selectedTier?.storeCompliance) return [];
    if (!storeSearch.trim()) return selectedTier.storeCompliance;
    return selectedTier.storeCompliance.filter(
      (store: any) =>
        (store.storeName &&
          store.storeName.toLowerCase().includes(storeSearch.toLowerCase())) ||
        (store.storeId && store.storeId.toString().includes(storeSearch))
    );
  }, [selectedTier, storeSearch]);

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-10" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title
                      as="h3"
                      className="text-lg font-medium leading-6 text-gray-900"
                    >
                      {manufacturerName} Programs
                    </Dialog.Title>
                    <button
                      onClick={onClose}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>

                  {/* Stage 1: Program Tiers List */}
                  <div className="space-y-4">
                    {chainPrograms.map((program: any, index: number) => {
                      const compliantStores =
                        program.storeCompliance?.filter(
                          (store: any) => store.isCompliant
                        ).length || 0;
                      const totalStores = program.storeCompliance?.length || 0;
                      const isCompliant =
                        compliantStores === totalStores && totalStores > 0;

                      // Construct program display name
                      const programDisplayName =
                        program.programType === "TIER" && program.tier
                          ? `${program.programHeader} - Tier ${program.tier}`
                          : program.programHeader || program.name || "Program";

                      return (
                        <div
                          key={index}
                          className="border rounded-lg p-4 hover:bg-gray-50"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-3 h-3 rounded-full ${isCompliant ? "bg-green-500" : "bg-red-500"}`}
                              ></div>
                              <div>
                                <h4 className="font-medium text-gray-900">
                                  {programDisplayName}
                                </h4>
                                <p className="text-sm text-gray-600">
                                  {compliantStores}/{totalStores} compliant
                                  stores
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => handleViewDetails(program)}
                              className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800"
                            >
                              View Details
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {chainPrograms.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      No programs found for this manufacturer.
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Stage 2: Store Compliance Modal */}
      {showStoreCompliance && selectedTier && (
        <Transition appear show={showStoreCompliance} as={Fragment}>
          <Dialog
            as="div"
            className="relative z-10"
            onClose={closeStoreDetailsModal}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <div className="fixed inset-0 bg-black bg-opacity-25" />
            </Transition.Child>

            <div className="fixed inset-0 overflow-y-auto">
              <div className="flex min-h-full items-center justify-center p-4 text-center">
                <Transition.Child
                  as={Fragment}
                  enter="ease-out duration-300"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="ease-in duration-200"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all min-h-[70vh] max-h-[70vh] flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                      <Dialog.Title
                        as="h3"
                        className="text-lg font-medium leading-6 text-gray-900"
                      >
                        Stores Compliance Status (
                        {selectedTier.programHeader || selectedTier.name})
                      </Dialog.Title>
                      <button
                        onClick={closeStoreDetailsModal}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <svg
                          className="w-6 h-6"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                    {/* Search Bar (outside scroll area) */}
                    <div className="mb-3 relative">
                      <input
                        type="text"
                        placeholder="Search stores by name or ID..."
                        value={storeSearch}
                        onChange={(e) => setStoreSearch(e.target.value)}
                        className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-200 text-sm pr-10"
                      />
                      {storeSearch && (
                        <button
                          type="button"
                          aria-label="Clear search"
                          onClick={() => setStoreSearch("")}
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                          tabIndex={0}
                        >
                          <svg
                            width="18"
                            height="18"
                            viewBox="0 0 20 20"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            <path
                              d="M6 6L14 14M6 14L14 6"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                    {/* Store List with Scrollbar */}
                    <div className="flex-1 overflow-y-auto">
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {filteredStoreCompliance.map(
                            (store: any, index: number) => (
                              <div
                                key={index}
                                className="flex border items-center rounded-lg overflow-hidden min-h-[64px] bg-white hover:shadow-md transition-shadow duration-150"
                              >
                                {/* Left: Compliance indicator and store name */}
                                <div className="flex items-center gap-3 flex-1 px-4 py-3">
                                  <div
                                    className={`w-3 h-3 rounded-full border border-black ${store.isCompliant ? "bg-green-500" : "bg-red-500"}`}
                                    style={{
                                      backgroundColor: store.isCompliant
                                        ? "#10B981"
                                        : "#EF4444"
                                    }}
                                  ></div>
                                  <span className="font-medium text-gray-900">
                                    {store.storeName ||
                                      `Store ${store.storeId}`}
                                  </span>
                                </div>
                                {/* Right: View Details button */}
                                <div className="flex justify-between flex-wrap gap-4 text-green font-medium w-full sm:w-auto">
                                  <button
                                    onClick={() =>
                                      handleStoreViewDetails(store)
                                    }
                                    className="py-2 px-4"
                                  >
                                    View Details
                                  </button>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                        {(!filteredStoreCompliance ||
                          filteredStoreCompliance.length === 0) && (
                          <div className="text-center py-8 text-gray-500">
                            No store compliance data available.
                          </div>
                        )}
                      </div>
                    </div>
                  </Dialog.Panel>
                </Transition.Child>
              </div>
            </div>
          </Dialog>
        </Transition>
      )}

      {/* Stage 3: Individual Store Tier Detail Modal */}
      {showTierDetail && (
        <TierDetailModal
          isOpen={showTierDetail}
          setIsOpen={(open: boolean, isBackClicked?: boolean) => {
            if (isBackClicked) {
              closeTierDetailModal();
              setShowStoreCompliance(true);
            } else {
              closeTierDetailModal();
            }
          }}
          data={selectedTierDetail || {}} // Pass empty object if no data yet
          showBackArror={true}
          isLoading={isLoading} // Only show loading during API call, not when waiting for data
          manfData={manufacturerInfo}
          showCategorizedProducts={true}
          showPurchasedProductsButton={true}
          canAddToWishlist={true}
          storeId={selectedStore?.storeId}
          manufacturerId={
            selectedTier?.manufacturerId || selectedTier?.manufacturer?.id
          }
        />
      )}
    </>
  );
};

export default ProgramTypeModal;
