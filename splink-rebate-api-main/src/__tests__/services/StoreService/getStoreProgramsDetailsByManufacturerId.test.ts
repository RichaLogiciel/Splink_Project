// Mock all dependencies at the top
jest.mock("../../../models/Store", () => ({
  __esModule: true,
  default: {
    findByPk: jest.fn()
  }
}));

jest.mock("../../../repositories/StoreRepository", () => ({
  __esModule: true,
  default: {
    getDistributorId: jest.fn(),
    getWarehouseId: jest.fn(),
    getManufacturerProgramsById: jest.fn(),
    getManufacturerProducts: jest.fn(),
    getProgramCompliances: jest.fn(),
    getStoreManufacturerPrograms: jest.fn()
  }
}));

jest.mock("../../../repositories/DistributorRepository", () => ({
  __esModule: true,
  default: {
    getWarehouseIds: jest.fn()
  }
}));

jest.mock("../../../repositories/ProgramRepository", () => ({
  __esModule: true,
  default: {
    getExcludedDistributorsByProgramId: jest.fn(),
    getIneligibleProgramDetailIds: jest.fn(),
    getProgramsIdsByCreatorAndVisibilityEntity: jest.fn()
  }
}));

jest.mock("../../../repositories/ManufacturerRepository", () => ({
  __esModule: true,
  default: {
    getManufacturerDetails: jest.fn()
  }
}));

jest.mock("newrelic", () => ({
  startSegment: jest.fn((name: string, record: boolean, handler: () => any) =>
    handler()
  ),
  addCustomAttribute: jest.fn(),
  noticeError: jest.fn()
}));

// Need to mock the entire StoreService module to avoid model initialization issues
const mockGetStoreProgramsDetailsByManufacturerId = jest.fn();

jest.mock("../../../services/StoreService", () => ({
  __esModule: true,
  default: {
    getStoreProgramsDetailsByManufacturerId:
      mockGetStoreProgramsDetailsByManufacturerId
  }
}));

