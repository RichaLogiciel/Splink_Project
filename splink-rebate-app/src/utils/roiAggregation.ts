import { ManufacturerROIData } from "@/types/DistributorTypes";
import { SHOW_ROI_TO_MANUFACTURERS_IDS } from "@/utils/constants";

/**
 * Aggregates multiple ROI data records into a single aggregated record.
 * Sums all numeric fields and recalculates ratios/percentages from aggregated totals.
 *
 * @param {ManufacturerROIData[]} roiDataArray - Array of ROI data records to aggregate
 * @param {string} [rebateType] - Optional rebate type filter ("STORE" or "SALES_REP")
 * @returns {ManufacturerROIData | null} - Aggregated ROI data or null if no data
 */
export function aggregateROIData(
  roiDataArray: ManufacturerROIData[],
  rebateType?: "STORE" | "SALES_REP"
): ManufacturerROIData | null {
  if (!roiDataArray || roiDataArray.length === 0) {
    return null;
  }

  // Filter by rebateType if provided
  let filteredData = roiDataArray;
  if (rebateType) {
    filteredData = roiDataArray.filter(
      (data) => data.rebateType === rebateType
    );
  }

  if (filteredData.length === 0) {
    return null;
  }

  // If only one record, return it as-is
  if (filteredData.length === 1) {
    return filteredData[0];
  }

  // Sum all numeric fields
  let totalCostOfProgram = 0;
  let totalCurrentYearSales = 0;
  let totalPreviousYearSales = 0;
  let totalNewDoorsCount = 0;
  let totalLastYearDoorsCount = 0;
  let totalNewPodCount = 0;
  let totalPodCount = 0;

  filteredData.forEach((data) => {
    totalCostOfProgram += Number(data.costOfProgram) || 0;
    totalCurrentYearSales += Number(data.currentYearProgramProductSales) || 0;
    totalPreviousYearSales += Number(data.previousYearProgramProductSales) || 0;
    totalNewDoorsCount += data.newDoorsCount || 0;
    totalLastYearDoorsCount += data.lastYearDoorsCount || 0;
    totalNewPodCount += data.newPodCount || 0;
    totalPodCount += data.totalPodCount || 0;
  });

  // Recalculate derived metrics
  const salesToCostRatio =
    totalCostOfProgram > 0 ? totalCurrentYearSales / totalCostOfProgram : 0;

  const incrementalSalesLift =
    totalPreviousYearSales > 0
      ? ((totalCurrentYearSales - totalPreviousYearSales) /
          totalPreviousYearSales) *
        100
      : 0;

  const newDoorsPercentage =
    totalLastYearDoorsCount > 0
      ? (totalNewDoorsCount / totalLastYearDoorsCount) * 100
      : 0;

  const newPodPercentage =
    totalPodCount > 0 ? (totalNewPodCount / totalPodCount) * 100 : 0;

  // Use the first record as a template for non-aggregated fields
  const template = filteredData[0];

  // Return aggregated ROI data
  return {
    ...template,
    distributorId: null, // Aggregated data represents all distributors
    costOfProgram: totalCostOfProgram.toFixed(2),
    currentYearProgramProductSales: totalCurrentYearSales.toFixed(2),
    previousYearProgramProductSales: totalPreviousYearSales.toFixed(2),
    salesToCostRatio,
    incrementalSalesLift,
    newDoorsCount: totalNewDoorsCount,
    lastYearDoorsCount: totalLastYearDoorsCount,
    newDoorsPercentage,
    newPodCount: totalNewPodCount,
    totalPodCount: totalPodCount,
    newPodPercentage
  };
}

/**
 * Checks if a manufacturer ID should see ROI data
 * @param manufacturerId - The manufacturer ID to check
 * @returns true if the manufacturer ID is in the allowed list, false otherwise
 */
export const shouldShowROIToManufacturer = (
  manufacturerId: number | null | undefined
): boolean => {
  if (!manufacturerId || !SHOW_ROI_TO_MANUFACTURERS_IDS) {
    return false;
  }

  const allowedIds = SHOW_ROI_TO_MANUFACTURERS_IDS.split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .map((id) => Number(id))
    .filter((id) => !isNaN(id));

  return allowedIds.includes(manufacturerId);
};
