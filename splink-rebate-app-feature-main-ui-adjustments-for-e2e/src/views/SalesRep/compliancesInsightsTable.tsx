"use client";

import Card from "@/components/Card";
import {
  NearComplianceStoreData,
  TierDetailsModalData
} from "@/types/StoreTypes";
import { formatNumber } from "@/utils/numberFormatter";
import { useEffect, useMemo, useRef, useState } from "react";

import AdvancedFiltersModal, {
  FilterState
} from "@/components/Dialog/AdvancedFiltersModal";
import TierDetailModal from "@/components/Dialog/TierDetailModal";
import CustomDropdown from "@/components/Form/CustomDropdown";
import SearchField from "@/components/SearchField";
import { MESSAGES } from "@/configs/messages";
import { APP_ROUTES } from "@/configs/routes";
import { apiClient } from "@/lib/axiosClient";
import { useWindowWidth } from "@/utils/clientHelper";
import { SORT_KEYS } from "@/utils/constants";
import { formateRebate } from "@/utils/helper";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import sortIcon from "../../assets/icons/sortIcon.svg";
import sortIconDefault from "../../assets/icons/sortIconDefault.svg";
import sortIconDesc from "../../assets/icons/sortIconDesc.svg";
import whiteFilterFunnel from "../../assets/icons/whiteFilterFunnel.svg";

