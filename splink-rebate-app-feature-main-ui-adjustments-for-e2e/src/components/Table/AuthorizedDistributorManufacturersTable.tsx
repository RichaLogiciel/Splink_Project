"use client";

import React, { useState, useEffect } from "react";
import { fetchAuthorizedDistributorManufacturers } from "@/app/app/distributor-admin/APIClient";

interface AuthorizedDistributorManufacturer {
  id: number;
  distributorId: number;
  manufacturerId: number;
  distributor: {
    id: number;
    name: string;
  };
  manufacturer: {
    id: number;
    name: string;
  };
  authorized: boolean;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}

interface AuthorizedDistributorManufacturersTableProps {
  initialData?: AuthorizedDistributorManufacturer[];
}

const AuthorizedDistributorManufacturersTable: React.FC<
  AuthorizedDistributorManufacturersTableProps
> = ({ initialData }) => {
  const [data, setData] = useState<AuthorizedDistributorManufacturer[]>(
    initialData || []
  );
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [expandedDistributors, setExpandedDistributors] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    if (!initialData) {
      fetchData();
    }
  }, [initialData]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAuthorizedDistributorManufacturers();
      setData(response?.data || response || []);
    } catch (err) {
      console.error(
        "Error fetching authorized distributor manufacturers:",
        err
      );
      setError("Failed to load authorized distributor manufacturers data");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (distributorName: string) => {
    setExpandedDistributors((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(distributorName)) {
        newSet.delete(distributorName);
      } else {
        newSet.add(distributorName);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-300 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-4 bg-gray-300 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-600 p-4 bg-red-50 rounded-lg">
        <p>{error}</p>
        <button
          onClick={fetchData}
          className="mt-2 text-sm text-red-800 underline hover:no-underline"
        >
          Try again
        </button>
      </div>
    );
  }

  // Group data by distributor
  const groupedData = data.reduce(
    (acc, item) => {
      const distributorName =
        item.distributor?.name ||
        item.distributorName ||
        (item.distributorId ? `ID: ${item.distributorId}` : "Unknown");

      const manufacturerName =
        item.manufacturer?.name ||
        item.manufacturerName ||
        (item.manufacturerId ? `ID: ${item.manufacturerId}` : "Unknown");

      if (!acc[distributorName]) {
        acc[distributorName] = [];
      }
      acc[distributorName].push(manufacturerName);
      return acc;
    },
    {} as Record<string, string[]>
  );

  return (
    <div className="space-y-6">
      {Object.keys(groupedData).length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          No authorized distributor manufacturers found
        </div>
      ) : (
        Object.entries(groupedData).map(([distributorName, manufacturers]) => {
          const isExpanded = expandedDistributors.has(distributorName);
          return (
            <div
              key={distributorName}
              className="bg-white rounded-lg border border-gray-200 p-6"
            >
              <button
                onClick={() => toggleExpanded(distributorName)}
                className="flex items-center justify-between w-full text-left hover:bg-gray-50 -m-2 p-2 rounded-md transition-colors"
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {distributorName}:
                </h3>
                <div className="flex items-center">
                  <span className="text-sm text-gray-500 mr-2">
                    {manufacturers.length} manufacturer
                    {manufacturers.length !== 1 ? "s" : ""}
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      isExpanded ? "rotate-180" : ""
                    }`}
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
                </div>
              </button>
              {isExpanded && (
                <div className="mt-4 space-y-2">
                  {manufacturers.map((manufacturer, index) => (
                    <div
                      key={`${distributorName}-${manufacturer}-${index}`}
                      className="flex items-center pl-4 py-2 text-gray-700"
                    >
                      <span className="text-gray-400 mr-2">•</span>
                      <span className="text-sm">{manufacturer}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
};

export default AuthorizedDistributorManufacturersTable;
