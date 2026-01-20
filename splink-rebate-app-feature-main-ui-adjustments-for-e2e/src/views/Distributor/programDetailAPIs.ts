import { apiServerClient } from "@/lib/axiosServer";
import { StoreComplianceData } from "@/types/ProgramStoresTypes";
import {
  DistributorProgramDetail,
  StoreProgramDetail
} from "@/types/ProgramTypes";
import { PROGRAMS_COMPLIANCE_STATUS } from "@/utils/constants";
import {
  formateRebate,
  getProgramTimelineQueryParam,
  getRangeFromCommaString
} from "@/utils/helper";
import { formatCategorySKUProgress } from "@/utils/programHelper";
import { ENTITY_TYPES, PROGRAM_TYPES, REBATE_TYPES } from "./programConstants";

const PROGRAM_URL = "/programs/details/";

/**
 * Retrieves the retailer program details for a given user, manufacturer and program type.
 *
 * @param {number} manufacturerId - The ID of the manufacturer.
 * @param {string} type - The type of program, one of 'STORE', 'DISTRIBUTOR' or 'SALESREP'.
 *
 * @returns {Promise<{storeProgramDetail: StoreProgramDetail, enrolledProgram: StoreComplianceData[], unenrolledProgram: StoreComplianceData[]}>}
 * A promise that resolves to an object containing the program details, enrolled stores and unenrolled stores.
 */
export const getRetailerProgramDetails = async (
  manufacturerId: number,
  type: string,
  searchQuery: string = "",
  enrolledPage: number = 1,
  notEnrolledPage: number = 1,
  sort: string = "ASC",
  sortKey: string = "sort",
  programTimeline?: string
): Promise<{
  storeProgramDetail: StoreProgramDetail;
  enrolledProgram: any;
  unenrolledProgram: any;
}> => {
  try {
    const url = `${PROGRAM_URL}?type=${type}&manufacturerId=${manufacturerId}&searchQuery=${decodeURI(
      searchQuery
    )}&enrolledPage=${enrolledPage}&notEnrolledPage=${notEnrolledPage}&sort=${sort}&sortKey=${sortKey}&programTimeline=${programTimeline}`;

    const { data } = await apiServerClient.get(url);

    const storeProgramDetail = mapResponseToStoreProgramDetail(data);
    const enrolledProgram: StoreComplianceData[] = data?.enrolledStores ?? [];
    const unenrolledProgram: StoreComplianceData[] =
      data?.unenrolledStores ?? [];
    return {
      storeProgramDetail,
      enrolledProgram,
      unenrolledProgram
    };
  } catch (err) {
    throw new Error("Failed to fetch retailer program details");
  }
};

/**
 * Retrieves the distributor program details for a given user, manufacturer and program type.
 *
 * @param {number} manufacturerId - The ID of the manufacturer.
 * @param {string} type - The type of program, one of 'STORE', 'DISTRIBUTOR' or 'SALESREP'.
 *
 * @returns {Promise<DistributorProgramDetail | null>}
 * A promise that resolves to the program details, or null if an error occurs.
 */
export const getManufacturerProgramDetails = async ({
  manufacturerId,
  type,
  warehouseId,
  programTimeline,
  isInternal
}: {
  manufacturerId: number;
  type: string;
  warehouseId?: string;
  programTimeline?: string;
  isInternal?: boolean;
}): Promise<DistributorProgramDetail | null> => {
  try {
    const programTimelineQueryParam =
      getProgramTimelineQueryParam(programTimeline);

    const url = `${PROGRAM_URL}?type=${type}&manufacturerId=${manufacturerId}&warehouseId=${warehouseId}&programTimeline=${programTimelineQueryParam}&isInternal=${isInternal}`;

    const { data } = await apiServerClient.get(url);

    const mappedData = mapResponseToDistributorProgramDetail(data);

    return mappedData;
  } catch (error) {
    return null;
  }
};

/**
 * Maps the response from the API to a StoreProgramDetail object.
 *
 * @param {any} data - The response from the API. *
 * @returns {StoreProgramDetail} - The mapped StoreProgramDetail object.
 */