interface SortableHeaderProps {
  label: string;
  sortKey: string;
  currentSortKey: string;
  currentSort: string | undefined;
  onSortChange: (key: string) => void;
  className?: string;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({
  label,
  sortKey,
  currentSortKey,
  currentSort,
  onSortChange,
  className = ""
}) => {
  const getSortIconSrc = (sort: string) => {
    let src = sortIconDefault.src;

    if (sort === "ASC") {
      src = sortIcon.src;
    } else if (sort === "DESC") {
      src = sortIconDesc.src;
    }
    return src;
  };

  return (
    <th
      className={`font-semibold px-2 sm:px-4 cursor-pointer ${className}`}
      onClick={() => onSortChange(sortKey)}
    >
      <span className="inline mr-2">{label}</span>
      <Image
        className="storeSortIcon inline"
        src={getSortIconSrc(
          currentSortKey === sortKey ? (currentSort ?? "") : ""
        )}
        alt="sort icon"
        width={7}
        height={10}
      />
    </th>
  );
};

const CompliancesInsightsTable = ({
  storesData,
  manufacturers = []
}: {
  storesData: NearComplianceStoreData[];
  manufacturers?: any[];
}) => {
  // State to store the stores data
  const [allProgramCompliances, setAllProgramCompliances] = useState<any[]>([]);
  const [programCompliances, setProgramCompliances] = useState<any[]>([]);
  const [selectedRowData, setSelectedRowData] = useState<any | undefined>(
    undefined
  );
  const router = useRouter();
  const searchParams = useSearchParams();
  const params = new URLSearchParams(searchParams.toString());
  const [sort, setSort] = useState<string | undefined>(() => {
    const initialSort = params.get(SORT_KEYS.SORT);
    if (initialSort) return initialSort;
  });
  const [sortKey, setSortKey] = useState<string>("earning_opportunity");
  const [expandedStoreCompliance, setExpandedStoreCompliance] = useState<
    number | null
  >(null);
  const [modalData, setModalData] = useState<any | undefined>(undefined);

  const [allPurchasedProductsData, setAllPurchasedProductsData] = useState<
    any[]
  >([]);

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Filter state
  const [isFilterModalOpen, setIsFilterModalOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterState>({});
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  // Local state for search and manufacturer (not in URL)
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedManufacturerId, setSelectedManufacturerId] =
    useState<string>("");

  const windowWidth = useWindowWidth();

  useEffect(() => {
    async function fetchData(id: string, manufacturerId: number) {
      try {
        setIsLoading(true);
        // Use Promise.all to fetch both API calls simultaneously
        const response = await apiClient.get(
          `/store/${id}/manufacture/${manufacturerId}`
        );

        const selectedTier = response?.data?.tierDetails?.find(
          (pro: any) =>
            pro.programDetailId == selectedRowData?.program_detail_id
        );

        if (!selectedTier) return;

        const REBATE_TYPES_WITH_EARNING_OPP = ["per_category_item"];
        const isEarningOppRebateType = REBATE_TYPES_WITH_EARNING_OPP.includes(
          selectedTier.rebate_type
        );

        const calculateTotalOppSavings = (): number => {
          if (isEarningOppRebateType) {
            return (
              selectedRowData.earning_opportunity ||
              selectedTier.rebate_amount ||
              0
            );
          }
          return (
            selectedTier.rebate_amount ||
            selectedRowData.earning_opportunity ||
            0
          );
        };

        const newTierDetails: TierDetailsModalData = {
          totalPotentialSavings: formateRebate(undefined, selectedTier),
          overview: selectedTier.overview ?? "",
          additionalInfo: selectedTier.description ?? "",
          title: selectedTier.title,
          products: [],
          purchasedProducts: [],
          progressAchieved: selectedTier.progressAchieved ?? [],
          graph: selectedTier.graph ?? undefined,
          rebate_amount: selectedTier.rebate_amount,
          rebate_percentage: selectedTier.rebate_percentage,
          rebate_type: selectedTier.rebate_type,
          categorizedProducts: selectedTier.categorizedProducts || {},
          totalOppSavings: {
            amount: calculateTotalOppSavings()
          },
          isRebateBasedOnListPrice: selectedTier.isRebateBasedOnListPrice,
          ...(selectedTier.SKU && {
            skus: {
              total: selectedTier.SKU.total,
              completed: selectedTier.SKU.completed
            }
          })
        };

        setModalData(newTierDetails);
        setAllPurchasedProductsData(
          response?.data?.additionalInfo?.purchasedProducts || []
        );
      } catch (e) {
        setModalData(null);
        setAllPurchasedProductsData([]);
        setIsLoading(false);
      } finally {
        setIsLoading(false);
      }
    }

    if (selectedRowData && selectedRowData?.store_id)
      fetchData(selectedRowData?.store_id, selectedRowData?.manufacturer_id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRowData]);

  const handleSortChange = (key: string) => {
    if (key === sortKey) {
      setSort((prev) => (prev === "DESC" ? "ASC" : "DESC"));
    } else {
      setSortKey(key);
      setSort("DESC");
    }
  };

  // Apply filters function
  const applyFilters = (
    data: any[],
    filterState: FilterState,
    search: string,
    manufacturerId: string
  ): any[] => {
    return data.filter((program: any) => {
      // Search filter (store name)
      if (search) {
        const storeName = program.store_name?.toLowerCase() || "";
        const searchLower = search.toLowerCase();
        if (!storeName.includes(searchLower)) return false;
      }

      // Manufacturer filter
      if (manufacturerId) {
        const programManufacturerId = program.manufacturer_id?.toString();
        if (programManufacturerId !== manufacturerId) return false;
      }

      // SKUs Needed filter (<= only)
      if (filterState.skusNeeded) {
        const skusNeeded = program.skuNeeded || 0;
        const { value } = filterState.skusNeeded;
        if (skusNeeded > value) return false;
      }

      // Compliance filter (>= only)
      if (filterState.complianceMin !== undefined) {
        const compliance = parseFloat(program.compliance_percentage) || 0;
        if (compliance < filterState.complianceMin) return false;
      }

      return true;
    });
  };

  // Initialize and filter data
  useEffect(() => {
    // Initialize the data first
    const storePrograms = storesData.flatMap((store) =>
      store.programs.map((program) => ({
        ...program,
        store_name: store.store_name,
        store_id: store.store_id
      }))
    );

    setAllProgramCompliances(storePrograms);

    // Apply filters first (search, manufacturer, and advanced filters)
    let filteredData = applyFilters(
      storePrograms,
      filters,
      searchQuery,
      selectedManufacturerId
    );

    // Then apply sorting
    if (sort) {
      filteredData = [...filteredData].sort((a: any, b: any) => {
        let valueA, valueB;

        switch (sortKey) {
          case "store_name":
            valueA = a.store_name?.toLowerCase() || "";
            valueB = b.store_name?.toLowerCase() || "";
            break;
          case "program_name":
            valueA = a.program_name?.toLowerCase() || "";
            valueB = b.program_name?.toLowerCase() || "";
            break;
          case "manufacturer_name":
            valueA = a.manufacturer_name?.toLowerCase() || "";
            valueB = b.manufacturer_name?.toLowerCase() || "";
            break;
          case "earning_opportunity":
          default:
            valueA = parseFloat(a.earning_opportunity) || 0;
            valueB = parseFloat(b.earning_opportunity) || 0;
            break;
        }

        if (typeof valueA === "string" && typeof valueB === "string") {
          return sort === "ASC"
            ? valueA.localeCompare(valueB)
            : valueB.localeCompare(valueA);
        }

        return sort === "ASC" ? valueA - valueB : valueB - valueA;
      });
    }

    setProgramCompliances(filteredData);
  }, [storesData, sort, sortKey, filters, searchQuery, selectedManufacturerId]);

  // Get active manufacturer name
  const activeManufacturerName = useMemo(() => {
    if (!selectedManufacturerId) return null;
    const manufacturer = manufacturers.find(
      (m) => m.associatedUserId.toString() === selectedManufacturerId
    );
    return manufacturer?.name || null;
  }, [selectedManufacturerId, manufacturers]);

  // Check if any filters are active (including manufacturer and search)
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.skusNeeded ||
      filters.complianceMin !== undefined ||
      activeManufacturerName ||
      searchQuery
    );
  }, [filters, activeManufacturerName, searchQuery]);

  // Get active filter count (only advanced filters)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.skusNeeded) count++;
    if (filters.complianceMin !== undefined) count++;
    return count;
  }, [filters]);

  // Handle filter removal
  const removeFilter = (filterKey: keyof FilterState) => {
    setFilters((prev) => {
      const newFilters = { ...prev };
      delete newFilters[filterKey];
      return newFilters;
    });
  };

  // Handle manufacturer filter removal
  const removeManufacturerFilter = () => {
    setSelectedManufacturerId("");
  };

  // Handle search filter removal
  const removeSearchFilter = () => {
    setSearchQuery("");
  };

  // Handle clear all filters
  const clearAllFilters = () => {
    setFilters({});
    setSearchQuery("");
    setSelectedManufacturerId("");
  };

  return (
    <Card className="w-full mb-4">
      <div className="flex justify-between items-center mb-2 flex-wrap gap-2 sm:gap-0">
        <p className="text-s font-normal text-heading-very-light">
          Stores Close to Compliance
        </p>
        <div className="flex items-center flex-wrap gap-4">
          <div className="max-w-56">
            <SearchField
              placeholder="Search by Store name"
              className="w-full sm:w-auto"
              onInputChange={(value: string) => setSearchQuery(value)}
            />
          </div>
          <CustomDropdown
            startFromRight
            classes="h-full w-full px-4 py-2 text-left bg-white border border-border-gray rounded outline-none"
            excludePageParam={true}
            queryParamKey={"manufacturerId"}
            value={selectedManufacturerId}
            options={[
              {
                label: "All Manufacturers",
                value: ""
              },
              ...manufacturers.map((entity: any) => ({
                label: entity.name,
                value: entity.associatedUserId.toString()
              }))
            ]}
            onOptionChange={(value: string) => setSelectedManufacturerId(value)}
          />
          <div className="relative">
            <button
              ref={filterButtonRef}
              onClick={() => setIsFilterModalOpen(true)}
              className="relative bg-green text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-opacity-90 transition-colors text-sm font-medium"
            >
              <Image
                src={whiteFilterFunnel.src}
                alt="Filter"
                width={16}
                height={16}
              />
              Advanced Filters
              {activeFilterCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <AdvancedFiltersModal
              isOpen={isFilterModalOpen}
              setIsOpen={setIsFilterModalOpen}
              filters={filters}
              onFiltersChange={setFilters}
              onApply={() => setIsFilterModalOpen(false)}
              onReset={() => {
                setFilters({});
              }}
              buttonRef={filterButtonRef}
            />
          </div>
        </div>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          {activeManufacturerName && (
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
              {activeManufacturerName}
              <button
                onClick={removeManufacturerFilter}
                className="font-semibold ml-1 text-red-500 hover:text-red-600"
              >
                ×
              </button>
            </span>
          )}
          {searchQuery && (
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
              Search: {searchQuery}
              <button
                onClick={removeSearchFilter}
                className="font-semibold ml-1 text-red-500 hover:text-red-600"
              >
                ×
              </button>
            </span>
          )}
          {filters.skusNeeded && (
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
              SKUs &lt;= {filters.skusNeeded.value}
              <button
                onClick={() => removeFilter("skusNeeded")}
                className="font-semibold ml-1 text-red-500 hover:text-red-600"
              >
                ×
              </button>
            </span>
          )}
          {filters.complianceMin !== undefined && (
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium">
              Compliance &gt;= {filters.complianceMin}%
              <button
                onClick={() => removeFilter("complianceMin")}
                className="font-semibold ml-1 text-red-500 hover:text-red-600"
              >
                ×
              </button>
            </span>
          )}
          <button
            onClick={clearAllFilters}
            className="text-blue-600 hover:text-blue-800 text-xs underline ml-3 font-medium"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Results Count */}
      <p className="mb-2 text-xs flex items-center gap-2 text-heading-very-light">
        Showing {programCompliances.length} of {allProgramCompliances.length}{" "}
        stores
      </p>
      <div className="storeTable text-left text-sm text-filter-light font-medium font-inter relative">
        {windowWidth <= 640 &&
          programCompliances &&
          programCompliances?.length > 0 && (
            <div className="flex gap-2 mb-4 flex-col">
              <CustomDropdown
                startFromRight
                classes="h-full w-full px-4 py-2 text-left bg-white border border-border-gray rounded outline-none"
                excludePageParam={true}
                queryParamKey={"manufacturerId"}
                options={[
                  "store_name",
                  "program_name",
                  "manufacturer_name",
                  "earning_opportunity"
                ].map((value: string) => ({
                  value,
                  label:
                    value == "SORT"
                      ? "Store Name"
                      : value
                          .split("_")
                          .map(
                            (word) =>
                              word.charAt(0).toUpperCase() +
                              word.slice(1).toLowerCase()
                          )
                          .join(" ")
                }))}
                onOptionChange={(value: string) => {
                  setSortKey(value);
                }}
              />
              <CustomDropdown
                startFromRight
                classes="h-full w-full px-4 py-2 text-left bg-white border border-border-gray rounded outline-none"
                excludePageParam={true}
                queryParamKey={"manufacturerId"}
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
                onOptionChange={(value: string) => {
                  setSort(value);
                }}
              />
            </div>
          )}

        <div
          className={`${
            programCompliances && programCompliances?.length > 0
              ? "overflow-y-auto flex-1 min-h-0 max-h-[45vh]"
              : "flex-1 min-h-0 bg-white"
          }`}
        >
          {windowWidth > 640 ? (
            <table className="w-full border-collapse table-fixed">
              <thead className="h-11 border-b text-heading-very-light text-xs sticky top-0  bg-white">
                <tr>
                  <SortableHeader
                    label="Store"
                    sortKey="store_name"
                    currentSortKey={sortKey}
                    currentSort={sort}
                    onSortChange={handleSortChange}
                    className="min-w-40"
                  />
                  <SortableHeader
                    label="Manufacturer"
                    sortKey="manufacturer_name"
                    currentSortKey={sortKey}
                    currentSort={sort}
                    onSortChange={handleSortChange}
                    className="min-w-32"
                  />
                  <SortableHeader
                    label="Program"
                    sortKey="program_name"
                    currentSortKey={sortKey}
                    currentSort={sort}
                    onSortChange={handleSortChange}
                    className="min-w-56"
                  />
                  <SortableHeader
                    label="Earnings Opportunity"
                    sortKey="earning_opportunity"
                    currentSortKey={sortKey}
                    currentSort={sort}
                    onSortChange={handleSortChange}
                    className="min-w-32"
                  />
                  <th className="font-semibold px-2 sm:px-4 w-18">
                    % Close To Compliance
                  </th>
                  <th className="font-semibold px-2 sm:px-4 w-18 text-center">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {programCompliances && programCompliances?.length ? (
                  programCompliances.map((program: any, index: number) => (
                    <tr
                      key={`${program.program_detail_id}-${index}`}
                      className={`${index % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-gray-100 transition-colors duration-150`}
                    >
                      <td className="px-2 sm:px-4 py-4 cursor-pointer text-gray-600 hover:text-gray-800">
                        <Link
                          href={`${APP_ROUTES.store}/${program.store_id}`}
                          className=" cursor-pointer text-gray-600 hover:text-gray-800"
                        >
                          {program.store_name}
                        </Link>
                      </td>
                      <td className="px-2 sm:px-4 py-4">
                        {program.manufacturer_name}
                      </td>
                      <td className="px-2 sm:px-4 py-4">
                        {program.program_name}
                      </td>
                      <td className="px-2 sm:px-4 py-4">
                        ${formatNumber(program.earning_opportunity)}
                      </td>
                      <td className="px-2 sm:px-4 py-4">
                        {formatNumber(program.compliance_percentage, false, 1)}%
                      </td>
                      <td className="px-2 sm:px-4 py-4 text-center">
                        <div className="w-full flex justify-center">
                          {program.missing_products ? (
                            <button
                              className="bg-green h-full rounded py-1 px-2 flex items-center text-white gap-1.5 text-xs min-[400px]:text-sm font-medium hover:bg-opacity-90"
                              onClick={() => {
                                setSelectedRowData(program);
                              }}
                            >
                              Missing SKUs
                            </button>
                          ) : (
                            <span className="text-heading-very-light">
                              No actions available at the moment
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="border-b">
                    <td className="px-2 sm:px-4 py-3" colSpan={5}>
                      <p className="text-center">{MESSAGES.NO_RECORDS_FOUND}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          ) : (
            <div
              className={`${
                programCompliances && programCompliances?.length > 0
                  ? "text-sm mb-5"
                  : " text-sm"
              }`}
            >
              {programCompliances && programCompliances?.length > 0 ? (
                programCompliances.map((program: any, index: number) => (
                  <div
                    key={`${program.program_detail_id}-${program.store_name}-${index}`}
                    className={`py-3 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-100"
                    }`}
                  >
                    <div className="flex justify-between items-center font-medium cursor-pointer gap-3">
                      <div className="title flex flex-col gap-2 w-full px-2 relative">
                        <span
                          onClick={() => {
                            setExpandedStoreCompliance(
                              expandedStoreCompliance == index ? null : index
                            );
                          }}
                          className="text-2xl absolute top-0 right-0 bg-green text-white px-3 mr-2 rounded w-[30px] flex justify-center items-center"
                        >
                          {expandedStoreCompliance != null &&
                          expandedStoreCompliance == index
                            ? "-"
                            : "+"}
                        </span>
                        <div className="flex gap-2 w-full">
                          <Link
                            href={`${APP_ROUTES.store}/${program.store_id}`}
                            className="text-blue-600 hover:text-blue-800 text-base mr-10"
                          >
                            {program.store_name}
                          </Link>
                        </div>
                        {expandedStoreCompliance == null && (
                          <div className="flex gap-2 w-full">
                            <p>{program.program_name}</p>
                          </div>
                        )}
                      </div>
                    </div>
                    {expandedStoreCompliance != null &&
                      expandedStoreCompliance == index && (
                        <div className="tabContent px-2 flex flex-col">
                          <div className="mt-4 flex justify-between flex-wrap gap-4 text-gray-700 w-full">
                            <div className="purchaseVolume">
                              <span className="text-filter-light text-xs font-medium">
                                Program
                              </span>
                              <p className="mt-1 text-highlighted-color font-semibold">
                                {program.program_name}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex justify-between flex-wrap gap-4 text-gray-700 w-full">
                            <div className="purchaseVolume">
                              <span className="text-filter-light text-xs font-medium">
                                Manufacturer
                              </span>
                              <p className="mt-1 text-highlighted-color font-semibold">
                                {program.manufacturer_name}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex justify-between flex-wrap gap-4 text-gray-700 w-full">
                            <div className="purchaseVolume">
                              <span className="text-filter-light text-xs font-medium">
                                Earnings Opportunity
                              </span>
                              <p className="mt-1 text-highlighted-color font-semibold">
                                ${formatNumber(program.earning_opportunity)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex justify-between flex-wrap gap-4 text-gray-700 w-full">
                            <div className="purchaseVolume">
                              <span className="text-filter-light text-xs font-medium">
                                % Close To Compliance
                              </span>
                              <p className="mt-1 text-highlighted-color font-semibold">
                                {formatNumber(
                                  program.compliance_percentage,
                                  false,
                                  1
                                )}
                                %
                              </p>
                            </div>
                          </div>
                          <div className="mt-4 flex justify-between flex-wrap gap-4 text-gray-700 w-full">
                            <div className="purchaseVolume">
                              <span className="text-filter-light text-xs font-medium">
                                Action
                              </span>
                              <div className="flex justify-center">
                                {program.missing_products ? (
                                  <button
                                    className="bg-green h-full rounded py-1 px-2 flex items-center text-white gap-1.5 text-xs min-[400px]:text-sm font-medium hover:bg-opacity-90"
                                    onClick={() => {
                                      setSelectedRowData(program);
                                    }}
                                  >
                                    Missing SKUs
                                  </button>
                                ) : (
                                  <span className="text-heading-very-light">
                                    No actions available at the moment
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                  </div>
                ))
              ) : (
                <p className="text-center font-medium text-heading-very-light text-sm p-4">
                  {MESSAGES.NO_RECORDS_FOUND}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      <TierDetailModal
        isOpen={selectedRowData ? true : false}
        setIsOpen={() => {
          setModalData(null);
          setSelectedRowData(null);
        }}
        data={modalData}
        manfData={{
          ...selectedRowData?.manufacturer
        }}
        showBackArror={false}
        showCategorizedProducts
        showPurchasedProductsButton
        isStoreEnrolled
        isLoading={isLoading}
        // addStoreIntialToTitle={!!manufacturerId}
        canAddToWishlist={false}
        showDistributorCode={true}
        showProductsUpcCode={false}
        allPurchasedProducts={allPurchasedProductsData}
        storeId={selectedRowData?.store_id}
        manufacturerId={selectedRowData?.manufacturer_id}
      />
    </Card>
  );
};

export default CompliancesInsightsTable;
