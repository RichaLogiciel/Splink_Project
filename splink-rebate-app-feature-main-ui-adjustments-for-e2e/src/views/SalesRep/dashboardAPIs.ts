import { apiServerClient } from "@/lib/axiosServer";

export const fetchSalesRepStoresNearToCompliance = async ({
  searchQuery = "",
  manufacturerId = "",
  programTimeline = "Current"
}: {
  searchQuery?: string;
  manufacturerId?: string;
  programTimeline: string;
}): Promise<any> => {
  try {
    const url = `/sales-rep/:id/stores-compliance?minPercentage=50&manufacturerId=${manufacturerId}&searchQuery=${decodeURI(
      searchQuery
    )}&programTimeline=${programTimeline}`;

    const { data } = await apiServerClient.get(url);

    return data;
  } catch (error) {
    return [];
  }
};

export const fetchAuthorizedManufacturers = async (
  programTimeline = "Current"
): Promise<any> => {
  try {
    const url = `/sales-rep/get-manufacturers?programTimeline=${programTimeline}`;

    const { data } = await apiServerClient.get(url);

    return data;
  } catch (error) {
    return [];
  }
};
