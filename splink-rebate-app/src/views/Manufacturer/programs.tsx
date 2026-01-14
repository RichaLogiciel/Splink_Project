import { fetchDistributors } from "@/app/app/DashboardAPIs";
import { fetchCategoriesProducts, fetchData } from "./programsAPIs";

// Import Components
import ManufacturerDashboardHead from "@/components/ManufacturerDashboardHead";
import ProgramsClient from "./ProgramsClient";
import { ROIViewProvider } from "@/contexts/ROIViewContext";

// Import Util functions
import { ProgramComplianceDetails } from "@/types/DistributorTypes";
import { getUserServer } from "@/utils/getUserServer";
import { getProgramTimelineQueryParam } from "@/utils/helper";
import { formatNumber } from "@/utils/numberFormatter";
import { isManufacturer } from "@/utils/rolesConditions";

// Utility function to extract base program name (removes tier information)
const getBaseProgramName = (programName: string): string => {
  // Remove patterns like "Tier 1", "Tier 2", "TIER 1", "tier 1", "- Tier 1", etc.
  return programName
    .replace(/\s*-\s*TIER\s*\d+/i, "")
    .replace(/\s*TIER\s*\d+/i, "")
    .replace(/\s*Tier\s*\d+/g, "")
    .replace(/\s*tier\s*\d+/g, "")
    .trim();
};

// Utility function to extract tier number from program name
const getTierNumber = (programName: string): number => {
  const tierMatch = programName.match(/tier\s*(\d+)/i);
  return tierMatch ? parseInt(tierMatch[1], 10) : 0;
};

// Utility function to remove numbers from description
const removeNumbersFromDescription = (description: string): string => {
  if (!description) return description;
  // Remove standalone numbers and numbers that are part of phrases like "2 SKUs" -> "SKUs"
  return description
    .replace(/\b\d+\s+/g, "") // Remove numbers followed by space (e.g., "2 " -> "")
    .replace(/\s+\d+\b/g, "") // Remove numbers preceded by space (e.g., " 2" -> "")
    .replace(/\b\d+\b/g, "") // Remove standalone numbers
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();
};

// Group programs by base name and aggregate data
const groupProgramsByBaseName = (
  programs: (ProgramOverview | ProgramComplianceDetails)[]
): (ProgramOverview | ProgramComplianceDetails)[] => {
  const grouped = new Map<
    string,
    {
      baseName: string;
      tiers: (ProgramOverview | ProgramComplianceDetails)[];
      aggregated: ProgramOverview | ProgramComplianceDetails;
    }
  >();

  programs.forEach((program) => {
    const baseName = getBaseProgramName(program.programName);
    const existing = grouped.get(baseName);

    if (existing) {
      existing.tiers.push(program);
      // Aggregate data
      const aggregated = existing.aggregated;

      // Handle ProgramOverview type
      if (
        "completedCompliances" in aggregated &&
        "completedCompliances" in program
      ) {
        (aggregated as ProgramOverview).completedCompliances += (
          program as ProgramOverview
        ).completedCompliances;
        (aggregated as ProgramOverview).totalEnrollments += (
          program as ProgramOverview
        ).totalEnrollments;
        (aggregated as ProgramOverview).rebate +=
          (program as ProgramOverview).rebate || 0;
      }
      // Handle ProgramComplianceDetails type (checking for properties that may exist)
      // Note: For store programs, we don't sum compliance - we'll use the lowest tier's compliance later
      else if (
        "qualifiedStores" in aggregated &&
        "qualifiedStores" in program
      ) {
        const agg = aggregated as any;
        const prog = program as any;
        // Don't sum compliance values - we'll use the lowest tier's values later
        // Only sum rebate
        if (agg.totalRebate !== undefined && prog.totalRebate !== undefined) {
          agg.totalRebate = (agg.totalRebate || 0) + (prog.totalRebate || 0);
        }
      }
    } else {
      // Create aggregated version
      const aggregated = { ...program } as
        | ProgramOverview
        | ProgramComplianceDetails;
      aggregated.programName = baseName;
      grouped.set(baseName, {
        baseName,
        tiers: [program],
        aggregated
      });
    }
  });

  // Return aggregated programs with tiers attached
  return Array.from(grouped.values()).map((group) => {
    // Find the highest tier
    let highestTier = group.tiers[0];
    let highestTierNumber = getTierNumber(highestTier.programName);

    // Find the lowest tier (for store compliance)
    let lowestTier = group.tiers[0];
    let lowestTierNumber = getTierNumber(lowestTier.programName);

    group.tiers.forEach((tier) => {
      const tierNumber = getTierNumber(tier.programName);
      if (tierNumber > highestTierNumber) {
        highestTierNumber = tierNumber;
        highestTier = tier;
      }
      if (
        tierNumber < lowestTierNumber ||
        (tierNumber === 0 && lowestTierNumber > 0)
      ) {
        lowestTierNumber = tierNumber;
        lowestTier = tier;
      }
    });

    // Get description from highest tier and remove numbers only if multiple tiers
    const cleanedOverview =
      group.tiers.length > 1
        ? highestTier.overview
          ? removeNumbersFromDescription(highestTier.overview)
          : group.aggregated.overview
        : group.aggregated.overview;

    // Calculate rebate range if multiple tiers
    let rebatePercentage = group.aggregated.rebate_percentage;
    let rebateAmount = group.aggregated.rebate_amount;
    const rebateType = group.aggregated.rebate_type;

    if (group.tiers.length > 1) {
      if (rebateType === "percentage") {
        // Get all percentage values and find min/max
        const percentages = group.tiers
          .map((tier) => Number(tier.rebate_percentage) || 0)
          .filter((val) => val > 0);
        if (percentages.length > 0) {
          const min = Math.min(...percentages);
          const max = Math.max(...percentages);
          rebatePercentage = `${formatNumber(min, false, 1)}-${formatNumber(max, false, 1)}%`;
        }
      } else {
        // Get all dollar amounts and find min/max
        const amounts = group.tiers
          .map((tier) => Number(tier.rebate_amount) || 0)
          .filter((val) => val > 0);
        if (amounts.length > 0) {
          const min = Math.min(...amounts);
          const max = Math.max(...amounts);
          rebateAmount = `$${formatNumber(min, false, 1)}-$${formatNumber(max, false, 1)}`;
        }
      }
    }

    // For store programs (ProgramComplianceDetails), use lowest tier compliance instead of aggregated
    const finalAggregated = { ...group.aggregated } as any;

    // Check if this is a store program (ProgramComplianceDetails)
    if ("qualifiedStores" in finalAggregated && group.tiers.length > 1) {
      const lowestTierData = lowestTier as any;
      if (lowestTierData.qualifiedStores !== undefined) {
        finalAggregated.qualifiedStores = lowestTierData.qualifiedStores;
      }
      if (lowestTierData.totalStores !== undefined) {
        finalAggregated.totalStores = lowestTierData.totalStores;
      }
    }

    return {
      ...finalAggregated,
      overview: cleanedOverview,
      rebate_percentage: rebatePercentage,
      rebate_amount: rebateAmount,
      _tiers: group.tiers // Attach tiers for ROI modal
    };
  });
};

