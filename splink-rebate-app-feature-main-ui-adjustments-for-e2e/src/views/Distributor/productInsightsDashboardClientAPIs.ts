import { apiClient } from "@/lib/axiosClient";

export const fetchDistributorProductInsightKeyMetrics = async (
  manufacturerId?: string,
  monthRange?: number,
  selectedProducts?: number[],
  warehouseId?: string
): Promise<any> => {
  try {
    const url = "/distributor/product-insights/key-metrics";

    const { data } = await apiClient.post(
      url,
      {
        manufacturerId: manufacturerId,
        monthRange: monthRange,
        selectedProducts: selectedProducts,
        warehouseId: warehouseId
      },
      { timeout: 120000 } // 2 minutes
    );

    return data;
  } catch (error) {
    return 0;
  }
};

export const fetchDistributorProductInsights = async (
  manufacturerId?: string,
  monthRange?: number,
  selectedProducts?: number[],
  warehouseId?: string
): Promise<any> => {
  try {
    const url = "/distributor/product-insights";

    const { data } = await apiClient.post(
      url,
      {
        manufacturerId: manufacturerId,
        monthRange: monthRange,
        selectedProducts: selectedProducts,
        warehouseId: warehouseId
      },
      { timeout: 120000 } // 2 minutes
    );

    return data;
  } catch (error) {
    return 0;
  }
};
