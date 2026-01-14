import StoreRepository from "../../repositories/StoreRepository";

// Mock sequelize
jest.mock("../../db");

// Mock all models to prevent association issues
jest.mock("../../models/Store", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    findByPk: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  }
}));

jest.mock("../../models/User", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/UserRole", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/Manufacturer", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/Distributor", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/Chain", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/ChainStore", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/StoreSalesRep", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/ProgramCompliance", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/Program", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/Warehouse", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/LineItem", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/ProgramDetail", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/ProgramRebate", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/ProgramProduct", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/Product", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

jest.mock("../../models/ProductCategory", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  }
}));

describe("StoreRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getSalesRepsByGeneralManager", () => {
    it("should return mapped sales reps for a GM", async () => {
      const sequelize = require("../../db").default;
      sequelize.query = jest.fn().mockResolvedValue([
        { associated_user_id: 1, sales_rep_name: "Alice", id: "SR-1" },
        { associated_user_id: 2, sales_rep_name: "Bob", id: "SR-2" }
      ]);

      const result = await StoreRepository.getSalesRepsByGeneralManager(55);

      expect(sequelize.query).toHaveBeenCalled();
      expect(result).toEqual([
        { associated_user_id: 1, sales_rep_name: "Alice", id: "SR-1" },
        { associated_user_id: 2, sales_rep_name: "Bob", id: "SR-2" }
      ]);
    });
  });

  describe("getStoreIdsByGeneralManager", () => {
    it("should return distinct store ids for a GM", async () => {
      const sequelize = require("../../db").default;
      sequelize.query = jest
        .fn()
        .mockResolvedValue([{ store_id: 1 }, { store_id: 2 }]);

      const result = await StoreRepository.getStoreIdsByGeneralManager({
        generalManagerUserId: 123,
        excludeChainStores: false
      });

      expect(sequelize.query).toHaveBeenCalled();
      expect(result).toEqual([1, 2]);
    });

    it("should pass excludeChainStores into query", async () => {
      const sequelize = require("../../db").default;
      sequelize.query = jest.fn().mockResolvedValue([]);

      await StoreRepository.getStoreIdsByGeneralManager({
        generalManagerUserId: 999,
        excludeChainStores: true
      });

      const sql = sequelize.query.mock.calls[0][0] as string;
      expect(sql).toContain("LEFT JOIN chain_stores");
      expect(sql).toContain("AND cs.store_id IS NULL");
    });
  });

  describe("getStoreIdsByWarehouseIds", () => {
    it("should return store IDs for valid warehouse IDs", async () => {
      const Store = require("../../models/Store").default;
      const mockStores = [{ store_id: 1 }, { store_id: 2 }, { store_id: 3 }];
      Store.findAll.mockResolvedValue(mockStores);

      const result = await StoreRepository.getStoreIdsByWarehouseIds([10, 20]);

      expect(result).toEqual([1, 2, 3]);
      expect(Store.findAll).toHaveBeenCalledTimes(1);

      // Verify the basic call structure
      const callArgs = Store.findAll.mock.calls[0][0];
      expect(callArgs.attributes).toEqual([["id", "store_id"]]);
      expect(callArgs.raw).toBe(true);
      expect(callArgs.where).toBeDefined();
      expect(callArgs.where.warehouse_id).toBeDefined();
    });

    it("should return empty array for empty warehouseIds array", async () => {
      const Store = require("../../models/Store").default;
      const result = await StoreRepository.getStoreIdsByWarehouseIds([]);

      expect(result).toEqual([]);
      expect(Store.findAll).not.toHaveBeenCalled();
    });

    it("should return empty array for null warehouseIds", async () => {
      const Store = require("../../models/Store").default;
      const result = await StoreRepository.getStoreIdsByWarehouseIds(
        null as any
      );

      expect(result).toEqual([]);
      expect(Store.findAll).not.toHaveBeenCalled();
    });

    it("should return empty array for undefined warehouseIds", async () => {
      const Store = require("../../models/Store").default;
      const result = await StoreRepository.getStoreIdsByWarehouseIds(
        undefined as any
      );

      expect(result).toEqual([]);
      expect(Store.findAll).not.toHaveBeenCalled();
    });

    it("should handle single warehouse ID", async () => {
      const Store = require("../../models/Store").default;
      const mockStores = [{ store_id: 100 }];
      Store.findAll.mockResolvedValue(mockStores);

      const result = await StoreRepository.getStoreIdsByWarehouseIds([5]);

      expect(result).toEqual([100]);
      expect(Store.findAll).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when no stores found for warehouse IDs", async () => {
      const Store = require("../../models/Store").default;
      Store.findAll.mockResolvedValue([]);

      const result = await StoreRepository.getStoreIdsByWarehouseIds([
        999, 1000
      ]);

      expect(result).toEqual([]);
      expect(Store.findAll).toHaveBeenCalledTimes(1);
    });

    it("should return empty array when findAll returns null", async () => {
      const Store = require("../../models/Store").default;
      Store.findAll.mockResolvedValue(null);

      const result = await StoreRepository.getStoreIdsByWarehouseIds([10, 20]);

      expect(result).toEqual([]);
    });

    it("should handle multiple warehouse IDs with many stores", async () => {
      const Store = require("../../models/Store").default;
      const mockStores = Array.from({ length: 50 }, (_, i) => ({
        store_id: i + 1
      }));
      Store.findAll.mockResolvedValue(mockStores);

      const result = await StoreRepository.getStoreIdsByWarehouseIds([
        1, 2, 3, 4, 5
      ]);

      expect(result).toHaveLength(50);
      expect(result).toEqual(mockStores.map((s) => s.store_id));
    });

    it("should handle database errors gracefully", async () => {
      const Store = require("../../models/Store").default;
      const error = new Error("Database connection failed");
      Store.findAll.mockRejectedValue(error);

      await expect(
        StoreRepository.getStoreIdsByWarehouseIds([10, 20])
      ).rejects.toThrow("Database connection failed");
    });

    it("should preserve store ID uniqueness when returned from database", async () => {
      const Store = require("../../models/Store").default;
      // In case database returns duplicates (shouldn't happen but good to test)
      const mockStores = [
        { store_id: 1 },
        { store_id: 2 },
        { store_id: 3 },
        { store_id: 2 }, // duplicate
        { store_id: 1 } // duplicate
      ];
      Store.findAll.mockResolvedValue(mockStores);

      const result = await StoreRepository.getStoreIdsByWarehouseIds([10]);

      expect(result).toEqual([1, 2, 3, 2, 1]);
      // Note: This test documents current behavior. The method doesn't dedupe.
      // If deduplication is needed, it should be added to the implementation.
    });
  });
});
