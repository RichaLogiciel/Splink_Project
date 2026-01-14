/**
 * DistributorService Tests
 *
 * Tests for distributor business logic
 * Focuses on warehouse management and delegation methods
 */

jest.mock("../../repositories/DistributorRepository");

import DistributorService from "../../services/DistributorService";
import DistributorRepository from "../../repositories/DistributorRepository";

describe("DistributorService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getDistributorWarehouses", () => {
    it("should retrieve distributor warehouses successfully", async () => {
      // Arrange
      const distributorId = 100;
      const mockWarehouses = [
        { id: 1, name: "Warehouse A", location: "Location A" },
        { id: 2, name: "Warehouse B", location: "Location B" }
      ];
      (
        DistributorRepository.getDistributorWarehouses as jest.Mock
      ).mockResolvedValue(mockWarehouses);

      // Act
      const result =
        await DistributorService.getDistributorWarehouses(distributorId);

      // Assert
      expect(
        DistributorRepository.getDistributorWarehouses
      ).toHaveBeenCalledWith(distributorId);
      expect(result).toEqual(mockWarehouses);
    });

    it("should return empty array when no warehouses found", async () => {
      // Arrange
      const distributorId = 100;
      (
        DistributorRepository.getDistributorWarehouses as jest.Mock
      ).mockResolvedValue([]);

      // Act
      const result =
        await DistributorService.getDistributorWarehouses(distributorId);

      // Assert
      expect(result).toEqual([]);
    });

    it("should handle repository errors", async () => {
      // Arrange
      const distributorId = 100;
      const mockError = new Error("Database connection failed");
      (
        DistributorRepository.getDistributorWarehouses as jest.Mock
      ).mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        DistributorService.getDistributorWarehouses(distributorId)
      ).rejects.toThrow("Database connection failed");
    });
  });

  describe("getDistributorManagerWarehouses", () => {
    const distributorId = 100;
    const managerId = 200;

    it("should return only assigned warehouses when returnAssigned is true", async () => {
      // Arrange
      const mockAssignedWarehouses = [
        { id: 1, name: "Warehouse A" },
        { id: 2, name: "Warehouse B" }
      ];
      (
        DistributorRepository.getDistributorManagerWarehouses as jest.Mock
      ).mockResolvedValue(mockAssignedWarehouses);

      // Act
      const result = await DistributorService.getDistributorManagerWarehouses(
        distributorId,
        managerId,
        true
      );

      // Assert
      expect(
        DistributorRepository.getDistributorManagerWarehouses
      ).toHaveBeenCalledWith(managerId, distributorId, true, undefined, undefined);
      expect(result).toEqual(mockAssignedWarehouses);
    });

    it("should return both assigned and unassigned warehouses when returnAssigned is false", async () => {
      // Arrange
      const mockAssignedWarehouses = [{ id: 1, name: "Warehouse A" }];
      const mockUnassignedWarehouses = [{ id: 2, name: "Warehouse B" }];

      (DistributorRepository.getDistributorManagerWarehouses as jest.Mock)
        .mockResolvedValueOnce(mockAssignedWarehouses)
        .mockResolvedValueOnce(mockUnassignedWarehouses);

      // Act
      const result = await DistributorService.getDistributorManagerWarehouses(
        distributorId,
        managerId,
        false
      );

      // Assert
      expect(
        DistributorRepository.getDistributorManagerWarehouses
      ).toHaveBeenCalledTimes(2);
      expect(
        DistributorRepository.getDistributorManagerWarehouses
      ).toHaveBeenNthCalledWith(1, managerId, distributorId, true, undefined, undefined);
      expect(
        DistributorRepository.getDistributorManagerWarehouses
      ).toHaveBeenNthCalledWith(2, managerId, distributorId, false, undefined, undefined);
      expect(result).toEqual({
        warehouses: {
          assigned: mockAssignedWarehouses,
          unassigned: mockUnassignedWarehouses
        }
      });
    });

    it("should return both when returnAssigned is undefined (default)", async () => {
      // Arrange
      const mockAssignedWarehouses = [{ id: 1, name: "Warehouse A" }];
      const mockUnassignedWarehouses = [{ id: 2, name: "Warehouse B" }];

      (DistributorRepository.getDistributorManagerWarehouses as jest.Mock)
        .mockResolvedValueOnce(mockAssignedWarehouses)
        .mockResolvedValueOnce(mockUnassignedWarehouses);

      // Act
      const result = await DistributorService.getDistributorManagerWarehouses(
        distributorId,
        managerId
      );

      // Assert
      expect(
        DistributorRepository.getDistributorManagerWarehouses
      ).toHaveBeenCalledTimes(2);
      expect(result.warehouses.assigned).toEqual(mockAssignedWarehouses);
      expect(result.warehouses.unassigned).toEqual(mockUnassignedWarehouses);
    });

    it("should pass isAdminOrExecutive flag to repository for assigned warehouses", async () => {
      // Arrange
      const mockWarehouses = [{ id: 1, name: "Warehouse A" }];
      (
        DistributorRepository.getDistributorManagerWarehouses as jest.Mock
      ).mockResolvedValue(mockWarehouses);

      // Act
      await DistributorService.getDistributorManagerWarehouses(
        distributorId,
        managerId,
        true,
        true
      );

      // Assert
      expect(
        DistributorRepository.getDistributorManagerWarehouses
      ).toHaveBeenCalledWith(managerId, distributorId, true, true, undefined);
    });

    it("should handle empty assigned warehouses", async () => {
      // Arrange
      const mockUnassignedWarehouses = [{ id: 2, name: "Warehouse B" }];

      (DistributorRepository.getDistributorManagerWarehouses as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce(mockUnassignedWarehouses);

      // Act
      const result = await DistributorService.getDistributorManagerWarehouses(
        distributorId,
        managerId,
        false
      );

      // Assert
      expect(result.warehouses.assigned).toEqual([]);
      expect(result.warehouses.unassigned).toEqual(mockUnassignedWarehouses);
    });

    it("should handle empty unassigned warehouses", async () => {
      // Arrange
      const mockAssignedWarehouses = [{ id: 1, name: "Warehouse A" }];

      (DistributorRepository.getDistributorManagerWarehouses as jest.Mock)
        .mockResolvedValueOnce(mockAssignedWarehouses)
        .mockResolvedValueOnce([]);

      // Act
      const result = await DistributorService.getDistributorManagerWarehouses(
        distributorId,
        managerId,
        false
      );

      // Assert
      expect(result.warehouses.assigned).toEqual(mockAssignedWarehouses);
      expect(result.warehouses.unassigned).toEqual([]);
    });

    it("should handle repository errors", async () => {
      // Arrange
      const mockError = new Error("Database error");
      (
        DistributorRepository.getDistributorManagerWarehouses as jest.Mock
      ).mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        DistributorService.getDistributorManagerWarehouses(
          distributorId,
          managerId,
          true
        )
      ).rejects.toThrow("Database error");
    });
  });

  describe("updateDistributorManagerWarehouseAssignment", () => {
    it("should update warehouse assignment successfully", async () => {
      // Arrange
      const distributorId = 100;
      const managerId = 200;
      const warehouseId = 300;
      const mockResult = { success: true, message: "Assignment updated" };

      (
        DistributorRepository.updateDistributorManagerWarehouseAssignment as jest.Mock
      ).mockResolvedValue(mockResult);

      // Act
      const result =
        await DistributorService.updateDistributorManagerWarehouseAssignment(
          distributorId,
          managerId,
          warehouseId
        );

      // Assert
      expect(
        DistributorRepository.updateDistributorManagerWarehouseAssignment
      ).toHaveBeenCalledWith(distributorId, managerId, warehouseId);
      expect(result).toEqual(mockResult);
    });

    it("should handle update errors", async () => {
      // Arrange
      const distributorId = 100;
      const managerId = 200;
      const warehouseId = 300;
      const mockError = new Error("Update failed");

      (
        DistributorRepository.updateDistributorManagerWarehouseAssignment as jest.Mock
      ).mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        DistributorService.updateDistributorManagerWarehouseAssignment(
          distributorId,
          managerId,
          warehouseId
        )
      ).rejects.toThrow("Update failed");
    });
  });
});
