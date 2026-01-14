import { handleStoreProgramEnrollmentChanged } from "../../../../worker/handlers/storeProgramEnrollmentHandler";
import { WorkerError } from "../../../../worker/errors/WorkerError";
import sequelize from "../../../../db";

// Mock dependencies
jest.mock("../../../../db", () => ({
  query: jest.fn()
}));

const mockStore = {
  findByPk: jest.fn()
};

const mockProgramParticipant = {
  findOne: jest.fn(),
  create: jest.fn()
};

const mockWarehouse = {
  findByPk: jest.fn()
};

jest.mock("../../../../models/Store", () => ({
  __esModule: true,
  default: mockStore
}));

jest.mock("../../../../models/Warehouse", () => ({
  __esModule: true,
  default: mockWarehouse
}));

jest.mock("../../../../models/ProgramParticipant", () => ({
  __esModule: true,
  default: mockProgramParticipant
}));

jest.mock("../../../../config/appConstants", () => ({
  ENTITY_TYPE: {
    STORE: "STORE"
  }
}));

jest.mock("../../../../utils/redis", () => ({
  invalidateCache: jest.fn().mockResolvedValue(undefined),
  scanKeys: jest.fn().mockResolvedValue([]),
  redisClient: {
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn().mockResolvedValue(0),
    isOpen: true,
    connect: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock("newrelic", () => ({
  startSegment: jest.fn((name, record, callback) => callback()),
  addCustomAttributes: jest.fn()
}));

describe("storeProgramEnrollmentHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleStoreProgramEnrollmentChanged", () => {
    describe("validation", () => {
      it("should throw error when storeId is missing", async () => {
        const payload = {
          programIds: [1, 2],
          action: "enroll",
          userId: 1,
          manufacturerId: 1
        } as any;

        await expect(
          handleStoreProgramEnrollmentChanged(payload)
        ).rejects.toThrow(WorkerError);
        await expect(
          handleStoreProgramEnrollmentChanged(payload)
        ).rejects.toMatchObject({
          code: "VALIDATION_FAILED"
        });
      });

      it("should throw error when programIds is empty", async () => {
        const payload = {
          storeId: 1,
          programIds: [],
          action: "enroll",
          userId: 1,
          manufacturerId: 1
        } as any;

        await expect(
          handleStoreProgramEnrollmentChanged(payload)
        ).rejects.toThrow(WorkerError);
      });

      it("should throw error when action is invalid", async () => {
        const payload = {
          storeId: 1,
          programIds: [1],
          action: "invalid",
          userId: 1,
          manufacturerId: 1
        } as any;

        await expect(
          handleStoreProgramEnrollmentChanged(payload)
        ).rejects.toThrow(WorkerError);
      });

      it("should throw error when userId is missing", async () => {
        const payload = {
          storeId: 1,
          programIds: [1],
          action: "enroll",
          manufacturerId: 1
        } as any;

        await expect(
          handleStoreProgramEnrollmentChanged(payload)
        ).rejects.toThrow(WorkerError);
      });

      it("should throw error when manufacturerId is missing", async () => {
        const payload = {
          storeId: 1,
          programIds: [1],
          action: "enroll",
          userId: 1
        } as any;

        await expect(
          handleStoreProgramEnrollmentChanged(payload)
        ).rejects.toThrow(WorkerError);
      });

      it("should throw error when programIds contains non-integers", async () => {
        const payload = {
          storeId: 1,
          programIds: [1, "invalid", 3],
          action: "enroll",
          userId: 1,
          manufacturerId: 1
        } as any;

        await expect(
          handleStoreProgramEnrollmentChanged(payload)
        ).rejects.toThrow(WorkerError);
      });
    });

    describe("enrollment", () => {
      it("should enroll store in multiple programs", async () => {
        const mockQuery = sequelize.query as jest.Mock;

        mockStore.findByPk.mockResolvedValue({
          id: 1,
          warehouseId: 10,
          warehouse: { id: 10, distributorId: 5 }
        });

        mockProgramParticipant.findOne.mockResolvedValue(null);
        mockProgramParticipant.create.mockResolvedValue({});
        mockQuery.mockResolvedValue([]);

        const payload = {
          storeId: 1,
          programIds: [101, 102],
          action: "enroll" as const,
          userId: 1,
          manufacturerId: 15
        };

        await handleStoreProgramEnrollmentChanged(payload);

        expect(mockProgramParticipant.create).toHaveBeenCalledTimes(2);
        expect(mockQuery).toHaveBeenCalledTimes(2); // Two MV refreshes
      });

      it("should skip already enrolled programs (idempotent)", async () => {
        mockStore.findByPk.mockResolvedValue({
          id: 1,
          warehouseId: 10,
          warehouse: { id: 10, distributorId: 5 }
        });

        mockProgramParticipant.findOne.mockResolvedValue({ id: 1 }); // Already exists

        const payload = {
          storeId: 1,
          programIds: [101],
          action: "enroll" as const,
          userId: 1,
          manufacturerId: 15
        };

        await handleStoreProgramEnrollmentChanged(payload);

        expect(mockProgramParticipant.create).not.toHaveBeenCalled();
      });

      it("should throw error when store not found", async () => {
        mockStore.findByPk.mockResolvedValue(null);

        const payload = {
          storeId: 999,
          programIds: [101],
          action: "enroll" as const,
          userId: 1,
          manufacturerId: 15
        };

        await expect(
          handleStoreProgramEnrollmentChanged(payload)
        ).rejects.toThrow(WorkerError);
        await expect(
          handleStoreProgramEnrollmentChanged(payload)
        ).rejects.toMatchObject({
          code: "VALIDATION_FAILED"
        });
      });
    });

    describe("unenrollment", () => {
      it("should unenroll store from programs", async () => {
        const mockQuery = sequelize.query as jest.Mock;
        const mockEnrollment = { id: 1, destroy: jest.fn() };

        mockStore.findByPk.mockResolvedValue({
          id: 1,
          warehouseId: 10,
          warehouse: { id: 10, distributorId: 5 }
        });

        mockProgramParticipant.findOne.mockResolvedValue(mockEnrollment);
        mockQuery.mockResolvedValue([]);

        const payload = {
          storeId: 1,
          programIds: [101],
          action: "unenroll" as const,
          userId: 1,
          manufacturerId: 15
        };

        await handleStoreProgramEnrollmentChanged(payload);

        expect(mockEnrollment.destroy).toHaveBeenCalledWith({ force: true });
        expect(mockQuery).toHaveBeenCalledTimes(2); // Two MV refreshes
      });

      it("should skip not enrolled programs (idempotent)", async () => {
        mockStore.findByPk.mockResolvedValue({
          id: 1,
          warehouseId: 10,
          warehouse: { id: 10, distributorId: 5 }
        });

        mockProgramParticipant.findOne.mockResolvedValue(null); // Not enrolled

        const payload = {
          storeId: 1,
          programIds: [101],
          action: "unenroll" as const,
          userId: 1,
          manufacturerId: 15
        };

        await handleStoreProgramEnrollmentChanged(payload);

        // No errors, just skip
        expect(mockProgramParticipant.findOne).toHaveBeenCalled();
      });
    });

    describe("materialized view refresh", () => {
      it("should refresh both materialized views concurrently", async () => {
        const mockQuery = sequelize.query as jest.Mock;

        mockStore.findByPk.mockResolvedValue({
          id: 1,
          warehouseId: 10,
          warehouse: { id: 10, distributorId: 5 }
        });

        mockProgramParticipant.findOne.mockResolvedValue(null);
        mockProgramParticipant.create.mockResolvedValue({});
        mockQuery.mockResolvedValue([]);

        const payload = {
          storeId: 1,
          programIds: [101],
          action: "enroll" as const,
          userId: 1,
          manufacturerId: 15
        };

        await handleStoreProgramEnrollmentChanged(payload);

        expect(mockQuery).toHaveBeenCalledWith(
          "REFRESH MATERIALIZED VIEW CONCURRENTLY distributor_stores_programs_enrolled_mv"
        );
        expect(mockQuery).toHaveBeenCalledWith(
          "REFRESH MATERIALIZED VIEW sales_rep_spiff_earning_summary"
        );
      });

      it("should handle view refresh errors as retryable", async () => {
        const mockQuery = sequelize.query as jest.Mock;

        mockStore.findByPk.mockResolvedValue({
          id: 1,
          warehouseId: 10,
          warehouse: { id: 10, distributorId: 5 }
        });

        mockProgramParticipant.findOne.mockResolvedValue(null);
        mockProgramParticipant.create.mockResolvedValue({});
        mockQuery.mockRejectedValue(new Error("Connection timeout"));

        const payload = {
          storeId: 1,
          programIds: [101],
          action: "enroll" as const,
          userId: 1,
          manufacturerId: 15
        };

        await expect(
          handleStoreProgramEnrollmentChanged(payload)
        ).rejects.toThrow(WorkerError);
        await expect(
          handleStoreProgramEnrollmentChanged(payload)
        ).rejects.toMatchObject({
          code: "DATABASE_ERROR",
          retryable: true
        });
      });

      it("should handle view does not exist errors as non-retryable", async () => {
        const mockQuery = sequelize.query as jest.Mock;

        mockStore.findByPk.mockResolvedValue({
          id: 1,
          warehouseId: 10,
          warehouse: { id: 10, distributorId: 5 }
        });

        mockProgramParticipant.findOne.mockResolvedValue(null);
        mockProgramParticipant.create.mockResolvedValue({});
        mockQuery.mockRejectedValue(
          new Error('relation "test_view" does not exist')
        );

        const payload = {
          storeId: 1,
          programIds: [101],
          action: "enroll" as const,
          userId: 1,
          manufacturerId: 15
        };

        await expect(
          handleStoreProgramEnrollmentChanged(payload)
        ).rejects.toThrow(WorkerError);
        await expect(
          handleStoreProgramEnrollmentChanged(payload)
        ).rejects.toMatchObject({
          code: "DATABASE_ERROR",
          retryable: false
        });
      });
    });

    describe("cache invalidation", () => {
      it("should invalidate targeted cache patterns", async () => {
        const mockQuery = sequelize.query as jest.Mock;

        mockStore.findByPk.mockResolvedValue({
          id: 1,
          warehouseId: 10,
          warehouse: { id: 10, distributorId: 5 }
        });

        mockWarehouse.findByPk.mockResolvedValue({
          id: 10,
          distributorId: 5
        });

        mockProgramParticipant.findOne.mockResolvedValue(null);
        mockProgramParticipant.create.mockResolvedValue({});
        mockQuery.mockResolvedValue([]);

        // Set Redis as available for cache invalidation
        process.env.USE_API_CACHING = "true";
        const {
          invalidateCache,
          scanKeys,
          redisClient
        } = require("../../../../utils/redis");
        redisClient.isOpen = true;
        (scanKeys as jest.Mock).mockResolvedValue(["key1", "key2"]);

        const payload = {
          storeId: 1,
          programIds: [101, 102],
          action: "enroll" as const,
          userId: 1,
          manufacturerId: 15
        };

        await handleStoreProgramEnrollmentChanged(payload);

        // Verify store cache invalidated
        expect(invalidateCache).toHaveBeenCalledWith("store", "byId:1");

        // Verify program caches invalidated
        expect(invalidateCache).toHaveBeenCalledWith("program", "byId:101");
        expect(invalidateCache).toHaveBeenCalledWith("program", "byId:102");

        // Verify program participants cache invalidated
        expect(invalidateCache).toHaveBeenCalledWith("program", "participants");

        // Verify distributor cache invalidated (requires distributor context)
        expect(invalidateCache).toHaveBeenCalledWith("distributor", "byId:5");
        expect(invalidateCache).toHaveBeenCalledWith("distributor", "stores:5");

        // Verify warehouse cache invalidated (requires warehouse context)
        expect(invalidateCache).toHaveBeenCalledWith("warehouse", "stores:10");
      });

      it("should use pre-computed warehouse/distributor if provided", async () => {
        // Set Redis as available for cache invalidation
        process.env.USE_API_CACHING = "true";
        const {
          invalidateCache,
          redisClient
        } = require("../../../../utils/redis");
        redisClient.isOpen = true;
        const mockQuery = sequelize.query as jest.Mock;

        // Don't mock Store.findByPk since we're providing context
        mockStore.findByPk.mockClear();

        mockProgramParticipant.findOne.mockResolvedValue(null);
        mockProgramParticipant.create.mockResolvedValue({});
        mockQuery.mockResolvedValue([]);

        const payload = {
          storeId: 1,
          programIds: [101],
          action: "enroll" as const,
          userId: 1,
          manufacturerId: 15,
          warehouseId: 20,
          distributorId: 30
        };

        await handleStoreProgramEnrollmentChanged(payload);

        // Should not fetch from database
        expect(mockStore.findByPk).not.toHaveBeenCalled();

        // Should use provided context
        expect(invalidateCache).toHaveBeenCalledWith("distributor", "byId:30");
        expect(invalidateCache).toHaveBeenCalledWith("warehouse", "stores:20");
      });
    });
  });
});
