import {
  DistributorProgram,
  DistributorProgramDetail,
  Manufacturer,
  ProgramListingCard,
  SalesData
} from "@/types/ProgramTypes";
import { getNumericDateString } from "@/utils/dateHelper";
import { formateRebate } from "@/utils/helper";
import { getManufacturerProgramDetails } from "../Distributor/programDetailAPIs";

/**
 * Maps a raw API response for SPIFF opportunities to an array of ProgramListingCard objects.
 *
 * @param {any} data - The raw API response.
 * @returns {Promise<ProgramListingCard[]>} - A promise that resolves to an array of ProgramListingCard objects.
 */
export const mapSpiffDataToProgramListingCard = async (
  data: any,
  isInternal?: boolean
): Promise<ProgramListingCard[]> => {
  if (!data || !Array.isArray(data)) {
    console.error("Invalid SPIFF API data:", data);
    return []; // Fallback to an empty array
  }

  const programCards = await Promise.all(
    data.map(async (spiffData: any) => {
      // const programDetails = await getManufacturerProgramDetails({
      //   manufacturerId: spiffData.id,
      //   type: "SALESREP",
      //   isInternal
      // });

      // Filter out manufacturers without SPIFF programs
      // if (!programDetails || !programDetails.programs.salesRep.length) {
      //   return null;
      // }
      return createSpiffProgramListingCard(spiffData, isInternal);
    })
  );
  // Filter out null values
  // return programCards.filter((card) => card !== null);
  return programCards;
};

/**
 * Creates a ProgramListingCard object from a raw SPIFF API response program data.
 *
 * @param {any} spiffData - The raw SPIFF API response program data.
 * @returns {Promise<ProgramListingCard>} - A promise that resolves to a ProgramListingCard object.
 */
export const createSpiffProgramListingCard = async (
  spiffData: any,
  isInternal?: boolean
): Promise<ProgramListingCard> => {
  const programDetails = await getManufacturerProgramDetails({
    manufacturerId: spiffData.id,
    type: "SALESREP",
    isInternal
  });

  const manufacturer: Manufacturer = {
    name: spiffData.manufacturer,
    avatar: spiffData.logo,
    authorized: true // Defaulting to true as not provided in SPIFF data
  };

  const salesData: SalesData = {
    purchaseVolume: {
      amount: Number(spiffData.My_earnings),
      yoy: 0
    },
    totalSavings: {
      amount: 0, // Not applicable for SPIFF card
      yoy: 0
    },
    totalOppSavings: {
      amount: 0
    },
    totalSalesRepSpiff: {
      amount: 0
    }
  };

  const programs: DistributorProgram[] =
    programDetails?.programs.salesRep.map((p: any) => ({
      ...p,
      type: p.overview, // Use overview for display
      overview: p.type, // Keep original type in overview
      id: p.id || 0,
      programDetailId: p.programDetailId || 0,
      complianceStatus: p.complianceStatus || false,
      additionalInfo: p.additionalInfo || {
        title: "",
        info: "",
        distributionTarget: { total: 0, completed: 0 },
        totalSavings: { amount: 0, yoy: 0 },
        description: ""
      },
      startDate: p.startDate,
      endDate: p.endDate
    })) ?? [];

  return {
    id: spiffData.id.toString(),
    manufacturer,
    programPaymentTerm: "", // Not in SPIFF data
    salesData,
    programs: programs
  };
};

