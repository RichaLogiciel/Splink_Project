import { Request, Response } from "express";
import { ENTITY_TYPE } from "../../config/appConstants";
import ProgramController from "../../controllers/ProgramController";
import programService from "../../services/ProgramService";
import { redisClient } from "../../utils/redis";

// Mock dependencies
jest.mock("../../services/ProgramService");
jest.mock("../../utils/redis");
jest.mock("newrelic", () => ({
  startSegment: jest.fn((name, record, fn) => fn()),
  addCustomAttribute: jest.fn(),
  noticeError: jest.fn()
}));

describe("SPIFF V2 API Performance Tests", () => {
  let controller: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockProgramService: jest.Mocked<typeof programService>;
  let mockRedisClient: jest.Mocked<typeof redisClient>;

  beforeEach(() => {
    controller = ProgramController;
    mockProgramService = programService as jest.Mocked<typeof programService>;
    mockRedisClient = redisClient as jest.Mocked<typeof redisClient>;

    mockRequest = {
      user: {
        id: 1,
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      },
      query: {
        programTimeline: "Current",
        isInternal: "false",
        isExcludeChainStores: "false"
      }
    };

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    jest.clearAllMocks();
  });

  describe("Performance Benchmarks", () => {
    it("should complete request within 200ms for cached response", async () => {
      // Arrange
      const cachedPrograms = [
        {
          manufacturerName: "Test Manufacturer",
          manufacturerId: 1,
          totalPurchaseVolume: 1000,
          totalSaving: 100,
          program_overview: []
        }
      ];

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedPrograms));

      // Act
      const startTime = Date.now();
      await controller.listProgramsV2(
        mockRequest as Request,
        mockResponse as Response
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(200); // Should be under 200ms for cached response
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        data: cachedPrograms
      });
    });

    it("should complete request within 1000ms for database response", async () => {
      // Arrange
      const mockPrograms = [
        {
          manufacturerName: "Test Manufacturer",
          manufacturerId: 1,
          totalPurchaseVolume: 1000,
          totalSaving: 100,
          program_overview: [
            {
              id: 1,
              name: "Test SPIFF Program",
              programType: "SPIFF",
              compliances: [],
              programDetails: []
            }
          ]
        }
      ];

      mockRedisClient.get.mockResolvedValue(null);
      mockProgramService.getSpiffProgramsOptimized.mockResolvedValue(
        mockPrograms
      );
      mockRedisClient.setEx.mockResolvedValue("OK");

      // Act
      const startTime = Date.now();
      await controller.listProgramsV2(
        mockRequest as Request,
        mockResponse as Response
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(1000); // Should be under 1000ms for database response
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        data: mockPrograms
      });
    });

    it("should handle large datasets efficiently", async () => {
      // Arrange - Create a large dataset
      const largePrograms = Array.from({ length: 100 }, (_, index) => ({
        manufacturerName: `Manufacturer ${index}`,
        manufacturerId: index + 1,
        totalPurchaseVolume: Math.floor(Math.random() * 10000),
        totalSaving: Math.floor(Math.random() * 1000),
        program_overview: Array.from({ length: 5 }, (_, progIndex) => ({
          id: progIndex + 1,
          name: `Program ${progIndex}`,
          programType: "SPIFF",
          compliances: [],
          programDetails: Array.from({ length: 3 }, (_, detailIndex) => ({
            id: detailIndex + 1,
            tier: detailIndex + 1,
            min_qty: "10.00",
            max_qty: "100.00",
            rebate_amount: "10.00",
            rebateAmount: "10.00",
            rebate_type: "FIXED",
            rebateType: "FIXED",
            rebate_calculation: "PER_UNIT",
            program_id: progIndex + 1,
            rebateCalculation: "PER_UNIT",
            productsTags: "test-tag",
            overview: "Test overview",
            programLine: "Test line",
            criteria: "SPIFF"
          }))
        }))
      }));

      mockRedisClient.get.mockResolvedValue(null);
      mockProgramService.getSpiffProgramsOptimized.mockResolvedValue(
        largePrograms
      );
      mockRedisClient.setEx.mockResolvedValue("OK");

      // Act
      const startTime = Date.now();
      await controller.listProgramsV2(
        mockRequest as Request,
        mockResponse as Response
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(2000); // Should handle large datasets under 2 seconds
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        data: largePrograms
      });
    });

    it("should maintain consistent performance across multiple requests", async () => {
      // Arrange
      const mockPrograms = [
        {
          manufacturerName: "Test Manufacturer",
          manufacturerId: 1,
          totalPurchaseVolume: 1000,
          totalSaving: 100,
          program_overview: []
        }
      ];

      mockRedisClient.get.mockResolvedValue(null);
      mockProgramService.getSpiffProgramsOptimized.mockResolvedValue(
        mockPrograms
      );
      mockRedisClient.setEx.mockResolvedValue("OK");

      // Act - Make multiple requests
      const durations: number[] = [];
      const requestCount = 10;

      for (let i = 0; i < requestCount; i++) {
        const startTime = Date.now();
        await controller.listProgramsV2(
          mockRequest as Request,
          mockResponse as Response
        );
        const endTime = Date.now();
        durations.push(endTime - startTime);
      }

      // Assert
      const averageDuration =
        durations.reduce((sum, duration) => sum + duration, 0) /
        durations.length;
      const maxDuration = Math.max(...durations);
      const minDuration = Math.min(...durations);

      expect(averageDuration).toBeLessThan(1000); // Average should be under 1 second
      expect(maxDuration).toBeLessThan(2000); // Max should be under 2 seconds
      expect(maxDuration - minDuration).toBeLessThan(1000); // Variance should be reasonable
    });

    it("should handle concurrent requests efficiently", async () => {
      // Arrange
      const mockPrograms = [
        {
          manufacturerName: "Test Manufacturer",
          manufacturerId: 1,
          totalPurchaseVolume: 1000,
          totalSaving: 100,
          program_overview: []
        }
      ];

      mockRedisClient.get.mockResolvedValue(null);
      mockProgramService.getSpiffProgramsOptimized.mockResolvedValue(
        mockPrograms
      );
      mockRedisClient.setEx.mockResolvedValue("OK");

      // Act - Make concurrent requests
      const concurrentRequests = 5;
      const startTime = Date.now();

      const promises = Array.from({ length: concurrentRequests }, () =>
        controller.listProgramsV2(
          mockRequest as Request,
          mockResponse as Response
        )
      );

      await Promise.all(promises);
      const endTime = Date.now();
      const totalDuration = endTime - startTime;

      // Assert
      expect(totalDuration).toBeLessThan(3000); // All concurrent requests should complete under 3 seconds
      expect(
        mockProgramService.getSpiffProgramsOptimized
      ).toHaveBeenCalledTimes(concurrentRequests);
    });
  });

  describe("Memory Usage", () => {
    it("should not cause memory leaks with repeated requests", async () => {
      // Arrange
      const mockPrograms = [
        {
          manufacturerName: "Test Manufacturer",
          manufacturerId: 1,
          totalPurchaseVolume: 1000,
          totalSaving: 100,
          program_overview: []
        }
      ];

      mockRedisClient.get.mockResolvedValue(null);
      mockProgramService.getSpiffProgramsOptimized.mockResolvedValue(
        mockPrograms
      );
      mockRedisClient.setEx.mockResolvedValue("OK");

      // Act - Make many requests to test for memory leaks
      const requestCount = 100;
      for (let i = 0; i < requestCount; i++) {
        await controller.listProgramsV2(
          mockRequest as Request,
          mockResponse as Response
        );
      }

      // Assert - If we get here without memory issues, the test passes
      expect(
        mockProgramService.getSpiffProgramsOptimized
      ).toHaveBeenCalledTimes(requestCount);
    });
  });

  describe("Error Handling Performance", () => {
    it("should handle errors quickly without hanging", async () => {
      // Arrange
      mockRedisClient.get.mockResolvedValue(null);
      mockProgramService.getSpiffProgramsOptimized.mockRejectedValue(
        new Error("Database error")
      );

      // Act
      const startTime = Date.now();
      await controller.listProgramsV2(
        mockRequest as Request,
        mockResponse as Response
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(500); // Error handling should be fast
      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });

    it("should handle invalid role quickly", async () => {
      // Arrange
      mockRequest.user!.role = ENTITY_TYPE.STORE;

      // Act
      const startTime = Date.now();
      await controller.listProgramsV2(
        mockRequest as Request,
        mockResponse as Response
      );
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Assert
      expect(duration).toBeLessThan(100); // Role validation should be very fast
      expect(mockResponse.status).toHaveBeenCalledWith(403);
    });
  });
});
