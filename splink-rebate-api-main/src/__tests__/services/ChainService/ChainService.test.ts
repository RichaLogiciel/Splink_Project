/**
 * ChainService Tests
 *
 * Tests for ChainService business logic methods
 * Focuses on utility methods and access control validation
 */

// Mock dependencies before imports
jest.mock("../../../repositories/ChainRepository");
jest.mock("../../../repositories/ProgramRepository");
jest.mock("../../../repositories/ManufacturerRepository");
jest.mock("../../../repositories/StoreRepository");
jest.mock("../../../utils/redis");
jest.mock("newrelic");

import chainService from "../../../services/ChainService";
import { ENTITY_TYPE } from "../../../config/appConstants";
import UserRole from "../../../models/UserRole";

describe("ChainService - Utility Methods", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("validateChainAccess", () => {
    it("should return true when chainView is false", () => {
      // Arrange
      const mockUserRole = {
        role: ENTITY_TYPE.STORE
      } as UserRole;

      // Act
      const result = chainService.validateChainAccess(mockUserRole, false);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for DISTRIBUTOR_ADMIN with chainView true", () => {
      // Arrange
      const mockUserRole = {
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      } as UserRole;

      // Act
      const result = chainService.validateChainAccess(mockUserRole, true);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for DISTRIBUTOR_EXECUTIVE with chainView true", () => {
      // Arrange
      const mockUserRole = {
        role: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
      } as UserRole;

      // Act
      const result = chainService.validateChainAccess(mockUserRole, true);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for CHAIN_ADMIN with chainView true", () => {
      // Arrange
      const mockUserRole = {
        role: ENTITY_TYPE.CHAIN_ADMIN
      } as UserRole;

      // Act
      const result = chainService.validateChainAccess(mockUserRole, true);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false for DISTRIBUTOR_SALES_REP with chainView true", () => {
      // Arrange
      const mockUserRole = {
        role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP
      } as UserRole;

      // Act
      const result = chainService.validateChainAccess(mockUserRole, true);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for STORE role with chainView true", () => {
      // Arrange
      const mockUserRole = {
        role: ENTITY_TYPE.STORE
      } as UserRole;

      // Act
      const result = chainService.validateChainAccess(mockUserRole, true);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for MANUFACTURER role with chainView true", () => {
      // Arrange
      const mockUserRole = {
        role: ENTITY_TYPE.MANUFACTURER
      } as UserRole;

      // Act
      const result = chainService.validateChainAccess(mockUserRole, true);

      // Assert
      expect(result).toBe(false);
    });

    it("should return true for DISTRIBUTOR_SALES_MANAGER with chainView true", () => {
      // Arrange
      const mockUserRole = {
        role: ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
      } as UserRole;

      // Act
      const result = chainService.validateChainAccess(mockUserRole, true);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false for DISTRIBUTOR_GENERAL_MANAGER with chainView true", () => {
      // Arrange - General Manager is not in the isDistributorAdminAndExecutive check
      const mockUserRole = {
        role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER
      } as UserRole;

      // Act
      const result = chainService.validateChainAccess(mockUserRole, true);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("Service Structure", () => {
    it("should have all required public methods", () => {
      expect(chainService).toBeDefined();
      expect(typeof chainService.validateChainAccess).toBe("function");
      expect(typeof chainService.getChainProgramDetails).toBe("function");
      expect(typeof chainService.getChainsByDistributor).toBe("function");
      expect(typeof chainService.getChainDetails).toBe("function");
      expect(typeof chainService.getChainAggregations).toBe("function");
    });
  });
});
