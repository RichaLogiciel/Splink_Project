import React from "react";
import HorizontalProgressBar from "@/components/Progress/HorizontalProgressBar";
import { formatNumber } from "@/utils/numberFormatter";
import { getUrlWithQueryParam } from "@/utils/helper";
import { APP_ROUTES } from "@/configs/routes";
import Link from "next/link";

// Import Images
import arrowDown from "@/assets/icons/arrowDown.svg";
import arrowUp from "@/assets/icons/greyUpArrow.svg";
import closeIcon from "@/assets/icons/popupCloseIcon.svg";

interface StoreCompliance {
  storeId: number;
  storeName: string;
  isEnrolled: boolean;
  isCompliant: boolean;
  complianceStatus: string;
  earnedRebate: number;
  totalPurchaseVolume: number;
}

interface Manufacturer {
  id: number;
  name: string;
  logo: string;
  authorized: boolean;
}

interface Program {
  id: number;
  programId: number;
  programDetailId: number;
  name: string;
  programType: string;
  programHeader: string;
  tier: number;
  paymentTerms: string;
  startDate: string;
  endDate: string;
  manufacturer: Manufacturer;
  rebateType: string;
  rebateAmount: number;
  rebatePercentage: number;
  overview: string;
  criteria: string;
  minSpend: number;
  minQty: number;
  maxQty: number;
  productsTags: string;
  rebateCalculation: string;
  storeCompliance: StoreCompliance[];
  totalStores: number;
  enrolledStores: number;
  compliantStores: number;
  compliancePercentage: number;
  totalEarnedRebate: number;
  totalPurchaseVolume: number;
}

interface GroupedProgram {
  programHeader: string;
  programs: Program[];
  totalPurchaseVolume: number;
  totalEarnedRebate: number;
  totalStores: number;
  compliantStores: number;
  compliancePercentage: number;
}

interface GroupedManufacturer {
  manufacturer: Manufacturer;
  programTypes: GroupedProgram[];
  totalPurchaseVolume: number;
  totalEarnedRebate: number;
  totalStores: number;
  compliantStores: number;
  compliancePercentage: number;
}

interface ManufacturerProgramsModalProps {
  isOpen: boolean;
  onClose: () => void;
  manufacturerData: GroupedManufacturer;
  chainName: string;
  programTimeline?: string;
}

