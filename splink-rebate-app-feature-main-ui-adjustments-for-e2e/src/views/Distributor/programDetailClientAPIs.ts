import { apiClient } from "@/lib/axiosClient";

const PROGRAM_URL = "/programs/details";

export const getAggregateSalesVolume = async (
  programID: number,
  programDetailID: number
): Promise<number> => {
  try {
    const url = `${PROGRAM_URL}/get-aggregate-sales-volumn?programID=${programID}&programDetailID=${programDetailID}`;

    const { data } = await apiClient.get(url);
    return data?.totalSalesVolume || 0;
  } catch (error) {
    return 0;
  }
};
