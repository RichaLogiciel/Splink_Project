import { apiServerClient } from "@/lib/axiosServer";
import { ManufacturerROIResponse } from "@/types/DistributorTypes";

/**
 * Retrieves a list of programs for a manufacturer, optionally filtered by distributor ID.*

 * @param {string} distributorId - The ID of the distributor to filter the results. Default is an empty string.
 *
 * @returns {Promise<Program[]>} - A promise that resolves to an array of programs, or an empty array if an error occurs.
 */
export async function fetchData(
  distributorId: string = "",
  programTimeline?: string
) {
  try {
    const url = `/manufacturer/programs?distributorId=${distributorId}&programTimeline=${programTimeline}`;
    console.log("url", url);

    const { data } = await apiServerClient.get(
      `/manufacturer/programs?distributorId=${distributorId}&programTimeline=${programTimeline}`
    );

    // if (res.status == "success") {
    return data;
    // }
  } catch (error) {
    return {
      stores: [],
      totalStores: 0,
      currentPage: 0,
      totalPages: 0
    };
  }
}

/**
 * Retrieves ROI metrics for a specific manufacturer program.
 *
 * @param {number} programId - The ID of the program to retrieve ROI metrics for.
 * @param {number} [distributorId] - Optional distributor ID to filter ROI metrics.
 *
 * @returns {Promise<ManufacturerROIResponse>} - A promise that resolves to ROI data, or error response.
 */
export async function fetchManufacturerROI(
  programId: number,
  distributorId?: number
): Promise<ManufacturerROIResponse> {
  try {
    const params = new URLSearchParams({ programId: programId.toString() });
    if (distributorId) {
      params.append("distributorId", distributorId.toString());
    }

    const { data } = await apiServerClient.get(
      `/manufacturer/roi?${params.toString()}`
    );

    return data;
  } catch (error) {
    console.error("Error fetching manufacturer ROI:", error);
    return {
      status: "error",
      message: "Failed to fetch ROI data"
    };
  }
}

/**
 * Retrieves categorized products for a manufacturer.
 *
 * @returns {Promise<any>} - A promise that resolves to the categorized products data, or an empty object if an error occurs.
 */
export async function fetchCategoriesProducts() {
  try {
    const { data } = await apiServerClient.get(
      `/manufacturer/categories-products`
    );

    // Process the data to ensure note is empty when products are found
    if (data && data.categorizedProducts) {
      const processedData = {
        ...data,
        categorizedProducts: {}
      };

      // Process each category
      Object.keys(data.categorizedProducts).forEach((category) => {
        const categoryData = data.categorizedProducts[category];

        // Check if there are required products or purchased products
        const hasProducts =
          (categoryData.requiredProducts &&
            categoryData.requiredProducts.length > 0) ||
          (categoryData.purchasedProducts &&
            categoryData.purchasedProducts.length > 0);

        // Set note to empty string if products are found, otherwise keep the original note
        processedData.categorizedProducts[category] = {
          ...categoryData,
          note: hasProducts ? "" : categoryData.note || ""
        };
      });

      return processedData;
    }

    return data;
  } catch (error) {
    console.error("Error fetching categorized products:", error);
    return {};
  }
}
