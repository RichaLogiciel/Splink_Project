/**
 * Helper functions for validating earnings cap (configurable percentage of purchase volume)
 */

import { EARNINGS_CAP_PERCENTAGE } from '../../../utils/constant';

export interface ProgramCompliance {
  completed: number;
  total: number;
}

export interface ValidationResult {
  shouldValidate: boolean;
  reason?: string;
}

export interface EarningsValidationResult {
  isValid: boolean;
  percentage: number;
  errorMessage?: string;
}

/**
 * Check if earnings validation should be performed
 * Earnings are only calculated when at least one program compliance is passed
 * @param programCompliance - Object with completed and total program compliance
 * @param context - Context string for logging (e.g., "Store: XYZ", "Program: ABC")
 * @returns Object with shouldValidate flag and optional reason
 */
export function shouldValidateEarnings(
  programCompliance: ProgramCompliance,
  context: string
): ValidationResult {
  if (programCompliance.completed < 1) {
    return {
      shouldValidate: false,
      reason: `No program compliance passed for ${context} (${programCompliance.completed}/${programCompliance.total}). Earnings are only calculated when compliance is met.`,
    };
  }
  return { shouldValidate: true };
}

/**
 * Calculate earnings as a percentage of purchase volume
 * @param earnings - Earnings amount
 * @param purchaseVolume - Purchase volume amount
 * @returns Percentage as decimal (e.g., 0.15 for 15%)
 */
export function calculatePercentage(
  earnings: number,
  purchaseVolume: number
): number {
  if (purchaseVolume === 0) {
    return 0;
  }
  return earnings / purchaseVolume;
}

/**
 * Extract numeric value from currency strings
 * @param text - Currency string (e.g., "$1,234.56", "$1,234", "1234.56")
 * @returns Numeric value
 */
export function parseCurrencyValue(text: string): number {
  if (!text) {
    return 0;
  }
  const value = parseFloat(String(text)?.replace(/[^\d.]/g, '') || '0') || 0;
  return isNaN(value) ? 0 : value;
}

/**
 * Validate that earnings do not exceed the maximum percentage of purchase volume
 * @param earnings - Earnings amount
 * @param purchaseVolume - Purchase volume amount
 * @param maxPercentage - Maximum allowed percentage (defaults to EARNINGS_CAP_PERCENTAGE constant)
 * @param context - Context string for error messages (e.g., "Store: XYZ")
 * @returns Object with validation result, percentage, and optional error message
 */
export function validateEarningsCap(
  earnings: number,
  purchaseVolume: number,
  maxPercentage: number = EARNINGS_CAP_PERCENTAGE,
  context: string = ''
): EarningsValidationResult {
  // Handle edge cases
  if (purchaseVolume === 0) {
    console.warn(
      `Skipping earnings cap validation for ${context}: Purchase Volume is 0`
    );
    return {
      isValid: true,
      percentage: 0,
    };
  }

  if (earnings < 0 || purchaseVolume < 0) {
    console.warn(
      `Skipping earnings cap validation for ${context}: Negative values detected (Earnings: ${earnings}, Purchase Volume: ${purchaseVolume})`
    );
    return {
      isValid: true,
      percentage: 0,
    };
  }

  // Calculate percentage
  const percentage = calculatePercentage(earnings, purchaseVolume);
  const maxAllowed = purchaseVolume * maxPercentage;

  // Validate
  if (percentage > maxPercentage) {
    const percentageDisplay = (percentage * 100).toFixed(2);
    const maxPercentageDisplay = (maxPercentage * 100).toFixed(0);
    return {
      isValid: false,
      percentage,
      errorMessage: `Earnings exceed ${maxPercentageDisplay}% cap for ${context}\nEarnings: $${earnings.toFixed(
        2
      )} (${percentageDisplay}%) | Purchase Volume: $${purchaseVolume.toFixed(
        2
      )}\nMax Allowed: $${maxAllowed.toFixed(2)} (${maxPercentageDisplay}%)`,
    };
  }

  return {
    isValid: true,
    percentage,
  };
}

export interface TierInfo {
  completed: number;
  total: number;
  percentage: number;
}

/**
 * Calculate the nearest incomplete tier percentage
 * Finds the tier that is closest to completion but not yet 100% complete
 * Skips tiers that are 100% complete
 * @param tiers - Array of tier information with completed and total values
 * @returns Percentage of the nearest incomplete tier (0-100), or null if all tiers are complete
 */
export function calculateNearestIncompleteTierPercentage(
  tiers: TierInfo[]
): number | null {
  if (!tiers || tiers.length === 0) {
    return null;
  }

  // Filter out completed tiers (100%) and calculate percentages
  const incompleteTiers = tiers
    .map((tier) => ({
      ...tier,
      percentage: tier.total > 0 ? (tier.completed / tier.total) * 100 : 0,
    }))
    .filter((tier) => tier.percentage < 100);

  if (incompleteTiers.length === 0) {
    // All tiers are complete
    return null;
  }

  // Find the tier with the highest percentage (closest to completion)
  const nearestTier = incompleteTiers.reduce((prev, current) =>
    current.percentage > prev.percentage ? current : prev
  );

  return Math.round(nearestTier.percentage);
}

export interface ComplianceToNextTierValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Validate % Compliance to Next Tier
 * Compares displayed percentage with expected value from nearest incomplete tier
 * @param displayedPercentage - Percentage displayed in the table
 * @param tiers - Array of tier information with completed and total values
 * @param context - Context string for error messages (e.g., "Store: XYZ")
 * @returns Object with validation result and optional error message
 */
export function validateComplianceToNextTier(
  displayedPercentage: number,
  tiers: TierInfo[],
  context: string
): ComplianceToNextTierValidationResult {
  // Calculate expected percentage from nearest incomplete tier
  const expectedPercentage = calculateNearestIncompleteTierPercentage(tiers);

  // Handle edge case: if all tiers are complete, displayed should be 0%
  if (expectedPercentage === null) {
    if (displayedPercentage > 0) {
      return {
        isValid: false,
        errorMessage: `% Compliance to Next Tier mismatch for ${context}\nAll tiers are complete (100%), but displayed value is: ${displayedPercentage}%\nExpected: 0% or N/A`,
      };
    }
    return { isValid: true };
  }

  // Compare with tolerance for rounding (allow ±1% difference)
  const difference = Math.abs(displayedPercentage - expectedPercentage);
  if (difference > 1) {
    const tiersInfo = tiers
      .map((t) => `${t.completed}/${t.total} (${t.percentage.toFixed(1)}%)`)
      .join(', ');
    return {
      isValid: false,
      errorMessage: `% Compliance to Next Tier mismatch for ${context}\nExpected: ${expectedPercentage}% (from nearest incomplete tier)\nDisplayed: ${displayedPercentage}%\nDifference: ${difference}%\nTiers: ${tiersInfo}`,
    };
  }

  return { isValid: true };
}
