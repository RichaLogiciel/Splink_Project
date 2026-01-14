"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getDateString } from "@/utils/dateHelper";

import { MESSAGES } from "@/configs/messages";
import {
  fetchDistributorAdminPrograms,
  fetchAllManufacturersFromProducts,
  fetchAllDistributors
} from "@/app/app/distributor-admin/APIClient";
import {
  DistributorAdminProgram,
  DistributorAdminProgramsParams
} from "@/types/DistributorAdminProgramTypes";

interface DistributorAdminProgramsTableProps {
  initialData?: DistributorAdminProgram[];
  searchParams?: any;
}

const DistributorAdminProgramsTable: React.FC<
  DistributorAdminProgramsTableProps
> = ({ initialData }) => {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [programs, setPrograms] = useState<DistributorAdminProgram[]>(
    initialData || []
  );
  const [isLoading, setIsLoading] = useState(false);

  // Filter states
  const [participantType, setParticipantType] = useState<string>(
    searchParams.get("participantType") || ""
  );
  const [manufacturerName, setManufacturerName] = useState<string>(
    searchParams.get("manufacturerName") || ""
  );
  const [distributorName, setDistributorName] = useState<string>(
    searchParams.get("distributorName") || ""
  );
  const [startDate, setStartDate] = useState<string>(
    searchParams.get("startDate") || ""
  );
  const [endDate, setEndDate] = useState<string>(
    searchParams.get("endDate") || ""
  );

  const [manufacturerOptions, setManufacturerOptions] = useState<any[]>([]);
  const [distributorOptions, setDistributorOptions] = useState<any[]>([]);
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

  const fetchData = useCallback(
    async (params: DistributorAdminProgramsParams = {}) => {
      setIsLoading(true);
      const apiParams = {
        participantType:
          params.participantType || (participantType as any) || undefined,
        manufacturerName:
          params.manufacturerName || manufacturerName || undefined,
        distributorName: params.distributorName || distributorName || undefined,
        startDate: params.startDate || startDate || undefined,
        endDate: params.endDate || endDate || undefined
      };

      console.log("Making API call with params:", apiParams);

      try {
        const response = await fetchDistributorAdminPrograms(apiParams);

        console.log("Fetch response:", response);

        if (response?.data) {
          console.log("Setting programs data:", response.data);
          setPrograms(response.data);
        } else if (response && Array.isArray(response)) {
          // Handle case where response is directly an array
          console.log("Setting programs data (direct array):", response);
          setPrograms(response);
        }
      } catch (error) {
        console.error("Error fetching programs:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [participantType, manufacturerName, distributorName, startDate, endDate]
  );

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [initialData, fetchData]);

  useEffect(() => {
    // Fetch manufacturers for the dropdown
    fetchAllManufacturersFromProducts()
      .then((response) => {
        const manufacturers = response?.data || response || [];
        const formattedOptions = manufacturers.map((manufacturer: any) => ({
          value: manufacturer.name || manufacturer,
          label: manufacturer.name || manufacturer
        }));
        setManufacturerOptions(formattedOptions);
      })
      .catch((error) => {
        console.error("Error fetching manufacturers:", error);
        setManufacturerOptions([]);
      });

    // Fetch distributors for the dropdown
    fetchAllDistributors()
      .then((response) => {
        const distributors = response?.data || response || [];
        const formattedOptions = distributors.map((distributor: any) => ({
          value: distributor.organizationName || distributor,
          label: distributor.organizationName || distributor
        }));
        setDistributorOptions(formattedOptions);
      })
      .catch((error) => {
        console.error("Error fetching distributors:", error);
        setDistributorOptions([]);
      });
  }, []);

  const handleFilterChange = (filterType: string, value: string) => {
    const updates: Record<string, string> = {};
    let newParams: DistributorAdminProgramsParams = {};

    if (filterType === "participantType") {
      setParticipantType(value);
      updates.participantType = value;
      newParams = {
        participantType: (value as any) || undefined,
        manufacturerName: manufacturerName || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };
    } else if (filterType === "manufacturerName") {
      setManufacturerName(value);
      updates.manufacturerName = value;
      newParams = {
        participantType: (participantType as any) || undefined,
        manufacturerName: value || undefined,
        distributorName: distributorName || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };
    } else if (filterType === "distributorName") {
      setDistributorName(value);
      updates.distributorName = value;
      newParams = {
        participantType: (participantType as any) || undefined,
        manufacturerName: manufacturerName || undefined,
        distributorName: value || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };
    } else if (filterType === "startDate") {
      setStartDate(value);
      updates.startDate = value;
      newParams = {
        participantType: (participantType as any) || undefined,
        manufacturerName: manufacturerName || undefined,
        distributorName: distributorName || undefined,
        startDate: value || undefined,
        endDate: endDate || undefined
      };
    } else if (filterType === "endDate") {
      setEndDate(value);
      updates.endDate = value;
      newParams = {
        participantType: (participantType as any) || undefined,
        manufacturerName: manufacturerName || undefined,
        distributorName: distributorName || undefined,
        startDate: startDate || undefined,
        endDate: value || undefined
      };
    }

    updateURL(updates);
    fetchData(newParams);
  };

  const clearFilters = () => {
    setParticipantType("");
    setManufacturerName("");
    setDistributorName("");
    setStartDate("");
    setEndDate("");
    router.replace("?", { scroll: false });
    fetchData({
      participantType: undefined,
      manufacturerName: undefined,
      distributorName: undefined,
      startDate: undefined,
      endDate: undefined
    });
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

  const formatDate = (dateString: string) => {
    try {
      return getDateString(dateString);
    } catch {
      return dateString;
    }
  };

  const getParticipantTypeBadge = (type: string) => {
    const colors = {
      SALES_REP: "bg-blue-100 text-blue-800",
      DISTRIBUTOR: "bg-green-100 text-green-800",
      STORE: "bg-purple-100 text-purple-800"
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const getApprovalStatusBadge = (status: string) => {
    const colors = {
      APPROVED: "bg-green-100 text-green-800",
      PENDING: "bg-yellow-100 text-yellow-800",
      REJECTED: "bg-red-100 text-red-800",
      DRAFT: "bg-orange-100 text-orange-800"
    };
    return colors[status as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const toggleRowExpansion = (programId: number) => {
    setExpandedRows((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(programId)) {
        newSet.delete(programId);
      } else {
        newSet.add(programId);
      }
      return newSet;
    });
  };

  return (
    <div className="w-full">
      {/* Filters */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Participant Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Participant Type
            </label>
            <select
              value={participantType}
              onChange={(e) =>
                handleFilterChange("participantType", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Types</option>
              <option value="SALES_REP">Sales Rep</option>
              <option value="DISTRIBUTOR">Distributor</option>
              <option value="STORE">Store</option>
            </select>
          </div>

          {/* Manufacturer Name Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Manufacturer Name
            </label>
            <select
              value={manufacturerName}
              onChange={(e) =>
                handleFilterChange("manufacturerName", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Manufacturers</option>
              {manufacturerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Distributor Name Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Distributor Name
            </label>
            <select
              value={distributorName}
              onChange={(e) =>
                handleFilterChange("distributorName", e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              <option value="">All Distributors</option>
              {distributorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleFilterChange("startDate", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>

          {/* End Date Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleFilterChange("endDate", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>

        {/* Filter Actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            Clear Filters
          </button>
          <button
            onClick={() => fetchData()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Results Summary */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {programs.length} programs
      </div>

      {/* Table */}
      <div
        className={`overflow-x-auto ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
      >
        <table className="w-full border-collapse table-auto bg-white rounded-lg shadow">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Manufacturer
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Program Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Participant Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Program Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Start Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                End Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Approval Status
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Visibility Scope
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Internal Initiative
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {programs.length > 0 ? (
              programs.map((program, index) => {
                const isExpanded = expandedRows.has(program.programId);
                return (
                  <React.Fragment key={program.programId}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-4 text-sm text-center">
                        <button
                          onClick={() => toggleRowExpansion(program.programId)}
                          className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {isExpanded ? (
                            <svg
                              className="w-4 h-4"
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
                          ) : (
                            <svg
                              className="w-4 h-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-500 font-medium">
                        {index + 1}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        {program.manufacturerName}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-900">
                        {program.programName}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getParticipantTypeBadge(program.participantType)}`}
                        >
                          {program.participantType?.replace("_", " ") || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {program.programType}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDate(program.startDate)}
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {formatDate(program.endDate)}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getApprovalStatusBadge(program.approvalStatus)}`}
                        >
                          {program.approvalStatus}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-600">
                        {program.visibilityScope}
                      </td>
                      <td className="px-4 py-4 text-sm">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            program.internalInitiative === true
                              ? "bg-blue-100 text-blue-800"
                              : program.internalInitiative === false
                                ? "bg-gray-100 text-gray-800"
                                : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {program.internalInitiative === true
                            ? "Yes"
                            : program.internalInitiative === false
                              ? "No"
                              : "N/A"}
                        </span>
                      </td>
                    </tr>

                    {/* Expandable Details Row */}
                    {isExpanded && (
                      <tr className="bg-gray-50">
                        <td colSpan={11} className="px-4 py-4">
                          <div className="ml-8">
                            <h4 className="text-sm font-semibold text-gray-700 mb-3">
                              Program Details:
                            </h4>
                            {program.programDetails &&
                            program.programDetails.length > 0 ? (
                              <div className="space-y-3">
                                {program.programDetails.map(
                                  (detail: any, detailIndex: number) => {
                                    // Filter out unwanted fields
                                    const filteredDetail = Object.entries(
                                      detail
                                    ).filter(
                                      ([key]) =>
                                        ![
                                          "id",
                                          "deleted_at",
                                          "deletedAt",
                                          "createdAt",
                                          "created_at",
                                          "updatedAt",
                                          "updated_at",
                                          "program_id",
                                          "programId"
                                        ].includes(key)
                                    );

                                    return (
                                      <div
                                        key={detailIndex}
                                        className="bg-white rounded-lg border border-gray-200 shadow-sm"
                                      >
                                        <div className="px-4 py-2 bg-blue-50 border-b border-gray-200 rounded-t-lg">
                                          <h5 className="text-sm font-semibold text-blue-800">
                                            {detail.tier
                                              ? `Tier ${detail.tier}`
                                              : `Detail ${detailIndex + 1}`}
                                          </h5>
                                        </div>
                                        <div className="p-3">
                                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                                            {filteredDetail.map(
                                              ([key, value]: [string, any]) => (
                                                <div
                                                  key={key}
                                                  className="flex flex-wrap items-center"
                                                >
                                                  <span className="font-medium text-gray-600 mr-2">
                                                    {key
                                                      .replace(
                                                        /([A-Z])/g,
                                                        " $1"
                                                      )
                                                      .replace(/^./, (str) =>
                                                        str.toUpperCase()
                                                      )}
                                                    :
                                                  </span>
                                                  <span className="text-gray-900">
                                                    {value !== null &&
                                                    value !== undefined ? (
                                                      typeof value ===
                                                      "boolean" ? (
                                                        <span
                                                          className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded ${
                                                            value
                                                              ? "bg-green-100 text-green-700"
                                                              : "bg-red-100 text-red-700"
                                                          }`}
                                                        >
                                                          {value ? "Yes" : "No"}
                                                        </span>
                                                      ) : typeof value ===
                                                          "number" &&
                                                        key
                                                          .toLowerCase()
                                                          .includes(
                                                            "percentage"
                                                          ) ? (
                                                        <span className="font-medium text-green-600">
                                                          {value}%
                                                        </span>
                                                      ) : typeof value ===
                                                          "number" &&
                                                        (key
                                                          .toLowerCase()
                                                          .includes("amount") ||
                                                          key
                                                            .toLowerCase()
                                                            .includes(
                                                              "rebate"
                                                            )) ? (
                                                        <span className="font-medium text-green-600">
                                                          ${value.toFixed(2)}
                                                        </span>
                                                      ) : (
                                                        String(value)
                                                      )
                                                    ) : (
                                                      <span className="text-gray-400 italic">
                                                        N/A
                                                      </span>
                                                    )}
                                                  </span>
                                                </div>
                                              )
                                            )}
                                          </div>
                                          {/* View Participants Button */}
                                          <div className="mt-4 pt-3 border-t border-gray-200">
                                            <button
                                              onClick={() => {
                                                // TODO: Implement view participants functionality
                                                console.log(
                                                  "View participants for program:",
                                                  program.programId,
                                                  "detail:",
                                                  detailIndex
                                                );
                                              }}
                                              className="inline-flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:text-blue-700 transition-colors"
                                            >
                                              <svg
                                                className="w-4 h-4 mr-2"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                              >
                                                <path
                                                  strokeLinecap="round"
                                                  strokeLinejoin="round"
                                                  strokeWidth={2}
                                                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                                                />
                                              </svg>
                                              View Participants
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500 italic">
                                No program details available
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <tr>
                <td
                  colSpan={11}
                  className="px-4 py-8 text-center text-sm text-gray-500"
                >
                  {MESSAGES.NO_RECORDS_FOUND}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DistributorAdminProgramsTable;
