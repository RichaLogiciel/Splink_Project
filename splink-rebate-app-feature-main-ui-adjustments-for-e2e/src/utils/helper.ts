import { formatNumber } from "@/utils/numberFormatter";

import { REBATE_TYPES } from "@/views/Distributor/programConstants";
import { randomNumber } from "./calculations";
import {
  HIDE_ORDER_UNIT_TYPE_FOR_DISTRIBUTOR_IDS,
  ORDER_FUNCTIONALITY_ENABLED_FOR_DISTRIBUTOR_IDS,
  PROGRAM_TIMELINE,
  SHOW_PROGRAM_ON_TIMELINE_BASE,
  SHOW_WAREHOUSES_FOR_DISTRIBUTOR_IDS
} from "./constants";

export function getInitials(fullName: string): string {
  if (!fullName) return "";

  // Split the full name by spaces and get the first and last name
  const names = fullName.split(" ");

  // Get the first letter of the first and last name
  const initials = names[0][0] + names[names.length - 1][0];

  return initials.toUpperCase(); // Convert to uppercase
}

export function wrapPercentageAndCurrency(input: string): string {
  // Regular expression to match percentage values (e.g., "1%")
  const percentageRegex = /(\d+%)/g;

  // Regular expression to match currency values (e.g., "$500", "£300", etc.)
  // eslint-disable-next-line no-useless-escape
  const currencyRegex = /(\$\d+|\£\d+|\€\d+)/g;

  // First, wrap the percentage values
  let result = input.replace(
    percentageRegex,
    (match) => `<span class="text-green font-medium">${match}</span>`
  );

  // Then, wrap the currency values
  result = result.replace(
    currencyRegex,
    (match) => `<span class="text-green font-medium">${match}</span>`
  );

  return result;
}

// Removes spaces and commas from a given input string
function removeSpacesAndCommas(input: any): string {
  return (input ?? "").toString().replace(/\s+|,/g, "").trim();
}

// Return if Provided string is empty or not
export function isEmptyString(input: string): boolean {
  return removeSpacesAndCommas(input)?.length === 0;
}

/**
 * Returns a color for a given value between 0 and 100.
 * The returned color indicates the progress bar color based on the value.
 * The colors are:
 * - 0 - 25 Red (#BC0909)
 * - 26 - 75 Orange (#FF9900)
 * - 76 - 100 Green (#106210)
 * - Red (#BC0909) if no other case matches (optional default).
 * @param {number} value - Value between 0 and 100.
 * @returns {string} Color hex value.
 */
export const getProgressBarColor = (value: number) => {
  switch (true) {
    case value <= 25:
      return "#BC0909";
    case value >= 26 && value <= 99:
      return "#FF9900";
    case value >= 100:
      return "#106210";
    default:
      return "#BC0909"; // Optional: Default color if no case matches
  }
};

/**
 * Formats a date string as MMMM DDth 'YY
 * @param {string} dateString - The date string to format.
 * @returns {string} The formatted date string.
 */
export const formatDate = (dateString: string) => {
  if (!dateString) return "";

  const date = new Date(dateString);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
  ];

  const day = date.getUTCDate();
  const month = months[date.getUTCMonth()];
  const year = date.getUTCFullYear();

  // Get the day suffix (st, nd, rd, th)
  const suffix = (day: number) => {
    if (day % 10 === 1 && day !== 11) return "st";
    if (day % 10 === 2 && day !== 12) return "nd";
    if (day % 10 === 3 && day !== 13) return "rd";
    return "th";
  };

  return `${month} ${day}${suffix(day)} '${String(year).slice(-2)}`;
};
export const getFormattedRebate = (rebate: number, rebateType: string) => {
  switch (rebateType) {
    case "percentage":
      return `${rebate}%`;
    case "per_case":
      return `$${formatNumber(rebate)}/cs`;
    case "fixed":
      return `$${formatNumber(rebate)}`;
    default:
      return `$${formatNumber(rebate)}`; // Ensures default to dollar format if type is unknown
  }
};

/**
 * Formats the rebate information into a string representation based on the provided
 * compliance data and optional program details.
 *
 * The function determines the rebate type from the program details or compliance data
 * and formats the rebate value accordingly. It supports percentage, per case, fixed,
 * and flat rebate types, and adjusts the format to include appropriate signs and units.
 *
 * @param {any} compliance - The compliance data containing rebate type and amounts.
 * @param {any} [programDetail] - Optional parameter providing additional program details
 *                                including rebate type, amount, and calculation method.
 *
 * @returns {string} - A formatted string representing the rebate amount or percentage.
 *                     Returns an empty string if the rebate type is invalid.
 */
