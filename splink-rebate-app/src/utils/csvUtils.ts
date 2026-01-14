import { StoreTableData } from "@/types/StoreTypes";
import { formatNumber } from "./numberFormatter";

/**
 * Generate CSV content for store data
 * @param stores - Array of store data
 * @param fields - Array of field configurations for CSV columns
 * @returns CSV content as string
 */
export const generateStoreCSV = (
  stores: StoreTableData[],
  fields: CSVFieldConfig[]
): string => {
  const headers = fields.map((field) => field.header);

  const rows = stores.map((store) =>
    fields.map((field) => field.getValue(store))
  );

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row
        .map((field) => `"${field?.toString().replace(/"/g, '""') || ""}"`)
        .join(",")
    )
  ].join("\n");

  return csvContent;
};

/**
 * Download CSV content as a file
 * @param csvContent - CSV content string
 * @param filename - Name of the file to download
 */
export const downloadCSV = (csvContent: string, filename: string): void => {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Get timestamp for filename
 * @returns Date string in YYYY-MM-DD format
 */
export const getTimestamp = (): string => {
  return new Date().toISOString().split("T")[0];
};

// Field configuration interface
export interface CSVFieldConfig {
  header: string;
  getValue: (store: StoreTableData) => string | number;
}

// Predefined field configurations for different contexts
export const storeCSVFields = {
  // Standard store fields
  storeName: {
    header: "Store Name",
    getValue: (store: StoreTableData) => store.storeInfo.name
  },
  storeLocation: {
    header: "Store Location",
    getValue: (store: StoreTableData) => store.storeInfo.location || ""
  },
  externalStoreId: {
    header: "External Store ID",
    getValue: (store: StoreTableData) => store.externalStoreId || ""
  },
  chainName: {
    header: "Chain",
    getValue: (store: StoreTableData) =>
      store.chainNames === "None" ? "" : store.chainNames
  },
  purchaseVolume: {
    header: "Purchase Volume",
    getValue: (store: StoreTableData) =>
      `$${formatNumber(store.salesData.purchaseVolume.amount)}`
  },
  totalSavings: {
    header: "Estimated Earnings",
    getValue: (store: StoreTableData) =>
      `$${formatNumber(store.salesData.totalSavings.amount)}`
  },
  totalOppSavings: {
    header: "Earnings Opportunity",
    getValue: (store: StoreTableData) =>
      store.salesData.totalOppSavings
        ? `$${formatNumber(store.salesData.totalOppSavings.amount)}`
        : "N/A"
  },
  programCompliance: {
    header: "Program Compliance",
    getValue: (store: StoreTableData) =>
      `${store.programData.completedPrograms}/${store.programData.totalEnrolled}`
  },
  distributorName: {
    header: "Distributor",
    getValue: (store: StoreTableData) => store.storeInfo.distributor?.name || ""
  },
  salesRepName: {
    header: "Sales Rep",
    getValue: (store: StoreTableData) => store.storeInfo.rep?.name || ""
  },
  purchasedSkus: {
    header: "SKUs",
    getValue: (store: StoreTableData) =>
      store.salesData.purchasedSkus?.length || 0
  }
} as const;

// Preset field combinations for different use cases
export const fieldPresets: Record<string, CSVFieldConfig[]> = {
  enrolledStores: [
    storeCSVFields.storeName,
    storeCSVFields.storeLocation,
    storeCSVFields.externalStoreId,
    storeCSVFields.chainName,
    storeCSVFields.purchaseVolume,
    storeCSVFields.totalSavings,
    storeCSVFields.programCompliance,
    storeCSVFields.distributorName,
    storeCSVFields.salesRepName
  ],
  unenrolledStores: [
    storeCSVFields.storeName,
    storeCSVFields.storeLocation,
    storeCSVFields.externalStoreId,
    storeCSVFields.chainName,
    storeCSVFields.purchaseVolume,
    storeCSVFields.totalOppSavings,
    storeCSVFields.distributorName,
    storeCSVFields.salesRepName
  ],
  distributorStores: [
    storeCSVFields.storeName,
    storeCSVFields.storeLocation,
    storeCSVFields.externalStoreId,
    storeCSVFields.chainName,
    storeCSVFields.purchaseVolume,
    storeCSVFields.purchasedSkus,
    storeCSVFields.programCompliance,
    storeCSVFields.salesRepName
  ]
};
