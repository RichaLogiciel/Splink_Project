"use client";

import { useState } from "react";
import React from "react";
import { formatNumber } from "@/utils/numberFormatter";

interface Program {
  programId: number;
  programName: string;
  programType: string;
  rebate: string;
  enrolledChains: number;
  totalChains: number;
  compliantChains: number;
  enrolledStores: number;
  totalStores: number;
  totalPurchaseVolume: number;
  totalEarnedRebate: number;
}

interface ManufacturerChainData {
  manufacturerId: number;
  manufacturerName: string;
  manufacturerLogo?: string;
  programCount: number;
  totalChainsEnrolled: number;
  totalStoresEnrolled: number;
  totalPurchaseVolume: number;
  totalEarnedRebate: number;
  programs: Program[];
}

interface ChainProgramsTabClientProps {
  initialData: ManufacturerChainData[];
}

const ChainProgramsTabClient = ({
  initialData
}: ChainProgramsTabClientProps) => {
  const [expandedManufacturers, setExpandedManufacturers] = useState<{
    [manufacturerId: number]: boolean;
  }>({});

  const toggleManufacturerExpansion = (manufacturerId: number) => {
    setExpandedManufacturers((prev) => ({
      ...prev,
      [manufacturerId]: !prev[manufacturerId]
    }));
  };

  const isManufacturerExpanded = (manufacturerId: number) => {
    return expandedManufacturers[manufacturerId] || false;
  };

  return initialData.length > 0 ? (
    <div className="mt-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse border-t">
          <thead className="h-11 border-b text-heading-very-light text-xs">
            <tr>
              <th className="font-normal min-w-64 px-2 sm:px-4 text-left">
                Manufacturer
              </th>
              <th className="font-normal min-w-24 px-2 sm:px-4 text-left">
                Programs
              </th>
              <th className="font-normal min-w-32 px-2 sm:px-4 text-left">
                Chains Enrolled
              </th>
              <th className="font-normal min-w-32 px-2 sm:px-4 text-left">
                Stores Enrolled
              </th>
              <th className="font-normal min-w-32 px-2 sm:px-4 text-left">
                Purchase Volume
              </th>
              <th className="font-normal min-w-32 px-2 sm:px-4 text-left">
                Total Rebate
              </th>
            </tr>
          </thead>
          <tbody>
            {initialData.map((manufacturer) => (
              <React.Fragment key={manufacturer.manufacturerId}>
                {/* Main manufacturer row */}
                <tr
                  className="border-b hover:bg-gray-50 cursor-pointer"
                  onClick={() =>
                    toggleManufacturerExpansion(manufacturer.manufacturerId)
                  }
                >
                  <td className="px-2 sm:px-4 py-3">
                    <div className="flex items-center gap-3">
                      <svg
                        className={`w-4 h-4 transition-transform ${
                          isManufacturerExpanded(manufacturer.manufacturerId)
                            ? "rotate-90"
                            : ""
                        }`}
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
                      {manufacturer.manufacturerLogo && (
                        <img
                          src={manufacturer.manufacturerLogo}
                          alt={manufacturer.manufacturerName}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      )}
                      <span className="font-medium">
                        {manufacturer.manufacturerName}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 sm:px-4 py-3">
                    <span className="text-sm font-medium">
                      {manufacturer.programCount}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-3">
                    <span className="text-sm font-medium">
                      {formatNumber(manufacturer.totalChainsEnrolled)}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-3">
                    <span className="text-sm font-medium">
                      {formatNumber(manufacturer.totalStoresEnrolled)}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-3">
                    <span className="text-sm font-medium">
                      ${formatNumber(manufacturer.totalPurchaseVolume)}
                    </span>
                  </td>
                  <td className="px-2 sm:px-4 py-3">
                    <span className="text-sm font-medium">
                      ${formatNumber(manufacturer.totalEarnedRebate)}
                    </span>
                  </td>
                </tr>

                {/* Expanded programs section */}
                {isManufacturerExpanded(manufacturer.manufacturerId) && (
                  <tr>
                    <td colSpan={6} className="px-0 py-0">
                      <div className="bg-gray-50 border-t">
                        <div className="px-4 py-3">
                          <h4 className="text-sm font-medium text-gray-700 mb-3">
                            Programs
                          </h4>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead className="bg-white">
                                <tr>
                                  <th className="text-left py-2 px-3 font-medium">
                                    Program Name
                                  </th>
                                  <th className="text-left py-2 px-3 font-medium">
                                    Type
                                  </th>
                                  <th className="text-left py-2 px-3 font-medium">
                                    Rebate
                                  </th>
                                  <th className="text-left py-2 px-3 font-medium">
                                    Chains
                                  </th>
                                  <th className="text-left py-2 px-3 font-medium">
                                    Compliant
                                  </th>
                                  <th className="text-left py-2 px-3 font-medium">
                                    Stores
                                  </th>
                                  <th className="text-left py-2 px-3 font-medium">
                                    Purchase Volume
                                  </th>
                                  <th className="text-left py-2 px-3 font-medium">
                                    Earned Rebate
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {manufacturer.programs.map((program) => (
                                  <tr
                                    key={program.programId}
                                    className="border-b border-gray-200"
                                  >
                                    <td className="py-2 px-3">
                                      {program.programName}
                                    </td>
                                    <td className="py-2 px-3">
                                      {program.programType}
                                    </td>
                                    <td className="py-2 px-3 text-green font-medium">
                                      {program.rebate}
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className="text-xs">
                                        {program.enrolledChains}/
                                        {program.totalChains}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className="text-xs">
                                        {program.compliantChains}/
                                        {program.enrolledChains}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3">
                                      <span className="text-xs">
                                        {program.enrolledStores}/
                                        {program.totalStores}
                                      </span>
                                    </td>
                                    <td className="py-2 px-3">
                                      $
                                      {formatNumber(
                                        program.totalPurchaseVolume
                                      )}
                                    </td>
                                    <td className="py-2 px-3">
                                      ${formatNumber(program.totalEarnedRebate)}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ) : (
    <div className="mt-4 p-8 text-center">
      <p className="text-heading-very-light text-sm">
        It seems there are currently no chain programs available. Please check
        back later or explore other sections.
      </p>
    </div>
  );
};

export default ChainProgramsTabClient;