const mapResponseToStoreProgramDetail = (data: any): StoreProgramDetail => {
  return {
    id: data?.manufacturerDetails?.id || "",
    manufacturer: {
      avatar: data?.manufacturerDetails?.logo || "",
      name: "Store Program Details",
      authorized: data?.manufacturerDetails?.authorized
    },
    salesData: {
      purchaseVolume: {
        amount: data.totalPurchasedVolume ?? 0,
        yoy: 0
      },
      totalSavings: {
        amount: data.totalSaving ?? 0,
        yoy: 0
      },
      totalStoreEnrolled: {
        total: 0,
        enrolled: 0
      }
    },
    programs: {
      retailer: transformPrograms(
        data.retailerProgramOverview,
        ENTITY_TYPES.STORE.toLowerCase(),
        data
      ),
      chain: data.chainInformation || []
    },
    // products: data.coreProducts?.map((product: any) => ({
    //   image: "/img/products/ProgramProducts/lightly-salted-no-shell.jpg",
    //   name: product.name,
    //   extraInfo: product.brand
    // })),
    products: [],
    categorizedProducts: data.categorizedProducts
  };
};

/**
 * Maps a response from the API to a DistributorProgramDetail.
 * @param {any} data The response from the API.
 * @returns {DistributorProgramDetail} The mapped response.
 */
const mapResponseToDistributorProgramDetail = (
  data: any
): DistributorProgramDetail => ({
  id: "",
  manufacturer: {
    avatar: data?.manufacturerDetails?.logo || "",
    name: "Distributor Program Details",
    authorized: data?.manufacturerDetails?.authorized,
    nameValue: data?.manufacturerDetails?.name || ""
  },
  salesData: {
    purchaseVolume: {
      amount: data.totalPurchasedVolume,
      yoy: 0
    },
    totalSavings: {
      amount: data.totalSaving,
      yoy: 0
    },
    totalOppSavings: {
      amount: 0
    },
    totalSalesRepSpiff: {
      amount: data.totalSalesRepSpiff ?? 0
    }
  },
  programs: {
    salesRep: transformPrograms(
      data.salesRepProgramOverview,
      ENTITY_TYPES.SALES_REP.toLowerCase(),
      data
    ),
    distributor: transformPrograms(
      data.distributorProgramOverview,
      ENTITY_TYPES.DISTRIBUTOR.toLowerCase(),
      data
    ),
    retailer: transformPrograms(
      data.retailerProgramOverview,
      ENTITY_TYPES.STORE.toLowerCase(),
      data
    )
  },
  products: [],
  purchasedProducts: data?.allProducts ?? [],
  categorizedProducts: replaceNAInternalCodes(data.categorizedProducts)
});

/**
 * Generates a random 8-digit number as a string.
 * @returns {string} A random 8-digit number string.
 */
const generateRandom8DigitNumber = (): string => {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
};

/**
 * Replaces "NA" internal codes with random 8-digit numbers in categorized products.
 * @param {any} categorizedProducts - The categorized products object to process.
 * @returns {any} The processed categorized products with updated internal codes.
 */
const replaceNAInternalCodes = (categorizedProducts: any): any => {
  if (!categorizedProducts || typeof categorizedProducts !== "object") {
    return categorizedProducts;
  }

  const processedProducts = { ...categorizedProducts };

  // Iterate through each category in categorizedProducts
  Object.keys(processedProducts).forEach((categoryKey) => {
    const category = processedProducts[categoryKey];

    if (category && typeof category === "object") {
      // Process purchasedProducts if they exist
      if (Array.isArray(category.purchasedProducts)) {
        category.purchasedProducts = category.purchasedProducts.map(
          (product: any) => ({
            ...product,
            internalCode:
              product.internalCode === "N/A"
                ? generateRandom8DigitNumber()
                : product.internalCode
          })
        );
      }

      // Process requiredProducts if they exist
      if (Array.isArray(category.requiredProducts)) {
        category.requiredProducts = category.requiredProducts.map(
          (product: any) => ({
            ...product,
            internalCode:
              product.internalCode === "N/A"
                ? generateRandom8DigitNumber()
                : product.internalCode
          })
        );
      }
    }
  });

  return processedProducts;
};

