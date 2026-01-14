import { apiClient } from "@/lib/axiosClient";

//not using as separate apis have been added for key metrics, distributor sales, store penetration, top products
export const fetchManufacturerProductInsights = async (
  distributorId?: string,
  monthRange?: number,
  selectedProducts?: number[]
): Promise<any> => {
  try {
    const url = "/manufacturer/product-insights-optimized";

    const { data } = await apiClient.post(url, {
      distributorId: distributorId,
      monthRange: monthRange,
      selectedProducts: selectedProducts
    });

    return data;
  } catch (error) {
    return 0;
  }
};

export const fetchManufacturerKeyMetrics = async (
  distributorId: number[],
  selectedProducts: number[],
  monthRange: number
): Promise<any> => {
  try {
    // Format arrays properly for URL parameters
    const distributorIdParam = distributorId.join(",");
    const selectedProductsParam =
      selectedProducts.length > 0 ? selectedProducts.join(",") : "";

    const url = `/manufacturer/key-metrics-optimized?distributorId=${distributorIdParam}&selectedProducts=${selectedProductsParam}&monthRange=${monthRange}`;

    const response = await apiClient.get(url, {
      // Add cache-busting to avoid 304 responses
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      },
      timeout: 120000 // 2 minutes
    });

    return response.data;
  } catch (error: any) {
    console.error("Error fetching key metrics:", error);
    console.error("Error details:", error.response?.data || error.message);
    return null;
  }
};

export const fetchManufacturerTopProducts = async (
  distributorId: number[],
  selectedProducts: number[],
  monthRange: number
): Promise<any> => {
  try {
    // Format arrays properly for URL parameters
    const distributorIdParam = distributorId.join(",");
    const selectedProductsParam =
      selectedProducts.length > 0 ? selectedProducts.join(",") : "";

    const url = `/manufacturer/top-products-optimized?distributorId=${distributorIdParam}&selectedProducts=${selectedProductsParam}&monthRange=${monthRange}`;

    const response = await apiClient.get(url, {
      // Add cache-busting to avoid 304 responses
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      },
      timeout: 120000 // 2 minutes
    });

    return response.data;
  } catch (error: any) {
    console.error("Error fetching top products:", error);
    console.error("Error details:", error.response?.data || error.message);
    return null;
  }
};

export const fetchManufacturerDistributorSales = async (
  distributorId: number[],
  selectedProducts: number[],
  monthRange: number
): Promise<any> => {
  try {
    // Format arrays properly for URL parameters
    const distributorIdParam = distributorId.join(",");
    const selectedProductsParam =
      selectedProducts.length > 0 ? selectedProducts.join(",") : "";

    const url = `/manufacturer/get-distributor-sales?distributorId=${distributorIdParam}&selectedProducts=${selectedProductsParam}&monthRange=${monthRange}`;

    const response = await apiClient.get(url, {
      // Add cache-busting to avoid 304 responses
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      },
      timeout: 120000 // 2 minutes
    });

    return response.data;
  } catch (error: any) {
    console.error("Error fetching distributor sales:", error);
    console.error("Error details:", error.response?.data || error.message);
    return null;
  }
};

export const fetchManufacturerStorePenetration = async (
  distributorId: number[],
  selectedProducts: number[],
  monthRange: number
): Promise<any> => {
  try {
    // Format arrays properly for URL parameters
    const distributorIdParam = distributorId.join(",");
    const selectedProductsParam =
      selectedProducts.length > 0 ? selectedProducts.join(",") : "";

    const url = `/manufacturer/get-store-penetration?distributorId=${distributorIdParam}&selectedProducts=${selectedProductsParam}&monthRange=${monthRange}`;

    const response = await apiClient.get(url, {
      // Add cache-busting to avoid 304 responses
      headers: {
        "Cache-Control": "no-cache",
        Pragma: "no-cache"
      },
      timeout: 120000 // 2 minutes
    });

    return response.data;
  } catch (error: any) {
    console.error("Error fetching store penetration:", error);
    console.error("Error details:", error.response?.data || error.message);
    return null;
  }
};