interface ProgramsProps {
  searchParams: {
    distributorId: string;
    programTimeline: string;
  };
}

interface ProgramOverview {
  programId?: number;
  programName: string;
  completedCompliances: number;
  totalEnrollments: number;
  rebate: number;
  programStartDate: string;
  programEndDate: string;
  overview?: string;
  rebate_percentage?: string;
  rebate_type?: string;
  rebate_amount?: string;
  _tiers?: (ProgramOverview | ProgramComplianceDetails)[]; // For storing tier breakdown
}

const Programs = async ({ searchParams }: ProgramsProps) => {
  const programTimeline = getProgramTimelineQueryParam(
    searchParams?.programTimeline
  );
  const user = await getUserServer();
  const triggerUIUpdateForManufacturer =
    process.env.NEXT_PUBLIC_HIDE_DISTRIBUTOR_PROGRAMS_FOR_MANUFACTURERS?.split(
      ","
    )
      .map(Number)
      .includes(user?.associatedUserId);

  const distributors = await fetchDistributors();
  const programsData = await fetchData(
    searchParams.distributorId,
    programTimeline
  );

  // Only fetch categorized products if triggerUIUpdateForManufacturer is true
  const categorizedProducts = triggerUIUpdateForManufacturer
    ? await fetchCategoriesProducts()
    : {};

  // Group programs by base name
  const groupedDistributorPrograms =
    programsData?.distributorProgramsData?.length > 0
      ? groupProgramsByBaseName(programsData.distributorProgramsData)
      : [];
  let groupedStorePrograms =
    programsData?.storeProgramsData?.length > 0
      ? groupProgramsByBaseName(programsData.storeProgramsData)
      : [];
  const groupedSalesRepsPrograms =
    programsData?.salesRepsProgramsData?.length > 0
      ? groupProgramsByBaseName(programsData.salesRepsProgramsData)
      : [];

  // For manufacturer users, sort store programs to move "Display" programs to the end
  const isManufacturerUser = isManufacturer(user?.role || "");
  if (isManufacturerUser && groupedStorePrograms.length > 0) {
    groupedStorePrograms = [...groupedStorePrograms].sort((a, b) => {
      const aIsDisplay = a.programName.toLowerCase().includes("display");
      const bIsDisplay = b.programName.toLowerCase().includes("display");

      // If both are Display or both are not Display, maintain original order
      if (aIsDisplay === bIsDisplay) {
        return 0;
      }

      // Display programs go to the end
      if (aIsDisplay) {
        return 1; // A is Display, move it to end
      }
      return -1; // B is Display, move it to end
    });
  }

  return (
    <ROIViewProvider>
      <ManufacturerDashboardHead
        title={"Programs Overview"}
        selectableEntities={distributors}
        showAddProgramBtn
        showProgramFilterSwitch
        programTimeline={programTimeline}
      />
      <ProgramsClient
        distributorProgramsData={groupedDistributorPrograms}
        storeProgramsData={groupedStorePrograms}
        salesRepsProgramsData={groupedSalesRepsPrograms}
        triggerUIUpdateForManufacturer={triggerUIUpdateForManufacturer || false}
        categorizedProducts={categorizedProducts}
      />
    </ROIViewProvider>
  );
};

export default Programs;