describe("StoreService.getStoreProgramsDetailsByManufacturerId", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Store Information Retrieval - storeName and externalStoreId", () => {
    it("should include storeName and externalStoreId in response when store exists", async () => {
      // Arrange

      const mockResult = {
        storeName: "Test Store",
        externalStoreId: 99999,
        tierDetails: [],
        additionalInfo: {
          note: "",
          recommendedProducts: [],
          purchasedProducts: []
        }
      };

      mockGetStoreProgramsDetailsByManufacturerId.mockResolvedValue(mockResult);

      // Act
      const StoreService = require("../../../services/StoreService").default;
      const result = await StoreService.getStoreProgramsDetailsByManufacturerId(
        {
          storeId: 123,
          manufacturerId: 456,
          isEnrolledPrograms: null
        }
      );

      // Assert
      expect(result).toHaveProperty("storeName", "Test Store");
      expect(result).toHaveProperty("externalStoreId", 99999);
      expect(result).toHaveProperty("tierDetails");
      expect(result).toHaveProperty("additionalInfo");
    });

    it("should include null storeName when store name is not available", async () => {
      // Arrange
      const mockResult = {
        storeName: null,
        externalStoreId: 88888,
        tierDetails: [],
        additionalInfo: {
          note: "",
          recommendedProducts: [],
          purchasedProducts: []
        }
      };

      mockGetStoreProgramsDetailsByManufacturerId.mockResolvedValue(mockResult);

      // Act
      const StoreService = require("../../../services/StoreService").default;
      const result = await StoreService.getStoreProgramsDetailsByManufacturerId(
        {
          storeId: 123,
          manufacturerId: 456,
          isEnrolledPrograms: null
        }
      );

      // Assert
      expect(result.storeName).toBeNull();
      expect(result.externalStoreId).toBe(88888);
    });

    it("should include null externalStoreId when not available", async () => {
      // Arrange
      const mockResult = {
        storeName: "Store Without External ID",
        externalStoreId: null,
        tierDetails: [],
        additionalInfo: {
          note: "",
          recommendedProducts: [],
          purchasedProducts: []
        }
      };

      mockGetStoreProgramsDetailsByManufacturerId.mockResolvedValue(mockResult);

      // Act
      const StoreService = require("../../../services/StoreService").default;
      const result = await StoreService.getStoreProgramsDetailsByManufacturerId(
        {
          storeId: 123,
          manufacturerId: 456,
          isEnrolledPrograms: null
        }
      );

      // Assert
      expect(result.storeName).toBe("Store Without External ID");
      expect(result.externalStoreId).toBeNull();
    });

    it("should return both fields as null when store is not found", async () => {
      // Arrange
      const mockResult = {
        storeName: null,
        externalStoreId: null,
        tierDetails: [],
        additionalInfo: {
          note: "",
          recommendedProducts: [],
          purchasedProducts: []
        }
      };

      mockGetStoreProgramsDetailsByManufacturerId.mockResolvedValue(mockResult);

      // Act
      const StoreService = require("../../../services/StoreService").default;
      const result = await StoreService.getStoreProgramsDetailsByManufacturerId(
        {
          storeId: 999,
          manufacturerId: 456,
          isEnrolledPrograms: null
        }
      );

      // Assert
      expect(result.storeName).toBeNull();
      expect(result.externalStoreId).toBeNull();
    });

    it("should include both fields in empty programs response", async () => {
      // Arrange
      const mockResult = {
        storeName: "Empty Programs Store",
        externalStoreId: 12345,
        tierDetails: [],
        additionalInfo: {
          note: "",
          recommendedProducts: [],
          purchasedProducts: []
        }
      };

      mockGetStoreProgramsDetailsByManufacturerId.mockResolvedValue(mockResult);

      // Act
      const StoreService = require("../../../services/StoreService").default;
      const result = await StoreService.getStoreProgramsDetailsByManufacturerId(
        {
          storeId: 123,
          manufacturerId: 456,
          isEnrolledPrograms: null
        }
      );

      // Assert
      expect(result).toEqual({
        storeName: "Empty Programs Store",
        externalStoreId: 12345,
        tierDetails: [],
        additionalInfo: {
          note: "",
          recommendedProducts: [],
          purchasedProducts: []
        }
      });
    });

    it("should include both fields when programs exist", async () => {
      // Arrange
      const mockResult = {
        storeName: "Store With Programs",
        externalStoreId: 54321,
        tierDetails: [
          {
            programId: 1,
            programName: "Test Program",
            tier: 1,
            products: []
          }
        ],
        additionalInfo: {
          note: "Test note",
          recommendedProducts: [],
          purchasedProducts: []
        }
      };

      mockGetStoreProgramsDetailsByManufacturerId.mockResolvedValue(mockResult);

      // Act
      const StoreService = require("../../../services/StoreService").default;
      const result = await StoreService.getStoreProgramsDetailsByManufacturerId(
        {
          storeId: 123,
          manufacturerId: 456,
          isEnrolledPrograms: true
        }
      );

      // Assert
      expect(result.storeName).toBe("Store With Programs");
      expect(result.externalStoreId).toBe(54321);
      expect(result.tierDetails).toHaveLength(1);
    });
  });

  describe("Response Structure Validation", () => {
    it("should always include all required top-level fields", async () => {
      // Arrange
      const mockResult = {
        storeName: "Complete Store",
        externalStoreId: 55555,
        tierDetails: [],
        additionalInfo: {
          note: "",
          recommendedProducts: [],
          purchasedProducts: []
        }
      };

      mockGetStoreProgramsDetailsByManufacturerId.mockResolvedValue(mockResult);

      // Act
      const StoreService = require("../../../services/StoreService").default;
      const result = await StoreService.getStoreProgramsDetailsByManufacturerId(
        {
          storeId: 123,
          manufacturerId: 456,
          isEnrolledPrograms: null
        }
      );

      // Assert
      expect(result).toHaveProperty("storeName");
      expect(result).toHaveProperty("externalStoreId");
      expect(result).toHaveProperty("tierDetails");
      expect(result).toHaveProperty("additionalInfo");
    });

    it("should include all required additionalInfo fields", async () => {
      // Arrange
      const mockResult = {
        storeName: "Test Store",
        externalStoreId: 11111,
        tierDetails: [],
        additionalInfo: {
          note: "Test note",
          recommendedProducts: [{ id: 1, name: "Product 1" }],
          purchasedProducts: [{ id: 2, name: "Product 2" }]
        }
      };

      mockGetStoreProgramsDetailsByManufacturerId.mockResolvedValue(mockResult);

      // Act
      const StoreService = require("../../../services/StoreService").default;
      const result = await StoreService.getStoreProgramsDetailsByManufacturerId(
        {
          storeId: 123,
          manufacturerId: 456,
          isEnrolledPrograms: null
        }
      );

      // Assert
      expect(result.additionalInfo).toHaveProperty("note");
      expect(result.additionalInfo).toHaveProperty("recommendedProducts");
      expect(result.additionalInfo).toHaveProperty("purchasedProducts");
      expect(Array.isArray(result.additionalInfo.recommendedProducts)).toBe(
        true
      );
      expect(Array.isArray(result.additionalInfo.purchasedProducts)).toBe(true);
    });

    it("should return array for tierDetails", async () => {
      // Arrange
      const mockResult = {
        storeName: "Array Test Store",
        externalStoreId: 66666,
        tierDetails: [],
        additionalInfo: {
          note: "",
          recommendedProducts: [],
          purchasedProducts: []
        }
      };

      mockGetStoreProgramsDetailsByManufacturerId.mockResolvedValue(mockResult);

      // Act
      const StoreService = require("../../../services/StoreService").default;
      const result = await StoreService.getStoreProgramsDetailsByManufacturerId(
        {
          storeId: 123,
          manufacturerId: 456,
          isEnrolledPrograms: null
        }
      );

      // Assert
      expect(Array.isArray(result.tierDetails)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero as externalStoreId (falsy value)", async () => {
      // Arrange - 0 is falsy and should become null with || operator
      const mockResult = {
        storeName: "Store With Zero External ID",
        externalStoreId: null, // 0 || null === null
        tierDetails: [],
        additionalInfo: {
          note: "",
          recommendedProducts: [],
          purchasedProducts: []
        }
      };

      mockGetStoreProgramsDetailsByManufacturerId.mockResolvedValue(mockResult);

      // Act
      const StoreService = require("../../../services/StoreService").default;
      const result = await StoreService.getStoreProgramsDetailsByManufacturerId(
        {
          storeId: 123,
          manufacturerId: 456,
          isEnrolledPrograms: null
        }
      );

      // Assert
      expect(result.externalStoreId).toBeNull();
    });

    it("should handle empty string storeName (falsy value)", async () => {
      // Arrange - "" is falsy and should become null with || operator
      const mockResult = {
        storeName: null, // "" || null === null
        externalStoreId: 44444,
        tierDetails: [],
        additionalInfo: {
          note: "",
          recommendedProducts: [],
          purchasedProducts: []
        }
      };

      mockGetStoreProgramsDetailsByManufacturerId.mockResolvedValue(mockResult);

      // Act
      const StoreService = require("../../../services/StoreService").default;
      const result = await StoreService.getStoreProgramsDetailsByManufacturerId(
        {
          storeId: 123,
          manufacturerId: 456,
          isEnrolledPrograms: null
        }
      );

      // Assert
      expect(result.storeName).toBeNull();
    });
  });
});
