/**
 * DistributorAdminService Unit Tests
 *
 * Tests for DistributorAdminService covering product management,
 * caching, filtering, and validation logic
 */

// Mock dependencies before imports
jest.mock("../../repositories/DistributorAdminRepository");
jest.mock("../../utils/redis");
jest.mock("newrelic");

// Mock app constants to enable caching in tests
jest.mock("../../config/appConstants", () => ({
  ...jest.requireActual("../../config/appConstants"),
  useApiCaching: true,
  CACHE_TTL_TIME: 300
}));

import { ApiError } from "../../lib/errors/APIError";
import DistributorAdminRepository from "../../repositories/DistributorAdminRepository";
import DistributorAdminService from "../../services/DistributorAdminService";
import { redisClient } from "../../utils/redis";

// Mock Redis client
const mockRedisClient = {
  get: jest.fn(),
  setEx: jest.fn()
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
(redisClient as any) = mockRedisClient;

describe("DistributorAdminService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock redis functions to resolve successfully by default
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.setEx.mockResolvedValue("OK");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getProducts", () => {
    it("should return formatted products with pagination", async () => {
      // Arrange
      const mockProducts = [
        {
          id: 1,
          manufacturer_id: 10,
          category_id: 5,
          skus_id: "SKU-001",
          name: "Product 1",
          brand: "Brand A",
          price: 99.99
        },
        {
          id: 2,
          manufacturer_id: 11,
          category_id: 6,
          skus_id: "SKU-002",
          name: "Product 2",
          brand: "Brand B",
          price: 149.99
        }
      ];

      const mockMetadata = {
        total: 100,
        page: 1,
        limit: 10,
        totalPages: 10,
        hasNext: true,
        hasPrevious: false
      };

      (
        DistributorAdminRepository.getAllProducts as jest.Mock
      ).mockResolvedValue({
        data: mockProducts,
        metadata: mockMetadata
      });

      // Act
      const result = await DistributorAdminService.getProducts({
        page: 1,
        limit: 10
      });

      // Assert
      expect(result.products).toHaveLength(2);
      expect(result.products[0].id).toBe(1);
      expect(result.products[0].manufacturerId).toBe(10);
      expect(result.products[0].price).toBe(99.99);
      expect(result.pagination).toEqual(mockMetadata);
    });

    it("should return cached results when available", async () => {
      // Arrange
      const cachedData = {
        products: [{ id: 1, name: "Cached Product" }],
        pagination: { total: 1, page: 1, limit: 10 }
      };

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedData));

      // Act
      const result = await DistributorAdminService.getProducts();

      // Assert
      expect(result).toEqual(cachedData);
      expect(DistributorAdminRepository.getAllProducts).not.toHaveBeenCalled();
    });

    it("should cache results after fetching from database", async () => {
      // Arrange
      const mockResponse = {
        data: [],
        metadata: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false
        }
      };

      (
        DistributorAdminRepository.getAllProducts as jest.Mock
      ).mockResolvedValue(mockResponse);

      // Act
      await DistributorAdminService.getProducts();

      // Assert
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it("should include schema when requested", async () => {
      // Arrange
      const mockSchema = [{ field: "id", type: "number" }];
      const mockResponse = {
        data: [],
        metadata: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false
        }
      };

      (
        DistributorAdminRepository.getAllProducts as jest.Mock
      ).mockResolvedValue(mockResponse);
      (
        DistributorAdminRepository.getProductsMetadata as jest.Mock
      ).mockResolvedValue(mockSchema);

      // Act
      const result = await DistributorAdminService.getProducts({
        includeSchema: true
      });

      // Assert
      expect(result.schema).toEqual(mockSchema);
      expect(DistributorAdminRepository.getProductsMetadata).toHaveBeenCalled();
    });

    it("should normalize options correctly", async () => {
      // Arrange
      const mockResponse = {
        data: [],
        metadata: {
          total: 0,
          page: 1,
          limit: 10,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false
        }
      };

      (
        DistributorAdminRepository.getAllProducts as jest.Mock
      ).mockResolvedValue(mockResponse);

      // Act
      await DistributorAdminService.getProducts({
        page: 2,
        limit: 50,
        sortBy: "name",
        sortOrder: "DESC",
        manufacturerId: 123,
        search: "  test product  "
      });

      // Assert
      expect(DistributorAdminRepository.getAllProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 50, // (page 2 - 1) * 50
          sortBy: "name",
          sortOrder: "DESC",
          manufacturerId: 123,
          search: "test product" // trimmed
        })
      );
    });

    it("should enforce maximum limit of 1000", async () => {
      // Arrange
      const mockResponse = {
        data: [],
        metadata: {
          total: 0,
          page: 1,
          limit: 1000,
          totalPages: 0,
          hasNext: false,
          hasPrevious: false
        }
      };

      (
        DistributorAdminRepository.getAllProducts as jest.Mock
      ).mockResolvedValue(mockResponse);

      // Act
      await DistributorAdminService.getProducts({ limit: 5000 });

      // Assert
      expect(DistributorAdminRepository.getAllProducts).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 1000
        })
      );
    });

    it("should handle errors gracefully", async () => {
      // Arrange
      (
        DistributorAdminRepository.getAllProducts as jest.Mock
      ).mockRejectedValue(new Error("Database error"));

      // Act & Assert
      await expect(DistributorAdminService.getProducts()).rejects.toThrow(
        ApiError
      );
      await expect(DistributorAdminService.getProducts()).rejects.toThrow(
        "Failed to retrieve products data"
      );
    });
  });

  describe("getProductsSchema", () => {
    it("should return product schema", async () => {
      // Arrange
      const mockSchema = [
        { field: "id", type: "number", required: true },
        { field: "name", type: "string", required: true }
      ];

      (
        DistributorAdminRepository.getProductsMetadata as jest.Mock
      ).mockResolvedValue(mockSchema);

      // Act
      const result = await DistributorAdminService.getProductsSchema();

      // Assert
      expect(result).toEqual(mockSchema);
      expect(DistributorAdminRepository.getProductsMetadata).toHaveBeenCalled();
    });

    it("should cache schema results for extended period", async () => {
      // Arrange
      const mockSchema = [{ field: "id" }];
      (
        DistributorAdminRepository.getProductsMetadata as jest.Mock
      ).mockResolvedValue(mockSchema);

      // Act
      await DistributorAdminService.getProductsSchema();

      // Assert
      expect(mockRedisClient.setEx).toHaveBeenCalled();
      const callArgs = mockRedisClient.setEx.mock.calls[0];
      expect(callArgs[1]).toBeGreaterThan(300); // Should be TTL * 10
      expect(callArgs[2]).toBe(JSON.stringify(mockSchema));
    });

    it("should return cached schema when available", async () => {
      // Arrange
      const cachedSchema = [{ field: "cached" }];
      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedSchema));

      // Act
      const result = await DistributorAdminService.getProductsSchema();

      // Assert
      expect(result).toEqual(cachedSchema);
      expect(
        DistributorAdminRepository.getProductsMetadata
      ).not.toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      // Arrange
      (
        DistributorAdminRepository.getProductsMetadata as jest.Mock
      ).mockRejectedValue(new Error("Schema fetch error"));

      // Act & Assert
      await expect(DistributorAdminService.getProductsSchema()).rejects.toThrow(
        ApiError
      );
    });
  });

  describe("getProductsStatistics", () => {
    it("should return formatted statistics", async () => {
      // Arrange
      const mockStats = {
        total_products: "1500",
        total_manufacturers: "50",
        total_categories: "25",
        total_brands: "100",
        primary_variants: "800",
        average_price: "89.99",
        min_price: "9.99",
        max_price: "999.99"
      };

      (
        DistributorAdminRepository.getProductStatistics as jest.Mock
      ).mockResolvedValue(mockStats);

      // Act
      const result = await DistributorAdminService.getProductsStatistics();

      // Assert
      expect(result.totalProducts).toBe(1500);
      expect(result.totalManufacturers).toBe(50);
      expect(result.pricing.average).toBe(89.99);
      expect(result.pricing.minimum).toBe(9.99);
      expect(result.pricing.maximum).toBe(999.99);
    });

    it("should handle null values with defaults", async () => {
      // Arrange
      const mockStats = {
        total_products: null,
        total_manufacturers: undefined,
        average_price: null
      };

      (
        DistributorAdminRepository.getProductStatistics as jest.Mock
      ).mockResolvedValue(mockStats);

      // Act
      const result = await DistributorAdminService.getProductsStatistics();

      // Assert
      expect(result.totalProducts).toBe(0);
      expect(result.totalManufacturers).toBe(0);
      expect(result.pricing.average).toBe(0);
    });

    it("should cache statistics results", async () => {
      // Arrange
      const mockStats = { total_products: "100" };
      (
        DistributorAdminRepository.getProductStatistics as jest.Mock
      ).mockResolvedValue(mockStats);

      // Act
      await DistributorAdminService.getProductsStatistics();

      // Assert
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      // Arrange
      (
        DistributorAdminRepository.getProductStatistics as jest.Mock
      ).mockRejectedValue(new Error("Stats error"));

      // Act & Assert
      await expect(
        DistributorAdminService.getProductsStatistics()
      ).rejects.toThrow(ApiError);
    });
  });

  describe("getFilterOptions", () => {
    it("should return distinct values for valid field", async () => {
      // Arrange
      const mockOptions = ["Option 1", "Option 2", "Option 3"];
      (
        DistributorAdminRepository.getDistinctValues as jest.Mock
      ).mockResolvedValue(mockOptions);

      // Act
      const result = await DistributorAdminService.getFilterOptions(
        "brand",
        10
      );

      // Assert
      expect(result).toEqual(mockOptions);
      expect(DistributorAdminRepository.getDistinctValues).toHaveBeenCalledWith(
        "brand",
        10
      );
    });

    it("should normalize camelCase field names", async () => {
      // Arrange
      (
        DistributorAdminRepository.getDistinctValues as jest.Mock
      ).mockResolvedValue([]);

      // Act
      await DistributorAdminService.getFilterOptions("manufacturerId", 50);

      // Assert
      expect(DistributorAdminRepository.getDistinctValues).toHaveBeenCalledWith(
        "manufacturer_id",
        50
      );
    });

    it("should throw error for invalid field name", async () => {
      // Act & Assert
      await expect(
        DistributorAdminService.getFilterOptions("invalid_field", 10)
      ).rejects.toThrow(ApiError);

      await expect(
        DistributorAdminService.getFilterOptions("invalid_field", 10)
      ).rejects.toThrow("Invalid field for filter options");
    });

    it("should use default limit of 50", async () => {
      // Arrange
      (
        DistributorAdminRepository.getDistinctValues as jest.Mock
      ).mockResolvedValue([]);

      // Act
      await DistributorAdminService.getFilterOptions("brand");

      // Assert
      expect(DistributorAdminRepository.getDistinctValues).toHaveBeenCalledWith(
        "brand",
        50
      );
    });

    it("should cache filter options", async () => {
      // Arrange
      (
        DistributorAdminRepository.getDistinctValues as jest.Mock
      ).mockResolvedValue(["Option 1"]);

      // Act
      await DistributorAdminService.getFilterOptions("brand", 20);

      // Assert
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it("should handle repository errors", async () => {
      // Arrange
      (
        DistributorAdminRepository.getDistinctValues as jest.Mock
      ).mockRejectedValue(new Error("DB error"));

      // Act & Assert
      await expect(
        DistributorAdminService.getFilterOptions("brand")
      ).rejects.toThrow(ApiError);
    });
  });

  describe("getCategories", () => {
    it("should return formatted categories with product counts", async () => {
      // Arrange
      const mockCategories = [
        {
          id: 1,
          name: "Category A",
          description: "Description A",
          product_count: "50",
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-02")
        },
        {
          id: 2,
          name: "Category B",
          description: "Description B",
          product_count: "75",
          created_at: new Date("2024-01-01"),
          updated_at: new Date("2024-01-02")
        }
      ];

      (DistributorAdminRepository.getCategories as jest.Mock).mockResolvedValue(
        mockCategories
      );

      // Act
      const result = await DistributorAdminService.getCategories();

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].productCount).toBe(50);
      expect(result[1].productCount).toBe(75);
    });

    it("should cache categories with extended TTL", async () => {
      // Arrange
      (DistributorAdminRepository.getCategories as jest.Mock).mockResolvedValue(
        []
      );

      // Act
      await DistributorAdminService.getCategories();

      // Assert
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });

    it("should handle errors gracefully", async () => {
      // Arrange
      (DistributorAdminRepository.getCategories as jest.Mock).mockRejectedValue(
        new Error("DB error")
      );

      // Act & Assert
      await expect(DistributorAdminService.getCategories()).rejects.toThrow(
        ApiError
      );
    });
  });

  describe("getManufacturers", () => {
    it("should return formatted manufacturers with product counts", async () => {
      // Arrange
      const mockManufacturers = [
        {
          id: 1,
          name: "Manufacturer A",
          logo: "logo-a.png",
          product_count: "100",
          created_at: new Date(),
          updated_at: new Date()
        }
      ];

      (
        DistributorAdminRepository.getManufacturers as jest.Mock
      ).mockResolvedValue(mockManufacturers);

      // Act
      const result = await DistributorAdminService.getManufacturers();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].productCount).toBe(100);
    });

    it("should cache manufacturers with extended TTL", async () => {
      // Arrange
      (
        DistributorAdminRepository.getManufacturers as jest.Mock
      ).mockResolvedValue([]);

      // Act
      await DistributorAdminService.getManufacturers();

      // Assert
      expect(mockRedisClient.setEx).toHaveBeenCalled();
    });
  });

  describe("getStoreLookup", () => {
    it("should validate required storeName parameter", async () => {
      // Act & Assert
      await expect(DistributorAdminService.getStoreLookup("")).rejects.toThrow(
        "Store name is required"
      );
    });

    it("should validate date format", async () => {
      // Act & Assert
      await expect(
        DistributorAdminService.getStoreLookup("Test Store", "2024-13-01")
      ).rejects.toThrow("Invalid start date provided");

      await expect(
        DistributorAdminService.getStoreLookup(
          "Test Store",
          "2024-01-01",
          "2024/01/31"
        )
      ).rejects.toThrow("End date must be in YYYY-MM-DD format");
    });

    it("should validate date range logic", async () => {
      // Act & Assert
      await expect(
        DistributorAdminService.getStoreLookup(
          "Test Store",
          "2024-12-31",
          "2024-01-01"
        )
      ).rejects.toThrow("Start date must be before or equal to end date");
    });

    it("should format store lookup results", async () => {
      // Arrange
      const mockData = [
        {
          store_name: "Test Store",
          manufacturer_name: "Mfr A",
          product_name: "Product 1",
          product_id: 1,
          matched_sku_type: "unit",
          transaction_date: "2024-01-01",
          category_tags_json: '{"tag1": true}',
          total_units: "50",
          warehouse: "WH1"
        }
      ];

      (
        DistributorAdminRepository.getStoreLookup as jest.Mock
      ).mockResolvedValue(mockData);

      // Act
      const result = await DistributorAdminService.getStoreLookup("Test");

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].totalUnits).toBe(50);
      expect(result[0].storeName).toBe("Test Store");
    });

    it("should add wildcards to store name", async () => {
      // Arrange
      (
        DistributorAdminRepository.getStoreLookup as jest.Mock
      ).mockResolvedValue([]);

      // Act
      await DistributorAdminService.getStoreLookup("TestStore");

      // Assert
      expect(DistributorAdminRepository.getStoreLookup).toHaveBeenCalledWith(
        "%TestStore%",
        undefined,
        undefined,
        undefined,
        undefined
      );
    });
  });

  describe("getProgramsWithFilters", () => {
    it("should validate participant type", async () => {
      // Act & Assert
      await expect(
        DistributorAdminService.getProgramsWithFilters("INVALID_TYPE")
      ).rejects.toThrow("Invalid participant type");
    });

    it("should validate date formats", async () => {
      // Act & Assert
      await expect(
        DistributorAdminService.getProgramsWithFilters(
          undefined,
          undefined,
          "invalid-date"
        )
      ).rejects.toThrow("Start date must be in YYYY-MM-DD format");
    });

    it("should group programs by program_id", async () => {
      // Arrange
      const mockPrograms = [
        {
          program_id: 100,
          manufacturer_name: "Mfr A",
          program_name: "Program 1",
          participant_type: "STORE",
          id: 1,
          tier: 1,
          min_qty: "10",
          rebate_amount: "50"
        },
        {
          program_id: 100,
          manufacturer_name: "Mfr A",
          program_name: "Program 1",
          participant_type: "STORE",
          id: 2,
          tier: 2,
          min_qty: "20",
          rebate_amount: "100"
        }
      ];

      (
        DistributorAdminRepository.getProgramsWithFilters as jest.Mock
      ).mockResolvedValue(mockPrograms);

      // Act
      const result = await DistributorAdminService.getProgramsWithFilters();

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].programId).toBe(100);
      expect(result[0].programDetails).toHaveLength(2);
      expect(result[0].programDetails[0].tier).toBe(1);
      expect(result[0].programDetails[1].tier).toBe(2);
    });

    it("should handle distributor filtering", async () => {
      // Arrange
      (
        DistributorAdminRepository.getDistributorIdByOrganizationName as jest.Mock
      ).mockResolvedValue(123);
      (
        DistributorAdminRepository.getProgramsWithFilters as jest.Mock
      ).mockResolvedValue([]);

      // Act
      await DistributorAdminService.getProgramsWithFilters(
        undefined,
        undefined,
        undefined,
        undefined,
        "Test Distributor"
      );

      // Assert
      expect(
        DistributorAdminRepository.getDistributorIdByOrganizationName
      ).toHaveBeenCalledWith("Test Distributor");
      expect(
        DistributorAdminRepository.getProgramsWithFilters
      ).toHaveBeenCalledWith(undefined, undefined, undefined, undefined, 123);
    });

    it("should throw error when distributor not found", async () => {
      // Arrange
      (
        DistributorAdminRepository.getDistributorIdByOrganizationName as jest.Mock
      ).mockResolvedValue(null);

      // Act & Assert
      await expect(
        DistributorAdminService.getProgramsWithFilters(
          undefined,
          undefined,
          undefined,
          undefined,
          "Nonexistent Distributor"
        )
      ).rejects.toThrow("Distributor with organization name");
    });
  });

  describe("Service Structure", () => {
    it("should have all required methods", () => {
      expect(DistributorAdminService).toBeDefined();
      expect(typeof DistributorAdminService.getProducts).toBe("function");
      expect(typeof DistributorAdminService.getProductsSchema).toBe("function");
      expect(typeof DistributorAdminService.getProductsStatistics).toBe(
        "function"
      );
      expect(typeof DistributorAdminService.getFilterOptions).toBe("function");
      expect(typeof DistributorAdminService.getCategories).toBe("function");
      expect(typeof DistributorAdminService.getManufacturers).toBe("function");
      expect(typeof DistributorAdminService.getStoreLookup).toBe("function");
      expect(typeof DistributorAdminService.getProgramsWithFilters).toBe(
        "function"
      );
      expect(typeof DistributorAdminService.getAllDistributors).toBe(
        "function"
      );
      expect(typeof DistributorAdminService.getCategoryTags).toBe("function");
      expect(
        typeof DistributorAdminService.getAllManufacturersFromProducts
      ).toBe("function");
      expect(
        typeof DistributorAdminService.getAuthorizedDistributorManufacturers
      ).toBe("function");
    });
  });
});