export const formateRebate = (
  compliance: any,
  programDetail?: any,
  purchaseVolumn?: number,
  purchaseQuantity?: number
): string => {
  // Define valid rebate types
  const rebateTypes = [
    REBATE_TYPES.PERCENTAGE.toLowerCase(),
    REBATE_TYPES.PER_CASE.toLowerCase(),
    REBATE_TYPES.FIXED.toLowerCase(),
    REBATE_TYPES.FLAT.toLowerCase(),
    REBATE_TYPES.POINT.toLowerCase(),
    "per_category_item" // Add support for per_category_item
  ];

  let rebateType = programDetail?.rebate_type ?? compliance?.rebateType;
  const isRebateTypePerCase =
    programDetail?.rebate_calculation?.toLowerCase() !=
    REBATE_TYPES.FIXED?.toLowerCase()
      ? true
      : false;
  const rebateAmount = programDetail?.rebate_amount ?? compliance?.rebateAmount;
  const rebatePercentage =
    programDetail?.rebate_percentage ?? compliance?.rebatePercentage;

  if (
    isRebateTypePerCase &&
    rebateType?.toLowerCase() == REBATE_TYPES.FLAT.toLowerCase()
  ) {
    rebateType = REBATE_TYPES.PER_CASE.toLowerCase();
  }

  // Check if the rebateType is valid
  if (!rebateTypes.includes(rebateType)) {
    return ""; // Return an empty string if the rebate type is invalid
  }

  // Initialize value and sign based on rebate type
  let value: number;
  let sign: string;

  switch (rebateType) {
    case REBATE_TYPES.PERCENTAGE.toLowerCase():
    case REBATE_TYPES.POINT.toLowerCase():
      if (purchaseVolumn != undefined)
        return `$${((purchaseVolumn * (rebatePercentage ?? 0)) / 100).toFixed(2)}`;
      value = rebatePercentage ?? 0; // Use rebate percentage
      sign = "%"; // Set to percent sign
      return `${value}${sign}`; // Return as percentage

    case REBATE_TYPES.PER_CASE.toLowerCase():
      if (purchaseQuantity != undefined)
        return `$${purchaseQuantity * (rebateAmount ?? 0)}`;
      value = rebateAmount ?? 0; // Use rebate amount for per_case
      sign = "/case"; // Set to per case sign
      return `$${value}${sign}`; // Return as per case

    case REBATE_TYPES.FIXED.toLowerCase():
    case REBATE_TYPES.FLAT.toLowerCase():
    case "per_category_item":
      value = rebateAmount ?? 0; // Use rebate amount for fixed
      sign = "$"; // Set to dollar sign
      const withFixed = typeof value == "number" ? value?.toFixed(2) : value;

      return `${sign}${withFixed}`; // Return as fixed amount

    default:
      return ""; // Should never reach here due to previous check
  }
};

// Return Full name
export function getFullName(
  firstName: string = "",
  lastName: string = ""
): string {
  return `${firstName || ""} ${lastName || ""}`.trim();
}

// Helper function to generate dark colors (RGB values close to 0)
export function generateDarkColor() {
  const randomValue = () => randomNumber(10, 200); // Dark range (0-100)

  const r = randomValue();
  const g = randomValue();
  const b = randomValue();

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export const dateFormatter = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, "0");
  const month = new Intl.DateTimeFormat("en-GB", { month: "short" }).format(
    date
  );
  const year = date.getFullYear();

  return `${day} ${month}, ${year}`;
};

/**
 * Generates a query string based on the provided search parameters.
 * @param params Current search parameters as URLSearchParams.
 * @param additionalParams Additional parameters to include in the query string.
 * @returns The generated query string.
 */
export const generateQueryString = (
  params: URLSearchParams,
  additionalParams: Record<string, string | number | null | undefined>
): string => {
  const query = new URLSearchParams(params);

  // Add or update additional parameters
  Object.entries(additionalParams).forEach(([key, value]) => {
    if (value !== null && value !== undefined) {
      query.set(key, value.toString());
    } else {
      query.delete(key); // Remove the parameter if its value is null or undefined
    }
  });

  return query.toString();
};

/**
 * Convert MB to bytes by OS specification
 *
 * @param {Number} mb
 *
 * @return {Number}
 */
export const getMegaByteToByte = (mb: number) => {
  let system_bit = 1000 * 1000;

  if (navigator.userAgent.includes("Windows")) {
    system_bit = 1024 * 1024;
  }

  return mb * system_bit;
};

/**
 * Convert bytes to MB bytes by OS specification
 *
 * @param {Number} bytes
 *
 * @return {Number}
 */
