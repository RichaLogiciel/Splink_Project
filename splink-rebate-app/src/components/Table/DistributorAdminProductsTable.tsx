"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import Pagination from "./Pagination";
import SortableHeader from "../SortableHeader";
import { MESSAGES } from "@/configs/messages";
import {
  fetchDistributorAdminProducts,
  fetchAllManufacturersFromProducts,
  fetchDistributorAdminCategoryTags,
  DistributorAdminProductsParams
} from "@/app/app/distributor-admin/APIClient";

interface Product {
  id: number;
  name: string;
  brand: string;
  sku: string;
  unitSku: string;
  boxSku: string;
  caseSku: string;
  price: number;
  manufacturerId: number;
  categoryId: number;
  manufacturer: {
    id: number;
    name: string;
  };
  category: {
    id: number;
    name: string;
  };
  distributorRecommended: boolean;
  storeRecommended: boolean;
  ranking: number | null;
  primaryVariant: boolean;
  categoryTags?: string[];
  [key: string]: any;
}

interface DistributorAdminProductsTableProps {
  initialData?: {
    products: Product[];
    totalPages: number;
    currentPage: number;
    totalCount: number;
  };
  initialSchema?: any;
  enableFiltering?: boolean;
  enableSearch?: boolean;
}

// Helper function to render tags
const renderTags = (tags?: string[] | string[][]) => {
  console.log("renderTags called with:", tags);
  if (!tags || tags.length === 0) {
    return <span className="text-gray-400">N/A</span>;
  }

  // Handle both flat array and nested array structures
  let flatTags: string[] = [];
  if (Array.isArray(tags) && tags.length > 0) {
    if (Array.isArray(tags[0])) {
      // Nested array structure: [["Flex"],["Flex","Core_Retail"]]
      flatTags = tags.flat();
    } else {
      // Flat array structure: ["Flex", "Core_Retail"]
      flatTags = tags as string[];
    }
  }

  // Remove duplicates and filter out empty strings
  const uniqueTags = Array.from(new Set(flatTags)).filter(
    (tag) => tag && tag.trim() !== ""
  );

  if (uniqueTags.length === 0) {
    return <span className="text-gray-400">N/A</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {uniqueTags.map((tag, index) => (
        <span
          key={index}
          className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
        >
          {tag}
        </span>
      ))}
    </div>
  );
};

const DistributorAdminProductsTable: React.FC<
  DistributorAdminProductsTableProps
