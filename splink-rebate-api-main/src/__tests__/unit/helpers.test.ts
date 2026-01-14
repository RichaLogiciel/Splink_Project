import csv from "csv-parser";
import fs from "fs";
import {
  buildGrowthData,
  calculateMetrics,
  calculateRelativeShare,
  calculateYOYGrowth,
  createRateLimitConfig,
  filterResultsByProducts,
  generateRandomString,
  getDateMinusDays,
  getExpiresAtTime,
  getHashedPassword,
  getPreviousYearDate,
  getRandomCityState,
  getStartAndEndDateByTerm,
  getTopProducts,
  mapProductColors,
  readCsvFile,
  sortPrograms,
  validateEmail
} from "../../utils/helpers";

// Mock fs and csv-parser
jest.mock("fs");
jest.mock("csv-parser");
jest.mock("bcrypt", () => ({
  genSalt: jest.fn().mockResolvedValue("$2b$10$testSalt"),
  hash: jest.fn().mockResolvedValue("$2b$10$testSalt$hashedPassword")
}));

describe("Helper Functions", () => {
  describe("createRateLimitConfig", () => {
    it("should create rate limit config with correct values", () => {
      const config = createRateLimitConfig(5, 100);
      expect(config).toEqual({
        windowMs: 300000, // 5 minutes in milliseconds
        max: 100,
        message:
          "Too many requests from this IP, please try again after 5 minutes"
      });
    });
  });

  describe("validateEmail", () => {
    it("should validate correct email addresses", () => {
      expect(validateEmail("test@example.com")).toBe(true);
      expect(validateEmail("user.name@domain.co.uk")).toBe(true);
    });

    it("should reject invalid email addresses", () => {
      expect(validateEmail("invalid-email")).toBe(false);
      expect(validateEmail("test@")).toBe(false);
      expect(validateEmail("@domain.com")).toBe(false);
    });
  });

  describe("getHashedPassword", () => {
    it("should hash password correctly", async () => {
      const password = "testPassword123";
      const hashedPassword = await getHashedPassword(password);
      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toMatch(/^\$2[aby]\$\d+\$/);
    });
  });

  describe("readCsvFile", () => {
    afterEach(() => {
      jest.clearAllMocks(); // Reset mocks after each test
    });

    it("should read CSV file correctly", async () => {
      type CsvRow = { id: number; name: string };
      const mockData: CsvRow[] = [{ id: 1, name: "Test" }];

      // Simulate a readable stream
      const mockStream = {
        pipe: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation(function (
          this: any,
          event: string,
          callback: (data?: CsvRow) => void
        ) {
          if (event === "data") callback(mockData[0]);
          if (event === "end") callback();
          return this;
        })
      };

      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);
      (csv as jest.Mock).mockReturnValue(mockStream);

      const result = await readCsvFile<CsvRow>("test.csv");

      expect(result).toEqual(mockData);
      expect(fs.createReadStream).toHaveBeenCalledWith("test.csv");
      expect(csv).toHaveBeenCalled();
    });

    it("should return an empty array when the CSV file is empty", async () => {
      const mockStream = {
        pipe: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation(function (
          this: any,
          event: string,
          callback: () => void
        ) {
          if (event === "end") callback();
          return this;
        })
      };

      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);
      (csv as jest.Mock).mockReturnValue(mockStream);

      const result = await readCsvFile<Record<string, unknown>>("empty.csv");

      expect(result).toEqual([]); // Should return an empty array
    });

    it("should handle file read errors", async () => {
      const error = new Error("File not found");

      (fs.createReadStream as jest.Mock).mockImplementation(() => {
        throw error;
      });

      await expect(readCsvFile("missing.csv")).rejects.toThrow(
        "File not found"
      );
    });

    it("should handle CSV parsing errors", async () => {
      const mockStream = {
        pipe: jest.fn().mockReturnThis(),
        on: jest.fn().mockImplementation(function (
          this: any,
          event: string,
          callback: (error?: Error) => void
        ) {
          if (event === "error") callback(new Error("Parsing error"));
          return this;
        })
      };

      (fs.createReadStream as jest.Mock).mockReturnValue(mockStream);
      (csv as jest.Mock).mockReturnValue(mockStream);

      await expect(readCsvFile("corrupted.csv")).rejects.toThrow(
        "Parsing error"
      );
    });
  });

  describe("getRandomCityState", () => {
    it("should return a valid city and state pair", () => {
      const result = getRandomCityState();
      expect(result).toHaveProperty("city");
      expect(result).toHaveProperty("state");
      expect(typeof result.city).toBe("string");
      expect(typeof result.state).toBe("string");
    });
  });

  describe("getExpiresAtTime", () => {
    it("should return correct expiration time", () => {
      const now = new Date();
      const expiresAt = getExpiresAtTime(3600); // 1 hour
      expect(expiresAt.getTime()).toBeGreaterThan(now.getTime());
      expect(expiresAt.getTime() - now.getTime()).toBeCloseTo(3600000, -2); // 1 hour in milliseconds
    });
  });

  describe("sortPrograms", () => {
    it("should sort program details by tier", () => {
      const programs = [
        {
          programDetails: [
            { tier: 2, name: "Tier 2" },
            { tier: 1, name: "Tier 1" },
            { tier: 3, name: "Tier 3" }
          ]
        }
      ];
      sortPrograms(programs, true);
      expect(programs[0].programDetails).toEqual([
        { tier: 1, name: "Tier 1" },
        { tier: 2, name: "Tier 2" },
        { tier: 3, name: "Tier 3" }
      ]);
    });
  });

  describe("generateRandomString", () => {
    it("should generate string of specified length", () => {
      const length = 15;
      const result = generateRandomString(length);
      expect(result.length).toBe(length);
      expect(result).toMatch(/^[A-Za-z0-9]+$/);
    });
  });

  describe("getDateMinusDays", () => {
    it("should return date minus specified days", () => {
      const result = getDateMinusDays(5);
      expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
  });

  describe("getStartAndEndDateByTerm", () => {
    it("should return correct dates for term", () => {
      const result = getStartAndEndDateByTerm("ANNUAL");
      expect(result).toHaveProperty("startDate");
      expect(result).toHaveProperty("endDate");
    });
  });

  describe("mapProductColors", () => {
    it("should map product IDs to colors", () => {
      const result = mapProductColors([1, 2, 3]);
      expect(result).toHaveProperty("1");
      expect(result).toHaveProperty("2");
      expect(result).toHaveProperty("3");
    });
  });

  describe("filterResultsByProducts", () => {
    it("should filter results by product IDs", () => {
      const results = [
        { product_id: 1, value: 100 },
        { product_id: 2, value: 200 },
        { product_id: 3, value: 300 }
      ];
      const filtered = filterResultsByProducts(results, [1, 2]);
      expect(filtered).toHaveLength(2);
      expect(filtered).toEqual([
        { product_id: 1, value: 100 },
        { product_id: 2, value: 200 }
      ]);
    });
  });

  describe("calculateMetrics", () => {
    it("should calculate metrics correctly", () => {
      const results = [
        { sales: 100, total_units: 10 },
        { sales: 200, total_units: 20 },
        { sales: 300, total_units: 30 }
      ];
      const metrics = calculateMetrics(results);
      expect(metrics).toHaveProperty("totalSales");
      expect(metrics).toHaveProperty("units");
      expect(metrics).toHaveProperty("activeStores");
    });
  });

  describe("calculateRelativeShare", () => {
    it("should calculate relative share correctly", () => {
      const filtered = { totalSales: 50, units: 10, activeStores: 5 };
      const overall = { totalSales: 100, units: 20, activeStores: 10 };
      const share = calculateRelativeShare(filtered, overall, 10);
      expect(share).toEqual({
        activeStores: 50,
        totalSales: 50,
        units: 50
      });
    });
  });

  describe("getTopProducts", () => {
    it("should return top products sorted by value", () => {
      const filteredResults = [
        { productId: 1, sales: 100 },
        { productId: 2, sales: 200 },
        { productId: 3, sales: 300 }
      ];
      const selectedProductIds = [1, 2, 3];
      const productColorMap = { 1: "#ff0000", 2: "#00ff00", 3: "#0000ff" };
      const topProducts = getTopProducts(
        filteredResults,
        selectedProductIds,
        productColorMap,
        true,
        2
      );
      expect(topProducts).toHaveLength(2);
      expect(topProducts[0].sales as number).toBeGreaterThan(
        topProducts[1].sales as number
      );
    });
  });

  describe("calculateYOYGrowth", () => {
    it("should calculate year-over-year growth correctly", () => {
      expect(calculateYOYGrowth(100, 80)).toBe(25); // 25% growth
      expect(calculateYOYGrowth(80, 100)).toBe(-20); // -20% growth
      expect(calculateYOYGrowth(0, 0)).toBe(undefined); // 0% growth
      expect(calculateYOYGrowth(0, 10)).toBe(undefined); // -100% growth
      expect(calculateYOYGrowth(10, 0)).toBe(100); // 100% growth
    });
  });

  describe("getPreviousYearDate", () => {
    it("should return date from previous year", () => {
      const date = new Date("2024-03-20");
      const result = getPreviousYearDate(date);
      expect(result.getFullYear()).toBe(2023);
    });
  });

  describe("buildGrowthData", () => {
    it("should build growth data correctly", () => {
      const prevData = [
        {
          groupingKey: "bar",
          sales_1: 100,
          color_1: "#ff0000"
        }
      ];
      const currData = [
        {
          groupingKey: "bar",
          sales_1: 120,
          color_1: "#ff0000"
        }
      ];

      const result = buildGrowthData(prevData, currData);
      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty("date");
      expect(result[0]).toHaveProperty(
        `sales_${new Date().getFullYear() - 1}_1`
      );
      expect(result[0]).toHaveProperty(`sales_${new Date().getFullYear()}_1`);
    });
  });
});
