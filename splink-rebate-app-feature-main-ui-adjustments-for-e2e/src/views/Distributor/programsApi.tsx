// lib/programApi.ts
import { apiServerClient } from "@/lib/axiosServer";
import { ProgramListingCard } from "@/types/ProgramTypes";
import { getV2ApiUrl } from "@/utils/urlHelper";
import {
  mapDistributorSpiffSummaryToProgramListingCard,
  mapSalesManagerOverviewToProgramListingCard,
  mapSpiffDataToProgramListingCard,
  mapSpiffV2DataToProgramListingCard
} from "../SalesRep/spiffProgramsApiDataHelpers";
import { mapResponseToProgramListingCard } from "./programsApiDataHelpers";
const PROGRAM_URL = "/programs";

/**
 * Fetches program listing data for a specific user and program type.
 *
 * This function sends a GET request to retrieve a list of programs
 * associated with the specified user ID and program type. The response
 * is mapped to an array of ProgramListingCard objects.
 *
 * @param {number} userId - The ID of the user whose program data is to be fetched.
 * @param {string} type - The type of programs to fetch, e.g., "DISTRIBUTOR", "STORE".
 * @returns {Promise<ProgramListingCard[]>} - A promise that resolves to an array of ProgramListingCard objects.
 */
export const fetchProgramsData = async (
  type: string,
  programTimeline?: string,
  warehouseId?: string,
  isInternal?: boolean,
  isExcludeChainStores?: boolean
): Promise<ProgramListingCard[]> => {
  try {
    const url = `${PROGRAM_URL}?type=${type}&warehouseId=${warehouseId}&programTimeline=${programTimeline}&isInternal=${isInternal}&isExcludeChainStores=${isExcludeChainStores}`;
    const { data } = await apiServerClient.get(url);
    const mappedData = mapResponseToProgramListingCard(data, type);
    console.log("[DEBUG] mappedData:", mappedData[1]?.programs);
    return mappedData;
  } catch (error: any) {
    return []; // Return an empty array as the default value
  }
};

export const fetchAllSpiffPrograms = async (
  programTimeline?: string,
  isInternal?: boolean
): Promise<ProgramListingCard[]> => {
  try {
    const { data } = await apiServerClient.get(
      `/sales-rep/all-spiff-opportunities?programTimeline=${programTimeline}&isInternal=${isInternal}`
    );
    return await mapSpiffDataToProgramListingCard(data, isInternal);
  } catch (error: any) {
    console.error("Failed to fetch SPIFF programs:", error);
    return [];
  }
};

export const fetchAllSpiffProgramsForDistributor = async (
  programTimeline?: string,
  isInternal?: boolean
): Promise<ProgramListingCard[]> => {
  try {
    const url = `/distributor/spiff-summary?programTimeline=${programTimeline}&isInternal=${isInternal}`;
    const { data } = await apiServerClient.get(url);

    const mappedData = await mapDistributorSpiffSummaryToProgramListingCard(
      data,
      isInternal
    );

    return mappedData.filter(
      (program) => program?.programs && program?.programs?.length > 0
    );
  } catch (error: any) {
    console.error("Failed to fetch SPIFF programs for distributor:", error);
    return [];
  }
};

/**
 * Fetches all Sales Manager programs for a distributor.
 *
 * This function sends a GET request to retrieve a list of programs
 * associated with the specified user ID and program type. The response
 * is mapped to an array of ProgramListingCard objects.
 */
export const fetchAllSalesManagerPrograms = async (
  programTimeline?: string,
  isInternal?: boolean,
  warehouseId?: string
): Promise<ProgramListingCard[] | any> => {
  try {
    // OLD URL
    // const url = getV2ApiUrl(
    //   `/programs/sales-manager-programs?programTimeline=${programTimeline}&isInternal=${isInternal}`
    // );
    const url = `/programs/v2?type=DISTRIBUTOR_SALES_MANAGER&programTimeline=${programTimeline}&isInternal=${isInternal}&isExcludeChainStores=false${warehouseId ? `&warehouseId=${warehouseId}` : ""}`;
    const { data } = await apiServerClient.get(url);

    // const mappedData = await mapSalesManagerOverviewToProgramListingCard(data);
    // return mappedData.filter(
    //   (program) => program?.programs && program?.programs?.length > 0
    // );
    return data;
  } catch (error: any) {
    console.error("Failed to fetch Sales Manager programs:", error);
    return [];
  }
};

/**
 * Fetches all Sales Manager programs for a distributor.
 *
 * This function sends a GET request to retrieve a list of programs
 * associated with the specified user ID and program type. The response
 * is mapped to an array of ProgramListingCard objects.
 */
export const fetchSalesManagerProgramsByManufacturer = async (
  programTimeline?: string,
  isInternal?: boolean,
  manufacturerId?: number
): Promise<ProgramListingCard[] | any> => {
  try {
    const url = getV2ApiUrl(
      `/programs/sales-manager-programs?programTimeline=${programTimeline}&isInternal=${isInternal}&manufacturerId=${manufacturerId}`
    );
    const { data } = await apiServerClient.get(url);

    const mappedData = await mapSalesManagerOverviewToProgramListingCard(data);
    return (
      mappedData.filter(
        (program) => program?.programs && program?.programs?.length > 0
      )?.[0] ?? {}
    );
  } catch (error: any) {
    console.error("Failed to fetch Sales Manager programs:", error);
    return [];
  }
};

export const fetchAllSpiffProgramsForDistributorV2 = async (
  programTimeline?: string,
  isInternal?: boolean,
  warehouseId?: string
): Promise<ProgramListingCard[]> => {
  try {
    const url = `/programs/v2?type=SPIFF&programTimeline=${programTimeline}&isInternal=${isInternal}&isExcludeChainStores=false${warehouseId ? `&warehouseId=${warehouseId}` : ""}`;
    const { data } = await apiServerClient.get(url);

    return mapSpiffV2DataToProgramListingCard(data);
  } catch (error: any) {
    console.error("Failed to fetch SPIFF programs for distributor:", error);
    return [];
  }
};