export const getByteToMegaByte = (bytes: number) => {
  let mb = bytes / 1000 / 1000;

  if (navigator.userAgent.includes("Windows")) {
    mb = bytes / 1024 / 1024;
  }

  return Number(mb.toFixed(2));
};
export function convertExpiresInToMilliseconds(expiresIn: string) {
  if (!expiresIn) {
    return 1000 * 60 * 60;
  }

  const timePattern = /(\d+)([smhd])/;
  const match = expiresIn.match(timePattern);

  if (!match) {
    console.log("Invalid time format, defaulting to 1 hour.");
    return 1000 * 60 * 60;
  }

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case "s": // Seconds
      return value * 1000;
    case "m": // Minutes
      return value * 1000 * 60;
    case "h": // Hours
      return value * 1000 * 60 * 60;
    case "d": // Days
      return value * 1000 * 60 * 60 * 24;
    default:
      return 1000 * 60 * 60; // Default to 1 hour in milliseconds
  }
}

export const formatCompliancePercentage = (
  value: number | undefined | null,
  decimalPlaces: number = 1
): string => {
  if (value === null || value === undefined) return "0%";
  return `${value.toFixed(decimalPlaces)}%`;
};

/**
 * Returns a string that combines the product name and size
 * @param {string} name Product name
 * @param {string} [size] Product size
 * @param {string} [caseSkusId] Case Sku Id
 * @returns {string} A string that is the product name, or the product name concatenated with the product size and product case sku id
 */
export const getProductNameWithSizeAndCaseSku = (
  name: string,
  size: string | undefined,
  caseSkusId: string | undefined
) => {
  if (!name && !size && !caseSkusId) return "";
  if (!size && !caseSkusId) return name.trim();
  if (!caseSkusId) return `${name} - ${size}`.trim();
  if (!size) return `${name} (${caseSkusId})`.trim();
  return `${name} - ${size} (${caseSkusId})`.trim();
};

export const isTokenExpired = (token: string | null | undefined) => {
  if (!token) return true;
  // Verify the token (optionally you can decode it here)
  const decodedToken = JSON.parse(atob(token.split(".")[1]));
  return decodedToken.exp * 1000 < Date.now();
};

export const formatYAxisValueChart = (
  tickItem: number,
  currencySign: string = "",
  suffixVal: string = ""
) => {
  if (tickItem >= 1000000) {
    return `${currencySign}${(tickItem / 1000000).toFixed(1)}m`; // Convert values 1000 and above to "$k" format
  }
  if (tickItem >= 1000) {
    return `${currencySign}${(tickItem / 1000).toFixed(0)}k`; // Convert values 1000 and above to "$k" format
  }
  return `${currencySign}${tickItem}${suffixVal && tickItem > 0 ? suffixVal : ""}`; // Display values below 1000 as the actual value with "$"
};

export const toLowerOrEmpty = (value?: string): string => {
  return value ? value.toLowerCase() : "";
};

/**
 * Calculate the mean of an array of numbers.
 *
 * @param {number[]} numbers - The array of numbers to calculate the mean of
 * @returns {number} The mean of the array of numbers
 */
export const calculateMean = (numbers: number[]): number => {
  const total = numbers.reduce((sum, num) => sum + num, 0);
  return Number((total / numbers.length).toFixed(1));
};

/**
 * Calculate the median of an array of numbers.
 *
 * @param {number[]} numbers - The array of numbers to calculate the median of
 * @returns {number} The median of the array of numbers
 * @description
 * If the array has an even number of elements, the median is the average of the two middle numbers.
 * If the array has an odd number of elements, the median is the middle number.
 */
export const calculateMedian = (numbers: number[]): number => {
  const sortedNumbers = [...numbers].sort((a, b) => a - b); // Sort the numbers
  const n = sortedNumbers.length;

  let median = 0;
  if (n % 2 === 0) {
    // If even, average of the two middle numbers
    const mid1 = sortedNumbers[n / 2 - 1];
    const mid2 = sortedNumbers[n / 2];
    median = (mid1 + mid2) / 2;
  } else {
    // If odd, median isthe middle number
    median = sortedNumbers[Math.floor(n / 2)];
  }

  return Number(median.toFixed(1));
};

export const formatDateToDayMonthYear = (dateInput: Date | string) => {
  const date = new Date(dateInput);
  const day = String(date.getDate()).padStart(2, "0");

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec"
  ];
  const month = monthNames[date.getMonth()];

  const year = date.getFullYear();

  return `${month} ${day}, ${year}`;
};

export const isListPriceApplicable = (rebateCalculationType: string) => {
  return rebateCalculationType?.toLowerCase() === "list_value";
};

export const isWarehouseFeatureEnabled = (distributorId?: number): boolean => {
  if (!distributorId) return false;
  const enabledIds = parseDistributorIdCsv(SHOW_WAREHOUSES_FOR_DISTRIBUTOR_IDS);
  return enabledIds.includes(distributorId);
};

