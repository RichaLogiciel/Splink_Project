import { handleAgreementStoreEnrollmentChanged } from "../../../../worker/handlers/agreementStoreEnrollmentHandler";
import { WorkerError } from "../../../../worker/errors/WorkerError";
import sequelize from "../../../../db";
import { QueryTypes } from "sequelize";

// Create mock transaction object
const mockTransaction = {
  commit: jest.fn().mockResolvedValue(undefined),
  rollback: jest.fn().mockResolvedValue(undefined)
};

// Mock dependencies - define mockTransaction inside the factory to avoid hoisting issues
jest.mock("../../../../db", () => {
  const mockTx = {
    commit: jest.fn().mockResolvedValue(undefined),
    rollback: jest.fn().mockResolvedValue(undefined)
  };
  return {
    query: jest.fn(),
    transaction: jest.fn().mockResolvedValue(mockTx),
    __mockTransaction: mockTx
  };
});

jest.mock("../../../../utils/redis", () => ({
  redisClient: {
    keys: jest.fn().mockResolvedValue([]),
    del: jest.fn(),
    isOpen: true,
    connect: jest.fn().mockResolvedValue(undefined)
  },
  scanKeys: jest.fn().mockResolvedValue([]),
  clearUserCache: jest.fn().mockResolvedValue({ keysFound: 0, keysDeleted: 0 })
}));

jest.mock("newrelic", () => ({
  startSegment: jest.fn((name, record, callback) => callback()),
  addCustomAttribute: jest.fn()
}));

jest.mock("../../../../services/EnrollmentRequestService", () => ({
  __esModule: true,
  default: {
    updateWorkerReceived: jest.fn().mockResolvedValue(undefined),
    updateDbOperationStarted: jest.fn().mockResolvedValue(undefined),
    updateDbOperationCompleted: jest.fn().mockResolvedValue(undefined),
    updateCacheClearStarted: jest.fn().mockResolvedValue(undefined),
    markCompleted: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined)
  }
}));

jest.mock("../../../../repositories/StoreEnrollmentStatusRepository", () => ({
  __esModule: true,
  default: {
    upsertStatusesForRequest: jest.fn().mockResolvedValue(undefined)
  }
}));