const ManufacturerProgramsModal: React.FC<ManufacturerProgramsModalProps> = ({
  isOpen,
  onClose,
  manufacturerData,
  chainName,
  programTimeline
}) => {
  const [expandedProgramTypes, setExpandedProgramTypes] = React.useState<
    Set<string>
  >(new Set());
  const [expandedTiers, setExpandedTiers] = React.useState<Set<string>>(
    new Set()
  );

  const toggleProgramTypeExpansion = (key: string) => {
    const newExpanded = new Set(expandedProgramTypes);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedProgramTypes(newExpanded);
  };

  const toggleTierExpansion = (key: string) => {
    const newExpanded = new Set(expandedTiers);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedTiers(newExpanded);
  };

  const calculateEarningsOpportunity = (
    purchaseVolume: number,
    rebatePercentage: number,
    earnedRebate: number
  ) => {
    const potentialEarnings = (purchaseVolume * rebatePercentage) / 100;
    return Math.max(0, potentialEarnings - earnedRebate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center">
            <div className="w-10 h-10 mr-4 relative">
              <img
                src={manufacturerData.manufacturer.logo}
                alt={manufacturerData.manufacturer.name}
                className="w-full h-full object-cover rounded"
              />
            </div>
            <div>
              <h2 className="text-xl font-semibold">
                {manufacturerData.manufacturer.name}
              </h2>
              <p className="text-sm text-gray-500">
                {manufacturerData.programTypes.length} program types •{" "}
                {chainName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <img src={closeIcon.src} alt="Close" className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="p-6 border-b bg-gray-50">
          <div className="grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                ${formatNumber(manufacturerData.totalPurchaseVolume)}
              </div>
              <div className="text-sm text-gray-600">Total Purchase Volume</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                ${formatNumber(manufacturerData.totalEarnedRebate)}
              </div>
              <div className="text-sm text-gray-600">Total Earned Rebate</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                $
                {formatNumber(
                  calculateEarningsOpportunity(
                    manufacturerData.totalPurchaseVolume,
                    5,
                    manufacturerData.totalEarnedRebate
                  )
                )}
              </div>
              <div className="text-sm text-gray-600">Earnings Opportunity</div>
            </div>
          </div>
        </div>

        {/* Programs Table */}
        <div className="overflow-y-auto max-h-[50vh]">
          <table className="w-full border-collapse">
            <thead className="h-11 border-b text-heading-very-light text-xs sticky top-0 bg-white z-[1]">
              <tr>
                <th className="min-w-44 lg:min-w-56 font-semibold text-left px-4 py-3">
                  Program
                </th>
                <th className="min-w-28 lg:min-w-40 font-semibold text-left px-4 py-3">
                  Purchase Volume
                </th>
                <th className="min-w-28 lg:min-w-40 font-semibold text-left px-4 py-3">
                  Estimated Earnings
                </th>
                <th className="min-w-28 lg:min-w-40 font-semibold text-left px-4 py-3">
                  Earnings Opp.
                </th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {manufacturerData.programTypes.map((programTypeGroup) => {
                const programTypeKey = `${manufacturerData.manufacturer.id}-${programTypeGroup.programHeader}`;

                return (
                  <React.Fragment key={programTypeKey}>
                    {/* Program Type Row */}
                    <tr
                      className="border-b hover:bg-blue-25 cursor-pointer bg-blue-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleProgramTypeExpansion(programTypeKey);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <div className="font-medium text-sm">
                            {programTypeGroup.programHeader}
                          </div>
                          <div className="ml-2 text-xs text-gray-500">
                            ({programTypeGroup.programs.length} tiers)
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm">
                          ${formatNumber(programTypeGroup.totalPurchaseVolume)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-green-600">
                          ${formatNumber(programTypeGroup.totalEarnedRebate)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-sm text-yellow-600">
                          $
                          {formatNumber(
                            calculateEarningsOpportunity(
                              programTypeGroup.totalPurchaseVolume,
                              5,
                              programTypeGroup.totalEarnedRebate
                            )
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <img
                          src={
                            expandedProgramTypes.has(programTypeKey)
                              ? arrowUp.src
                              : arrowDown.src
                          }
                          alt="Expand/Collapse"
                          className="w-4 h-4"
                        />
                      </td>
                    </tr>

                    {/* Individual Tiers under Program Type */}
                    {expandedProgramTypes.has(programTypeKey) &&
                      programTypeGroup.programs.map((program) => {
                        const tierKey = `${programTypeKey}-${program.id}`;

                        return (
                          <React.Fragment key={tierKey}>
                            {/* Tier Row */}
                            <tr
                              className="border-b hover:bg-green-25 cursor-pointer bg-green-50"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTierExpansion(tierKey);
                              }}
                            >
                              <td className="px-4 py-3 pl-8">
                                <div className="flex items-center">
                                  <div className="font-medium text-sm">
                                    Tier {program.tier} - {program.name}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-sm">
                                  ${formatNumber(program.totalPurchaseVolume)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-sm text-green-600">
                                  ${formatNumber(program.totalEarnedRebate)}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-sm text-yellow-600">
                                  $
                                  {formatNumber(
                                    calculateEarningsOpportunity(
                                      program.totalPurchaseVolume,
                                      program.rebatePercentage,
                                      program.totalEarnedRebate
                                    )
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <img
                                  src={
                                    expandedTiers.has(tierKey)
                                      ? arrowUp.src
                                      : arrowDown.src
                                  }
                                  alt="Expand/Collapse"
                                  className="w-4 h-4"
                                />
                              </td>
                            </tr>

                            {/* Store Compliance Details */}
                            {expandedTiers.has(tierKey) && (
                              <tr className="border-b">
                                <td
                                  colSpan={5}
                                  className="px-4 py-3 bg-gray-50"
                                >
                                  <div className="pl-12">
                                    <div className="mb-2 font-medium text-sm">
                                      Store Compliance Details:
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-sm">
                                        <thead>
                                          <tr className="border-b">
                                            <th className="text-left py-2 px-3">
                                              Store Name
                                            </th>
                                            <th className="text-left py-2 px-3">
                                              Compliance Status
                                            </th>
                                            <th className="text-left py-2 px-3">
                                              Purchase Volume
                                            </th>
                                            <th className="text-left py-2 px-3">
                                              Earned Rebate
                                            </th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {program.storeCompliance.map(
                                            (store) => (
                                              <tr
                                                key={store.storeId}
                                                className="border-b hover:bg-gray-100 cursor-pointer"
                                                onClick={() => {
                                                  const programUrl =
                                                    getUrlWithQueryParam(
                                                      `${APP_ROUTES.store}/${store.storeId}/program/${program.programId}`,
                                                      "programTimeline",
                                                      programTimeline ||
                                                        "Current"
                                                    );
                                                  window.location.href =
                                                    programUrl;
                                                }}
                                              >
                                                <td className="py-2 px-3">
                                                  {store.storeName}
                                                </td>
                                                <td className="py-2 px-3">
                                                  <span
                                                    className={`px-2 py-1 rounded text-xs ${
                                                      store.isCompliant
                                                        ? "bg-green-100 text-green-800"
                                                        : "bg-red-100 text-red-800"
                                                    }`}
                                                  >
                                                    {store.complianceStatus}
                                                  </span>
                                                </td>
                                                <td className="py-2 px-3">
                                                  $
                                                  {formatNumber(
                                                    store.totalPurchaseVolume
                                                  )}
                                                </td>
                                                <td className="py-2 px-3 text-green-600">
                                                  $
                                                  {formatNumber(
                                                    store.earnedRebate
                                                  )}
                                                </td>
                                              </tr>
                                            )
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManufacturerProgramsModal;
