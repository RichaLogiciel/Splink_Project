import dotenv from 'dotenv';
dotenv.config();

export const ENTITY_TYPE = {
  DISTRIBUTOR: 'DISTRIBUTOR',
  MANUFACTURER: 'MANUFACTURER',
  STORE: 'STORE',
  SALES_REP: 'SALES_REP',
  DISTRIBUTOR_ADMIN: 'DISTRIBUTOR_ADMIN',
  DISTRIBUTOR_EXECUTIVE: 'DISTRIBUTOR_EXECUTIVE',
  DISTRIBUTOR_SALES_REP: 'DISTRIBUTOR_SALES_REP',
  DISTRIBUTOR_GENERAL_MANAGER: 'DISTRIBUTOR_GENERAL_MANAGER',
  MANUFACTURER_ADMIN: 'MANUFACTURER_ADMIN',
  MANUFACTURER_EXECUTIVE: 'MANUFACTURER_EXECUTIVE',
  MANUFACTURER_SALES_REP: 'MANUFACTURER_SALES_REP',
  MANUFACTURER_ACCOUNT_MANAGER: 'MANUFACTURER_ACCOUNT_MANAGER',
  SALES_REP_MANAGER: 'SALES_REP_MANAGER',
  SUPER_ADMIN: 'SUPER_ADMIN',
  CHAIN: 'CHAIN',
  CHAIN_ADMIN: 'CHAIN_ADMIN',
};

/**
 * Map of category names to display names
 * @type {Map<string, string>}
 */
export const CATEGORY_DISPLAY_NAME = new Map([
  // SKipping Flex category Name change because it's already flex
  // ['Flex', 'Recommended Flex'],
  ['Core', 'Core Wholesale'],
]);

// Manufacturer To Skip
export const ManufacturerToSkip = [
  'HERSHEY',
  'Jack Links',
  "Florida's Natural",
];

export const MAX_STORES_TO_TEST = process.env?.MAX_STORES_TO_TEST || 5;
export const MAX_STORES_TO_TEST_FOR_MANUFACTURERS =
  process.env?.MAX_STORES_TO_TEST_FOR_MANUFACTURERS || 5;

export const PROGRAM_TIMELINE_TO_TEST =
  process.env?.PROGRAM_TIMELINE_TO_TEST || 'Current';

// Earnings Cap Percentage (15% = 0.15)
// This represents the maximum percentage of purchase volume that earnings can be
export const EARNINGS_CAP_PERCENTAGE =
  parseFloat(process.env?.EARNINGS_CAP_PERCENTAGE) || 0.15;