/**
 * Calculates the rebate value based on the program type and compliance data.
 *
 * @param {string | null} programType - The type of the program, which can be null.
 * @param {any} compliance - The compliance data containing rebate type and amounts.
 *
 * @returns {number} - The calculated rebate value, which can be a percentage,
 * per case, or fixed amount, depending on the rebate type. Returns 0 if the
 * rebate type is invalid or missing.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const calculateRebate = (
  programType: string | null,
  compliance: any
): number => {
  // Define valid rebate types
  const rebateTypes = [
    REBATE_TYPES.PERCENTAGE.toLowerCase(),
    REBATE_TYPES.PER_CASE.toLowerCase(),
    REBATE_TYPES.FIXED.toLowerCase()
  ];

  // Check if the rebateType is valid
  if (!rebateTypes.includes(compliance.rebateType)) {
    return 0; // Return an empty string if the rebate type is invalid
  }

  switch (compliance.rebateType) {
    case REBATE_TYPES.PERCENTAGE.toLowerCase():
      return compliance.rebatePercentage ?? 0; // Use rebate percentage

    // Return as percentage

    case REBATE_TYPES.PER_CASE.toLowerCase():
      return compliance.rebateAmount ?? 0; // Use rebate amount for per_case

    case REBATE_TYPES.FIXED.toLowerCase():
      return compliance.rebateAmount ?? 0; // Use rebate amount for fixed

    default:
      return compliance.rebateAmount ?? 0; // Use rebate amount
  }
};

/**
 * Transforms program overview data into a standardized format for each entity
 * type, including distributor, store, and sales rep. The transformed data
 * includes the program type, overview, payment terms, rebate type, and any
 * additional relevant information, such as store compliance, total earnings, and
 * total savings.
 *
 * @param {any[]} programOverview - The program overview data to be transformed.
 * @param {string} programType - The type of the program, which can be one of
 * "Distributor", "Store", or "Sales Rep".
 * @param {any} data - Additional data containing enrolled stores, unenrolled
 * stores, and compliances.
 *
 * @returns {any[]} - The transformed program overview data in a standardized
 * format.
 */
