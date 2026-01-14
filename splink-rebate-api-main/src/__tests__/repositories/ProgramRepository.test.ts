// Mock statements FIRST before imports
jest.mock("../../models/Program", () => {
  const mockProgram = {
    create: jest.fn(),
    findByPk: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn()
  };
  return mockProgram;
});

jest.mock("../../models/ProgramDetail", () => {
  const mockProgramDetail = {
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  };
  return mockProgramDetail;
});

jest.mock("../../models/DistributorProgramAggregation", () => {
  return {
    __esModule: true,
    default: {
      findAll: jest.fn()
    }
  };
});

jest.mock("newrelic", () => ({
  startSegment: jest.fn((name: string, record: boolean, handler: () => any) =>
    handler()
  ),
  addCustomAttribute: jest.fn(),
  noticeError: jest.fn()
}));

// Import after mocks
import { Transaction } from "sequelize";
import Program from "../../models/Program";
import ProgramRepository from "../../repositories/ProgramRepository";
import DistributorProgramAggregation from "../../models/DistributorProgramAggregation";

describe("ProgramRepository", () => {
  let mockTransaction: Partial<Transaction>;

  beforeEach(() => {
    mockTransaction = {
      commit: jest.fn(),
      rollback: jest.fn()
    };
    jest.clearAllMocks();
  });

  describe("create", () => {
    const mockProgramData = {
      name: "Test Program",
      startDate: new Date(),
      endDate: new Date(),
      targetAudience: "DISTRIBUTOR",
      visibilityScope: "ALL_DISTRIBUTORS",
      description: "Test Description",
      minPurchaseAmount: 100,
      rebatePercentage: 10,
      creatorId: 1,
      creatorType: "MANUFACTURER",
      approvalStatus: "DRAFT",
      manufacturerId: 1,
      participantType: "DISTRIBUTOR",
      programType: "REBATE",
      programHeader: "Test Header",
      paymentTerm: "30"
    };

    it("should create program successfully", async () => {
      const mockProgram = { id: 1, ...mockProgramData };
      (Program.create as jest.Mock).mockResolvedValue(mockProgram);

      const result = await ProgramRepository.create(
        mockProgramData,
        mockTransaction as Transaction
      );

      expect(result).toEqual(mockProgram);
      expect(Program.create).toHaveBeenCalledWith(mockProgramData, {
        transaction: mockTransaction
      });
    });

    it("should handle create error", async () => {
      const error = new Error("Create failed");
      (Program.create as jest.Mock).mockRejectedValue(error);

      await expect(
        ProgramRepository.create(
          mockProgramData,
          mockTransaction as Transaction
        )
      ).rejects.toThrow(error);
    });
  });

  describe("findById", () => {
    it("should find program by id successfully", async () => {
      const mockProgram = { id: 1, name: "Test Program" };
      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);

      const result = await ProgramRepository.findById(1);

      expect(result).toEqual(mockProgram);
      expect(Program.findByPk).toHaveBeenCalledWith(1);
    });

    it("should return null if program not found", async () => {
      (Program.findByPk as jest.Mock).mockResolvedValue(null);

      const result = await ProgramRepository.findById(999);

      expect(result).toBeNull();
      expect(Program.findByPk).toHaveBeenCalledWith(999);
    });

    it("should handle find error", async () => {
      const error = new Error("Find failed");
      (Program.findByPk as jest.Mock).mockRejectedValue(error);

      await expect(ProgramRepository.findById(1)).rejects.toThrow(error);
    });
  });

  describe("update", () => {
    const mockUpdateData = {
      name: "Updated Program"
    };

    it("should update program successfully", async () => {
      const mockProgram = {
        id: 1,
        name: "Test Program",
        update: jest.fn().mockResolvedValue({ id: 1, name: "Updated Program" })
      };
      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);

      await ProgramRepository.update(
        1,
        mockUpdateData,
        mockTransaction as Transaction
      );

      expect(mockProgram.update).toHaveBeenCalledWith(mockUpdateData, {
        transaction: mockTransaction
      });
      expect(Program.findByPk).toHaveBeenCalledWith(1);
    });

    it("should throw error if program not found", async () => {
      (Program.findByPk as jest.Mock).mockResolvedValue(null);

      await expect(
        ProgramRepository.update(
          999,
          mockUpdateData,
          mockTransaction as Transaction
        )
      ).rejects.toThrow("Program not found");
    });

    it("should handle update error", async () => {
      const mockProgram = {
        id: 1,
        name: "Test Program",
        update: jest.fn().mockRejectedValue(new Error("Update failed"))
      };
      (Program.findByPk as jest.Mock).mockResolvedValue(mockProgram);

      await expect(
        ProgramRepository.update(
          1,
          mockUpdateData,
          mockTransaction as Transaction
        )
      ).rejects.toThrow("Update failed");
    });
  });

  describe("getDistributorProgramAggregations", () => {
    const distributorId = 1;
    const programIds = [101, 102];
    const participantType = "STORE";

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return empty map when programIds array is empty", async () => {
      const result = await ProgramRepository.getDistributorProgramAggregations(
        distributorId,
        [],
        participantType
      );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(DistributorProgramAggregation.findAll).not.toHaveBeenCalled();
    });

    it("should aggregate data without warehouse filter (all warehouses)", async () => {
      const mockAggregations = [
        {
          programId: 101,
          totalSalesVolume: "50000.50",
          totalStoreEarnings: "5000.25",
          storesEnrolled: "150",
          totalStores: "200",
          compliantStores: "120"
        },
        {
          programId: 102,
          totalSalesVolume: "30000.00",
          totalStoreEarnings: "3000.00",
          storesEnrolled: "100",
          totalStores: "150",
          compliantStores: "80"
        }
      ];

      (DistributorProgramAggregation.findAll as jest.Mock).mockResolvedValue(
        mockAggregations
      );

      const result = await ProgramRepository.getDistributorProgramAggregations(
        distributorId,
        programIds,
        participantType,
        false,
        undefined // No warehouse filter
      );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);

      const program101Data = result.get(101);
      expect(program101Data).toEqual({
        totalSalesVolume: 50000.5,
        totalStoreEarnings: 5000.25,
        storesEnrolled: 150,
        totalStores: 200,
        compliantStores: 120
      });

      const program102Data = result.get(102);
      expect(program102Data).toEqual({
        totalSalesVolume: 30000.0,
        totalStoreEarnings: 3000.0,
        storesEnrolled: 100,
        totalStores: 150,
        compliantStores: 80
      });

      expect(DistributorProgramAggregation.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            distributorId,
            participantType
          }),
          group: ["program_id"],
          raw: true
        })
      );
    });

    it("should aggregate data with specific warehouse filter", async () => {
      const warehouseIds = [5, 6];
      const mockAggregations = [
        {
          programId: 101,
          totalSalesVolume: "25000.00",
          totalStoreEarnings: "2500.00",
          storesEnrolled: "75",
          totalStores: "100",
          compliantStores: "60"
        }
      ];

      (DistributorProgramAggregation.findAll as jest.Mock).mockResolvedValue(
        mockAggregations
      );

      const result = await ProgramRepository.getDistributorProgramAggregations(
        distributorId,
        programIds,
        participantType,
        false,
        warehouseIds
      );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);

      const program101Data = result.get(101);
      expect(program101Data).toEqual({
        totalSalesVolume: 25000.0,
        totalStoreEarnings: 2500.0,
        storesEnrolled: 75,
        totalStores: 100,
        compliantStores: 60
      });

      expect(DistributorProgramAggregation.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            distributorId,
            participantType
          }),
          group: ["program_id"],
          raw: true
        })
      );
    });

    it("should exclude chain stores when excludeChainStores is true", async () => {
      const mockAggregations = [
        {
          programId: 101,
          totalSalesVolume: "40000.00",
          totalStoreEarnings: "4000.00",
          storesEnrolled: "120",
          totalStores: "150",
          compliantStores: "100"
        }
      ];

      (DistributorProgramAggregation.findAll as jest.Mock).mockResolvedValue(
        mockAggregations
      );

      const result = await ProgramRepository.getDistributorProgramAggregations(
        distributorId,
        programIds,
        participantType,
        true // excludeChainStores
      );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);

      expect(DistributorProgramAggregation.findAll).toHaveBeenCalled();
    });

    it("should return empty map on error", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (DistributorProgramAggregation.findAll as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const result = await ProgramRepository.getDistributorProgramAggregations(
        distributorId,
        programIds,
        participantType
      );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should handle null/zero values in aggregation results", async () => {
      const mockAggregations = [
        {
          programId: 101,
          totalSalesVolume: null,
          totalStoreEarnings: "0",
          storesEnrolled: null,
          totalStores: "0",
          compliantStores: null
        }
      ];

      (DistributorProgramAggregation.findAll as jest.Mock).mockResolvedValue(
        mockAggregations
      );

      const result = await ProgramRepository.getDistributorProgramAggregations(
        distributorId,
        programIds,
        participantType
      );

      const program101Data = result.get(101);
      expect(program101Data).toEqual({
        totalSalesVolume: 0,
        totalStoreEarnings: 0,
        storesEnrolled: 0,
        totalStores: 0,
        compliantStores: 0
      });
    });
  });

  describe("getDistributorProgramDetailAggregations", () => {
    const distributorId = 1;
    const programDetailIds = [201, 202];
    const participantType = "STORE";

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should return empty map when programDetailIds array is empty", async () => {
      const result =
        await ProgramRepository.getDistributorProgramDetailAggregations(
          distributorId,
          [],
          participantType
        );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(DistributorProgramAggregation.findAll).not.toHaveBeenCalled();
    });

    it("should aggregate data without warehouse filter (all warehouses)", async () => {
      const mockAggregations = [
        {
          programDetailId: 201,
          totalSalesVolume: "15000.00",
          totalEarnings: "1500.00",
          storesEnrolled: "50",
          totalStores: "75",
          compliantStores: "40"
        },
        {
          programDetailId: 202,
          totalSalesVolume: "20000.00",
          totalEarnings: "2000.00",
          storesEnrolled: "60",
          totalStores: "80",
          compliantStores: "50"
        }
      ];

      (DistributorProgramAggregation.findAll as jest.Mock).mockResolvedValue(
        mockAggregations
      );

      const result =
        await ProgramRepository.getDistributorProgramDetailAggregations(
          distributorId,
          programDetailIds,
          participantType,
          false,
          undefined // No warehouse filter
        );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(2);

      const detail201Data = result.get(201);
      expect(detail201Data).toEqual({
        purchaseVolume: 15000.0,
        estimatedEarnings: 1500.0,
        storesEnrolled: 50,
        totalStores: 75,
        compliantStores: 40
      });

      expect(DistributorProgramAggregation.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            distributorId,
            participantType
          }),
          group: ["program_detail_id"],
          raw: true
        })
      );
    });

    it("should aggregate data with specific warehouse filter", async () => {
      const warehouseIds = [5];
      const mockAggregations = [
        {
          programDetailId: 201,
          totalSalesVolume: "10000.00",
          totalEarnings: "1000.00",
          storesEnrolled: "30",
          totalStores: "40",
          compliantStores: "25"
        }
      ];

      (DistributorProgramAggregation.findAll as jest.Mock).mockResolvedValue(
        mockAggregations
      );

      const result =
        await ProgramRepository.getDistributorProgramDetailAggregations(
          distributorId,
          programDetailIds,
          participantType,
          false,
          warehouseIds
        );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);

      const detail201Data = result.get(201);
      expect(detail201Data).toEqual({
        purchaseVolume: 10000.0,
        estimatedEarnings: 1000.0,
        storesEnrolled: 30,
        totalStores: 40,
        compliantStores: 25
      });

      expect(DistributorProgramAggregation.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            distributorId,
            participantType
          }),
          group: ["program_detail_id"],
          raw: true
        })
      );
    });

    it("should exclude chain stores when excludeChainStores is true", async () => {
      const mockAggregations = [
        {
          programDetailId: 201,
          totalSalesVolume: "12000.00",
          totalEarnings: "1200.00",
          storesEnrolled: "40",
          totalStores: "50",
          compliantStores: "35"
        }
      ];

      (DistributorProgramAggregation.findAll as jest.Mock).mockResolvedValue(
        mockAggregations
      );

      const result =
        await ProgramRepository.getDistributorProgramDetailAggregations(
          distributorId,
          programDetailIds,
          participantType,
          true // excludeChainStores
        );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);

      expect(DistributorProgramAggregation.findAll).toHaveBeenCalled();
    });

    it("should return empty map on error", async () => {
      const consoleErrorSpy = jest
        .spyOn(console, "error")
        .mockImplementation(() => {});

      (DistributorProgramAggregation.findAll as jest.Mock).mockRejectedValue(
        new Error("Database error")
      );

      const result =
        await ProgramRepository.getDistributorProgramDetailAggregations(
          distributorId,
          programDetailIds,
          participantType
        );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(0);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("should handle multiple warehouse IDs", async () => {
      const warehouseIds = [5, 6, 7];
      const mockAggregations = [
        {
          programDetailId: 201,
          totalSalesVolume: "18000.00",
          totalEarnings: "1800.00",
          storesEnrolled: "55",
          totalStores: "70",
          compliantStores: "45"
        }
      ];

      (DistributorProgramAggregation.findAll as jest.Mock).mockResolvedValue(
        mockAggregations
      );

      const result =
        await ProgramRepository.getDistributorProgramDetailAggregations(
          distributorId,
          programDetailIds,
          participantType,
          false,
          warehouseIds
        );

      expect(result).toBeInstanceOf(Map);
      expect(result.size).toBe(1);

      expect(DistributorProgramAggregation.findAll).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            distributorId,
            participantType
          }),
          group: ["program_detail_id"],
          raw: true
        })
      );
    });
  });
});
