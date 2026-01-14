/**
 * StoreRepository.validateStoreAccess Tests
 *
 * Tests for the new store access validation method.
 * Focuses on role-based authorization logic.
 */

// Mock Sequelize Model before any model imports
jest.mock("sequelize", () => {
  const actualSequelize = jest.requireActual("sequelize");
  const { Model: ActualModel, DataTypes: ActualDataTypes } = actualSequelize;

  class MockedSequelizeModel extends ActualModel {
    static init = jest.fn();
    static addScope = jest.fn();
    static hasMany = jest.fn();
    static belongsTo = jest.fn();
    static hasOne = jest.fn();
    static belongsToMany = jest.fn();
    static removeAttribute = jest.fn();
  }

  return {
    ...actualSequelize,
    Model: MockedSequelizeModel,
    DataTypes: ActualDataTypes
  };
});

// Mock statements FIRST
jest.mock("../../../db", () => {
  return {
    __esModule: true,
    default: {
      query: jest.fn()
    }
  };
});
jest.mock("../../../models/Store");
jest.mock("../../../models/UserRole");
jest.mock("../../../models/StoreSalesRep");
jest.mock("../../../models/ManagerSalesRepMapping");
jest.mock("../../../utils/redis");
jest.mock("../../../repositories/ProgramRepository");
jest.mock("../../../repositories/ManufacturerRepository");
jest.mock("../../../utils/requestContext", () => ({
  getCurrentUser: jest.fn(() => ({ id: 1, role: "test" }))
}));
jest.mock("newrelic", () => ({
  startSegment: jest.fn((name, record, callback) => callback())
}));

import StoreRepository from "../../../repositories/StoreRepository";
import Store from "../../../models/Store";
import UserRole from "../../../models/UserRole";
import StoreSalesRep from "../../../models/StoreSalesRep";
import ManagerSalesRepMapping from "../../../models/ManagerSalesRepMapping";
import { ENTITY_TYPE } from "../../../config/appConstants";
import sequelize from "../../../db";
import { QueryTypes } from "sequelize";

describe("StoreRepository.validateStoreAccess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Store existence validation", () => {
    it("should return false when store does not exist", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await StoreRepository.validateStoreAccess(
        999,
        ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        1
      );

      // Assert
      expect(result).toBe(false);
      expect(Store.findOne).toHaveBeenCalledWith({
        where: { id: 999 },
        attributes: ["external_store_id"],
        raw: true
      });
    });

    it("should return false when store has no external_store_id", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue({
        external_store_id: null
      });

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        1
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("DISTRIBUTOR_ADMIN access", () => {
    it("should return true when distributor admin has access to store", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue({
        external_store_id: 12345
      });
      (UserRole.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        parent_entity_id: 1,
        associated_user_id: 100,
        role: ENTITY_TYPE.STORE
      });

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        1
      );

      // Assert
      expect(result).toBe(true);
      expect(UserRole.findOne).toHaveBeenCalledWith({
        where: {
          parent_entity_id: 1,
          associated_user_id: 100,
          role: ENTITY_TYPE.STORE
        },
        raw: true
      });
    });

    it("should return false when distributor admin does not have access to store", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue({
        external_store_id: 12345
      });
      (UserRole.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        1
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("DISTRIBUTOR_EXECUTIVE access", () => {
    it("should return true when distributor executive has access to store", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue({
        external_store_id: 12345
      });
      (UserRole.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        parent_entity_id: 1,
        associated_user_id: 100,
        role: ENTITY_TYPE.STORE
      });

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
        1
      );

      // Assert
      expect(result).toBe(true);
      expect(UserRole.findOne).toHaveBeenCalledWith({
        where: {
          parent_entity_id: 1,
          associated_user_id: 100,
          role: ENTITY_TYPE.STORE
        },
        raw: true
      });
    });

    it("should return false when distributor executive does not have access", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue({
        external_store_id: 12345
      });
      (UserRole.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE,
        1
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("DISTRIBUTOR_SALES_REP access", () => {
    it("should return false when associatedUserId is not provided", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue({
        external_store_id: 12345
      });

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
        1
      );

      // Assert
      expect(result).toBe(false);
      expect(StoreSalesRep.findOne).not.toHaveBeenCalled();
    });

    it("should return true when sales rep is assigned to the store", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue({
        external_store_id: 12345
      });
      (StoreSalesRep.findOne as jest.Mock).mockResolvedValue({
        id: 1,
        store_id: 100,
        sales_rep_id: 50,
        deleted_at: null
      });

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
        1,
        50
      );

      // Assert
      expect(result).toBe(true);
      expect(StoreSalesRep.findOne).toHaveBeenCalledWith({
        where: {
          store_id: 100,
          sales_rep_id: 50,
          deleted_at: null
        },
        raw: true
      });
    });

    it("should return false when sales rep is not assigned to the store", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue({
        external_store_id: 12345
      });
      (StoreSalesRep.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
        1,
        50
      );

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when sales rep assignment is deleted", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue({
        external_store_id: 12345
      });
      (StoreSalesRep.findOne as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
        1,
        50
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("DISTRIBUTOR_SALES_MANAGER access", () => {
    it("should return false when associatedUserId is not provided", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue({
        external_store_id: 12345
      });

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER,
        1
      );

      // Assert
      expect(result).toBe(false);
      expect(ManagerSalesRepMapping.findAll).not.toHaveBeenCalled();
    });

    it("should return true when sales manager manages a sales rep assigned to the store", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue({
        external_store_id: 12345
      });
      (sequelize.query as jest.Mock).mockResolvedValue([
        {
          id: 1
        }
      ]);

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER,
        1,
        30 // manager ID
      );

      // Assert
      expect(result).toBe(true);
      expect(sequelize.query).toHaveBeenCalledWith(
        expect.stringContaining("SELECT ssr.id"),
        expect.objectContaining({
          type: QueryTypes.SELECT,
          replacements: {
            storeId: 100,
            salesManagerId: 30
          }
        })
      );
    });

    it("should return false when manager has no sales reps", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue({
        external_store_id: 12345
      });
      (sequelize.query as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER,
        1,
        30
      );

      // Assert
      expect(result).toBe(false);
    });

    it("should return false when none of manager's sales reps are assigned to the store", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue({
        external_store_id: 12345
      });
      (sequelize.query as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER,
        1,
        30
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("Unknown role", () => {
    it("should return false for unknown roles", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockResolvedValue({
        external_store_id: 12345
      });

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        "UNKNOWN_ROLE",
        1
      );

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("Error handling", () => {
    it("should return false when an error occurs", async () => {
      // Arrange
      (Store.findOne as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      // Spy on console.error to avoid cluttering test output
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Act
      const result = await StoreRepository.validateStoreAccess(
        100,
        ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        1
      );

      // Assert
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error in validateStoreAccess:",
        expect.any(Error)
      );

      // Cleanup
      consoleErrorSpy.mockRestore();
    });
  });
});
