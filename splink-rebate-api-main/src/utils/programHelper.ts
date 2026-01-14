import { REBATE_ADJUSTMENT_FACTORS } from "../config/appConstants";
import StoreRebateAdjustmentRepository from "../repositories/StoreRebateAdjustmentRepository";

// Helper function to calculate the rebate amount based on the rebate type and criteria
export const overrideProgramDetailOverviewText = async ({
  rebateType,
  criteria,
  rebateAmount,
  rebatePercentage,
  distributorId,
  storeId,
  overview
}: {
  rebateType: string;
  criteria: null | string;
  rebateAmount: number;
  rebatePercentage: number;
  distributorId: number;
  storeId?: number;
  overview: string;
}): Promise<{ newAmount: number; newOverview: string }> => {
  const type = rebateType?.toLowerCase();
  const isValidType = { fixed: true, percentage: true }[type];

  if (!isValidType) return { newAmount: rebateAmount, newOverview: overview };

  const oldValue = type === "fixed" ? rebateAmount : rebatePercentage;
  if (!oldValue || isNaN(oldValue) || oldValue <= 0)
    return { newAmount: rebateAmount, newOverview: overview };

  // Check store_rebate_adjustments table first if storeId is provided
  let factor: number;
  if (storeId) {
    const storeAdjustmentFactor =
      await StoreRebateAdjustmentRepository.getAdjustmentFactor(
        storeId,
        distributorId
      );
    if (storeAdjustmentFactor !== null) {
      factor = storeAdjustmentFactor;
    } else {
      // Fallback to REBATE_ADJUSTMENT_FACTORS if not found in table
      factor = Number(REBATE_ADJUSTMENT_FACTORS[distributorId]) || 1;
    }
  } else {
    // Use REBATE_ADJUSTMENT_FACTORS if storeId not provided
    factor = Number(REBATE_ADJUSTMENT_FACTORS[distributorId]) || 1;
  }

  const newValue = oldValue * factor;

  // --- Generic formatting strategies ---
  const formatValue = (value: number) =>
    type === "fixed" ? `$${value.toFixed(2)}` : `${value.toFixed(2)}%`;

  const oldFormats = (() => {
    const whole = String(oldValue);
    const fixed2 = oldValue.toFixed(2);
    const fixed1 = oldValue.toFixed(1);

    return type === "fixed"
      ? [`$${fixed2}`, `$${whole}`, `$ ${fixed2}`, `$ ${whole}`]
      : [`${fixed2}%`, `${whole}%`, `${fixed1}%`];
  })();

  const newFormatted = formatValue(newValue);

  // --- Try direct string replacement first ---
  const directMatch = oldFormats.find((f) => overview.includes(f));
  if (directMatch)
    return {
      newAmount: newValue,
      newOverview: overview.replace(directMatch, newFormatted)
    };

  // --- Fallback regex pattern ---
  const escaped = oldValue.toFixed(2).replace(/\./g, "\\.");

  const pattern =
    type === "fixed"
      ? new RegExp(`\\$\\s*${escaped}`, "g")
      : new RegExp(`${escaped}%`, "g");

  return {
    newAmount: newValue,
    newOverview: overview.replace(pattern, newFormatted)
  };
};
