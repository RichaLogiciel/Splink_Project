"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  fetchStoreLookup,
  StoreLookupParams,
  fetchAllManufacturersFromProducts,
  fetchDistributorAdminCategoryTags
} from "@/app/app/distributor-admin/APIClient";

interface StoreLookupResult {
  storeName: string;
  manufacturerName: string;
  productName: string;
  productId: string;
  matchedSkuType: string;
  transactionDate: string;
  categoryTags: string[];
  totalUnits: number;
  warehouse: string;
  [key: string]: any;
}

interface StoreLookupTableProps {
  initialData?: StoreLookupResult[];
}

const StoreLookupTable: React.FC<StoreLookupTableProps> = ({ initialData }) => {
  const [data, setData] = useState<StoreLookupResult[]>(initialData || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter states with defaults
  const [storeName, setStoreName] = useState("");
  const [manufacturerName, setManufacturerName] = useState("");
  const [startDate, setStartDate] = useState("2025-01-01"); // Default to first day of year
  const [endDate, setEndDate] = useState(() => {
    // Default to current date
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Manufacturers dropdown data
  const [manufacturers, setManufacturers] = useState<any[]>([]);
  const [loadingManufacturers, setLoadingManufacturers] = useState(true);

  // Category tags state
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<
    number | null
  >(null);
  const [categoryTagsOptions, setCategoryTagsOptions] = useState<any[]>([]);
  const [selectedCategoryTags, setSelectedCategoryTags] = useState<string[]>(
    []
  );

  // Fetch manufacturers on component mount
  useEffect(() => {
    const fetchManufacturers = async () => {
      try {
        const response = await fetchAllManufacturersFromProducts();
        setManufacturers(response?.data || response || []);
      } catch (error) {
        console.error("Error fetching manufacturers:", error);
      } finally {
        setLoadingManufacturers(false);
      }
    };

    fetchManufacturers();
  }, []);

  // Fetch category tags when manufacturer changes
  useEffect(() => {
    if (selectedManufacturerId) {
      fetchDistributorAdminCategoryTags(selectedManufacturerId)
        .then((response) => {
          const tags = response?.tags || response || [];
          const formattedOptions = tags.map((tag: string) => ({
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
  }, [selectedManufacturerId]);

  const fetchData = useCallback(async (params: StoreLookupParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchStoreLookup(params);
      setData(response?.data || response || []);
    } catch (err) {
      console.error("Error fetching store lookup data:", err);
      setError("Failed to load store lookup data");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSearch = () => {
    // Always pass all parameters to match API requirements
    const params: StoreLookupParams = {
      storeName: storeName.trim(),
      manufacturerName: manufacturerName.trim(),
      startDate: startDate,
      endDate: endDate,
      categoryTags:
        selectedCategoryTags.length > 0 ? selectedCategoryTags : undefined
    };

    fetchData(params);
  };

  const handleReset = () => {
    setStoreName("");
    setManufacturerName("");
    setStartDate("2025-01-01");
    setEndDate(() => {
      const today = new Date();
      return today.toISOString().split("T")[0];
    });
    setSelectedManufacturerId(null);
    setSelectedCategoryTags([]);
    setData([]);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-sm font-medium text-gray-900 mb-2">
          Search Filters
        </h3>
        <p className="text-xs text-gray-600 mb-4">
          Use the date range to filter transactions. Start date defaults to
          2025-01-01 and end date defaults to today. You can search with any
          combination of fields below.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          {/* Store Name Search */}
          <div>
            <label
              htmlFor="storeName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Store Name
            </label>
            <input
              type="text"
              id="storeName"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Enter store name..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Manufacturer Filter */}
          <div>
            <label
              htmlFor="manufacturerName"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Manufacturer
            </label>
            <select
              id="manufacturerName"
              value={manufacturerName}
              onChange={(e) => {
                setManufacturerName(e.target.value);
                // Find the manufacturer ID for category tags
                const selectedManufacturer = manufacturers.find(
                  (m) => (m.name || m) === e.target.value
                );
                setSelectedManufacturerId(selectedManufacturer?.id || null);
              }}
              disabled={loadingManufacturers}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50"
            >
              <option value="">
                {loadingManufacturers
                  ? "Loading manufacturers..."
                  : "All manufacturers"}
              </option>
              {manufacturers.map((manufacturer, index) => (
                <option
                  key={manufacturer.id || index}
                  value={manufacturer.name || manufacturer}
                >
                  {manufacturer.name || manufacturer}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label
              htmlFor="startDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Start Date
            </label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label
              htmlFor="endDate"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              End Date
            </label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Category Tags Filter */}
          <div>
            <label
              htmlFor="categoryTags"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Category Tags
            </label>
            <select
              id="categoryTags"
              value={
                selectedCategoryTags.length > 0 ? selectedCategoryTags[0] : ""
              }
              onChange={(e) => {
                const value = e.target.value;
                if (value) {
                  setSelectedCategoryTags([value]);
                } else {
                  setSelectedCategoryTags([]);
                }
              }}
              disabled={
                !selectedManufacturerId || categoryTagsOptions.length === 0
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white disabled:bg-gray-50"
            >
              <option value="">
                {!selectedManufacturerId
                  ? "Select manufacturer first"
                  : categoryTagsOptions.length === 0
                    ? "No tags available"
                    : "All Category Tags"}
              </option>
              {categoryTagsOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleSearch}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            {loading ? "Searching..." : "Search"}
          </button>
          <button
            onClick={handleReset}
            disabled={loading}
            className="bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="text-red-600 p-4 bg-red-50 rounded-lg">
          <p>{error}</p>
          <button
            onClick={() => handleSearch()}
            className="mt-2 text-sm text-red-800 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Results Table */}
      <div className="overflow-x-auto">
        {loading && (
          <div className="animate-pulse space-y-3 mb-4">
            <div className="h-4 bg-gray-300 rounded w-1/4"></div>
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-4 bg-gray-300 rounded"></div>
            ))}
          </div>
        )}

        {!loading && (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Store Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manufacturer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Transaction Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category Tags
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Units
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Warehouse
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {data.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-6 py-8 text-center text-gray-500"
                  >
                    {loading
                      ? "Loading..."
                      : "No results found. Use the search filters above to find stores."}
                  </td>
                </tr>
              ) : (
                data.map((result, index) => (
                  <tr
                    key={`${result.productId || index}-${index}`}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {result.storeName || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.manufacturerName || "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 max-w-xs">
                      <div className="truncate" title={result.productName}>
                        {result.productName || "-"}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                      {result.productId || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                        {result.matchedSkuType || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {result.transactionDate
                        ? new Date(result.transactionDate).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {result.categoryTags && result.categoryTags.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {result.categoryTags.map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {typeof result.totalUnits === "number"
                        ? result.totalUnits
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {result.warehouse || "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Results Summary */}
      {!loading && data.length > 0 && (
        <div className="text-sm text-gray-600 mt-4">
          Found {data.length} transaction{data.length !== 1 ? "s" : ""} matching
          your search
        </div>
      )}
    </div>
  );
};

export default StoreLookupTable;