export const mapDistributorSpiffSummaryToProgramListingCard = async (
  data: any[],
  isInternal?: boolean
): Promise<ProgramListingCard[]> => {
  if (!data || !Array.isArray(data)) {
    console.error("Invalid distributor SPIFF summary data:", data);
    return [];
  }

  const programCardPromises = data.map(async (item: any) => {
    const programDetails = await getManufacturerProgramDetails({
      manufacturerId: item.id,
      type: "DISTRIBUTOR",
      isInternal
    });

    // Transform SalesRepProgram[] to DistributorProgram[]
    const distributorPrograms: DistributorProgram[] =
      programDetails?.programs?.salesRep.map((p: any) => ({
        ...p,
        type: p.overview, // Use overview for display
        overview: p.type, // Keep original type in overview
        id: p.id || 0,
        programDetailId: p.programDetailId || 0,
        complianceStatus: p.complianceStatus || false,
        additionalInfo: p.additionalInfo || {
          title: "",
          info: "",
          distributionTarget: { total: 0, completed: 0 },
          totalSavings: { amount: 0, yoy: 0 },
          description: ""
        },
        startDate: p.startDate,
        endDate: p.endDate
      })) ?? [];

    const salesData: SalesData = {
      purchaseVolume: {
        amount: Number(item.total_earnings) || 0,
        yoy: 0
      },
      totalSavings: { amount: 0, yoy: 0 },
      totalOppSavings: { amount: 0 },
      totalSalesRepSpiff: { amount: 0 }
    };

    return {
      id: item.id.toString(),
      manufacturer: {
        name: item.manufacturer,
        avatar: item.logo,
        authorized: true // Assuming authorized
      },
      programPaymentTerm: "", // Not available in summary
      salesData,
      programs: distributorPrograms,
      startDate: item.Start_Date,
      endDate: item.End_Date
    };
  });

  return Promise.all(programCardPromises);
};

export const mapSalesManagerOverviewToProgramListingCard = async (
  data: any[],
  isInternal?: boolean
): Promise<ProgramListingCard[]> => {
  if (!data || !Array.isArray(data)) {
    console.error("Invalid distributor SPIFF summary data:", data);
    return [];
  }

  return data.map((item: any) => {
    // Flatten all programs → details into DistributorPrograms
    const distributorPrograms: DistributorProgram[] =
      item.programs?.flatMap(
        (program: any) =>
          program.details?.map((d: any) => ({
            id: d.id?.toString() || "0",
            name: program.name,
            overview: d.overview || "", // treat tier overview as program type
            type: d.program_header || d.program_type || program.name || "", // treat tier overview as program type
            rebate: d.rebate_amount
              ? `$${d.rebate_amount}`
              : d.rebate_percentage
                ? `${d.rebate_percentage}%`
                : "",
            programDetailId: d.id || 0,
            complianceStatus: false, // can be enriched later
            additionalInfo: {
              title: program.program_header || "",
              info: program.name || "",
              distributionTarget: { total: 0, completed: 0 },
              totalSavings: { amount: 0, yoy: 0 },
              description: ""
            },
            startDate: program.start_date,
            endDate: program.end_date
          })) ?? []
      ) ?? [];

    // Sum up all program earnings across tiers
    const salesData: SalesData = {
      totalSavings: {
        amount: Number(
          item.programs?.reduce(
            (acc: number, p: any) => acc + Number(p.total_earnings || 0),
            0
          )
        ),
        yoy: 0
      },
      purchaseVolume: { amount: 0, yoy: 0 },
      totalOppSavings: { amount: 0 },
      totalSalesRepSpiff: { amount: 0 }
    };

    return {
      id: item.id.toString(),
      manufacturer: {
        name: item.name,
        avatar: item.logo,
        authorized: true
      },
      programPaymentTerm: "",
      salesData,
      programs: distributorPrograms,
      startDate: distributorPrograms[0]?.startDate || "",
      endDate: distributorPrograms[0]?.endDate || ""
    };
  });
};

/**
 * Maps V2 SPIFF API response data to ProgramListingCard format without additional API calls.
 * This function works directly with the V2 API response structure.
 *
 * @param {any[]} data - The V2 API response data array.
 * @returns {ProgramListingCard[]} - Array of ProgramListingCard objects.
 */
