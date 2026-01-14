import { getCommonConfigs } from "@/lib/axios";
import { apiClient } from "@/lib/axiosClient";
import { StoreComplianceData } from "@/types/ProgramStoresTypes";
import { StoreProgramDetail } from "@/types/ProgramTypes";
import { PROGRAMS_COMPLIANCE_STATUS } from "@/utils/constants";
import { getCookie } from "@/utils/getCookie";
import {
  convertNumberToRoman,
  formateRebate,
  getRangeFromCommaString
} from "@/utils/helper";
import { formatCategorySKUProgress } from "@/utils/programHelper";
import axios from "axios";
import { ENTITY_TYPES, PROGRAM_TYPES } from "./programConstants";

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
  warehouseId?: string,
  programTimeline?: string,
  isInternal?: boolean,
  isExcludeChainStores?: boolean,
  clearCache?: boolean
): Promise<{
  storeProgramDetail: StoreProgramDetail;
  enrolledProgram: any;
  unenrolledProgram: any;
}> => {
  try {
    const url = `${PROGRAM_URL}?type=${type}&manufacturerId=${manufacturerId}&searchQuery=${
      searchQuery
    }&enrolledPage=${enrolledPage}&notEnrolledPage=${notEnrolledPage}&sort=${sort}&sortKey=${sortKey}&warehouseId=${warehouseId}&programTimeline=${programTimeline}&isInternal=${isInternal}&isExcludeChainStores=${isExcludeChainStores}&clearCache=${clearCache}`;

    const { data } = await apiClient.get(url);

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
 * Retrieves the retailer program store compliance details for a given user, manufacturer and program type.
 *
 * @param {number} manufacturerId - The ID of the manufacturer.
 * @param {string} warehouseId - The ID of the warehouse.
 * @param {string} programTimeline - The program timeline.
 * @param {boolean} isInternal - Whether the program is an internal program.
 *
 * @returns {Promise<{storeProgramDetail: StoreProgramDetail, enrolledProgram: any, unenrolledProgram: any}>}
 * A promise that resolves to an object containing the program details, enrolled stores and unenrolled stores.
 */
export const getRetailerProgramsComplianceDetails = async (
  manufacturerId: number,
  warehouseId?: string,
  programTimeline?: string,
  isInternal?: boolean,
  excludeChainStores?: boolean,
  clearCache?: boolean
): Promise<{
  storeProgramDetail: StoreProgramDetail;
  enrolledProgram: any;
  unenrolledProgram: any;
}> => {
  try {
    const url = `${PROGRAM_URL}store-compliance?manufacturerId=${manufacturerId}&programTimeline=${programTimeline}&isInternal=${isInternal}&excludeChainStores=${excludeChainStores}&clearCache=${clearCache}&warehouseId=${warehouseId}`;

    const { data } = await apiClient.get(url);

    return data;
  } catch (err) {
    throw new Error(
      "Failed to fetch retailer program store complaince details"
    );
  }
};

export const getStoresListing = async (
  manufacturerId: number,
  searchQuery: string = "",
  enrolledPage: number = 1,
  notEnrolledPage: number = 1,
  sort: string = "ASC",
  sortKey: string = "sort",
  enrolled: boolean | undefined,
  warehouseId?: string,
  programTimeline?: string,
  isInternal?: boolean,
  isIndependentStores?: boolean,
  clearCache?: boolean,
  agreementId?: string | number
) => {
  let url = `/programs/get-stores-listing?manufacturerId=${manufacturerId}&searchQuery=${
    searchQuery
  }&enrolledPage=${enrolledPage}&notEnrolledPage=${notEnrolledPage}&sort=${sort}&sortKey=${sortKey}&enrolled=${enrolled}&warehouseId=${warehouseId}&programTimeline=${programTimeline}&isInternal=${isInternal}&isIndependentStores=${isIndependentStores}&clearCache=${clearCache}`;

  if (agreementId !== undefined && agreementId !== null && agreementId !== "") {
    url += `&agreementId=${agreementId}`;
  }

  const { data } = await apiClient.get(url);
  const enrolledProgram: StoreComplianceData[] =
    data?.storesListingEnrolled ?? [];
  const unenrolledProgram: StoreComplianceData[] =
    data?.storesListingNotEnrolled ?? [];
  return {
    enrolledProgram,
    unenrolledProgram
  };
};

/**
 * Downloads stores listing as CSV from the API
 *
 * @param {number} manufacturerId - The ID of the manufacturer.
 * @param {string} searchQuery - Optional search query to filter stores.
 * @param {boolean} enrolled - Whether to fetch enrolled stores (true), not enrolled (false), or both (undefined).
 * @param {string} warehouseId - Optional warehouse ID to filter stores.
 * @param {string} programTimeline - Optional program timeline filter.
 * @param {boolean} isInternal - Whether to filter by internal initiative.
 * @param {boolean} isIndependentStores - Whether to exclude chain stores.
 * @param {boolean} hideEnrollTable - Whether to hide enrolled stores table (only for enrolled=false case).
 *
 * @returns {Promise<Blob>} A promise that resolves to a Blob containing the CSV data.
 */
/**
 * Get program PDF URL
 * @param manufacturerId - The ID of the manufacturer
 * @param timeline - Timeline: "Current" or "Upcoming"
 * @param programType - Program type: "STORE" or "SPIFF" (defaults to "STORE")
 * @returns Promise with program_pdf URL (null if not available)
 */
export const getProgramPdfUrl = async (
  manufacturerId: number,
  timeline: "Current" | "Upcoming" = "Current",
  programType: "STORE" | "SPIFF" | "DISTRIBUTOR" = "STORE"
): Promise<{ program_pdf: string | null }> => {
  try {
    const url = `/programs/${manufacturerId}/pdf?timeline=${timeline}&programType=${programType}`;

    const { data } = await apiClient.get(url);
    return data || { program_pdf: null };
  } catch (err) {
    console.error("Failed to fetch program PDF URL:", err);
    return { program_pdf: null };
  }
};

export const downloadStoresListingCSV = async (
  manufacturerId: number,
  searchQuery: string = "",
  enrolled: boolean | string | undefined,
  warehouseId?: string,
  programTimeline?: string,
  isInternal?: boolean,
  isIndependentStores?: boolean,
  hideEnrollTable?: boolean,
  sort?: string,
  sortKey?: string,
  agreementId?: string | number
): Promise<Blob> => {
  // Use the same query parameters as the current table view
  const enrolledParam =
    enrolled === undefined || enrolled === "undefined" ? "undefined" : enrolled;
  const sortParam = sort || "ASC";
  const sortKeyParam = sortKey || "sort";

  let url = `/programs/get-stores-listing?manufacturerId=${manufacturerId}&searchQuery=${decodeURI(
    searchQuery
  )}&enrolledPage=1&notEnrolledPage=1&sort=${sortParam}&sortKey=${sortKeyParam}&enrolled=${enrolledParam}&warehouseId=${warehouseId}&programTimeline=${programTimeline}&isInternal=${isInternal}&isIndependentStores=${isIndependentStores}&isDownload=true${hideEnrollTable ? "&hideEnrollTable=true" : ""}`;

  if (agreementId !== undefined && agreementId !== null && agreementId !== "") {
    url += `&agreementId=${agreementId}`;
  }

  // Use axios directly to bypass the interceptor for blob responses
  // The interceptor returns res.data which might interfere with blob handling
  const token = getCookie("accessToken");
  const baseURL = getCommonConfigs().baseURL;

  const response = await axios.get(`${baseURL}${url}`, {
    responseType: "blob",
    timeout: 180000, // 3 minutes
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });

  // Check if response is actually an error JSON wrapped in a blob
  if (response.data.type === "application/json") {
    const text = await response.data.text();
    const errorData = JSON.parse(text);
    if (errorData.status === "error" || errorData.message) {
      throw new Error(errorData.message || "Failed to download CSV");
    }
  }

  // The response.data should be a Blob when responseType is "blob"
  // But if it's not, convert it
  if (response.data instanceof Blob) {
    return response.data;
  }

  // If it's a string, convert it to a Blob
  const csvString =
    typeof response.data === "string" ? response.data : String(response.data);
  return new Blob([csvString], { type: "text/csv;charset=utf-8;" });
};

/**
 * Maps the response from the API to a StoreProgramDetail object.
 *
 * @param {any} data - The response from the API. *
 * @returns {StoreProgramDetail} - The mapped StoreProgramDetail object.
 */
const mapResponseToStoreProgramDetail = (data: any): StoreProgramDetail => {
  const result = {
    id: data?.manufacturerDetails?.id || "",
    manufacturer: {
      avatar: data?.manufacturerDetails?.logo || "",
      name: "Store Program Details",
      authorized: data?.manufacturerDetails?.authorized || false
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
  return result;
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

  const isStorePrograms = programType == ENTITY_TYPES.STORE.toLowerCase();

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
          // Convert Number into Roman Numeral
          const romanTier = programDetail.tier
            ? convertNumberToRoman(programDetail.tier)
            : "";

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

          const { total: totalStores, completed: totalEnrolledStores } =
            calculateStoreCompliance();

          // Construct type matching Program Overview logic
          let programTypeName = "";
          if (
            (program.programType?.toLowerCase() ===
              PROGRAM_TYPES.TIER.toLowerCase() ||
              programDetail?.tier != null) &&
            programDetail.tier
          ) {
            // Tier program: "Distribution - TIER 1"
            programTypeName = `${program.programHeader} - TIER ${romanTier || ""}`;
          } else {
            // Non-tier program: just use programHeader (e.g., "Innovation")
            programTypeName = program.programHeader || "";
          }

          return {
            id: program?.id,
            programDetailId: programDetailId ?? "",
            rebate: rebate ?? 0,
            type: programTypeName,
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
            progressText: program?.progressDetails?.length
              ? formatCategorySKUProgress(
                  // prefer per-detail index if present
                  program?.progressDetails?.length > idx
                    ? program?.progressDetails[idx]?.progressText
                    : program?.progressDetails[0]?.progressText
                )
              : null,
            categorizedProducts: programDetail?.categorizedProducts ?? null,
            rebateRange: programDetail?.fixed_rebate_amount
              ? getRangeFromCommaString(programDetail.fixed_rebate_amount)
              : null,
            storeCompliance: {
              total:
                isStorePrograms && programDetail?.totalEnrollments != null
                  ? programDetail.totalEnrollments
                  : totalStores,
              completed:
                isStorePrograms && programDetail?.qualifiedComliances != null
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
              ? program?.programDetails.map((pd: any) => pd.tier)
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

          // Convert tier number to Roman numeral
          const romanTier = tierId ? convertNumberToRoman(tierId) : "";

          const baseProgram = {
            id: program?.id,
            programDetailId:
              program?.programDetails.find((pd: any) => pd.tier === tierId)
                ?.id ?? "",
            rebate: rebate ?? 0,
            type: `${program.programHeader} ${tierId ? `- TIER ${romanTier}` : ""}`,
            overview: program.description ?? "",
            paymentTerms: program.programTerms ?? "",
            rebateType: program.rebateType ?? rebateType,
            graph:
              program?.progressDetails?.length > programDetailIndex
                ? program?.progressDetails[programDetailIndex]?.graph
                : null,
            progressText: program?.progressDetails?.length
              ? formatCategorySKUProgress(
                  program?.progressDetails[0]?.progressText
                )
              : null,
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
                : null
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
                total: isStorePrograms
                  ? program?.programDetails.find(
                      (pd: any) => pd.tier === tierId
                    )?.totalEnrollments
                  : totalStores,
                completed: isStorePrograms
                  ? program?.programDetails.find(
                      (pd: any) => pd.tier === tierId
                    )?.qualifiedComliances
                  : isQualifiedCompliance.length
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

        const baseProgram = {
          id: program?.id,
          programDetailId,
          rebate: rebate ?? 0,
          type: program.programHeader || "",
          overview: program.description ?? "",
          paymentTerms: program.programTerms ?? "",
          rebateType: program.rebateType ?? rebateType,
          graph: program?.progressDetails?.length
            ? program?.progressDetails[0]?.graph
            : null,
          progressText: program?.progressDetails?.length
            ? formatCategorySKUProgress(
                program?.progressDetails[0]?.progressText
              )
            : null,
          categorizedProducts: program?.programDetails?.length
            ? program?.programDetails[0]?.categorizedProducts
            : null,
          rebateRange: program?.programDetails?.length
            ? getRangeFromCommaString(
                program?.programDetails[0]?.fixed_rebate_amount
              )
            : null
        };

        if (programType.toLowerCase() === ENTITY_TYPES.STORE.toLowerCase()) {
          return {
            ...baseProgram,
            overview:
              program?.programDetails.find(
                (pd: any) => pd.program_id === program.id
              )?.overview ?? "",
            storeCompliance: {
              total: isStorePrograms
                ? program?.programDetails.find(
                    (pd: any) => pd.program_id === program.id
                  )?.totalEnrollments
                : totalStores,
              completed: isStorePrograms
                ? program?.programDetails.find(
                    (pd: any) => pd.program_id === program.id
                  )?.qualifiedComliances
                : isQualifiedCompliance.length
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

          return {
            ...baseProgram,
            rebateValue: rebateValue,
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
