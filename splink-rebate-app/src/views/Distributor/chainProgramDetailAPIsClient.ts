import { apiClient } from "@/lib/axiosClient";

// Chain Program Details API
export const getChainProgramDetails = async (
  manufacturerId: number,
  warehouseId?: string,
  programTimeline?: string,
  isInternal?: boolean
) => {
  const url = `/programs/details/?type=CHAIN&manufacturerId=${manufacturerId}&includeChainInfo=true&includeProducts=true&warehouseId=${warehouseId || ""}&programTimeline=${programTimeline || ""}&isInternal=${isInternal || false}`;
  console.log("=== getChainProgramDetails API Call ===");
  console.log("URL:", url);

  const { data } = await apiClient.get(url);

  console.log("=== getChainProgramDetails API Response ===");
  console.log("Raw response:", data);
  console.log("Response keys:", Object.keys(data || {}));
  console.log("Returning:", data?.data || {});
  console.log("=== End getChainProgramDetails ===");

  return data || {};
};

// Chains Listing API
export const getChainsListing = async (
  manufacturerId: number,
  enrolled: boolean,
  page: number = 1,
  searchQuery?: string,
  sort?: string,
  sortKey?: string,
  warehouseId?: string,
  programTimeline?: string,
  isInternal?: boolean
) => {
  const url = `/programs/chain-stores?type=CHAIN&manufacturerId=${manufacturerId}&enrolled=${enrolled}&page=${page}&searchQuery=${searchQuery || ""}&sort=${sort || ""}&sortKey=${sortKey || ""}&warehouseId=${warehouseId || ""}&programTimeline=${programTimeline || ""}&isInternal=${isInternal || false}`;
  const { data } = await apiClient.get(url);
  return data?.data || {};
};

// Chain Categorized Products API
export const getChainCategorizedProducts = async (
  manufacturerId: number,
  warehouseId?: string,
  programTimeline?: string,
  isInternal?: boolean
) => {
  const url = `/programs/categorized-products?type=CHAIN&manufacturerId=${manufacturerId}&chainView=true&warehouseId=${warehouseId || ""}&programTimeline=${programTimeline || ""}&isInternal=${isInternal || false}`;
  const { data } = await apiClient.get(url);
  return data?.data || {};
};

// Chain-specific enrollment API
export const enrollChain = async (
  chainId: number,
  programId: number,
  manufacturerId: number
) => {
  const url = `/programs/enroll-chain`;
  const { data } = await apiClient.post(url, {
    chainId,
    programId,
    manufacturerId
  });
  return data;
};

// Chain-specific unenrollment API
export const unenrollChain = async (
  chainId: number,
  programId: number,
  manufacturerId: number
) => {
  const url = `/programs/unenroll-chain`;
  const { data } = await apiClient.post(url, {
    chainId,
    programId,
    manufacturerId
  });
  return data;
};