const transformPrograms = (
  programOverview: any[],
  programType: string,
  data: any
): any[] => {
  if (!Array.isArray(programOverview)) {
    return []; // Fallback to an empty array
  }

  // Helper function to calculate total earned rebate
  const calculateTotalEarnedRebate = (compliances: any[]): number => {
    return compliances
      ?.filter(
        (compliance: any) =>
          compliance.isQualified &&
          compliance.status == PROGRAMS_COMPLIANCE_STATUS.Active
      )
      ?.reduce((total, compliance) => {
        const earnedRebate =
          typeof compliance.earnedRebate === "number"
            ? compliance.earnedRebate
            : parseFloat(compliance.earnedRebate) || 0;
        return total + earnedRebate;
      }, 0);
  };

  /**
   * Calculates the total number of stores and the number of enrolled stores for
   * a given program ID.
   *
   * @param {any} programId - The ID of the program for which to calculate the
   * store compliance.
   *
   * @returns {{ total: number; completed: number }} - An object containing the
   * total number of stores and the number of enrolled stores for the given
   * program ID.
   */
  const calculateStoreCompliance = (): { total: number; completed: number } => {
    const enrolledStores = data?.enrolledStores?.totalStores ?? 0;
    const totalStores =
      (data?.enrolledStores?.totalStores ?? 0) +
      (data?.unenrolledStores?.totalStores ?? 0);

    return { total: totalStores, completed: enrolledStores };
  };

  const getTotalRequiredAndPurchased = (data: any[]) => {
    return data.reduce(
      (acc, item) => {
        acc.required += item.sku?.total || 0;
        acc.purchased += item.sku?.completed || 0;
        return acc;
      },
      { required: 0, purchased: 0 }
    );
  };

  const getDates = (program: any) => {
    const startDate = program.startDate;
    const endDate = program.endDate;
    return {
      startDate: startDate
        ? new Date(startDate).toLocaleDateString()
        : undefined,
      endDate: endDate ? new Date(endDate).toLocaleDateString() : undefined
    };
  };

  return programOverview
    .flatMap((program) => {
      // IMPORTANT: For Store program detail UI, we want to display one row per programDetails entry
      // (these are the "program details" the user expects under agreements).
      if (
        programType.toLowerCase() === ENTITY_TYPES.STORE.toLowerCase() &&
        Array.isArray(program?.programDetails) &&
        program.programDetails.length > 0
      ) {
        return program.programDetails.map((programDetail: any, idx: number) => {
          const programDetailId = programDetail?.id;
          const compliances = Array.isArray(program?.compliances)
            ? program.compliances.filter((c: any) => {
                const cDetailId =
                  c?.programDetailId ??
                  c?.program_detail_id ??
                  c?.programDetailID;
                return (
                  c?.programId === program?.id &&
                  (programDetailId ? cDetailId == programDetailId : true)
                );
              })
            : [];

          const isQualifiedCompliance = compliances.filter(
            (c: any) => c?.isQualified
          );

          const rebate =
            compliances.length > 0 || programDetail
              ? formateRebate(compliances?.[0], programDetail)
              : 0;

          const rebateType =
            compliances.length > 0 ? compliances[0].rebateType : "";
          const totalEarnedRebate = calculateTotalEarnedRebate(compliances);

          const { total: totalStores } = calculateStoreCompliance();

          const requiredProducts = programDetail?.products_tags_qty;
          const progressText = program?.progressDetails?.length
            ? formatCategorySKUProgress(
                requiredProducts
                  ? program?.progressDetails
                  : program?.progressDetails?.length > idx
                    ? program?.progressDetails[idx]?.progressText
                    : program?.progressDetails[0]?.progressText,
                requiredProducts
              )
            : null;

          return {
            id: program?.id,
            programDetailId: programDetailId ?? "",
            rebate: rebate ?? 0,
            programName: program.name ?? "",
            programType: program.programType || "",
            type: `${program.programHeader} - ${program.programType || ""}${
              programDetail?.tier != null ? ` ${programDetail.tier}` : ""
            }`,
            description: programDetail?.description ?? "",
            overview: programDetail?.overview ?? "",
            paymentTerms: program.programTerms ?? "",
            rebateType: program.rebateType ?? rebateType,
            graph:
              program?.progressDetails?.length > idx
                ? program?.progressDetails[idx]?.graph
                : program?.progressDetails?.length
                  ? program?.progressDetails[0]?.graph
                  : null,
            progressText,
            categorizedProducts: programDetail?.categorizedProducts ?? null,
            rebateRange: programDetail?.fixed_rebate_amount
              ? getRangeFromCommaString(programDetail.fixed_rebate_amount)
              : null,
            totalCategoriesQuantity: progressText
              ? getTotalRequiredAndPurchased(progressText)
              : null,
            ...getDates(program),
            storeCompliance: {
              total:
                programDetail?.totalEnrollments != null
                  ? programDetail.totalEnrollments
                  : totalStores,
              completed:
                programDetail?.qualifiedComliances != null
                  ? programDetail.qualifiedComliances
                  : isQualifiedCompliance.length
            },
            totalSaving: { amount: totalEarnedRebate, yoy: 0 }
          };
        });
      }

      if (
        program.programType.toLowerCase() === PROGRAM_TYPES.TIER.toLowerCase()
      ) {
        const uniqueTierIds = Array.from(
          new Set(
            program?.programDetails?.length
              ? program?.programDetails
                  .map((pd: any) => pd.tier)
                  .sort((a: any, b: any) => Number(a) - Number(b))
              : program.compliances
                  .filter(
                    (compliance: any) => compliance.programId === program.id
                  )
                  .map((compliance: any) => compliance.tier)
          )
        );

        return uniqueTierIds.map((tierId: any) => {
          const programDetailId = program?.programDetails?.length
            ? program?.programDetails.find((pd: any) => pd.tier == tierId).id
            : undefined;

          const tierCompliances = program.compliances.filter(
            (compliance: any) =>
              compliance.programId === program.id &&
              (programDetailId
                ? compliance.programDetailId == programDetailId
                : true)
          );
          const isQualifiedCompliance = tierCompliances.filter(
            (compliance: any) => compliance.isQualified
          );

          const programDetail = program.programDetails.find(
            (pd: any) => pd.tier === tierId
          );

          const rebate =
            tierCompliances.length > 0 || programDetail
              ? formateRebate(tierCompliances?.[0], programDetail)
              : 0; // Default to 0 if there are no compliances
          const rebateType =
            tierCompliances.length > 0 ? tierCompliances[0].rebateType : "";

          const totalEarnedRebate = calculateTotalEarnedRebate(tierCompliances);
          const { total: totalStores, completed: totalEnrolledStores } =
            calculateStoreCompliance();

          const programDetailIndex = program?.programDetails.findIndex(
            (pd: any) => pd.tier === tierId
          );

          // products_tags_qty from Program Details Table
          const requiredProducts =
            program?.programDetails[programDetailIndex]?.products_tags_qty;

          const progressText = program?.progressDetails?.length
            ? formatCategorySKUProgress(
                requiredProducts
                  ? program?.progressDetails
                  : program?.progressDetails[programDetailIndex]?.progressText,
                requiredProducts
              )
            : null;

          const baseProgram = {
            id: program?.id,
            programDetailId:
              program?.programDetails.find((pd: any) => pd.tier === tierId)
                ?.id ?? "",
            rebate: rebate ?? 0,
            programName: program.name ?? "",
            programType: program.programType || "",
            type: `${program.programHeader} - ${program.programType || ""}${tierId ? ` ${tierId}` : ""}`,
            overview: program.description ?? "",
            paymentTerms: program.programTerms ?? "",
            rebateType: program.rebateType ?? rebateType,
            graph:
              program?.progressDetails?.length > programDetailIndex
                ? program?.progressDetails[programDetailIndex]?.graph
                : null,
            progressText: progressText,
            categorizedProducts:
              program?.programDetails?.length > programDetailIndex
                ? program?.programDetails[programDetailIndex]
                    ?.categorizedProducts
                : null,
            rebateRange:
              program?.programDetails?.length > programDetailIndex
                ? getRangeFromCommaString(
                    program?.programDetails[programDetailIndex]
                      ?.fixed_rebate_amount
                  )
                : null,
            totalCategoriesQuantity: progressText
              ? getTotalRequiredAndPurchased(progressText)
              : null,
            ...getDates(program)
          };

          if (programType.toLowerCase() === ENTITY_TYPES.STORE.toLowerCase()) {
            return {
              ...baseProgram,
              description:
                program?.programDetails.find((pd: any) => pd.tier === tierId)
                  ?.description ?? "",
              overview:
                program?.programDetails.find((pd: any) => pd.tier === tierId)
                  ?.overview ?? "",
              storeCompliance: {
                total: totalStores,
                completed: isQualifiedCompliance.length
              },
              totalSaving: { amount: totalEarnedRebate, yoy: 0 }
            };
          } else if (
            programType.toLowerCase() === ENTITY_TYPES.DISTRIBUTOR.toLowerCase()
          ) {
            const complianceTotalPurchased = tierCompliances?.length
              ? (tierCompliances[0]?.totalPurchaseVolume ?? 0)
              : 0;

            const rebateValue =
              tierCompliances.length > 0 || programDetail
                ? formateRebate(
                    tierCompliances?.[0],
                    programDetail,
                    complianceTotalPurchased,
                    data?.totalPurchasedQuantity ?? 0
                  )
                : 0; // Default to 0 if there are no compliances

            return {
              ...baseProgram,
              rebateValue: rebateValue,
              complianceTotalPurchased:
                tierCompliances[0]?.totalPurchaseVolume ?? 0,
              criteria:
                program?.programDetails.find((pd: any) => pd.tier === tierId)
                  ?.criteria ?? "",
              complianceStatus: tierCompliances[0]?.isQualified ?? false,
              overview:
                program?.programDetails.find((pd: any) => pd.tier === tierId)
                  ?.overview ?? "",
              additionalInfo: {
                title: "",
                info: "",
                distributionTarget: {
                  total: tierCompliances.length,
                  completed: isQualifiedCompliance.length
                },
                totalSavings: { amount: totalEarnedRebate, yoy: 0 },
                description:
                  program?.programDetails.find((pd: any) => pd.tier === tierId)
                    ?.description ?? ""
              }
            };
          } else if (
            programType.toLowerCase() === ENTITY_TYPES.SALES_REP.toLowerCase()
          ) {
            return {
              ...baseProgram,
              storesCompliant: totalEnrolledStores,
              totalEarnings: { amount: totalEarnedRebate },
              complianceStatus: tierCompliances[0]?.isQualified ?? false,
              overview:
                program?.programDetails.find((pd: any) => pd.tier === tierId)
                  ?.overview ?? "",
              programLine:
                program?.programDetails.find((pd: any) => pd.tier === tierId)
                  ?.program_line ?? "",
              additionalInfo: {
                title: "",
                info: "",
                distributionTarget: {
                  total: tierCompliances.length,
                  completed: isQualifiedCompliance.length
                },
                totalSavings: { amount: totalEarnedRebate, yoy: 0 }
              }
            };
          }
        });
      } else {
        const compliances = program.compliances.filter(
          (compliance: any) => compliance.programId === program.id
        );
        const isQualifiedCompliance = compliances.filter(
          (compliance: any) => compliance.isQualified
        );
        const rebate =
          compliances.length > 0 || program?.programDetails?.length
            ? formateRebate(compliances?.[0], program?.programDetails?.[0])
            : 0; // Default to 0 if there are no compliances

        const programDetailId =
          compliances.length > 0 || program?.programDetails?.length
            ? (compliances?.[0]?.program_detail_id ??
              program?.programDetails?.[0]?.id)
            : undefined;

        const rebateType =
          compliances.length > 0 ? compliances[0].rebateType : "";

        const totalEarnedRebate = calculateTotalEarnedRebate(compliances);
        const { total: totalStores, completed: totalEnrolledStores } =
          calculateStoreCompliance();

        const progressText = program?.progressDetails?.length
          ? formatCategorySKUProgress(program?.progressDetails[0]?.progressText)
          : null;

        const baseProgram = {
          id: program?.id,
          programDetailId,
          rebate: rebate ?? 0,
          programName: program.name ?? "",
          programType: program.programType || "",
          type: program.programHeader || "",
          overview: program.description ?? "",
          paymentTerms: program.programTerms ?? "",
          rebateType: program.rebateType ?? rebateType,
          graph: program?.progressDetails?.length
            ? program?.progressDetails[0]?.graph
            : null,
          progressText: progressText,
          categorizedProducts: program?.programDetails?.length
            ? program?.programDetails[0]?.categorizedProducts
            : null,
          rebateRange: program?.programDetails?.length
            ? getRangeFromCommaString(
                program?.programDetails[0]?.fixed_rebate_amount
              )
            : null,
          totalCategoriesQuantity: progressText
            ? getTotalRequiredAndPurchased(progressText)
            : null,
          ...getDates(program)
        };

        if (programType.toLowerCase() === ENTITY_TYPES.STORE.toLowerCase()) {
          return {
            ...baseProgram,
            description: program?.description ?? "",
            overview:
              program?.programDetails.find(
                (pd: any) => pd.program_id === program.id
              )?.overview ?? "",
            storeCompliance: {
              total: totalStores,
              completed: isQualifiedCompliance.length
            },
            totalSaving: { amount: totalEarnedRebate, yoy: 0 }
          };
        } else if (
          programType.toLowerCase() === ENTITY_TYPES.DISTRIBUTOR.toLowerCase()
        ) {
          const complianceTotalPurchased = compliances?.length
            ? (compliances[0]?.totalPurchaseVolume ?? 0)
            : 0;

          const rebateValue =
            compliances.length > 0 || program?.programDetails?.length
              ? formateRebate(
                  compliances?.[0],
                  program?.programDetails?.[0],
                  complianceTotalPurchased,
                  data?.totalPurchasedQuantity ?? 0
                )
              : 0;

          const earnedRebate = compliances.find(
            (compliance: any) => compliance.programId === program.id
          )?.earnedRebate;

          return {
            ...baseProgram,
            rebateValue: rebateValue,
            earnedRebate: earnedRebate,
            complianceStatus: compliances[0]?.isQualified ?? false,
            complianceTotalPurchased: complianceTotalPurchased,
            criteria:
              program?.programDetails.find(
                (pd: any) => pd.program_id === program.id
              )?.criteria ?? "",
            overview:
              program?.programDetails.find(
                (pd: any) => pd.program_id === program.id
              )?.overview ?? "",
            additionalInfo: {
              title: "",
              info: "",
              distributionTarget: {
                total: compliances.length,
                completed: isQualifiedCompliance.length
              },
              totalSavings: { amount: totalEarnedRebate, yoy: 0 },
              description:
                program?.programDetails.find(
                  (pd: any) => pd.program_id === program.id
                )?.description ?? ""
            }
          };
        } else if (
          programType.toLowerCase() === ENTITY_TYPES.SALES_REP.toLowerCase()
        ) {
          return {
            ...baseProgram,
            storesCompliant: totalEnrolledStores,
            overview:
              program?.programDetails.find(
                (pd: any) => pd.program_id === program.id
              )?.overview ?? "",
            programLine:
              program?.programDetails.find(
                (pd: any) => pd.program_id === program.id
              )?.program_line ?? "",
            totalEarnings: { amount: totalEarnedRebate },
            complianceStatus: compliances[0]?.isQualified ?? false,
            additionalInfo: {
              title: "",
              info: "",
              distributionTarget: {
                total: compliances.length,
                completed: isQualifiedCompliance.length
              },
              totalSavings: { amount: totalEarnedRebate, yoy: 0 }
            }
          };
        }
      }
    })
    .filter(Boolean);
};

