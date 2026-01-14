"use client";

import React from "react";
import { formatNumber } from "@/utils/numberFormatter";
import ProgramTypeModal from "@/components/Dialog/ProgramTypeModal";

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

interface ChainProgramsTableProps {
  programs: Program[];
  chainName: string;
  programTimeline?: string;
}

const ChainProgramsTable: React.FC<ChainProgramsTableProps> = ({
  programs,
  chainName,
  programTimeline
}) => {
  const [expandedManufacturers, setExpandedManufacturers] = React.useState<
    Set<number>
  >(new Set());
  const [selectedProgramType, setSelectedProgramType] =
    React.useState<GroupedProgram | null>(null);
  const [selectedManufacturer, setSelectedManufacturer] =
    React.useState<Manufacturer | null>(null);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Group programs by manufacturer and program type
  const groupedData = React.useMemo(() => {
    const manufacturerMap = new Map<number, GroupedManufacturer>();

    programs.forEach((program) => {
      const manufacturerId = program.manufacturer.id;

      if (!manufacturerMap.has(manufacturerId)) {
        manufacturerMap.set(manufacturerId, {
          manufacturer: program.manufacturer,
          programTypes: [],
          totalPurchaseVolume: 0,
          totalEarnedRebate: 0,
          totalStores: 0,
          compliantStores: 0,
          compliancePercentage: 0
        });
      }

      const manufacturerGroup = manufacturerMap.get(manufacturerId)!;

      // Find or create program type group
      let programTypeGroup = manufacturerGroup.programTypes.find(
        (pt) => pt.programHeader === program.programHeader
      );
      if (!programTypeGroup) {
        programTypeGroup = {
          programHeader: program.programHeader,
          programs: [],
          totalPurchaseVolume: 0,
          totalEarnedRebate: 0,
          totalStores: 0,
          compliantStores: 0,
          compliancePercentage: 0
        };
        manufacturerGroup.programTypes.push(programTypeGroup);
      }

      // Add program to type group
      programTypeGroup.programs.push(program);

      // Update aggregated values for program type
      programTypeGroup.totalPurchaseVolume = Math.max(
        programTypeGroup.totalPurchaseVolume,
        program.totalPurchaseVolume
      );
      programTypeGroup.totalEarnedRebate += program.totalEarnedRebate;
      programTypeGroup.totalStores += program.totalStores;
      programTypeGroup.compliantStores += program.compliantStores;

      // Update aggregated values for manufacturer
      manufacturerGroup.totalPurchaseVolume = Math.max(
        manufacturerGroup.totalPurchaseVolume,
        program.totalPurchaseVolume
      );
      manufacturerGroup.totalEarnedRebate += program.totalEarnedRebate;
      manufacturerGroup.totalStores += program.totalStores;
      manufacturerGroup.compliantStores += program.compliantStores;
    });

    // Calculate compliance percentages
    manufacturerMap.forEach((manufacturerGroup) => {
      manufacturerGroup.compliancePercentage =
        manufacturerGroup.totalStores > 0
          ? (manufacturerGroup.compliantStores /
              manufacturerGroup.totalStores) *
            100
          : 0;

      manufacturerGroup.programTypes.forEach((programTypeGroup) => {
        programTypeGroup.compliancePercentage =
          programTypeGroup.totalStores > 0
            ? (programTypeGroup.compliantStores /
                programTypeGroup.totalStores) *
              100
            : 0;
      });
    });

    return Array.from(manufacturerMap.values());
  }, [programs]);

  const toggleManufacturerExpansion = (manufacturerId: number) => {
    const newExpanded = new Set(expandedManufacturers);
    if (newExpanded.has(manufacturerId)) {
      newExpanded.delete(manufacturerId);
    } else {
      newExpanded.add(manufacturerId);
    }
    setExpandedManufacturers(newExpanded);
  };

  const handleProgramTypeClick = (
    programType: GroupedProgram,
    manufacturer: Manufacturer
  ) => {
    setSelectedProgramType(programType);
    setSelectedManufacturer(manufacturer);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProgramType(null);
    setSelectedManufacturer(null);
  };

  const calculateEarningsOpportunity = (
    purchaseVolume: number,
    rebatePercentage: number,
    earnedRebate: number
  ) => {
    const potentialEarnings = (purchaseVolume * rebatePercentage) / 100;
    return Math.max(0, potentialEarnings - earnedRebate);
  };

  return (
    <>
      <div className="chainProgramsTable">
        <table className="w-full border-collapse">
          <thead className="h-11 border-b text-heading-very-light text-xs sticky top-0 bg-white z-[1]">
            <tr>
              <th className="min-w-44 lg:min-w-56 font-semibold text-left px-4 py-3">
                <span className="inline mr-2">Manufacturer</span>
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
            {groupedData.map((manufacturerGroup) => (
              <tr
                key={manufacturerGroup.manufacturer.id}
                className="border-b hover:bg-gray-50 cursor-pointer bg-gray-25"
                onClick={() =>
                  handleProgramTypeClick(
                    {
                      programHeader: manufacturerGroup.manufacturer.name,
                      programs: manufacturerGroup.programTypes.flatMap(
                        (pt) => pt.programs
                      ),
                      totalPurchaseVolume:
                        manufacturerGroup.totalPurchaseVolume,
                      totalEarnedRebate: manufacturerGroup.totalEarnedRebate,
                      totalStores: manufacturerGroup.totalStores,
                      compliantStores: manufacturerGroup.compliantStores,
                      compliancePercentage:
                        manufacturerGroup.compliancePercentage
                    },
                    manufacturerGroup.manufacturer
                  )
                }
              >
                <td className="px-4 py-1">
                  <div className="flex items-center">
                    <div className="w-6 h-6 mr-2 relative">
                      <img
                        src={manufacturerGroup.manufacturer.logo}
                        alt={manufacturerGroup.manufacturer.name}
                        className="w-full h-full object-cover rounded"
                      />
                    </div>
                    <div>
                      <div className="font-semibold text-sm">
                        {manufacturerGroup.manufacturer.name}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-1">
                  <div className="font-semibold text-sm">
                    ${formatNumber(manufacturerGroup.totalPurchaseVolume)}
                  </div>
                </td>
                <td className="px-4 py-1">
                  <div className="font-semibold text-sm text-green-600">
                    ${formatNumber(manufacturerGroup.totalEarnedRebate)}
                  </div>
                </td>
                <td className="px-4 py-1">
                  <div className="font-semibold text-sm text-yellow-600">
                    $
                    {formatNumber(
                      calculateEarningsOpportunity(
                        manufacturerGroup.totalPurchaseVolume,
                        5, // Default rebate percentage for calculation
                        manufacturerGroup.totalEarnedRebate
                      )
                    )}
                  </div>
                </td>
                <td className="px-4 py-1"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Program Type Modal */}
      {selectedProgramType && selectedManufacturer && (
        <ProgramTypeModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          manufacturerName={selectedManufacturer.name}
          programs={selectedProgramType.programs}
          chainData={{ chainName }}
        />
      )}
    </>
  );
};

export default ChainProgramsTable;
