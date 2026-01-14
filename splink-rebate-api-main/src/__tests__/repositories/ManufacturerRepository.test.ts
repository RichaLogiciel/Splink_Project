// Mock ProductCodeMapping first (before it gets imported by helpers)
jest.mock("../../models/ProductCodeMapping", () => ({
  __esModule: true,
  default: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

// Mock helpers to avoid ProductCodeMapping import chain issues
jest.mock("../../utils/helpers", () => ({
  __esModule: true,
  formatSKU: jest.fn(),
  formatDate: jest.fn(),
  calculatePercentage: jest.fn(),
  getEnvironment: jest.fn().mockReturnValue("development")
}));

// Mock LineItem with scope support - define inline
jest.mock("../../models/LineItem", () => {
  const mockFindAll = jest.fn();
  return {
    __esModule: true,
    default: {
      findAll: mockFindAll,
      scope: jest.fn().mockReturnValue({
        findAll: mockFindAll
      }),
      belongsTo: jest.fn(),
      hasMany: jest.fn()
    }
  };
});

// Mock AuthorizedManufacturerDistributor
jest.mock("../../models/AuthorizedManufacturerDistributor", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

// Mock ExcludedDistributorManufacturerData
jest.mock("../../models/ExcludedDistributorManufacturerData", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

// Mock Distributor
jest.mock("../../models/Distributor", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

// Mock EntityAccessMapping
jest.mock("../../models/EntityAccessMapping", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

// Mock Product
jest.mock("../../models/Product", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

// Mock other models to prevent association issues
jest.mock("../../models/Store", () => ({
  __esModule: true,
  default: { belongsTo: jest.fn(), hasMany: jest.fn() }
}));

jest.mock("../../models/User", () => ({
  __esModule: true,
  default: { belongsTo: jest.fn(), hasMany: jest.fn() }
}));

jest.mock("../../models/UserRole", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), belongsTo: jest.fn(), hasMany: jest.fn() }
}));

jest.mock("../../models/Manufacturer", () => ({
  __esModule: true,
  default: { findAll: jest.fn(), belongsTo: jest.fn(), hasMany: jest.fn() }
}));

jest.mock("../../models/Chain", () => ({
  __esModule: true,
  default: { belongsTo: jest.fn(), hasMany: jest.fn() }
}));

jest.mock("../../models/Program", () => ({
  __esModule: true,
  default: { belongsTo: jest.fn(), hasMany: jest.fn(), findAll: jest.fn() }
}));

jest.mock("../../models/ProgramDetail", () => ({
  __esModule: true,
  default: { belongsTo: jest.fn(), hasMany: jest.fn(), findAll: jest.fn() }
}));

jest.mock("../../models/ProgramRebate", () => ({
  __esModule: true,
  default: { belongsTo: jest.fn(), hasMany: jest.fn(), findAll: jest.fn() }
}));

jest.mock("../../models/ProgramProduct", () => ({
  __esModule: true,
  default: { belongsTo: jest.fn(), hasMany: jest.fn(), findAll: jest.fn() }
}));

jest.mock("../../models/Warehouse", () => ({
  __esModule: true,
  default: { belongsTo: jest.fn(), hasMany: jest.fn(), findAll: jest.fn() }
}));

jest.mock("../../models/ChainStore", () => ({
  __esModule: true,
  default: { belongsTo: jest.fn(), hasMany: jest.fn(), findAll: jest.fn() }
}));

jest.mock("../../models/StoreSalesRep", () => ({
  __esModule: true,
  default: { belongsTo: jest.fn(), hasMany: jest.fn(), findAll: jest.fn() }
}));

jest.mock("../../models/ProgramCompliance", () => ({
  __esModule: true,
  default: { belongsTo: jest.fn(), hasMany: jest.fn() }
}));

jest.mock("../../models/ProductCategory", () => ({
  __esModule: true,
  default: { belongsTo: jest.fn(), hasMany: jest.fn() }
}));

jest.mock("../../models/LineItemsProductsJoinedMaterializedView", () => ({
  __esModule: true,
  default: { belongsTo: jest.fn(), hasMany: jest.fn() }
}));

import ManufacturerRepository from "../../repositories/ManufacturerRepository";
import LineItem from "../../models/LineItem";
import AuthorizedManufacturerDistributor from "../../models/AuthorizedManufacturerDistributor";
import ExcludedDistributorManufacturerData from "../../models/ExcludedDistributorManufacturerData";
import Distributor from "../../models/Distributor";

describe("ManufacturerRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getDistributorsOptimized", () => {
    it("should use allData scope to bypass year filter on LineItem queries", async () => {
      // Arrange: Setup authorized distributors
      (
        AuthorizedManufacturerDistributor.findAll as jest.Mock
      ).mockResolvedValue([
        { distributor_id: 1 },
        { distributor_id: 65 },
        { distributor_id: 39 }
      ]);

      // No excluded distributors
      (
        ExcludedDistributorManufacturerData.findAll as jest.Mock
      ).mockResolvedValue([]);

      // Setup LineItem scope to return distributors with transactions
      const mockLineItemScopedFindAll = (LineItem.scope as jest.Mock)()
        .findAll as jest.Mock;
      mockLineItemScopedFindAll
        .mockResolvedValueOnce([{ distributorId: 1 }]) // buyers query
        .mockResolvedValueOnce([
          { distributorId: 1 },
          { distributorId: 65 },
          { distributorId: 39 }
        ]); // sellers query

      // Setup Distributor findAll
      (Distributor.findAll as jest.Mock).mockResolvedValue([
        { id: 1, organizationName: "Distributor 1" },
        { id: 65, organizationName: "Distributor 65" },
        { id: 39, organizationName: "Distributor 39" }
      ]);

      // Act
      const result = await ManufacturerRepository.getDistributorsOptimized(11);

      // Assert: Verify scope('allData') was called (once for buyers, once for sellers)
      expect(LineItem.scope).toHaveBeenCalledWith("allData");
      // Filter scope calls to only count 'allData' scope calls
      const allDataCalls = (LineItem.scope as jest.Mock).mock.calls.filter(
        (call) => call[0] === "allData"
      );
      expect(allDataCalls.length).toBeGreaterThanOrEqual(2);

      // Verify distributors are returned
      expect(result).toHaveLength(3);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ associatedUserId: 1 }),
          expect.objectContaining({ associatedUserId: 65 }),
          expect.objectContaining({ associatedUserId: 39 })
        ])
      );
    });

    it("should return empty array when no authorized distributors", async () => {
      // Arrange
      (
        AuthorizedManufacturerDistributor.findAll as jest.Mock
      ).mockResolvedValue([]);
      (
        ExcludedDistributorManufacturerData.findAll as jest.Mock
      ).mockResolvedValue([]);

      // Act
      const result = await ManufacturerRepository.getDistributorsOptimized(11);

      // Assert
      expect(result).toEqual([]);
      expect(LineItem.scope).not.toHaveBeenCalled();
    });

    it("should filter out excluded distributors", async () => {
      // Arrange
      (
        AuthorizedManufacturerDistributor.findAll as jest.Mock
      ).mockResolvedValue([
        { distributor_id: 1 },
        { distributor_id: 65 },
        { distributor_id: 327 }
      ]);

      // Distributor 327 is excluded
      (
        ExcludedDistributorManufacturerData.findAll as jest.Mock
      ).mockResolvedValue([{ distributor_id: 327 }]);

      const mockLineItemScopedFindAll = (LineItem.scope as jest.Mock)()
        .findAll as jest.Mock;
      mockLineItemScopedFindAll
        .mockResolvedValueOnce([]) // buyers
        .mockResolvedValueOnce([{ distributorId: 1 }, { distributorId: 65 }]); // sellers

      (Distributor.findAll as jest.Mock).mockResolvedValue([
        { id: 1, organizationName: "Distributor 1" },
        { id: 65, organizationName: "Distributor 65" }
      ]);

      // Act
      const result = await ManufacturerRepository.getDistributorsOptimized(11);

      // Assert: 327 should not be in the result
      expect(result).toHaveLength(2);
      expect(result.map((d: any) => d.associatedUserId)).not.toContain(327);
    });

    it("should only return distributors that have line items", async () => {
      // Arrange
      (
        AuthorizedManufacturerDistributor.findAll as jest.Mock
      ).mockResolvedValue([
        { distributor_id: 1 },
        { distributor_id: 65 },
        { distributor_id: 46 }
      ]);

      (
        ExcludedDistributorManufacturerData.findAll as jest.Mock
      ).mockResolvedValue([]);

      // Only distributors 1 and 65 have line items, 46 does not
      const mockLineItemScopedFindAll = (LineItem.scope as jest.Mock)()
        .findAll as jest.Mock;
      mockLineItemScopedFindAll
        .mockResolvedValueOnce([]) // buyers
        .mockResolvedValueOnce([{ distributorId: 1 }, { distributorId: 65 }]); // sellers - no 46

      (Distributor.findAll as jest.Mock).mockResolvedValue([
        { id: 1, organizationName: "Distributor 1" },
        { id: 65, organizationName: "Distributor 65" }
      ]);

      // Act
      const result = await ManufacturerRepository.getDistributorsOptimized(11);

      // Assert: Only distributors with line items returned
      expect(result).toHaveLength(2);
      expect(result.map((d: any) => d.associatedUserId)).toEqual(
        expect.arrayContaining([1, 65])
      );
      expect(result.map((d: any) => d.associatedUserId)).not.toContain(46);
    });
  });

  describe("getActiveAuthorizedDistributorIds", () => {
    it("should return authorized distributors excluding excluded ones", async () => {
      // Arrange
      (
        AuthorizedManufacturerDistributor.findAll as jest.Mock
      ).mockResolvedValue([
        { distributor_id: 1 },
        { distributor_id: 65 },
        { distributor_id: 39 },
        { distributor_id: 327 }
      ]);

      (
        ExcludedDistributorManufacturerData.findAll as jest.Mock
      ).mockResolvedValue([{ distributor_id: 327 }]);

      // Act
      const result =
        await ManufacturerRepository.getActiveAuthorizedDistributorIds(11);

      // Assert
      expect(result).toHaveLength(3);
      expect(result).toContain(1);
      expect(result).toContain(65);
      expect(result).toContain(39);
      expect(result).not.toContain(327);
    });

    it("should return empty array when no authorized distributors", async () => {
      // Arrange
      (
        AuthorizedManufacturerDistributor.findAll as jest.Mock
      ).mockResolvedValue([]);
      (
        ExcludedDistributorManufacturerData.findAll as jest.Mock
      ).mockResolvedValue([]);

      // Act
      const result =
        await ManufacturerRepository.getActiveAuthorizedDistributorIds(11);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