/**
 * Fetches the SPIFF program details for a given manufacturer, type, warehouse, program timeline and is internal.
 *
 * @param {number} manufacturerId - The ID of the manufacturer.
 * @param {string} type - The type of program, one of 'SPIFF'.
 * @param {string} warehouseId - The ID of the warehouse.
 * @param {string} programTimeline - The program timeline.
 * @param {boolean} isInternal - Whether the program is internal.
 */
export const fetchSpiffProgramDetailsV2 = async ({
  manufacturerId,
  warehouseId,
  programTimeline,
  isInternal
}: {
  manufacturerId: number;
  type: string;
  warehouseId?: string;
  programTimeline?: string;
  isInternal?: boolean;
}): Promise<DistributorProgramDetail | null> => {
  try {
    const programTimelineQueryParam =
      getProgramTimelineQueryParam(programTimeline);

    const url = `${PROGRAM_URL}v2?type=SPIFF&manufacturerId=${manufacturerId}&warehouseId=${warehouseId}&programTimeline=${programTimelineQueryParam}&isInternal=${isInternal}`;

    const { data } = await apiServerClient.get(url);

    return data;
  } catch (error) {
    return null;
  }
};

/**
 * Get program PDF URL (Server-side)
 * @param manufacturerId - The ID of the manufacturer
 * @param timeline - Timeline: "Current" or "Upcoming"
 * @param programType - Program type: "STORE", "SPIFF", or "DISTRIBUTOR" (defaults to "STORE")
 * @returns Promise with program_pdf URL (null if not available)
 */
export const getProgramPdfUrl = async (
  manufacturerId: number,
  timeline: "Current" | "Upcoming" = "Current",
  programType: "STORE" | "SPIFF" | "DISTRIBUTOR" = "STORE"
): Promise<{ program_pdf: string | null }> => {
  try {
    const url = `/programs/${manufacturerId}/pdf?timeline=${timeline}&programType=${programType}`;

    const { data } = await apiServerClient.get(url);
    return data || { program_pdf: null };
  } catch (err) {
    console.error("Failed to fetch program PDF URL:", err);
    return { program_pdf: null };
  }
};