> = ({ initialData, enableFiltering = true, enableSearch = true }) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const manufacturerDropdownRef = useRef<HTMLDivElement>(null);

  const [products, setProducts] = useState<Product[]>(
    initialData?.products || []
  );
  const [totalPages, setTotalPages] = useState(initialData?.totalPages || 1);
  const [currentPage, setCurrentPage] = useState(initialData?.currentPage || 1);
  const [totalCount, setTotalCount] = useState(initialData?.totalCount || 0);
  const [isLoading, setIsLoading] = useState(false);

  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "name");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">(
    (searchParams.get("sortOrder") as "ASC" | "DESC") || "ASC"
  );
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );
  const [manufacturerId, setManufacturerId] = useState<number | undefined>(
    searchParams.get("manufacturerId")
      ? parseInt(searchParams.get("manufacturerId")!)
      : undefined
  );
  const [manufacturerSearchQuery, setManufacturerSearchQuery] = useState(
    searchParams.get("manufacturerSearch") || ""
  );
  const [showManufacturerDropdown, setShowManufacturerDropdown] =
    useState(false);
  const [selectedManufacturerName, setSelectedManufacturerName] = useState("");

  const [manufacturerOptions, setManufacturerOptions] = useState<any[]>([]);
  const [filteredManufacturerOptions, setFilteredManufacturerOptions] =
    useState<any[]>([]);
  const [categoryTagsOptions, setCategoryTagsOptions] = useState<any[]>([]);
  const [selectedCategoryTags, setSelectedCategoryTags] = useState<string[]>(
    []
  );

  const fetchData = useCallback(
    async (params: DistributorAdminProductsParams = {}) => {
      setIsLoading(true);
      try {
        const response = await fetchDistributorAdminProducts({
          page: params.page || currentPage,
          limit: 20,
          sortBy: params.sortBy || sortBy,
          sortOrder: params.sortOrder || sortOrder,
          search:
            params.search !== undefined
              ? params.search
              : searchQuery || undefined,
          manufacturerId:
            params.manufacturerId !== undefined
              ? params.manufacturerId
              : manufacturerId,
          categoryTags:
            params.categoryTags !== undefined
              ? params.categoryTags
              : selectedCategoryTags.length > 0
                ? selectedCategoryTags
                : undefined
        });

        console.log("Fetch response:", response);
        console.log("API call parameters:", {
          page: params.page || currentPage,
          limit: 20,
          sortBy: params.sortBy || sortBy,
          sortOrder: params.sortOrder || sortOrder,
          search:
            params.search !== undefined
              ? params.search
              : searchQuery || undefined,
          manufacturerId:
            params.manufacturerId !== undefined
              ? params.manufacturerId
              : manufacturerId
        });

        if (response) {
          const newProducts = response.products || [];
          console.log("Setting new products:", newProducts.length);
          console.log(
            "Sample product with categoryTags:",
            newProducts[0]?.categoryTags
          );
          setProducts([...newProducts]); // Force new array reference
          setTotalPages(
            response.pagination?.totalPages || response.totalPages || 1
          );
          setTotalCount(response.pagination?.total || response.totalCount || 0);
          setCurrentPage(
            response.pagination?.page || response.currentPage || 1
          );
        }
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [
      currentPage,
      sortBy,
      sortOrder,
      searchQuery,
      manufacturerId,
      selectedCategoryTags
    ]
  );

  useEffect(() => {
    if (enableFiltering) {
      // Fetch manufacturers from the new endpoint
      fetchAllManufacturersFromProducts()
        .then((response) => {
          const manufacturers = response?.data || response || [];

          const formattedOptions = manufacturers.map((manufacturer: any) => {
            // Handle different possible data structures
            let value, label;

            if (
              typeof manufacturer === "object" &&
              manufacturer.id !== undefined
            ) {
              // Manufacturer is an object with id and name
              value = manufacturer.id.toString();
              label = manufacturer.name || `Manufacturer ${manufacturer.id}`;
            } else if (typeof manufacturer === "string") {
              // Manufacturer is just a string
              value = manufacturer;
              label = manufacturer;
            } else {
              // Fallback
              value = manufacturer.toString();
              label = manufacturer.toString();
            }

            return { value, label };
          });
          setManufacturerOptions(formattedOptions);
          setFilteredManufacturerOptions(formattedOptions);
        })
        .catch((error) => {
          console.error("Error fetching manufacturers:", error);
          setManufacturerOptions([]);
          setFilteredManufacturerOptions([]);
        });
    }
  }, [enableFiltering]);

  // Filter manufacturers based on search query
  useEffect(() => {
    if (manufacturerSearchQuery.trim() === "") {
      setFilteredManufacturerOptions(manufacturerOptions);
    } else {
      const filtered = manufacturerOptions.filter((option) =>
        option.label
          .toLowerCase()
          .includes(manufacturerSearchQuery.toLowerCase())
      );
      setFilteredManufacturerOptions(filtered);
    }
  }, [manufacturerSearchQuery, manufacturerOptions]);

  // Initialize selected manufacturer name when manufacturerId changes
  useEffect(() => {
    if (manufacturerId && manufacturerOptions.length > 0) {
      const selectedOption = manufacturerOptions.find(
        (option) => parseInt(option.value) === manufacturerId
      );
      if (selectedOption) {
        setSelectedManufacturerName(selectedOption.label);
        setManufacturerSearchQuery(selectedOption.label);
      }
    } else if (!manufacturerId) {
      setSelectedManufacturerName("");
      setManufacturerSearchQuery("");
    }
  }, [manufacturerId, manufacturerOptions]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        manufacturerDropdownRef.current &&
        !manufacturerDropdownRef.current.contains(event.target as Node)
      ) {
        setShowManufacturerDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Fetch category tags when manufacturer changes
  useEffect(() => {
    if (manufacturerId && enableFiltering) {
      fetchDistributorAdminCategoryTags(manufacturerId)
        .then((response) => {
          const tags = response?.tags || response || [];

          // Handle nested array structure: [["Flex"],["Flex","Core_Retail"]]
          let flatTags: string[] = [];
          if (Array.isArray(tags) && tags.length > 0) {
            if (Array.isArray(tags[0])) {
              // Nested array structure
              flatTags = tags.flat();
            } else {
              // Flat array structure
              flatTags = tags as string[];
            }
          }

          // Remove duplicates and filter out empty strings
          const uniqueTags = Array.from(new Set(flatTags)).filter(
            (tag) => tag && tag.trim() !== ""
          );
          console.log("Processed unique tags:", uniqueTags);

          const formattedOptions = uniqueTags.map((tag: string) => ({
            value: tag,
            label: tag
          }));
          setCategoryTagsOptions(formattedOptions);
        })
        .catch((error) => {
          console.error("Error fetching category tags:", error);
          setCategoryTagsOptions([]);
        });
    } else {
      setCategoryTagsOptions([]);
      setSelectedCategoryTags([]);
    }
  }, [manufacturerId, enableFiltering]);

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [initialData, fetchData]);

  const handleSort = (column: string) => {
    const newSortOrder =
      sortBy === column && sortOrder === "ASC" ? "DESC" : "ASC";
    setSortBy(column);
    setSortOrder(newSortOrder);
    updateURL({ sortBy: column, sortOrder: newSortOrder });
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Search triggered with:", searchQuery);
    setCurrentPage(1);
    updateURL({ search: searchQuery, page: "1" });
    // Trigger immediate data fetch with new search
    fetchData({
      page: 1,
      search: searchQuery || undefined
    });
  };

  const handleManufacturerSelect = (
    manufacturerId: number | undefined,
    manufacturerName?: string
  ) => {
    console.log("Manufacturer select:", manufacturerId, manufacturerName);
    setCurrentPage(1);
    setManufacturerId(manufacturerId);
    setShowManufacturerDropdown(false);

    if (manufacturerId && manufacturerName) {
      setSelectedManufacturerName(manufacturerName);
      setManufacturerSearchQuery(manufacturerName);
    } else {
      setSelectedManufacturerName("");
      setManufacturerSearchQuery("");
    }

    const updates: Record<string, string> = { page: "1" };
    if (manufacturerId) {
      updates.manufacturerId = manufacturerId.toString();
      updates.manufacturerSearch = manufacturerName || "";
    } else {
      updates.manufacturerId = "";
      updates.manufacturerSearch = "";
    }

    updateURL(updates);
    // Trigger immediate data fetch with new filters
    fetchData({
      page: 1,
      manufacturerId: manufacturerId
    });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    updateURL({ page: page.toString() });
    // Trigger immediate data fetch with new page
    fetchData({ page });
  };

  const updateURL = (params: Record<string, string>) => {
    const currentParams = new URLSearchParams(searchParams.toString());

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        currentParams.set(key, value);
      } else {
        currentParams.delete(key);
      }
    });

    router.replace(`?${currentParams.toString()}`, { scroll: false });
  };

  const clearFilters = () => {
    setSearchQuery("");
    setManufacturerId(undefined);
    setManufacturerSearchQuery("");
    setSelectedManufacturerName("");
    setShowManufacturerDropdown(false);
    setSelectedCategoryTags([]);
    setCurrentPage(1);
    router.replace("?", { scroll: false });
    // Trigger immediate data fetch with cleared filters
    fetchData({
      page: 1,
      search: undefined,
      manufacturerId: undefined,
      categoryTags: undefined
    });
  };

  return (
    <div className="w-full">
      {/* Search and Filters */}
      <div className="mb-6 flex flex-col gap-4">
        {enableSearch && (
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Search
            </button>
          </form>
        )}

        {enableFiltering && (
          <div className="flex gap-4 items-center">
            <div className="relative" ref={manufacturerDropdownRef}>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search manufacturers..."
                  value={manufacturerSearchQuery}
                  onChange={(e) => {
                    setManufacturerSearchQuery(e.target.value);
                    setShowManufacturerDropdown(true);
                  }}
                  onFocus={() => setShowManufacturerDropdown(true)}
                  className="w-64 px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowManufacturerDropdown(!showManufacturerDropdown)
                  }
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600 focus:outline-none"
                >
                  <svg
                    className={`w-4 h-4 transition-transform ${showManufacturerDropdown ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              {showManufacturerDropdown && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto mt-1">
                  <button
                    onClick={() => handleManufacturerSelect(undefined)}
                    className={`w-full px-4 py-2 text-left hover:bg-gray-50 text-sm transition-colors ${
                      !manufacturerId
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-gray-700"
                    }`}
                  >
                    All Manufacturers
                  </button>
                  {filteredManufacturerOptions.length > 0 ? (
                    filteredManufacturerOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          const manufacturerId = parseInt(option.value);
                          handleManufacturerSelect(
                            manufacturerId,
                            option.label
                          );
                        }}
                        className={`w-full px-4 py-2 text-left hover:bg-gray-50 text-sm transition-colors ${
                          manufacturerId === parseInt(option.value)
                            ? "bg-blue-50 text-blue-700 font-medium"
                            : "text-gray-700"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-sm text-gray-500 bg-gray-50">
                      No manufacturers found
                    </div>
                  )}
                </div>
              )}
            </div>

            <select
              value={
                selectedCategoryTags.length > 0 ? selectedCategoryTags[0] : ""
              }
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  setSelectedCategoryTags([value]);
                  setCurrentPage(1);
                  updateURL({ page: "1" });
                  fetchData({
                    page: 1,
                    categoryTags: [value]
                  });
                } else {
                  setSelectedCategoryTags([]);
                  setCurrentPage(1);
                  updateURL({ page: "1" });
                  fetchData({
                    page: 1,
                    categoryTags: undefined
                  });
                }
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              disabled={!manufacturerId || categoryTagsOptions.length === 0}
            >
              <option value="">All Category Tags</option>
              {categoryTagsOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <button
              onClick={clearFilters}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Clear Filters
            </button>

            <button
              onClick={() => fetchData()}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Refresh
            </button>
          </div>
        )}
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {products.length} of {totalCount} products
      </div>

      {/* Table */}
      <div
        className={`overflow-x-auto ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <table
          key={`table-${products.length}-${searchQuery}-${manufacturerId}`}
          className="w-full border-collapse table-auto"
        >
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                #
              </th>
              <SortableHeader
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                label="Name"
                sortKey="name"
                sort={sortOrder}
                customSortFunction={() => handleSort("name")}
                activeSortKey={sortBy}
              />
              <SortableHeader
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                label="Brand"
                sortKey="brand"
                sort={sortOrder}
                customSortFunction={() => handleSort("brand")}
                activeSortKey={sortBy}
              />
              <SortableHeader
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                label="Manufacturer"
                sortKey="manufacturer"
                sort={sortOrder}
                customSortFunction={() => handleSort("manufacturer")}
                activeSortKey={sortBy}
              />
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category Tags
              </th>
              <SortableHeader
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                label="Unit SKU"
                sortKey="unitSku"
                sort={sortOrder}
                customSortFunction={() => handleSort("unitSku")}
                activeSortKey={sortBy}
              />
              <SortableHeader
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                label="Box SKU"
                sortKey="boxSku"
                sort={sortOrder}
                customSortFunction={() => handleSort("boxSku")}
                activeSortKey={sortBy}
              />
              <SortableHeader
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                label="Case SKU"
                sortKey="caseSku"
                sort={sortOrder}
                customSortFunction={() => handleSort("caseSku")}
                activeSortKey={sortBy}
              />
              <SortableHeader
                className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                label="Type"
                sortKey="primaryVariant"
                sort={sortOrder}
                customSortFunction={() => handleSort("primaryVariant")}
                activeSortKey={sortBy}
              />
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {products.length > 0 ? (
              products.map((product, index) => {
                const rowNumber = (currentPage - 1) * 20 + index + 1;
                return (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-4 text-sm text-gray-500 font-medium">
                      {rowNumber}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {product.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {product.brand || "N/A"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {product.manufacturer?.name || "N/A"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {renderTags(product.categoryTags)}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 font-mono">
                      {product.unitSku || "N/A"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 font-mono">
                      {product.boxSku || "N/A"}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600 font-mono">
                      {product.caseSku || "N/A"}
                    </td>
                    <td className="px-4 py-4 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          product.primaryVariant
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {product.primaryVariant ? "Primary" : "Variant"}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={9}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  {MESSAGES.NO_RECORDS_FOUND}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
};

export default DistributorAdminProductsTable;