export const isQuantitySelectionEnabled = (distributorId?: number): boolean => {
  if (!distributorId) return false;
  const enabledIds = parseDistributorIdCsv(
    HIDE_ORDER_UNIT_TYPE_FOR_DISTRIBUTOR_IDS
  );
  return enabledIds.includes(distributorId);
};

export const isOrderAndCartFeatureEnabled = (
  distributorId?: number | null
): boolean => {
  if (!distributorId) return false;
  const enabledIds = parseDistributorIdCsv(
    ORDER_FUNCTIONALITY_ENABLED_FOR_DISTRIBUTOR_IDS
  );
  return enabledIds.includes(distributorId);
};

export function getProgramTimelineQueryParam(programTimeline?: string): string {
  if (!SHOW_PROGRAM_ON_TIMELINE_BASE) return "";

  const validTimelines = [
    PROGRAM_TIMELINE.CURRENT,
    PROGRAM_TIMELINE.UPCOMING,
    PROGRAM_TIMELINE.HISTORICAL
  ];

  const normalized = programTimeline?.toLowerCase();
  const isValid = validTimelines.some((t) => t.toLowerCase() === normalized);

  return isValid ? programTimeline! : PROGRAM_TIMELINE.CURRENT;
}

export const parseDistributorIdCsv = (csv?: string | null): number[] => {
  if (!csv) return [];
  return csv
    .split(",")
    .map((id) => parseInt(id.trim()))
    .filter((n) => !isNaN(n));
};

export const isDistributorFeatureEnabled = (
  distributorId?: number | null,
  enabledIdsCsv?: string | null
): boolean => {
  if (!distributorId) return false;
  const enabledIds = parseDistributorIdCsv(enabledIdsCsv);
  return enabledIds.includes(distributorId);
};

export const parseManufacturerIdCsv = (csv?: string | null): number[] => {
  if (!csv) return [];
  return csv
    .split(",")
    .map((id) => parseInt(id.trim()))
    .filter((n) => !isNaN(n));
};

export const isManufacturerFeatureEnabled = (
  manufacturerId?: number | null,
  enabledIdsCsv?: string | null
): boolean => {
  if (!manufacturerId) return false;
  const enabledIds = parseManufacturerIdCsv(enabledIdsCsv);
  return enabledIds.includes(manufacturerId);
};

/**
 * Given a base URL, a key and an optional value, appends the key-value pair
 * as a query parameter to the base URL and returns the modified URL.
 *
 * @param {string} base - The base URL to modify.
 * @param {string} key - The key to add to the query string.
 * @param {string} [value] - The value to add to the query string for the key.
 * @returns {string} The modified URL with the query parameter.
 */
export const getUrlWithQueryParam = (
  base: string,
  key: string,
  value?: string
) => {
  const url = new URL(base, "http://dummy-base"); // dummy base is required for parsing relative URLs
  if (value) {
    url.searchParams.set(key, value);
  }
  return url.pathname + url.search;
};

export const getRangeFromCommaString = (value: string | undefined): string => {
  if (!value) return "";

  const numbers = value
    .split(",")
    .map((n) => parseFloat(n.trim()))
    .filter((n) => !isNaN(n));

  if (numbers.length === 0) return "";

  const min = Math.min(...numbers);
  const max = Math.max(...numbers);

  return min === max ? `$${min}` : `$${min} - $${max}`;
};

export const getGrowthPercent = (prev: number, curr: number) => {
  if (!prev || prev === 0) return curr > 0 ? 100 : 0; // avoid divide by 0
  return ((curr - prev) / prev) * 100;
};

/**
 * Converts a decimal number to Roman numeral
 * @param num - The number to convert (1-3999)
 * @returns The Roman numeral representation of the number
 */
export function convertNumberToRoman(num: number | null | undefined): string {
  if (!num || num <= 0 || num > 3999) {
    return "";
  }

  const romanNumerals: Array<{ value: number; numeral: string }> = [
    { value: 1000, numeral: "M" },
    { value: 900, numeral: "CM" },
    { value: 500, numeral: "D" },
    { value: 400, numeral: "CD" },
    { value: 100, numeral: "C" },
    { value: 90, numeral: "XC" },
    { value: 50, numeral: "L" },
    { value: 40, numeral: "XL" },
    { value: 10, numeral: "X" },
    { value: 9, numeral: "IX" },
    { value: 5, numeral: "V" },
    { value: 4, numeral: "IV" },
    { value: 1, numeral: "I" }
  ];

  let result = "";
  let remaining = num;

  for (const { value, numeral } of romanNumerals) {
    const count = Math.floor(remaining / value);
    if (count > 0) {
      result += numeral.repeat(count);
      remaining -= value * count;
    }
  }

  return result;
}
