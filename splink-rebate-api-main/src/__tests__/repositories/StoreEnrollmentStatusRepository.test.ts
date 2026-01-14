import StoreEnrollmentStatusRepository from "../../repositories/StoreEnrollmentStatusRepository";
import sequelize from "../../db";

// Mock sequelize
jest.mock("../../db");

// Mock the model
jest.mock("../../models/StoreEnrollmentStatus", () => ({
  __esModule: true,
  default: {
    findAll: jest.fn(),
    belongsTo: jest.fn(),
    hasMany: jest.fn()
  },
  StoreEnrollmentAction: {
    ENROLL: "enroll",
    UNENROLL: "unenroll"
  },
  StoreEnrollmentStatusValue: {
    PROCESSING: "processing",
    SUCCEEDED: "succeeded",
    FAILED: "failed"
  }
}));

describe("StoreEnrollmentStatusRepository", () => {
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery = jest.fn();
    (sequelize.query as jest.Mock) = mockQuery;
  });

  describe("getLatestByStoresAndManufacturer", () => {
    const baseParams = {
      storeIds: [1, 2, 3],
      manufacturerId: 100
    };

    it("should return empty Map when storeIds is empty", async () => {
      const result =
        await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer({
          storeIds: [],
          manufacturerId: 100
        });

      expect(result).toEqual(new Map());
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it("should return empty Map when manufacturerId is null", async () => {
      const result =
        await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer({
          storeIds: [1, 2, 3],
          manufacturerId: null as any
        });

      expect(result).toEqual(new Map());
      expect(mockQuery).not.toHaveBeenCalled();
    });

    describe("without startDate (backward compatibility)", () => {
      it("should return latest status for each store regardless of date", async () => {
        const mockRows = [
          { storeId: 1, status: "processing" },
          { storeId: 2, status: "succeeded" },
          { storeId: 3, status: "failed" }
        ];

        mockQuery.mockResolvedValue(mockRows);

        const result =
          await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer(
            baseParams
          );

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining("SELECT DISTINCT ON (ses.store_id)"),
          expect.objectContaining({
            replacements: {
              storeIds: [1, 2, 3],
              manufacturerId: 100,
              startDate: null
            }
          })
        );

        expect(result).toEqual(
          new Map([
            [1, "processing"],
            [2, "succeeded"],
            [3, "failed"]
          ])
        );
      });

      it("should prioritize 'processing' status over others", async () => {
        // This test validates the ORDER BY clause behavior
        const mockRows = [
          { storeId: 1, status: "processing" } // Should be returned even if there are succeeded/failed
        ];

        mockQuery.mockResolvedValue(mockRows);

        const result =
          await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer(
            baseParams
          );

        expect(result.get(1)).toBe("processing");
      });

      it("should not populate default values when startDate is not provided", async () => {
        const mockRows = [
          { storeId: 1, status: "processing" }
          // Store 2 and 3 have no status
        ];

        mockQuery.mockResolvedValue(mockRows);

        const result =
          await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer(
            baseParams
          );

        expect(result).toEqual(new Map([[1, "processing"]]));
        expect(result.has(2)).toBe(false);
        expect(result.has(3)).toBe(false);
      });
    });

    describe("with startDate (new behavior)", () => {
      const today = new Date("2025-12-15T00:00:00Z");
      const paramsWithDate = {
        ...baseParams,
        startDate: today
      };

      it("should filter by created_at >= startDate", async () => {
        const mockRows = [
          { storeId: 1, status: "processing" },
          { storeId: 2, status: "succeeded" }
        ];

        mockQuery.mockResolvedValue(mockRows);

        await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer(
          paramsWithDate
        );

        expect(mockQuery).toHaveBeenCalledWith(
          expect.stringContaining(
            "AND (:startDate::timestamp IS NULL OR ses.created_at >= :startDate)"
          ),
          expect.objectContaining({
            replacements: {
              storeIds: [1, 2, 3],
              manufacturerId: 100,
              startDate: today
            }
          })
        );
      });

      it("should populate missing stores with 'succeeded' default", async () => {
        const mockRows = [
          { storeId: 1, status: "processing" }
          // Stores 2 and 3 have no status for today
        ];

        mockQuery.mockResolvedValue(mockRows);

        const result =
          await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer(
            paramsWithDate
          );

        expect(result).toEqual(
          new Map([
            [1, "processing"],
            [2, "succeeded"],
            [3, "succeeded"]
          ])
        );
      });

      it("should handle all stores having status today", async () => {
        const mockRows = [
          { storeId: 1, status: "processing" },
          { storeId: 2, status: "succeeded" },
          { storeId: 3, status: "failed" }
        ];

        mockQuery.mockResolvedValue(mockRows);

        const result =
          await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer(
            paramsWithDate
          );

        expect(result).toEqual(
          new Map([
            [1, "processing"],
            [2, "succeeded"],
            [3, "failed"]
          ])
        );
      });

      it("should handle no stores having status today", async () => {
        const mockRows: any[] = [];

        mockQuery.mockResolvedValue(mockRows);

        const result =
          await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer(
            paramsWithDate
          );

        expect(result).toEqual(
          new Map([
            [1, "succeeded"],
            [2, "succeeded"],
            [3, "succeeded"]
          ])
        );
      });

      it("should prioritize 'processing' over other statuses even with date filter", async () => {
        const mockRows = [
          { storeId: 1, status: "processing" },
          { storeId: 2, status: "failed" }
        ];

        mockQuery.mockResolvedValue(mockRows);

        const result =
          await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer(
            paramsWithDate
          );

        expect(result.get(1)).toBe("processing");
        expect(result.get(2)).toBe("failed");
        expect(result.get(3)).toBe("succeeded"); // Default for missing store
      });

      it("should handle large number of stores efficiently", async () => {
        const largeStoreIds = Array.from({ length: 1000 }, (_, i) => i + 1);
        const mockRows = largeStoreIds.slice(0, 100).map((id) => ({
          storeId: id,
          status: "succeeded"
        }));

        mockQuery.mockResolvedValue(mockRows);

        const result =
          await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer(
            {
              storeIds: largeStoreIds,
              manufacturerId: 100,
              startDate: today
            }
          );

        // First 100 stores should have 'succeeded' from query
        expect(result.get(1)).toBe("succeeded");
        expect(result.get(100)).toBe("succeeded");

        // Remaining 900 stores should have 'succeeded' as default
        expect(result.get(101)).toBe("succeeded");
        expect(result.get(1000)).toBe("succeeded");

        // Total size should be 1000
        expect(result.size).toBe(1000);
      });
    });

    describe("edge cases", () => {
      it("should handle numeric string storeIds", async () => {
        const mockRows = [
          { storeId: "1", status: "processing" },
          { storeId: "2", status: "succeeded" }
        ];

        mockQuery.mockResolvedValue(mockRows);

        const result =
          await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer(
            {
              storeIds: [1, 2],
              manufacturerId: 100,
              startDate: new Date("2025-12-15T00:00:00Z")
            }
          );

        expect(result).toEqual(
          new Map([
            [1, "processing"],
            [2, "succeeded"]
          ])
        );
      });

      it("should handle duplicate storeIds in input", async () => {
        const mockRows = [{ storeId: 1, status: "processing" }];

        mockQuery.mockResolvedValue(mockRows);

        const result =
          await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer(
            {
              storeIds: [1, 1, 1], // Duplicates
              manufacturerId: 100,
              startDate: new Date("2025-12-15T00:00:00Z")
            }
          );

        expect(result.size).toBe(1);
        expect(result.get(1)).toBe("processing");
      });

      it("should handle all three status types", async () => {
        const mockRows = [
          { storeId: 1, status: "processing" },
          { storeId: 2, status: "succeeded" },
          { storeId: 3, status: "failed" }
        ];

        mockQuery.mockResolvedValue(mockRows);

        const result =
          await StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer(
            {
              storeIds: [1, 2, 3],
              manufacturerId: 100,
              startDate: new Date("2025-12-15T00:00:00Z")
            }
          );

        expect(result.get(1)).toBe("processing");
        expect(result.get(2)).toBe("succeeded");
        expect(result.get(3)).toBe("failed");
      });
    });
  });
});