export const mapSpiffV2DataToProgramListingCard = (
  data: any[]
): ProgramListingCard[] => {
  if (!data || !Array.isArray(data)) {
    console.error("Invalid V2 SPIFF API data:", data);
    return [];
  }

  return data.map((item: any) => {
    const manufacturer: Manufacturer = {
      name: item.manufacturerName,
      avatar: item.manufacturerLogo,
      authorized: item.authManufacturer || false
    };

    // Calculate total earned rebate across all programs
    const totalEarnedRebate = (item.program_overview || []).reduce(
      (total: number, program: any) => {
        const programEarnedRebate =
          program.compliances?.reduce(
            (programTotal: number, compliance: any) => {
              return programTotal + (Number(compliance.earnedRebate) || 0);
            },
            0
          ) || 0;
        return total + programEarnedRebate;
      },
      0
    );

    const salesData: SalesData = {
      purchaseVolume: {
        amount: Number(item.totalSaving) || totalEarnedRebate || 0,
        yoy: 0
      },
      totalSavings: {
        amount: Number(item.totalSaving) || totalEarnedRebate,
        yoy: 0
      },
      totalOppSavings: {
        amount: 0
      },
      totalSalesRepSpiff: {
        amount: totalEarnedRebate
      }
    };

    // Map program_overview array to DistributorProgram format
    // Create separate rows for each program detail
    const programs: DistributorProgram[] = (
      item.program_overview || []
    ).flatMap((program: any, programIndex: number) => {
      // Calculate total earned rebate from compliances for this program
      const totalEarnedRebate =
        program.compliances?.reduce((total: number, compliance: any) => {
          return total + (Number(compliance.earnedRebate) || 0);
        }, 0) || 0;

      // Calculate total purchase volume from compliances for this program
      const totalPurchaseVolume =
        program.compliances?.reduce((total: number, compliance: any) => {
          return total + (Number(compliance.totalPurchaseVolume) || 0);
        }, 0) || 0;

      // Create a separate row for each program detail
      return (program.programDetails || []).map(
        (programDetail: any, detailIndex: number) => {
          // Format rebate using the same function as V1 API
          const formattedRebate = formateRebate(
            {}, // compliance object (empty for V2)
            programDetail // program detail with rebate info
          );

          return {
            id: program.id || programIndex,
            programDetailId: programDetail.id || 0,
            type:
              programDetail.overview ||
              programDetail.programLine ||
              program.name ||
              program.programHeader ||
              "SPIFF", // Program type
            overview: program.name || program.programHeader || "",
            paymentTerms: program.programTerms || item.programPaymentTerm || "",
            rebate: formattedRebate, // Use formatted rebate with $ and % symbols
            rebateType:
              programDetail.rebateType || programDetail.rebate_type || "fixed",
            criteria: programDetail.criteria || "",
            complianceStatus:
              program.compliances?.some((c: any) => c.isQualified) || false,
            earnedRebate: totalEarnedRebate,
            complianceTotalPurchased: totalPurchaseVolume.toString(),
            additionalInfo: {
              title: program.programHeader || program.name || "",
              info: programDetail.overview || "",
              distributionTarget: {
                total: 0, // Not available in V2 API
                completed: 0 // Not available in V2 API
              },
              totalSavings: {
                amount: totalEarnedRebate,
                yoy: 0
              },
              description: programDetail.overview || ""
            },
            startDate: program.startDate,
            endDate: program.endDate,
            programType: program.programType || "SPIFF",
            programLine: programDetail.programLine || program.name || "",
            programName: program.name || program.programHeader || "",
            // Additional fields from V2 API
            programEntityType: program.programEntityType,
            product_tags: programDetail.productsTags
              ? [
                  {
                    key: programDetail.productsTags,
                    value: 1
                  }
                ]
              : [],
            rebateCalculation:
              programDetail.rebateCalculation ||
              programDetail.rebate_calculation ||
              "",
            qualifiedComliances:
              program.compliances?.filter((c: any) => c.isQualified)?.length ||
              0,
            completedComplianceEntityIds:
              program.compliances
                ?.filter((c: any) => c.isQualified)
                ?.map((c: any) => c.entityId) || [],
            // SPIFF V2 specific void fill fields
            total_void: programDetail.total_void,
            void_filled: programDetail.void_filled
          };
        }
      );
    });

    return {
      id: item.manufacturerId?.toString() || "",
      manufacturer,
      programPaymentTerm: item.programPaymentTerm || "",
      salesData,
      programs,
      startDate: item.startDate,
      endDate: item.endDate
    };
  });
};

/**
 * Maps V2 SPIFF Program Detail API response to DistributorProgramDetail format.
 * This function works with the V2 API response structure for program details.
 *
 * @param {any} data - The V2 API response data.
 * @returns {DistributorProgramDetail | null} - Mapped DistributorProgramDetail object or null.
 */
