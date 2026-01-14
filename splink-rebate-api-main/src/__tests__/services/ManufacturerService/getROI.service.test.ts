/**
 * ManufacturerService.getROI Service Tests
 *
 * Tests for the getROI service method implementation.
 * Focuses on business logic, authorization filtering, and metric calculations.
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
jest.mock("../../../db");
jest.mock("../../../models/ManufacturerProgramROI");
jest.mock("../../../models/Program");
jest.mock("../../../repositories/ManufacturerRepository");
jest.mock("../../../repositories/StoreRepository");
jest.mock("../../../repositories/ProgramRepository");
jest.mock("../../../repositories/ProductsRepository");
jest.mock("../../../repositories/DistributorRepository");
jest.mock("../../../utils/redis");
jest.mock("../../../utils/requestContext", () => ({
  getCurrentUser: jest.fn(() => ({ id: 1, role: "test" }))
}));
jest.mock("newrelic", () => ({
  startSegment: jest.fn((name, record, callback) => callback())
}));

import ManufacturerDashboardService from "../../../services/ManufacturerService";
import ManufacturerProgramROI from "../../../models/ManufacturerProgramROI";
import Program from "../../../models/Program";
import ManufacturerRepository from "../../../repositories/ManufacturerRepository";
import { Op } from "sequelize";

describe("ManufacturerService.getROI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Authorization and filtering", () => {
    it("should return empty array when program does not exist", async () => {
      // Arrange
      (Program.findByPk as jest.Mock).mockResolvedValue(null);

      // Act
      const result = await ManufacturerDashboardService.getROI(999);

      // Assert
      expect(result).toEqual([]);
      expect(Program.findByPk).toHaveBeenCalledWith(999, {
        attributes: ["manufacturerId"]
      });
      expect(ManufacturerProgramROI.findAll).not.toHaveBeenCalled();
    });

    it("should return empty array when requested distributor is not authorized", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([1, 2, 3]);

      // Act
      const result = await ManufacturerDashboardService.getROI(100, 999);

      // Assert
      expect(result).toEqual([]);
      expect(
        ManufacturerRepository.getActiveAuthorizedDistributorIds
      ).toHaveBeenCalledWith(50);
      expect(ManufacturerProgramROI.findAll).not.toHaveBeenCalled();
    });

    it("should query specific distributor when authorized", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([1, 2, 3]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue([]);

      // Act
      await ManufacturerDashboardService.getROI(100, 2);

      // Assert
      expect(ManufacturerProgramROI.findAll).toHaveBeenCalledWith({
        where: {
          programId: 100,
          distributorId: 2
        },
        order: [["rebateType", "ASC"]]
      });
    });

    it("should include aggregate and authorized distributors when no distributorId specified", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([1, 2, 3]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue([]);

      // Act
      await ManufacturerDashboardService.getROI(100);

      // Assert
      const callArgs = (ManufacturerProgramROI.findAll as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.where.programId).toBe(100);
      expect(callArgs.where.distributorId).toBeDefined();
      // Should have Op.or with Op.is null and Op.in [1,2,3]
      expect(callArgs.where.distributorId[Op.or]).toBeDefined();
      expect(callArgs.where.distributorId[Op.or]).toHaveLength(2);
    });

    it("should only query aggregate records when no authorized distributors exist", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue([]);

      // Act
      await ManufacturerDashboardService.getROI(100);

      // Assert
      const callArgs = (ManufacturerProgramROI.findAll as jest.Mock).mock
        .calls[0][0];
      expect(callArgs.where.programId).toBe(100);
      expect(callArgs.where.distributorId[Op.is]).toBeNull();
    });
  });

  describe("Metric calculations - Sales to Cost Ratio", () => {
    it("should calculate sales to cost ratio correctly", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      const mockROIData = [
        {
          toJSON: () => ({
            id: 1,
            programId: 100,
            distributorId: null,
            rebateType: "STORE",
            costOfProgram: "10000.00",
            currentYearProgramProductSales: "50000.00",
            previousYearProgramProductSales: "40000.00",
            newDoorsCount: 15,
            lastYearsDoorsCount: 100,
            newPodCount: 8,
            totalPodCount: 50
          })
        }
      ];

      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue(
        mockROIData
      );

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].salesToCostRatio).toBe(5.0); // 50000 / 10000
    });

    it("should return null for sales to cost ratio when cost is zero", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      const mockROIData = [
        {
          toJSON: () => ({
            id: 1,
            costOfProgram: "0",
            currentYearProgramProductSales: "50000.00",
            previousYearProgramProductSales: "40000.00",
            newDoorsCount: 0,
            lastYearsDoorsCount: 0,
            newPodCount: 0,
            totalPodCount: 0
          })
        }
      ];

      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue(
        mockROIData
      );

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result[0].salesToCostRatio).toBeNull();
    });

    it("should return null for sales to cost ratio when cost is null", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      const mockROIData = [
        {
          toJSON: () => ({
            id: 1,
            costOfProgram: null,
            currentYearProgramProductSales: "50000.00",
            previousYearProgramProductSales: "40000.00",
            newDoorsCount: 0,
            lastYearsDoorsCount: 0,
            newPodCount: 0,
            totalPodCount: 0
          })
        }
      ];

      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue(
        mockROIData
      );

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result[0].salesToCostRatio).toBeNull();
    });
  });

  describe("Metric calculations - Incremental Sales Lift", () => {
    it("should calculate incremental sales lift correctly with positive growth", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      const mockROIData = [
        {
          toJSON: () => ({
            id: 1,
            costOfProgram: "10000.00",
            currentYearProgramProductSales: "50000.00",
            previousYearProgramProductSales: "40000.00",
            newDoorsCount: 15,
            lastYearsDoorsCount: 100,
            newPodCount: 8,
            totalPodCount: 50
          })
        }
      ];

      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue(
        mockROIData
      );

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result[0].incrementalSalesLift).toBe(25.0); // (50000 - 40000) / 40000 * 100
    });

    it("should return 100% lift when previous year sales is zero but current year has sales", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      const mockROIData = [
        {
          toJSON: () => ({
            id: 1,
            costOfProgram: "10000.00",
            currentYearProgramProductSales: "50000.00",
            previousYearProgramProductSales: "0",
            newDoorsCount: 15,
            lastYearsDoorsCount: 100,
            newPodCount: 8,
            totalPodCount: 50
          })
        }
      ];

      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue(
        mockROIData
      );

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result[0].incrementalSalesLift).toBe(100);
    });

    it("should return 0% lift when both years are zero", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      const mockROIData = [
        {
          toJSON: () => ({
            id: 1,
            costOfProgram: "10000.00",
            currentYearProgramProductSales: "0",
            previousYearProgramProductSales: "0",
            newDoorsCount: 0,
            lastYearsDoorsCount: 0,
            newPodCount: 0,
            totalPodCount: 0
          })
        }
      ];

      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue(
        mockROIData
      );

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result[0].incrementalSalesLift).toBe(0);
    });

    it("should calculate negative lift correctly", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      const mockROIData = [
        {
          toJSON: () => ({
            id: 1,
            costOfProgram: "10000.00",
            currentYearProgramProductSales: "30000.00",
            previousYearProgramProductSales: "40000.00",
            newDoorsCount: 15,
            lastYearsDoorsCount: 100,
            newPodCount: 8,
            totalPodCount: 50
          })
        }
      ];

      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue(
        mockROIData
      );

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result[0].incrementalSalesLift).toBe(-25.0); // (30000 - 40000) / 40000 * 100
    });
  });

  describe("Metric calculations - New Doors Percentage", () => {
    it("should calculate new doors percentage correctly", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      const mockROIData = [
        {
          toJSON: () => ({
            id: 1,
            costOfProgram: "10000.00",
            currentYearProgramProductSales: "50000.00",
            previousYearProgramProductSales: "40000.00",
            newDoorsCount: 15,
            lastYearsDoorsCount: 100,
            newPodCount: 8,
            totalPodCount: 50
          })
        }
      ];

      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue(
        mockROIData
      );

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result[0].newDoorsPercentage).toBe(15.0); // 15 / 100 * 100
    });

    it("should return 100% when last year doors is zero but new doors exist", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      const mockROIData = [
        {
          toJSON: () => ({
            id: 1,
            costOfProgram: "10000.00",
            currentYearProgramProductSales: "50000.00",
            previousYearProgramProductSales: "40000.00",
            newDoorsCount: 10,
            lastYearsDoorsCount: 0,
            newPodCount: 8,
            totalPodCount: 50
          })
        }
      ];

      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue(
        mockROIData
      );

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result[0].newDoorsPercentage).toBe(100);
    });

    it("should return 0% when both last year and new doors are zero", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      const mockROIData = [
        {
          toJSON: () => ({
            id: 1,
            costOfProgram: "10000.00",
            currentYearProgramProductSales: "50000.00",
            previousYearProgramProductSales: "40000.00",
            newDoorsCount: 0,
            lastYearsDoorsCount: 0,
            newPodCount: 8,
            totalPodCount: 50
          })
        }
      ];

      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue(
        mockROIData
      );

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result[0].newDoorsPercentage).toBe(0);
    });
  });

  describe("Metric calculations - New POD Percentage", () => {
    it("should calculate new POD percentage correctly", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      const mockROIData = [
        {
          toJSON: () => ({
            id: 1,
            costOfProgram: "10000.00",
            currentYearProgramProductSales: "50000.00",
            previousYearProgramProductSales: "40000.00",
            newDoorsCount: 15,
            lastYearsDoorsCount: 100,
            newPodCount: 8,
            totalPodCount: 50
          })
        }
      ];

      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue(
        mockROIData
      );

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result[0].newPodPercentage).toBe(16.0); // 8 / 50 * 100
    });

    it("should return 0 when total POD is zero", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      const mockROIData = [
        {
          toJSON: () => ({
            id: 1,
            costOfProgram: "10000.00",
            currentYearProgramProductSales: "50000.00",
            previousYearProgramProductSales: "40000.00",
            newDoorsCount: 15,
            lastYearsDoorsCount: 100,
            newPodCount: 8,
            totalPodCount: 0
          })
        }
      ];

      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue(
        mockROIData
      );

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result[0].newPodPercentage).toBe(0);
    });
  });

  describe("Multiple rebate types", () => {
    it("should return multiple ROI records for different rebate types", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      const mockROIData = [
        {
          toJSON: () => ({
            id: 1,
            rebateType: "STORE",
            costOfProgram: "10000.00",
            currentYearProgramProductSales: "50000.00",
            previousYearProgramProductSales: "40000.00",
            newDoorsCount: 15,
            lastYearsDoorsCount: 100,
            newPodCount: 8,
            totalPodCount: 50
          })
        },
        {
          toJSON: () => ({
            id: 2,
            rebateType: "SALES_REP",
            costOfProgram: "5000.00",
            currentYearProgramProductSales: "25000.00",
            previousYearProgramProductSales: "20000.00",
            newDoorsCount: 10,
            lastYearsDoorsCount: 80,
            newPodCount: 5,
            totalPodCount: 40
          })
        }
      ];

      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue(
        mockROIData
      );

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].rebateType).toBe("STORE");
      expect(result[1].rebateType).toBe("SALES_REP");
      expect(result[0].salesToCostRatio).toBe(5.0);
      expect(result[1].salesToCostRatio).toBe(5.0);
    });
  });

  describe("Edge cases", () => {
    it("should handle null values in ROI data gracefully", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      const mockROIData = [
        {
          toJSON: () => ({
            id: 1,
            costOfProgram: null,
            currentYearProgramProductSales: null,
            previousYearProgramProductSales: null,
            newDoorsCount: null,
            lastYearsDoorsCount: null,
            newPodCount: null,
            totalPodCount: null
          })
        }
      ];

      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue(
        mockROIData
      );

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].salesToCostRatio).toBeNull();
      expect(result[0].incrementalSalesLift).toBe(0);
      expect(result[0].newDoorsPercentage).toBe(0);
      expect(result[0].newPodPercentage).toBe(0);
    });

    it("should handle empty ROI data array", async () => {
      // Arrange
      const mockProgram = { manufacturerId: 50 };
      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);
      (
        ManufacturerRepository.getActiveAuthorizedDistributorIds as jest.Mock
      ).mockResolvedValue([]);
      (ManufacturerProgramROI.findAll as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await ManufacturerDashboardService.getROI(100);

      // Assert
      expect(result).toEqual([]);
    });
  });
});
