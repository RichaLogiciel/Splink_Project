import { handleError, handleSuccess } from "@/lib/axios";
import { apiClientExtended } from "@/lib/axiosClient";
import { UserCookie } from "@/types/UsersType";
import { getCookie } from "@/utils/getCookie";
import { REPORT_TYPE } from "./constants";

/**
 * Utility function to export store earnings data as CSV
 */
export const exportStoreEarningsCSV = async (param?: {
  manufacturerId?: number;
  manufacturerName?: string;
  programTimeline?: string;
  reportType?: string;
}) => {
  const manufacturerId = param?.manufacturerId;
  const manufacturerName = param?.manufacturerName;
  const programTimeline = param?.programTimeline;
  const reportType = param?.reportType || REPORT_TYPE.STORE_EARNINGS;
  try {
    // Use direct axios call to bypass the response interceptor
    const user = JSON.parse(getCookie("user") ?? "{}") as unknown as UserCookie;
    const response = await apiClientExtended({
      responseType: ["blob", "text"] // Important for downloading files
    })
      .get(`/dashboard/export-store-earnings-csv`, {
        params: {
          manufacturerId,
          programTimeline,
          reportType
        }
      })
      .then(handleSuccess, handleError)
      .then((response) => {
        return JSON.parse(response);
      });

    // Response Status
    if (response.status !== "success") {
      throw new Error(`HTTP error! status: ${response.message}`);
    }

    const responseData = response.data;

    // Get Distributor Name
    const distributorName =
      user?.name?.toLowerCase().replace(/[^a-zA-Z0-9]/g, "-") || "";
    const brandName =
      manufacturerName?.toLowerCase().replace(/[^a-zA-Z0-9]/g, "-") || "";
    const currentDate = new Date().toISOString().split("T")[0];

    // Export Filename
    let filename = `${reportType.toLowerCase()}-report-`;

    filename += brandName
      ? `${distributorName}-${brandName}-${currentDate}.csv`
      : `${distributorName}-${currentDate}.csv`;

    // Create Blob and Download
    const blob = new Blob([responseData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    // Append Link to Body and Click
    document.body.appendChild(link);
    link.click();

    // Remove Link from Body and Revoke Object URL
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    try {
      const message = JSON.parse(error).data;
      throw new Error(message);
    } catch (error: any) {
      throw new Error(error?.message);
    }
  }
};

/**
 * Utility function to export void fill programs summary data as CSV
 */
export const exportVoidFillSummaryCSV = async (param?: {
  salesRepIds?: number[];
  excludeChainStore?: boolean;
  warehouseIds?: (string | number)[];
  programId?: number;
  manufacturerId?: number;
  manufacturerName?: string;
}) => {
  const salesRepIds = param?.salesRepIds;
  const excludeChainStore = param?.excludeChainStore;
  const warehouseIds = param?.warehouseIds;
  const programId = param?.programId;
  const manufacturerId = param?.manufacturerId;
  const manufacturerName = param?.manufacturerName;
  try {
    const user = JSON.parse(getCookie("user") ?? "{}") as unknown as UserCookie;

    // Prepare request body
    const body: any = {
      salesRepIds: salesRepIds || [],
      isDownload: true
    };

    if (excludeChainStore !== undefined) {
      body.excludeChainStore = excludeChainStore;
    }
    if (warehouseIds && warehouseIds.length > 0) {
      body.warehouseIds = warehouseIds;
    }
    if (programId !== undefined) {
      body.programId = programId;
    }
    if (manufacturerId !== undefined) {
      body.manufacturerId = manufacturerId;
    }

    body.isDownload = true;

    // Use direct axios call to bypass the response interceptor
    const response = await apiClientExtended({
      responseType: "blob" // Important for downloading files
    })
      .post(`/programs/get-void-fill-programs-summary`, body)
      .then(handleSuccess, handleError);

    // Handle response - could be blob, string, or JSON
    let responseData: string | Blob;

    if (typeof response === "string") {
      // If it's a JSON string, parse it to check for errors
      try {
        const parsed = JSON.parse(response);
        if (parsed.status === "error" || parsed.status !== "success") {
          throw new Error(parsed.message || "Error exporting CSV");
        }
        // If status is success, get data
        responseData = parsed.data || response;
      } catch {
        // If parsing fails, assume it's CSV string
        responseData = response;
      }
    } else if (response instanceof Blob) {
      responseData = response;
    } else {
      // If it's an object, check for status and data
      if (
        response?.status === "error" ||
        (response?.status && response?.status !== "success")
      ) {
        throw new Error(response?.message || "Error exporting CSV");
      }
      responseData = response?.data || response;
    }

    // Convert blob to text if needed
    if (responseData instanceof Blob) {
      responseData = await responseData.text();
    }

    // Get Distributor Name
    const distributorName =
      user?.name?.toLowerCase().replace(/[^a-zA-Z0-9]/g, "-") || "";
    const currentDate = new Date().toISOString().split("T")[0];

    // Export Filename
    let filename = `void-fill-summary-report-`;
    filename += manufacturerName
      ? `${distributorName}-${manufacturerName}-${currentDate}.csv`
      : `${distributorName}-${currentDate}.csv`;

    // Create Blob and Download
    const blob = new Blob([responseData], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    // Append Link to Body and Click
    document.body.appendChild(link);
    link.click();

    // Remove Link from Body and Revoke Object URL
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (error: any) {
    try {
      const message = JSON.parse(error).data;
      throw new Error(message);
    } catch (error: any) {
      throw new Error(error?.message);
    }
  }
};
