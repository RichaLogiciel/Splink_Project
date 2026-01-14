/**
 * ManufacturerController.getROI Tests
 *
 * Tests for the new ROI endpoint controller added in this branch.
 * Focuses on request validation, error handling, and response formatting.
 */

import { Request, Response } from "express";
import ManufacturerController from "../../../controllers/ManufacturerController";
import ManufacturerDashboardService from "../../../services/ManufacturerService";
import { createMockRequestResponse } from "../../helpers/test-utils";

// Mock the service
jest.mock("../../../services/ManufacturerService");

describe("ManufacturerController.getROI", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.clearAllMocks();
    const { req, res } = createMockRequestResponse();
    mockReq = req as Partial<Request>;
    mockRes = res as Partial<Response>;
  });

  describe("Success scenarios", () => {
    it("should successfully retrieve ROI data with programId only", async () => {
      // Arrange
      mockReq.query = {
        programId: "100"
      };

      const mockROIData = [
        {
          id: 1,
          programId: 100,
          manufacturerId: 50,
          distributorId: null,
          rebateType: "STORE",
          costOfProgram: "10000.00",
          currentYearProgramProductSales: "50000.00",
          previousYearProgramProductSales: "40000.00",
          salesToCostRatio: 5.0,
          incrementalSalesLift: 25.0,
          newDoorsCount: 15,
          lastYearsDoorsCount: 100,
          newDoorsPercentage: 15.0,
          newPodCount: 8,
          totalPodCount: 50,
          newPodPercentage: 16.0
        }
      ];

      jest
        .spyOn(ManufacturerDashboardService, "getROI")
        .mockResolvedValue(mockROIData);

      // Act
      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      // Assert
      expect(ManufacturerDashboardService.getROI).toHaveBeenCalledWith(
        100,
        undefined
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockROIData
      });
    });

    it("should successfully retrieve ROI data with programId and distributorId", async () => {
      // Arrange
      mockReq.query = {
        programId: "100",
        distributorId: "5"
      };

      const mockROIData = [
        {
          id: 1,
          programId: 100,
          manufacturerId: 50,
          distributorId: 5,
          rebateType: "STORE",
          costOfProgram: "10000.00",
          currentYearProgramProductSales: "50000.00",
          previousYearProgramProductSales: "40000.00",
          salesToCostRatio: 5.0,
          incrementalSalesLift: 25.0,
          newDoorsCount: 15,
          lastYearsDoorsCount: 100,
          newDoorsPercentage: 15.0,
          newPodCount: 8,
          totalPodCount: 50,
          newPodPercentage: 16.0
        }
      ];

      jest
        .spyOn(ManufacturerDashboardService, "getROI")
        .mockResolvedValue(mockROIData);

      // Act
      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      // Assert
      expect(ManufacturerDashboardService.getROI).toHaveBeenCalledWith(100, 5);
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockROIData
      });
    });

    it("should successfully return empty array when no ROI data exists", async () => {
      // Arrange
      mockReq.query = {
        programId: "100"
      };

      jest.spyOn(ManufacturerDashboardService, "getROI").mockResolvedValue([]);

      // Act
      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: []
      });
    });
  });

  describe("Validation scenarios", () => {
    it("should return 400 error when programId is missing", async () => {
      // Arrange
      mockReq.query = {};

      // Act
      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      // Assert
      expect(ManufacturerDashboardService.getROI).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "programId is required"
      });
    });

    it("should return 400 error when programId is empty string", async () => {
      // Arrange
      mockReq.query = {
        programId: ""
      };

      // Act
      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      // Assert
      expect(ManufacturerDashboardService.getROI).not.toHaveBeenCalled();
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "programId is required"
      });
    });

    it("should convert string programId to number", async () => {
      // Arrange
      mockReq.query = {
        programId: "123"
      };

      jest.spyOn(ManufacturerDashboardService, "getROI").mockResolvedValue([]);

      // Act
      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      // Assert
      expect(ManufacturerDashboardService.getROI).toHaveBeenCalledWith(
        123,
        undefined
      );
    });

    it("should convert string distributorId to number", async () => {
      // Arrange
      mockReq.query = {
        programId: "100",
        distributorId: "456"
      };

      jest.spyOn(ManufacturerDashboardService, "getROI").mockResolvedValue([]);

      // Act
      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      // Assert
      expect(ManufacturerDashboardService.getROI).toHaveBeenCalledWith(
        100,
        456
      );
    });
  });

  describe("Error handling", () => {
    it("should handle service errors gracefully", async () => {
      // Arrange
      mockReq.query = {
        programId: "100"
      };

      const error = new Error("Database connection failed");
      jest
        .spyOn(ManufacturerDashboardService, "getROI")
        .mockRejectedValue(error);

      // Act
      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Database connection failed"
      });
    });

    it("should handle errors with status codes", async () => {
      // Arrange
      mockReq.query = {
        programId: "100"
      };

      const error: any = new Error("Unauthorized");
      error.statusCode = 401;

      jest
        .spyOn(ManufacturerDashboardService, "getROI")
        .mockRejectedValue(error);

      // Act
      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Unauthorized"
      });
    });

    it("should handle generic errors", async () => {
      // Arrange
      mockReq.query = {
        programId: "100"
      };

      jest
        .spyOn(ManufacturerDashboardService, "getROI")
        .mockRejectedValue(new Error("Unexpected error"));

      // Act
      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Unexpected error"
      });
    });
  });

  describe("Edge cases", () => {
    it("should handle programId as 0", async () => {
      // Arrange
      mockReq.query = {
        programId: "0"
      };

      jest.spyOn(ManufacturerDashboardService, "getROI").mockResolvedValue([]);

      // Act
      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      // Assert
      expect(ManufacturerDashboardService.getROI).toHaveBeenCalledWith(
        0,
        undefined
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should handle distributorId as 0", async () => {
      // Arrange
      mockReq.query = {
        programId: "100",
        distributorId: "0"
      };

      jest.spyOn(ManufacturerDashboardService, "getROI").mockResolvedValue([]);

      // Act
      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      // Assert
      expect(ManufacturerDashboardService.getROI).toHaveBeenCalledWith(100, 0);
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });

    it("should handle very large programId", async () => {
      // Arrange
      mockReq.query = {
        programId: "999999999"
      };

      jest.spyOn(ManufacturerDashboardService, "getROI").mockResolvedValue([]);

      // Act
      await ManufacturerController.getROI(
        mockReq as Request,
        mockRes as Response
      );

      // Assert
      expect(ManufacturerDashboardService.getROI).toHaveBeenCalledWith(
        999999999,
        undefined
      );
      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });
});
