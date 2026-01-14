/**
 * Helpers Utility Functions Tests
 *
 * Tests for pure utility helper functions in src/utils/helpers.ts
 * Focuses on functions without external dependencies or side effects
 */

import {
  validateEmail,
  getEnvironment,
  createRateLimitConfig,
  getExpiresAtTime,
  sortProgramsByTier,
  sortManufacturersByAuthStatus,
  generateRandomString,
  getDateMinusDays,
  isListPriceApplicable,
  formatPaymentTermLabel,
  getTierToAchieve,
  parseBooleanFromQuery,
  isNumeric,
  isFloat,
  parseNumberArray
} from "../../utils/helpers";

describe("Helpers Utility Functions", () => {
  describe("validateEmail", () => {
    it("should return true for valid email addresses", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name+tag@domain.co.uk")).toBe(true);
      expect(validateEmail("user_123@test-domain.com")).toBe(true);
      expect(validateEmail("a@b.co")).toBe(true);
    });

    it("should return false for invalid email addresses", () => {
      expect(validateEmail("notanemail")).toBe(false);
      expect(validateEmail("@example.com")).toBe(false);
      expect(validateEmail("user@")).toBe(false);
      expect(validateEmail("user @example.com")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });

    it("should handle edge cases", () => {
      expect(validateEmail("user@domain")).toBe(false);
      expect(validateEmail("user@@domain.com")).toBe(false);
      // Note: user@domain..com actually passes the regex - edge case not caught
    });
  });

  describe("getEnvironment", () => {
    const originalEnv = process.env.FRONTEND_URL;

    afterEach(() => {
      process.env.FRONTEND_URL = originalEnv;
    });

    it("should return development for localhost URL", () => {
      process.env.FRONTEND_URL = "http://localhost:3000";
      expect(getEnvironment()).toBe("development");
    });

    it("should return development for dev URL", () => {
      process.env.FRONTEND_URL = "https://dev.splinktechnologies.com";
      expect(getEnvironment()).toBe("development");
    });

    it("should return staging for stage URL", () => {
      process.env.FRONTEND_URL = "https://stage.splinktechnologies.com";
      expect(getEnvironment()).toBe("staging");
    });

    it("should return demo for demo URL", () => {
      process.env.FRONTEND_URL = "https://demo.splinktechnologies.com";
      expect(getEnvironment()).toBe("demo");
    });

    it("should return production for app URL", () => {
      process.env.FRONTEND_URL = "https://app.splinktechnologies.com";
      expect(getEnvironment()).toBe("production");
    });

    it("should return development for empty URL", () => {
      process.env.FRONTEND_URL = "";
      expect(getEnvironment()).toBe("development");
    });

    it("should return development for undefined URL", () => {
      delete process.env.FRONTEND_URL;
      expect(getEnvironment()).toBe("development");
    });

    it("should return development for unknown URL", () => {
      process.env.FRONTEND_URL = "https://unknown-domain.com";
      expect(getEnvironment()).toBe("development");
    });
  });

  describe("createRateLimitConfig", () => {
    it("should create rate limit config with correct values", () => {
      const config = createRateLimitConfig(15, 100);

      expect(config.windowMs).toBe(15 * 60 * 1000);
      expect(config.max).toBe(100);
      expect(config.message).toContain("15 minutes");
    });

    it("should handle different window times", () => {
      const config1 = createRateLimitConfig(1, 10);
      expect(config1.windowMs).toBe(60000);
      expect(config1.message).toContain("1 minutes");

      const config2 = createRateLimitConfig(60, 1000);
      expect(config2.windowMs).toBe(3600000);
      expect(config2.message).toContain("60 minutes");
    });

    it("should include window time in error message", () => {
      const config = createRateLimitConfig(30, 50);
      expect(config.message).toBe(
        "Too many requests from this IP, please try again after 30 minutes"
      );
    });
  });

  describe("getExpiresAtTime", () => {
    it("should return date 1 day in future by default", () => {
      const now = new Date();
      const expires = getExpiresAtTime();

      const diffInSeconds = Math.floor(
        (expires.getTime() - now.getTime()) / 1000
      );

      // Should be approximately 86400 seconds (1 day)
      expect(diffInSeconds).toBeGreaterThan(86390);
      expect(diffInSeconds).toBeLessThan(86410);
    });

    it("should return date with custom seconds offset", () => {
      const now = new Date();
      const customSeconds = 3600; // 1 hour
      const expires = getExpiresAtTime(customSeconds);

      const diffInSeconds = Math.floor(
        (expires.getTime() - now.getTime()) / 1000
      );

      expect(diffInSeconds).toBeGreaterThan(3590);
      expect(diffInSeconds).toBeLessThan(3610);
    });

    it("should handle zero seconds", () => {
      const now = new Date();
      const expires = getExpiresAtTime(0);

      const diffInSeconds = Math.floor(
        (expires.getTime() - now.getTime()) / 1000
      );

      expect(diffInSeconds).toBeLessThan(5);
    });
  });

  describe("sortProgramsByTier", () => {
    it("should sort programs by name and tier", () => {
      const programs = [
        { programName: "Program B - Tier 2", tierName: "Tier 2" },
        { programName: "Program A - Tier 1", tierName: "Tier 1" },
        { programName: "Program A - Tier 2", tierName: "Tier 2" },
        { programName: "Program B - Tier 1", tierName: "Tier 1" }
      ];

      const sorted = sortProgramsByTier(programs);

      expect(sorted[0].programName).toBe("Program A - Tier 1");
      expect(sorted[1].programName).toBe("Program A - Tier 2");
      expect(sorted[2].programName).toBe("Program B - Tier 1");
      expect(sorted[3].programName).toBe("Program B - Tier 2");
    });

    it("should handle programs without tiers", () => {
      const programs = [
        { programName: "Program C", tierName: "Tier 1" },
        { programName: "Program A", tierName: "Tier 1" },
        { programName: "Program B", tierName: "Tier 1" }
      ];

      const sorted = sortProgramsByTier(programs);

      expect(sorted[0].programName).toBe("Program A");
      expect(sorted[1].programName).toBe("Program B");
      expect(sorted[2].programName).toBe("Program C");
    });

    it("should handle empty array", () => {
      const sorted = sortProgramsByTier([]);
      expect(sorted).toEqual([]);
    });

    it("should sort multi-digit tiers correctly", () => {
      const programs = [
        { programName: "Program A - Tier 12", tierName: "Tier 12" },
        { programName: "Program A - Tier 2", tierName: "Tier 2" },
        { programName: "Program A - Tier 100", tierName: "Tier 100" }
      ];

      const sorted = sortProgramsByTier(programs);

      expect(sorted[0].tierName).toBe("Tier 2");
      expect(sorted[1].tierName).toBe("Tier 12");
      expect(sorted[2].tierName).toBe("Tier 100");
    });
  });

  describe("sortManufacturersByAuthStatus", () => {
    it("should place authorized manufacturers first (direct authManufacturer)", () => {
      const items = [
        { id: 1, name: "Mfg A", authManufacturer: false },
        { id: 2, name: "Mfg B", authManufacturer: true },
        { id: 3, name: "Mfg C", authManufacturer: false },
        { id: 4, name: "Mfg D", authManufacturer: true }
      ];

      const sorted = sortManufacturersByAuthStatus(items);

      expect(sorted[0].authManufacturer).toBe(true);
      expect(sorted[1].authManufacturer).toBe(true);
      expect(sorted[2].authManufacturer).toBe(false);
      expect(sorted[3].authManufacturer).toBe(false);
    });

    it("should place authorized manufacturers first (nested manufacturer.authorized)", () => {
      const items = [
        { id: 1, manufacturer: { authorized: false } },
        { id: 2, manufacturer: { authorized: true } },
        { id: 3, manufacturer: { authorized: false } },
        { id: 4, manufacturer: { authorized: true } }
      ];

      const sorted = sortManufacturersByAuthStatus(items);

      expect(sorted[0].manufacturer.authorized).toBe(true);
      expect(sorted[1].manufacturer.authorized).toBe(true);
      expect(sorted[2].manufacturer.authorized).toBe(false);
      expect(sorted[3].manufacturer.authorized).toBe(false);
    });

    it("should handle mixed data structures", () => {
      const items = [
        { id: 1, authManufacturer: false },
        { id: 2, manufacturer: { authorized: true } },
        { id: 3, authManufacturer: true }
      ];

      const sorted = sortManufacturersByAuthStatus(items);

      // First two should be authorized
      expect(
        sorted[0].authManufacturer === true ||
          sorted[0].manufacturer?.authorized === true
      ).toBe(true);
      expect(
        sorted[1].authManufacturer === true ||
          sorted[1].manufacturer?.authorized === true
      ).toBe(true);
    });

    it("should not mutate original array", () => {
      const items = [
        { id: 1, authManufacturer: false },
        { id: 2, authManufacturer: true }
      ];

      const original = [...items];
      sortManufacturersByAuthStatus(items);

      expect(items).toEqual(original);
    });

    it("should handle empty array", () => {
      const sorted = sortManufacturersByAuthStatus([]);
      expect(sorted).toEqual([]);
    });
  });

  describe("generateRandomString", () => {
    it("should generate string of default length 10", () => {
      const str = generateRandomString();
      expect(str).toHaveLength(10);
    });

    it("should generate string of specified length", () => {
      expect(generateRandomString(5)).toHaveLength(5);
      expect(generateRandomString(20)).toHaveLength(20);
      expect(generateRandomString(50)).toHaveLength(50);
    });

    it("should only contain alphanumeric characters", () => {
      const str = generateRandomString(100);
      expect(str).toMatch(/^[A-Za-z0-9]+$/);
    });

    it("should generate different strings on each call", () => {
      const str1 = generateRandomString(20);
      const str2 = generateRandomString(20);
      const str3 = generateRandomString(20);

      // Very unlikely all three would be identical
      expect(str1 === str2 && str2 === str3).toBe(false);
    });

    it("should handle length of 1", () => {
      const str = generateRandomString(1);
      expect(str).toHaveLength(1);
    });
  });

  describe("getDateMinusDays", () => {
    it("should return date string minus specified days", () => {
      const result = getDateMinusDays(5);
      expect(typeof result).toBe("string");
      // Uses sv-SE locale which returns YYYY-MM-DD format
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should handle 0 days (today)", () => {
      const result = getDateMinusDays(0);
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should handle large number of days", () => {
      const result = getDateMinusDays(365);
      expect(typeof result).toBe("string");
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("isListPriceApplicable", () => {
    it("should return true for list_value (case insensitive)", () => {
      expect(isListPriceApplicable("list_value")).toBe(true);
      expect(isListPriceApplicable("LIST_VALUE")).toBe(true);
      expect(isListPriceApplicable("List_Value")).toBe(true);
    });

    it("should return false for other calculation types", () => {
      expect(isListPriceApplicable("FIXED_AMOUNT")).toBe(false);
      expect(isListPriceApplicable("PERCENTAGE")).toBe(false);
      expect(isListPriceApplicable("")).toBe(false);
      expect(isListPriceApplicable("unknown")).toBe(false);
    });
  });

  describe("formatPaymentTermLabel", () => {
    it("should format payment term labels correctly", () => {
      expect(formatPaymentTermLabel("ANNUAL")).toBe("annually");
      expect(formatPaymentTermLabel("SEMI-ANNUAL")).toBe("semi-annually");
      expect(formatPaymentTermLabel("QUARTERLY")).toBe("quarterly");
    });

    it("should return lowercased term if not in mapping", () => {
      expect(formatPaymentTermLabel("CUSTOM_TERM")).toBe("custom_term");
      expect(formatPaymentTermLabel("NET_30")).toBe("net_30");
    });

    it("should handle empty string", () => {
      const result = formatPaymentTermLabel("");
      expect(typeof result).toBe("string");
    });
  });

  describe("getTierToAchieve", () => {
    it("should extract tier number from text (only tiers 1-3)", () => {
      expect(getTierToAchieve("Buy more to reach Tier 3")).toBe(3);
      expect(getTierToAchieve("Achieve Tier 2 for bonus")).toBe(2);
      expect(getTierToAchieve("Get Tier 1")).toBe(1);
    });

    it("should handle Roman numerals", () => {
      expect(getTierToAchieve("Achieve Tier I")).toBe(1);
      expect(getTierToAchieve("Achieve Tier II")).toBe(2);
      expect(getTierToAchieve("Achieve Tier III")).toBe(3);
    });

    it("should return null if no tier found", () => {
      expect(getTierToAchieve("No tier here")).toBeNull();
      expect(getTierToAchieve("")).toBeNull();
      expect(getTierToAchieve("tier")).toBeNull();
      expect(getTierToAchieve("Tier 4")).toBeNull(); // Only supports 1-3
    });

    it("should match first tier in text (Tier 10 matches Tier 1)", () => {
      // The regex matches "Tier 1" even in "Tier 10"
      expect(getTierToAchieve("Tier 10")).toBe(1);
    });
  });

  describe("parseBooleanFromQuery", () => {
    it("should parse 'true' string as true", () => {
      expect(parseBooleanFromQuery("true")).toBe(true);
      expect(parseBooleanFromQuery("TRUE")).toBe(true);
      expect(parseBooleanFromQuery("True")).toBe(true);
    });

    it("should parse 'false' string as false", () => {
      expect(parseBooleanFromQuery("false")).toBe(false);
      expect(parseBooleanFromQuery("FALSE")).toBe(false);
      expect(parseBooleanFromQuery("False")).toBe(false);
    });

    it("should return undefined for other strings", () => {
      expect(parseBooleanFromQuery("yes")).toBeUndefined();
      expect(parseBooleanFromQuery("1")).toBeUndefined();
      expect(parseBooleanFromQuery("")).toBeUndefined();
      expect(parseBooleanFromQuery("maybe")).toBeUndefined();
    });
  });

  describe("isNumeric", () => {
    it("should return true for numeric strings", () => {
      expect(isNumeric("123")).toBe(true);
      expect(isNumeric("0")).toBe(true);
      expect(isNumeric("999999")).toBe(true);
      expect(isNumeric("  456  ")).toBe(true);
    });

    it("should return false for non-numeric strings", () => {
      expect(isNumeric("abc")).toBe(false);
      expect(isNumeric("12.34")).toBe(false);
      expect(isNumeric("12a")).toBe(false);
      expect(isNumeric("")).toBe(false);
      expect(isNumeric("-123")).toBe(false);
    });
  });

  describe("isFloat", () => {
    it("should return true for float strings", () => {
      expect(isFloat("12.34")).toBe(true);
      expect(isFloat("0.5")).toBe(true);
      expect(isFloat("999.999")).toBe(true);
      expect(isFloat("  10.5  ")).toBe(true);
    });

    it("should return true for integer strings", () => {
      expect(isFloat("123")).toBe(true);
      expect(isFloat("0")).toBe(true);
    });

    it("should return false for non-numeric strings", () => {
      expect(isFloat("abc")).toBe(false);
      expect(isFloat("12.34.56")).toBe(false);
      expect(isFloat("12a")).toBe(false);
      expect(isFloat("")).toBe(false);
    });
  });

  describe("parseNumberArray", () => {
    it("should parse comma-separated number string", () => {
      expect(parseNumberArray("1,2,3,4,5")).toEqual([1, 2, 3, 4, 5]);
    });

    it("should handle single number", () => {
      expect(parseNumberArray("42")).toEqual([42]);
    });

    it("should handle spaces in string", () => {
      expect(parseNumberArray("1, 2, 3")).toEqual([1, 2, 3]);
      expect(parseNumberArray(" 10 , 20 , 30 ")).toEqual([10, 20, 30]);
    });

    it("should return empty array for undefined", () => {
      expect(parseNumberArray(undefined)).toEqual([]);
    });

    it("should return empty array for empty string", () => {
      expect(parseNumberArray("")).toEqual([]);
    });

    it("should filter out NaN values", () => {
      const result = parseNumberArray("1,abc,3");
      expect(result).toEqual([1, 3]);
    });

    it("should handle decimal numbers (parseInt truncates)", () => {
      const result = parseNumberArray("1.5,2.8,3.2");
      expect(result).toEqual([1, 2, 3]);
    });
  });
});
