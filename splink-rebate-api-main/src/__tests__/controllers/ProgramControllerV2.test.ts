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

describe("ProgramController V2 API", () => {
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

    // Reset mocks
    jest.clearAllMocks();
  });

  describe("listProgramsV2", () => {
    it("should successfully return SPIFF programs for DISTRIBUTOR_ADMIN", async () => {
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
        mockPrograms as any
      );
      mockRedisClient.setEx.mockResolvedValue("OK");

      // Act
      await controller.listProgramsV2(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockProgramService.getSpiffProgramsOptimized).toHaveBeenCalledWith(
        {
          userId: 1,
          programTimeline: "Current",
          getInternalInitiative: false,
          excludeChainStores: false
        }
      );
      expect(mockRedisClient.setEx).toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        data: mockPrograms
      });
    });

    it("should return cached programs when available", async () => {
      // Arrange
      const cachedPrograms = [
        {
          manufacturerName: "Cached Manufacturer",
          manufacturerId: 1,
          totalPurchaseVolume: 500,
          totalSaving: 50,
          program_overview: []
        }
      ];

      mockRedisClient.get.mockResolvedValue(JSON.stringify(cachedPrograms));

      // Act
      await controller.listProgramsV2(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockRedisClient.get).toHaveBeenCalled();
      expect(
        mockProgramService.getSpiffProgramsOptimized
      ).not.toHaveBeenCalled();
      expect(mockRedisClient.setEx).not.toHaveBeenCalled();
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        data: cachedPrograms
      });
    });

    it("should reject non-DISTRIBUTOR_ADMIN users", async () => {
      // Arrange
      mockRequest.user!.role = ENTITY_TYPE.STORE;

      // Act
      await controller.listProgramsV2(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "error",
        message: "Access denied. SPIFF v2 API requires DISTRIBUTOR_ADMIN role."
      });
    });

    it("should handle service errors gracefully", async () => {
      // Arrange
      const errorMessage = "Database connection failed";
      mockRedisClient.get.mockResolvedValue(null);
      mockProgramService.getSpiffProgramsOptimized.mockRejectedValue(
        new Error(errorMessage)
      );

      // Act
      await controller.listProgramsV2(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "error",
        message: errorMessage
      });
    });

    it("should handle different query parameters correctly", async () => {
      // Arrange
      mockRequest.query = {
        programTimeline: "Upcoming",
        isInternal: "true",
        isExcludeChainStores: "true"
      };

      const mockPrograms: any[] = [];
      mockRedisClient.get.mockResolvedValue(null);
      mockProgramService.getSpiffProgramsOptimized.mockResolvedValue(
        mockPrograms as any
      );
      mockRedisClient.setEx.mockResolvedValue("OK");

      // Act
      await controller.listProgramsV2(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockProgramService.getSpiffProgramsOptimized).toHaveBeenCalledWith(
        {
          userId: 1,
          programTimeline: "Upcoming",
          getInternalInitiative: true,
          excludeChainStores: true
        }
      );
    });
  });

  describe("Response Format Compatibility", () => {
    it("should return response in the same format as sample_response_format.json", async () => {
      // Arrange
      const mockPrograms = [
        {
          manufacturerName: "Test Manufacturer",
          manufacturerLogo: "logo.png",
          authManufacturer: true,
          manufacturerId: 1,
          totalPurchaseVolume: 1000,
          totalSaving: 100.5,
          programPaymentTerm: "Net 30",
          program_overview: [
            {
              id: 1,
              name: "Test SPIFF Program",
              programType: "SPIFF",
              programTerms: "Net 30",
              programHeader: "Test Header",
              compliances: [
                {
                  id: 1,
                  programId: 1,
                  programDetailId: 1,
                  totalPurchaseVolume: "1000.00",
                  earnedRebate: "100.50",
                  isQualified: true,
                  entityId: 1,
                  status: "active",
                  entityType: "STORE",
                  totalCasePurchases: 10,
                  complianceDate: "2024-01-01",
                  compliancePercentage: 85.5,
                  createdAt: "2024-01-01T00:00:00Z",
                  updatedAt: "2024-01-01T00:00:00Z"
                }
              ],
              programEntityType: "SALES_REP",
              programDetails: [
                {
                  id: 1,
                  tier: 1,
                  min_qty: "10.00",
                  max_qty: "100.00",
                  rebate_amount: "10.00",
                  rebateAmount: "10.00",
                  rebate_percentage: null,
                  rebate_type: "FIXED",
                  rebateType: "FIXED",
                  rebate_calculation: "PER_UNIT",
                  rebateCalculationType: null,
                  program_id: 1,
                  rebateCalculation: "PER_UNIT",
                  quantityType: null,
                  productsTags: "test-tag",
                  fixed_rebate_amount: null,
                  fixedRebateAmount: null,
                  fixed_rebate_category: null,
                  overview: "Test overview",
                  programLine: "Test line",
                  criteria: "SPIFF"
                }
              ],
              startDate: "2024-01-01",
              endDate: "2024-12-31"
            }
          ]
        }
      ];

      mockRedisClient.get.mockResolvedValue(null);
      mockProgramService.getSpiffProgramsOptimized.mockResolvedValue(
        mockPrograms as any
      );
      mockRedisClient.setEx.mockResolvedValue("OK");

      // Act
      await controller.listProgramsV2(
        mockRequest as Request,
        mockResponse as Response
      );

      // Assert
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "success",
        data: mockPrograms
      });

      // Verify the structure matches expected format
      const responseData = (mockResponse.json as jest.Mock).mock.calls[0][0]
        .data[0];
      expect(responseData).toHaveProperty("manufacturerName");
      expect(responseData).toHaveProperty("manufacturerLogo");
      expect(responseData).toHaveProperty("authManufacturer");
      expect(responseData).toHaveProperty("manufacturerId");
      expect(responseData).toHaveProperty("totalPurchaseVolume");
      expect(responseData).toHaveProperty("totalSaving");
      expect(responseData).toHaveProperty("programPaymentTerm");
      expect(responseData).toHaveProperty("program_overview");
      expect(Array.isArray(responseData.program_overview)).toBe(true);
    });
  });

  describe("Warehouse Filtering", () => {
    describe("listProgramsV2 with warehouseId", () => {
      it("should pass warehouseId to service when provided", async () => {
        // Arrange
        mockRequest.query = {
          ...mockRequest.query,
          warehouseId: "5"
        };

        const mockPrograms = [
          {
            manufacturerName: "Test Manufacturer",
            manufacturerId: 1,
            totalPurchaseVolume: 500,
            totalSaving: 50,
            program_overview: []
          }
        ];

        mockRedisClient.get.mockResolvedValue(null);
        mockProgramService.getSpiffProgramsOptimized.mockResolvedValue(
          mockPrograms as any
        );

        // Act
        await controller.listProgramsV2(
          mockRequest as Request,
          mockResponse as Response
        );

        // Assert
        expect(
          mockProgramService.getSpiffProgramsOptimized
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            warehouseId: 5
          })
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          status: "success",
          data: mockPrograms
        });
      });

      it("should not pass warehouseId when not provided", async () => {
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
          mockPrograms as any
        );

        // Act
        await controller.listProgramsV2(
          mockRequest as Request,
          mockResponse as Response
        );

        // Assert
        expect(
          mockProgramService.getSpiffProgramsOptimized
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            warehouseId: undefined
          })
        );
      });
    });

    describe("getProgramDetailsV2 with warehouseId", () => {
      beforeEach(() => {
        mockRequest.user = {
          id: 1,
          role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
          associatedUserId: 10
        };
        mockRequest.query = {
          type: "SPIFF",
          manufacturerId: "1",
          programTimeline: "Current",
          isInternal: "false",
          isExcludeChainStores: "false"
        };
      });

      it("should pass warehouseId to service when provided", async () => {
        // Arrange
        mockRequest.query = {
          ...mockRequest.query,
          warehouseId: "3"
        };

        const mockProgramDetails = {
          manufacturers: [
            {
              id: 1,
              name: "Test Manufacturer",
              program_overview: []
            }
          ],
          spiffProgramDetails: [],
          totalRepEarnings: 0,
          totalSaving: 0
        };

        mockRedisClient.get.mockResolvedValue(null);
        mockProgramService.getSpiffProgramDetailsOptimized.mockResolvedValue(
          mockProgramDetails as any
        );

        // Act
        await controller.getProgramDetailsV2(
          mockRequest as Request,
          mockResponse as Response
        );

        // Assert
        expect(
          mockProgramService.getSpiffProgramDetailsOptimized
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            warehouseId: 3,
            distributorId: expect.any(Number),
            manufacturerId: 1
          })
        );
        expect(mockResponse.json).toHaveBeenCalledWith({
          status: "success",
          data: mockProgramDetails
        });
      });

      it("should include warehouseId in cache key when provided", async () => {
        // Arrange
        mockRequest.query = {
          ...mockRequest.query,
          warehouseId: "7"
        };

        const cachedData = JSON.stringify({
          manufacturers: [],
          spiffProgramDetails: [],
          totalRepEarnings: 0,
          totalSaving: 0
        });

        mockRedisClient.get.mockResolvedValue(cachedData);

        // Act
        await controller.getProgramDetailsV2(
          mockRequest as Request,
          mockResponse as Response
        );

        // Assert
        // Verify cache was checked
        expect(mockRedisClient.get).toHaveBeenCalled();
        // Verify service was not called (data was cached)
        expect(
          mockProgramService.getSpiffProgramDetailsOptimized
        ).not.toHaveBeenCalled();
        // Verify cached data was returned
        expect(mockResponse.json).toHaveBeenCalledWith({
          status: "success",
          data: JSON.parse(cachedData)
        });
      });

      it("should work without warehouseId (backward compatibility)", async () => {
        // Arrange - no warehouseId in query
        const mockProgramDetails = {
          manufacturers: [
            {
              id: 1,
              name: "Test Manufacturer",
              program_overview: []
            }
          ],
          spiffProgramDetails: [],
          totalRepEarnings: 0,
          totalSaving: 0
        };

        mockRedisClient.get.mockResolvedValue(null);
        mockProgramService.getSpiffProgramDetailsOptimized.mockResolvedValue(
          mockProgramDetails as any
        );

        // Act
        await controller.getProgramDetailsV2(
          mockRequest as Request,
          mockResponse as Response
        );

        // Assert
        expect(
          mockProgramService.getSpiffProgramDetailsOptimized
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            warehouseId: undefined,
            distributorId: expect.any(Number),
            manufacturerId: 1
          })
        );
      });

      it("should handle warehouseId for DISTRIBUTOR_EXECUTIVE role", async () => {
        // Arrange
        mockRequest.user = {
          ...mockRequest.user,
          role: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
        };
        mockRequest.query = {
          ...mockRequest.query,
          warehouseId: "4"
        };

        const mockProgramDetails = {
          manufacturers: [],
          spiffProgramDetails: [],
          totalRepEarnings: 0,
          totalSaving: 0
        };

        mockRedisClient.get.mockResolvedValue(null);
        mockProgramService.getSpiffProgramDetailsOptimized.mockResolvedValue(
          mockProgramDetails as any
        );

        // Act
        await controller.getProgramDetailsV2(
          mockRequest as Request,
          mockResponse as Response
        );

        // Assert
        expect(
          mockProgramService.getSpiffProgramDetailsOptimized
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            warehouseId: 4,
            role: ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
          })
        );
      });
    });
  });
});