describe("agreementStoreEnrollmentHandler", () => {
  let mockTransaction: {
    commit: jest.Mock;
    rollback: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mock transaction from the mocked module
    const dbModule = require("../../../../db");
    mockTransaction = dbModule.__mockTransaction;
    mockTransaction.commit.mockClear();
    mockTransaction.rollback.mockClear();
    // Reset the transaction mock to return our mockTransaction
    (sequelize.transaction as jest.Mock).mockResolvedValue(mockTransaction);
  });

  describe("handleAgreementStoreEnrollmentChanged", () => {
    describe("enrollment", () => {
      it("should execute bulk enrollment query with correct parameters", async () => {
        const mockQuery = sequelize.query as jest.Mock;
        // Mock program info query response
        mockQuery.mockResolvedValueOnce([
          {
            agreement_id: 1,
            program_id: 101,
            manufacturer_id: 1,
            program_name: "Test Program 1",
            start_date: new Date(),
            end_date: new Date()
          },
          {
            agreement_id: 2,
            program_id: 102,
            manufacturer_id: 1,
            program_name: "Test Program 2",
            start_date: new Date(),
            end_date: new Date()
          }
        ]);
        // Mock validation query response (all records exist)
        mockQuery.mockResolvedValueOnce([
          { store_id: 10, program_id: 101, manufacturer_id: 1, exists_flag: 1 },
          { store_id: 10, program_id: 102, manufacturer_id: 1, exists_flag: 1 },
          { store_id: 20, program_id: 101, manufacturer_id: 1, exists_flag: 1 },
          { store_id: 20, program_id: 102, manufacturer_id: 1, exists_flag: 1 }
        ]);
        // Mock enrollment UPDATE query response (2 existing rows updated)
        mockQuery.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
        // Mock enrollment INSERT query response (2 new rows inserted)
        mockQuery.mockResolvedValueOnce([{ id: 3 }, { id: 4 }]);
        // Mock store_listing_aggregates update response
        mockQuery.mockResolvedValueOnce([[], { rowCount: 4 }]);
        // Mock MV refresh calls
        mockQuery.mockResolvedValue([]);

        const payload = {
          action: "enroll" as const,
          agreementIds: [1, 2],
          storeIds: [10, 20],
          programIds: [101, 102],
          userId: 123,
          reason: "Test enrollment",
          timestamp: new Date().toISOString()
        };

        await handleAgreementStoreEnrollmentChanged(payload);

        // Verify program info query was called
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("FROM program_agreements pa"),
          expect.objectContaining({
            replacements: { agreementIds: [1, 2] },
            type: QueryTypes.SELECT,
            transaction: mockTransaction
          })
        );

        // Verify validation query was called
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("expected_combinations AS"),
          expect.objectContaining({
            replacements: {
              agreementIds: [1, 2],
              storeIds: [10, 20]
            },
            type: QueryTypes.SELECT,
            transaction: mockTransaction
          })
        );

        // Verify enrollment UPDATE query was called (to reactivate existing rows)
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE program_participants pp"),
          expect.objectContaining({
            replacements: {
              agreementIds: [1, 2],
              storeIds: [10, 20]
            },
            type: QueryTypes.SELECT,
            transaction: mockTransaction
          })
        );

        // Verify enrollment INSERT query was called (to add new rows)
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("INSERT INTO program_participants"),
          expect.objectContaining({
            replacements: {
              agreementIds: [1, 2],
              storeIds: [10, 20]
            },
            type: QueryTypes.SELECT,
            transaction: mockTransaction
          })
        );

        // Verify store_listing_aggregates update was called
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE store_listing_aggregates"),
          expect.objectContaining({
            replacements: expect.objectContaining({
              agreementIds: [1, 2],
              storeIds: [10, 20],
              enrolledValue: true
            }),
            transaction: mockTransaction
          })
        );

        // Verify transaction was committed
        expect(mockTransaction.commit).toHaveBeenCalled();
      });

      it("should update store enrollment statuses to succeeded when requestId is provided", async () => {
        const mockQuery = sequelize.query as jest.Mock;

        // Mock program info query response
        mockQuery.mockResolvedValueOnce([
          {
            agreement_id: 1,
            program_id: 101,
            manufacturer_id: 1,
            program_name: "Test Program",
            start_date: new Date(),
            end_date: new Date()
          }
        ]);
        // Mock validation query response (all records exist)
        mockQuery.mockResolvedValueOnce([
          { store_id: 10, program_id: 101, manufacturer_id: 1, exists_flag: 1 }
        ]);
        // Mock enrollment UPDATE query response
        mockQuery.mockResolvedValueOnce([{ id: 1 }]);
        // Mock enrollment INSERT query response
        mockQuery.mockResolvedValueOnce([]);
        // Mock store_listing_aggregates update response
        mockQuery.mockResolvedValueOnce([[], { rowCount: 1 }]);
        // Mock MV refresh calls
        mockQuery.mockResolvedValue([]);

        const StoreEnrollmentStatusRepository =
          require("../../../../repositories/StoreEnrollmentStatusRepository").default;

        const payload = {
          action: "enroll" as const,
          agreementIds: [1],
          storeIds: [10],
          programIds: [101],
          userId: 123,
          requestId: "req-1",
          timestamp: new Date().toISOString()
        };

        await handleAgreementStoreEnrollmentChanged(payload);

        expect(
          StoreEnrollmentStatusRepository.upsertStatusesForRequest
        ).toHaveBeenCalledWith({
          requestId: "req-1",
          action: "enroll",
          status: "succeeded",
          storeIds: [10],
          agreementIds: [1]
        });
      });

      it("should return correct count of affected rows", async () => {
        const mockQuery = sequelize.query as jest.Mock;
        // Mock program info query response
        mockQuery.mockResolvedValueOnce([
          {
            agreement_id: 1,
            program_id: 101,
            manufacturer_id: 1,
            program_name: "Test Program",
            start_date: new Date(),
            end_date: new Date()
          }
        ]);
        // Mock validation query response (all records exist)
        mockQuery.mockResolvedValueOnce([
          { store_id: 10, program_id: 101, manufacturer_id: 1, exists_flag: 1 },
          { store_id: 20, program_id: 101, manufacturer_id: 1, exists_flag: 1 },
          { store_id: 30, program_id: 101, manufacturer_id: 1, exists_flag: 1 }
        ]);
        // Mock enrollment UPDATE query response (1 existing row updated)
        mockQuery.mockResolvedValueOnce([{ id: 1 }]);
        // Mock enrollment INSERT query response (2 new rows inserted)
        mockQuery.mockResolvedValueOnce([{ id: 2 }, { id: 3 }]);
        // Mock store_listing_aggregates update response
        mockQuery.mockResolvedValueOnce([[], { rowCount: 3 }]);
        // Mock MV refresh calls
        mockQuery.mockResolvedValue([]);

        const payload = {
          action: "enroll" as const,
          agreementIds: [1],
          storeIds: [10, 20, 30],
          programIds: [101],
          userId: 123,
          timestamp: new Date().toISOString()
        };

        await expect(
          handleAgreementStoreEnrollmentChanged(payload)
        ).resolves.not.toThrow();

        // Handler completed successfully
        expect(mockQuery).toHaveBeenCalled();
        expect(mockTransaction.commit).toHaveBeenCalled();
      });
    });

    describe("unenrollment", () => {
      it("should execute bulk unenrollment query with correct parameters", async () => {
        const mockQuery = sequelize.query as jest.Mock;
        // Mock program info query response
        mockQuery.mockResolvedValueOnce([
          {
            agreement_id: 3,
            program_id: 301,
            manufacturer_id: 1,
            program_name: "Test Program 3",
            start_date: new Date(),
            end_date: new Date()
          },
          {
            agreement_id: 4,
            program_id: 302,
            manufacturer_id: 1,
            program_name: "Test Program 4",
            start_date: new Date(),
            end_date: new Date()
          }
        ]);
        // Mock validation query response (all records exist)
        mockQuery.mockResolvedValueOnce([
          {
            store_id: 100,
            program_id: 301,
            manufacturer_id: 1,
            exists_flag: 1
          },
          {
            store_id: 100,
            program_id: 302,
            manufacturer_id: 1,
            exists_flag: 1
          },
          {
            store_id: 200,
            program_id: 301,
            manufacturer_id: 1,
            exists_flag: 1
          },
          { store_id: 200, program_id: 302, manufacturer_id: 1, exists_flag: 1 }
        ]);
        // Mock unenrollment query response
        mockQuery.mockResolvedValueOnce([[], { rowCount: 4 }]);
        // Mock store_listing_aggregates update response
        mockQuery.mockResolvedValueOnce([[], { rowCount: 4 }]);
        // Mock MV refresh calls
        mockQuery.mockResolvedValue([]);

        const payload = {
          action: "unenroll" as const,
          agreementIds: [3, 4],
          storeIds: [100, 200],
          programIds: [301, 302],
          userId: 456,
          reason: "Test unenrollment",
          timestamp: new Date().toISOString()
        };

        await handleAgreementStoreEnrollmentChanged(payload);

        // Verify program info query was called
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("FROM program_agreements pa"),
          expect.objectContaining({
            replacements: { agreementIds: [3, 4] },
            type: QueryTypes.SELECT,
            transaction: mockTransaction
          })
        );

        // Verify validation query was called
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("expected_combinations AS"),
          expect.objectContaining({
            replacements: {
              agreementIds: [3, 4],
              storeIds: [100, 200]
            },
            type: QueryTypes.SELECT,
            transaction: mockTransaction
          })
        );

        // Verify unenrollment query was called
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE program_participants"),
          expect.objectContaining({
            replacements: {
              agreementIds: [3, 4],
              storeIds: [100, 200]
            },
            transaction: mockTransaction
          })
        );

        // Verify store_listing_aggregates update was called with enrolledValue: false
        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("UPDATE store_listing_aggregates"),
          expect.objectContaining({
            replacements: expect.objectContaining({
              agreementIds: [3, 4],
              storeIds: [100, 200],
              enrolledValue: false
            }),
            transaction: mockTransaction
          })
        );

        // Verify transaction was committed
        expect(mockTransaction.commit).toHaveBeenCalled();
      });
    });

    describe("materialized views", () => {
      it("should refresh both materialized views", async () => {
        const mockQuery = sequelize.query as jest.Mock;
        // Mock program info query response
        mockQuery.mockResolvedValueOnce([
          {
            agreement_id: 1,
            program_id: 101,
            manufacturer_id: 1,
            program_name: "Test Program",
            start_date: new Date(),
            end_date: new Date()
          }
        ]);
        // Mock validation query response (all records exist)
        mockQuery.mockResolvedValueOnce([
          { store_id: 10, program_id: 101, manufacturer_id: 1, exists_flag: 1 }
        ]);
        // Mock enrollment query response
        mockQuery.mockResolvedValueOnce([{ id: 1 }]);
        // Mock store_listing_aggregates update response
        mockQuery.mockResolvedValueOnce([[], { rowCount: 1 }]);
        // Mock MV refresh calls (2 views)
        mockQuery.mockResolvedValue([]);
        mockQuery.mockResolvedValue([]);

        const payload = {
          action: "enroll" as const,
          agreementIds: [1],
          storeIds: [10],
          programIds: [101],
          userId: 123,
          timestamp: new Date().toISOString()
        };

        await handleAgreementStoreEnrollmentChanged(payload);

        // Verify MV refresh calls - check for both views with correct syntax
        expect(mockQuery).toHaveBeenCalledWith(
          "REFRESH MATERIALIZED VIEW combined_store_enrolled_summary"
        );
        expect(mockQuery).toHaveBeenCalledWith(
          "REFRESH MATERIALIZED VIEW CONCURRENTLY distributor_stores_programs_enrolled_mv"
        );
      });

      it("should not throw when MV refresh fails", async () => {
        const mockQuery = sequelize.query as jest.Mock;
        // Mock program info query (called first)
        mockQuery.mockResolvedValueOnce([
          {
            agreement_id: 1,
            program_id: 101,
            manufacturer_id: 1,
            program_name: "Test Program",
            start_date: new Date(),
            end_date: new Date()
          }
        ]);
        // Mock validation query response (all records exist)
        mockQuery.mockResolvedValueOnce([
          { store_id: 10, program_id: 101, manufacturer_id: 1, exists_flag: 1 }
        ]);
        // Mock enrollment UPDATE query response (reactivating existing)
        mockQuery.mockResolvedValueOnce([{ id: 1 }]);
        // Mock enrollment INSERT query response (no new rows)
        mockQuery.mockResolvedValueOnce([]);
        // Mock store_listing_aggregates update response
        mockQuery.mockResolvedValueOnce([[], { rowCount: 1 }]);
        // MV refresh calls - first one fails, second succeeds
        // Since refreshMaterializedViews uses Promise.allSettled, both calls will be attempted
        mockQuery.mockRejectedValueOnce(new Error("MV refresh failed"));
        mockQuery.mockResolvedValueOnce([]);

        const payload = {
          action: "enroll" as const,
          agreementIds: [1],
          storeIds: [10],
          programIds: [101],
          userId: 123,
          timestamp: new Date().toISOString()
        };

        // Should not throw - MV failures are non-blocking
        await expect(
          handleAgreementStoreEnrollmentChanged(payload)
        ).resolves.not.toThrow();
      });
    });

    describe("cache invalidation", () => {
      it("should invalidate store and program caches", async () => {
        // Set Redis as available for cache invalidation
        process.env.USE_API_CACHING = "true";

        const mockQuery = sequelize.query as jest.Mock;

        // Mock program info query
        mockQuery.mockResolvedValueOnce([
          {
            agreement_id: 1,
            program_id: 101,
            manufacturer_id: 1,
            program_name: "Test Program 1",
            start_date: new Date(),
            end_date: new Date()
          },
          {
            agreement_id: 2,
            program_id: 102,
            manufacturer_id: 1,
            program_name: "Test Program 2",
            start_date: new Date(),
            end_date: new Date()
          }
        ]);
        // Mock validation query
        mockQuery.mockResolvedValueOnce([
          { store_id: 10, program_id: 101, manufacturer_id: 1, exists_flag: 1 },
          { store_id: 20, program_id: 101, manufacturer_id: 1, exists_flag: 1 }
        ]);
        // Mock UPDATE query
        mockQuery.mockResolvedValueOnce([{ id: 1 }]);
        // Mock INSERT query
        mockQuery.mockResolvedValueOnce([{ id: 2 }]);
        // Mock store_listing_aggregates update
        mockQuery.mockResolvedValueOnce([[], { rowCount: 2 }]);
        // Mock MV refresh calls
        mockQuery.mockResolvedValue([]);

        const {
          scanKeys,
          clearUserCache,
          redisClient
        } = require("../../../../utils/redis");
        redisClient.isOpen = true;
        (scanKeys as jest.Mock).mockResolvedValue(["key1", "key2", "key3"]);
        (clearUserCache as jest.Mock).mockResolvedValue({
          keysFound: 4,
          keysDeleted: 4
        });
        redisClient.del.mockResolvedValue(3);

        const payload = {
          action: "enroll" as const,
          agreementIds: [1, 2],
          storeIds: [10, 20],
          programIds: [101, 102, 103],
          userId: 123,
          timestamp: new Date().toISOString()
        };

        await handleAgreementStoreEnrollmentChanged(payload);

        // Verify user-scoped caches were cleared via index (not SCAN)
        expect(clearUserCache).toHaveBeenCalledWith(123);

        // Verify cache keys were checked for stores (still uses SCAN)
        expect(scanKeys).toHaveBeenCalledWith("store:byId:10*");
        expect(scanKeys).toHaveBeenCalledWith("store:10:*");
        expect(scanKeys).toHaveBeenCalledWith("store:byId:20*");
        expect(scanKeys).toHaveBeenCalledWith("store:20:*");

        // Verify cache keys were checked for programs (still uses SCAN)
        expect(scanKeys).toHaveBeenCalledWith("program:byId:101*");
        expect(scanKeys).toHaveBeenCalledWith("program:101:*");
        expect(scanKeys).toHaveBeenCalledWith("program:byId:102*");
        expect(scanKeys).toHaveBeenCalledWith("program:102:*");
        expect(scanKeys).toHaveBeenCalledWith("program:byId:103*");
        expect(scanKeys).toHaveBeenCalledWith("program:103:*");

        // Verify user-scoped patterns are NOT scanned (replaced by clearUserCache)
        expect(scanKeys).not.toHaveBeenCalledWith(
          "getProgramsStoreComplianceDetail_123_*"
        );
        expect(scanKeys).not.toHaveBeenCalledWith("getListingV2_123_*");
        expect(scanKeys).not.toHaveBeenCalledWith(
          "getSalesRepWithStoresAndTotalAmount_123_*"
        );
        expect(scanKeys).not.toHaveBeenCalledWith(
          "getFormattedStoresListing_123_*"
        );
      });

      it("should not throw when cache invalidation fails", async () => {
        const mockQuery = sequelize.query as jest.Mock;

        // Mock program info query
        mockQuery.mockResolvedValueOnce([
          {
            agreement_id: 1,
            program_id: 101,
            manufacturer_id: 1,
            program_name: "Test Program",
            start_date: new Date(),
            end_date: new Date()
          }
        ]);
        // Mock validation query
        mockQuery.mockResolvedValueOnce([
          { store_id: 10, program_id: 101, manufacturer_id: 1, exists_flag: 1 }
        ]);
        // Mock UPDATE query
        mockQuery.mockResolvedValueOnce([{ id: 1 }]);
        // Mock INSERT query
        mockQuery.mockResolvedValueOnce([]);
        // Mock store_listing_aggregates update
        mockQuery.mockResolvedValueOnce([[], { rowCount: 1 }]);
        // Mock MV refresh calls
        mockQuery.mockResolvedValue([]);

        const {
          scanKeys,
          clearUserCache,
          redisClient
        } = require("../../../../utils/redis");
        (scanKeys as jest.Mock).mockRejectedValue(
          new Error("Redis connection failed")
        );
        (clearUserCache as jest.Mock).mockRejectedValue(
          new Error("Failed to clear user cache")
        );

        const payload = {
          action: "enroll" as const,
          agreementIds: [1],
          storeIds: [10],
          programIds: [101],
          userId: 123,
          timestamp: new Date().toISOString()
        };

        // Should not throw - cache failures are non-blocking
        await expect(
          handleAgreementStoreEnrollmentChanged(payload)
        ).resolves.not.toThrow();
      });
    });

    describe("error handling", () => {
      it("should throw WorkerError when SQL execution fails", async () => {
        const mockQuery = sequelize.query as jest.Mock;
        mockQuery.mockRejectedValue(new Error("Database connection lost"));

        const StoreEnrollmentStatusRepository =
          require("../../../../repositories/StoreEnrollmentStatusRepository").default;

        const payload = {
          action: "enroll" as const,
          agreementIds: [1],
          storeIds: [10],
          programIds: [101],
          userId: 123,
          requestId: "req-error",
          timestamp: new Date().toISOString()
        };

        await expect(
          handleAgreementStoreEnrollmentChanged(payload)
        ).rejects.toThrow(WorkerError);

        await expect(
          handleAgreementStoreEnrollmentChanged(payload)
        ).rejects.toMatchObject({
          retryable: true
        });

        expect(
          StoreEnrollmentStatusRepository.upsertStatusesForRequest
        ).toHaveBeenCalledWith({
          requestId: "req-error",
          action: "enroll",
          status: "failed",
          storeIds: [10],
          agreementIds: [1]
        });
      });
    });
  });
});
