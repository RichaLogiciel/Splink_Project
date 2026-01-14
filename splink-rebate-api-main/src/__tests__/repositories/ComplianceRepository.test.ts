// Mock all dependencies at the top
jest.mock("../../db", () => ({
  query: jest.fn()
}));

jest.mock("../../lib/errors/APIError", () => ({
  ApiError: {
    internal: jest.fn((message: string) => new Error(message))
  }
}));

jest.mock("../../models/ProgramCompliance", () => ({
  findAll: jest.fn(),
  hasMany: jest.fn(),
  belongsTo: jest.fn()
}));

jest.mock("../../models/ProgramParticipant", () => ({
  hasMany: jest.fn(),
  belongsTo: jest.fn()
}));

jest.mock("../../models/ProgramStoreIneligibility", () => ({
  hasMany: jest.fn(),
  belongsTo: jest.fn()
}));

import sequelize from "../../db";
import ComplianceRepository from "../../repositories/ComplianceRepository";
import { ApiError } from "../../lib/errors/APIError";
import { QueryTypes } from "sequelize";

describe("ComplianceRepository", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear console.log mock
    jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("getComplianceAggregates", () => {
    const mockDistributorId = 327;
    const mockProgramIds = [313, 314, 315];
    const mockWarehouseIds = [148, 149, 150];

    describe("success scenarios", () => {
      it("should return aggregated savings with only distributorId", async () => {
        // Arrange
        const mockResult = [{ total_savings: "15000.50" }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockResult);

        // Act
        const result = await ComplianceRepository.getComplianceAggregates({
          distributorId: mockDistributorId
        });

        // Assert
        expect(result).toEqual({
          totalSavings: 15000.5,
          totalStores: 0,
          enrolledStores: 0
        });

        expect(sequelize.query).toHaveBeenCalledWith(
          expect.stringContaining("FROM distributor_program_aggregations dpa"),
          {
            type: QueryTypes.SELECT,
            bind: [mockDistributorId]
          }
        );

        expect(sequelize.query).toHaveBeenCalledWith(
          expect.stringContaining("dpa.distributor_id = $1"),
          expect.any(Object)
        );

        expect(sequelize.query).toHaveBeenCalledWith(
          expect.stringContaining("dpa.participant_type = 'STORE'"),
          expect.any(Object)
        );
      });

      it("should return aggregated savings with distributorId and programIds", async () => {
        // Arrange
        const mockResult = [{ total_savings: "8500.75" }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockResult);

        // Act
        const result = await ComplianceRepository.getComplianceAggregates({
          distributorId: mockDistributorId,
          programIds: mockProgramIds
        });

        // Assert
        expect(result).toEqual({
          totalSavings: 8500.75,
          totalStores: 0,
          enrolledStores: 0
        });

        expect(sequelize.query).toHaveBeenCalledWith(
          expect.stringContaining("dpa.program_id = ANY($2)"),
          {
            type: QueryTypes.SELECT,
            bind: [mockDistributorId, mockProgramIds]
          }
        );
      });

      it("should return aggregated savings with distributorId and warehouseIds", async () => {
        // Arrange
        const mockResult = [{ total_savings: "12000.00" }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockResult);

        // Act
        const result = await ComplianceRepository.getComplianceAggregates({
          distributorId: mockDistributorId,
          warehouseIds: mockWarehouseIds
        });

        // Assert
        expect(result).toEqual({
          totalSavings: 12000,
          totalStores: 0,
          enrolledStores: 0
        });

        expect(sequelize.query).toHaveBeenCalledWith(
          expect.stringContaining("dpa.warehouse_id = ANY($2)"),
          {
            type: QueryTypes.SELECT,
            bind: [mockDistributorId, mockWarehouseIds]
          }
        );
      });

      it("should return aggregated savings with all filters (distributorId, warehouseIds, programIds)", async () => {
        // Arrange
        const mockResult = [{ total_savings: "5500.25" }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockResult);

        // Act
        const result = await ComplianceRepository.getComplianceAggregates({
          distributorId: mockDistributorId,
          warehouseIds: mockWarehouseIds,
          programIds: mockProgramIds
        });

        // Assert
        expect(result).toEqual({
          totalSavings: 5500.25,
          totalStores: 0,
          enrolledStores: 0
        });

        expect(sequelize.query).toHaveBeenCalledWith(
          expect.stringContaining("dpa.warehouse_id = ANY($2)"),
          expect.any(Object)
        );

        expect(sequelize.query).toHaveBeenCalledWith(
          expect.stringContaining("dpa.program_id = ANY($3)"),
          {
            type: QueryTypes.SELECT,
            bind: [mockDistributorId, mockWarehouseIds, mockProgramIds]
          }
        );
      });

      it("should include both stores_earnings and chains_stores_earnings in the sum", async () => {
        // Arrange
        const mockResult = [{ total_savings: "20000.00" }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockResult);

        // Act
        await ComplianceRepository.getComplianceAggregates({
          distributorId: mockDistributorId
        });

        // Assert
        expect(sequelize.query).toHaveBeenCalledWith(
          expect.stringContaining(
            "SUM(dpa.stores_earnings + dpa.chains_stores_earnings)"
          ),
          expect.any(Object)
        );
      });

      it("should filter out soft-deleted records", async () => {
        // Arrange
        const mockResult = [{ total_savings: "10000.00" }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockResult);

        // Act
        await ComplianceRepository.getComplianceAggregates({
          distributorId: mockDistributorId
        });

        // Assert
        expect(sequelize.query).toHaveBeenCalledWith(
          expect.stringContaining("dpa.deleted_at IS NULL"),
          expect.any(Object)
        );
      });
    });

    describe("edge cases", () => {
      it("should return 0 when no aggregations exist", async () => {
        // Arrange
        const mockResult = [{ total_savings: "0" }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockResult);

        // Act
        const result = await ComplianceRepository.getComplianceAggregates({
          distributorId: mockDistributorId
        });

        // Assert
        expect(result).toEqual({
          totalSavings: 0,
          totalStores: 0,
          enrolledStores: 0
        });
      });

      it("should return 0 when total_savings is null", async () => {
        // Arrange
        const mockResult = [{ total_savings: null }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockResult);

        // Act
        const result = await ComplianceRepository.getComplianceAggregates({
          distributorId: mockDistributorId
        });

        // Assert
        expect(result.totalSavings).toBe(0);
      });

      it("should handle empty warehouseIds array by not filtering", async () => {
        // Arrange
        const mockResult = [{ total_savings: "5000.00" }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockResult);

        // Act
        const result = await ComplianceRepository.getComplianceAggregates({
          distributorId: mockDistributorId,
          warehouseIds: []
        });

        // Assert
        expect(result.totalSavings).toBe(5000);

        // Should not include warehouse filter when array is empty
        const sqlQuery = (sequelize.query as jest.Mock).mock.calls[0][0];
        expect(sqlQuery).not.toContain("warehouse_id = ANY");

        expect(sequelize.query).toHaveBeenCalledWith(expect.any(String), {
          type: QueryTypes.SELECT,
          bind: [mockDistributorId]
        });
      });

      it("should handle empty programIds array by not filtering", async () => {
        // Arrange
        const mockResult = [{ total_savings: "5000.00" }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockResult);

        // Act
        const result = await ComplianceRepository.getComplianceAggregates({
          distributorId: mockDistributorId,
          programIds: []
        });

        // Assert
        expect(result.totalSavings).toBe(5000);

        // Should not include program filter when array is empty
        const sqlQuery = (sequelize.query as jest.Mock).mock.calls[0][0];
        expect(sqlQuery).not.toContain("program_id = ANY");

        expect(sequelize.query).toHaveBeenCalledWith(expect.any(String), {
          type: QueryTypes.SELECT,
          bind: [mockDistributorId]
        });
      });

      it("should correctly format decimal string to number", async () => {
        // Arrange
        const mockResult = [{ total_savings: "12345.67" }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockResult);

        // Act
        const result = await ComplianceRepository.getComplianceAggregates({
          distributorId: mockDistributorId
        });

        // Assert
        expect(result.totalSavings).toBe(12345.67);
        expect(typeof result.totalSavings).toBe("number");
      });
    });

    describe("error handling", () => {
      it("should throw ApiError with message when database query fails", async () => {
        // Arrange
        const dbError = new Error("Database connection failed");
        (sequelize.query as jest.Mock).mockRejectedValue(dbError);

        // Act & Assert
        await expect(
          ComplianceRepository.getComplianceAggregates({
            distributorId: mockDistributorId
          })
        ).rejects.toThrow(
          "Compliance aggregation error: Database connection failed"
        );

        expect(ApiError.internal).toHaveBeenCalledWith(
          "Compliance aggregation error: Database connection failed"
        );
      });

      it("should throw generic ApiError when error is not an Error instance", async () => {
        // Arrange
        (sequelize.query as jest.Mock).mockRejectedValue("String error");

        // Act & Assert
        await expect(
          ComplianceRepository.getComplianceAggregates({
            distributorId: mockDistributorId
          })
        ).rejects.toThrow(
          "An unknown error occurred during compliance aggregation"
        );

        expect(ApiError.internal).toHaveBeenCalledWith(
          "An unknown error occurred during compliance aggregation"
        );
      });
    });

    describe("query parameter ordering", () => {
      it("should use correct parameter indices with no optional filters", async () => {
        // Arrange
        const mockResult = [{ total_savings: "1000.00" }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockResult);

        // Act
        await ComplianceRepository.getComplianceAggregates({
          distributorId: mockDistributorId
        });

        // Assert
        const sqlQuery = (sequelize.query as jest.Mock).mock.calls[0][0];
        expect(sqlQuery).toContain("dpa.distributor_id = $1");
        expect(sqlQuery).not.toContain("$2");
        expect(sqlQuery).not.toContain("$3");
      });

      it("should use $2 for programIds when no warehouseIds", async () => {
        // Arrange
        const mockResult = [{ total_savings: "1000.00" }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockResult);

        // Act
        await ComplianceRepository.getComplianceAggregates({
          distributorId: mockDistributorId,
          programIds: mockProgramIds
        });

        // Assert
        const sqlQuery = (sequelize.query as jest.Mock).mock.calls[0][0];
        expect(sqlQuery).toContain("dpa.program_id = ANY($2)");
      });

      it("should use $3 for programIds when warehouseIds is present", async () => {
        // Arrange
        const mockResult = [{ total_savings: "1000.00" }];
        (sequelize.query as jest.Mock).mockResolvedValue(mockResult);

        // Act
        await ComplianceRepository.getComplianceAggregates({
          distributorId: mockDistributorId,
          warehouseIds: mockWarehouseIds,
          programIds: mockProgramIds
        });

        // Assert
        const sqlQuery = (sequelize.query as jest.Mock).mock.calls[0][0];
        expect(sqlQuery).toContain("dpa.warehouse_id = ANY($2)");
        expect(sqlQuery).toContain("dpa.program_id = ANY($3)");
      });
    });
  });
});