export const mapSpiffV2DetailDataToProgramDetail = (
  data: any
): DistributorProgramDetail | null => {
  if (
    !data ||
    !data.manufacturers ||
    !Array.isArray(data.manufacturers) ||
    data.manufacturers.length === 0
  ) {
    console.error("Invalid V2 SPIFF detail API data:", data);
    return null;
  }

  const manufacturer = data.manufacturers[0];
  const programOverview = manufacturer.program_overview || [];

  // Calculate total earned rebate across all programs
  const totalEarnedRebate = programOverview.reduce(
    (total: number, program: any) => {
      const programEarnedRebate = program.totalEarning || 0;
      return total + programEarnedRebate;
    },
    0
  );

  // Map programs to the expected format
  const salesRepPrograms = programOverview.flatMap((program: any) => {
    return (program.programDetails || []).map((programDetail: any) => {
      // Format rebate using the same function as V1 API
      const formattedRebate = formateRebate(
        {}, // compliance object (empty for V2)
        programDetail // program detail with rebate info
      );

      // Calculate earned rebate for this specific program detail
      const programEarnedRebate =
        program.compliances?.reduce((total: number, compliance: any) => {
          return total + (Number(compliance.earnedRebate) || 0);
        }, 0) || 0;

      return {
        id: program.id,
        programDetailId: programDetail.id || 0,
        type:
          programDetail.programLine ||
          programDetail.overview ||
          program.name ||
          program.programHeader ||
          "SPIFF",
        overview: programDetail.overview || "",
        paymentTerms:
          program.programTerms || manufacturer.programPaymentTerm || "",
        rebate: formattedRebate,
        rebateType:
          programDetail.rebateType || programDetail.rebate_type || "fixed",
        criteria: programDetail.criteria || "",
        complianceStatus:
          program.compliances?.some((c: any) => c.isQualified) || false,
        earnedRebate: programEarnedRebate,
        complianceTotalPurchased:
          program.compliances?.reduce((total: number, compliance: any) => {
            return total + (Number(compliance.totalPurchaseVolume) || 0);
          }, 0) || 0,
        additionalInfo: {
          title: program.programHeader || program.name || "",
          info: programDetail.overview || "",
          distributionTarget: {
            total: program.enrolledStoresCount || 0,
            completed:
              program.compliances?.filter((c: any) => c.isQualified)?.length ||
              0
          },
          totalSavings: {
            amount: programEarnedRebate,
            yoy: 0
          },
          description: programDetail.overview || ""
        },
        startDate: getNumericDateString(program.startDate),
        endDate: getNumericDateString(program.endDate),
        programType: program.programType || "SPIFF",
        programLine: programDetail.programLine || program.name || "",
        programName: program.name || program.programHeader || "",
        programEntityType: program.programEntityType,
        product_tags: programDetail.productsTags
          ? [
              {
                key: programDetail.productsTags,
                value: 1
              }
            ]
          : [],
        rebateCalculation:
          programDetail.rebateCalculation ||
          programDetail.rebate_calculation ||
          "",
        qualifiedComliances:
          program.compliances?.filter((c: any) => c.isQualified)?.length || 0,
        completedComplianceEntityIds:
          program.compliances
            ?.filter((c: any) => c.isQualified)
            ?.map((c: any) => c.entityId) || [],
        // SPIFF V2 specific void fill fields
        total_void: programDetail.total_void,
        void_filled: programDetail.void_filled
      };
    });
  });

  return {
    id: manufacturer.manufacturerId?.toString() || "",
    manufacturer: {
      name: "SPIFF Program Details",
      avatar: manufacturer.manufacturerLogo || "",
      authorized: manufacturer.manufacturerAuthorized || false,
      nameValue: manufacturer.manufacturerName || ""
    },
    salesData: {
      purchaseVolume: {
        amount: Number(manufacturer.totalPurchaseVolume) || 0,
        yoy: 0
      },
      totalSavings: {
        amount: Number(manufacturer.totalSaving) || totalEarnedRebate,
        yoy: 0
      },
      totalOppSavings: {
        amount: 0
      },
      totalSalesRepSpiff: {
        amount: totalEarnedRebate
      }
    },
    programs: {
      salesRep: salesRepPrograms,
      distributor: [],
      retailer: []
    },
    products: [],
    purchasedProducts: [],
    categorizedProducts: {}
  };
};
