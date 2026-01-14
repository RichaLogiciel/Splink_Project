import { handleMaterializedViewUpdate } from "../../../../worker/handlers/materializedViewHandler";
import { WorkerError } from "../../../../worker/errors/WorkerError";
import sequelize from "../../../../db";

// Mock dependencies
jest.mock("../../../../db", () => ({
  query: jest.fn()
}));

jest.mock("newrelic", () => ({
  startSegment: jest.fn((name, record, callback) => callback()),
  addCustomAttributes: jest.fn()
}));

describe("materializedViewHandler", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("handleMaterializedViewUpdate", () => {
    const validViewNames = [
      "line_items_products_joined_mv",
      "product_insights_aggregated_view",
      "distributor_stores_programs_enrolled_mv",
      "sales_rep_spiff_earning_summary_mv"
    ];

    validViewNames.forEach((viewName) => {
      it(`should refresh allowed view: ${viewName}`, async () => {
        const mockQuery = sequelize.query as jest.Mock;
        mockQuery.mockResolvedValue([]);

        const payload = { viewName };

        await handleMaterializedViewUpdate(payload);

        expect(mockQuery).toHaveBeenCalledWith(
          `REFRESH MATERIALIZED VIEW  ${viewName}`
        );
      });
    });

    it("should refresh view with CONCURRENTLY option", async () => {
      const mockQuery = sequelize.query as jest.Mock;
      mockQuery.mockResolvedValue([]);

      const payload = {
        viewName: "line_items_products_joined_mv",
        concurrently: true
      };

      await handleMaterializedViewUpdate(payload);

      expect(mockQuery).toHaveBeenCalledWith(
        "REFRESH MATERIALIZED VIEW CONCURRENTLY line_items_products_joined_mv"
      );
    });

    it("should refresh view without CONCURRENTLY when false", async () => {
      const mockQuery = sequelize.query as jest.Mock;
      mockQuery.mockResolvedValue([]);

      const payload = {
        viewName: "line_items_products_joined_mv",
        concurrently: false
      };

      await handleMaterializedViewUpdate(payload);

      expect(mockQuery).toHaveBeenCalledWith(
        "REFRESH MATERIALIZED VIEW  line_items_products_joined_mv"
      );
    });

    it("should throw WorkerError when viewName is missing", async () => {
      const payload = {} as any;

      await expect(handleMaterializedViewUpdate(payload)).rejects.toThrow(
        WorkerError
      );
      await expect(handleMaterializedViewUpdate(payload)).rejects.toMatchObject(
        {
          code: "VALIDATION_FAILED",
          retryable: false
        }
      );
    });

    it("should throw WorkerError for invalid view name", async () => {
      const payload = {
        viewName: "malicious_view"
      };

      await expect(handleMaterializedViewUpdate(payload)).rejects.toThrow(
        WorkerError
      );
      await expect(handleMaterializedViewUpdate(payload)).rejects.toMatchObject(
        {
          code: "VALIDATION_FAILED",
          retryable: false
        }
      );
    });

    it("should throw WorkerError for SQL injection attempt", async () => {
      const payload = {
        viewName: "test_view; DROP TABLE users;"
      };

      await expect(handleMaterializedViewUpdate(payload)).rejects.toThrow(
        WorkerError
      );
    });

    it("should throw retryable error for database connection failure", async () => {
      const mockQuery = sequelize.query as jest.Mock;
      mockQuery.mockRejectedValue(new Error("Connection timeout"));

      const payload = {
        viewName: "line_items_products_joined_mv"
      };

      await expect(handleMaterializedViewUpdate(payload)).rejects.toThrow(
        WorkerError
      );
      await expect(handleMaterializedViewUpdate(payload)).rejects.toMatchObject(
        {
          code: "DATABASE_ERROR",
          retryable: true
        }
      );
    });

    it("should throw non-retryable error if view does not exist", async () => {
      const mockQuery = sequelize.query as jest.Mock;
      mockQuery.mockRejectedValue(
        new Error('relation "test_view" does not exist')
      );

      const payload = {
        viewName: "line_items_products_joined_mv"
      };

      await expect(handleMaterializedViewUpdate(payload)).rejects.toThrow(
        WorkerError
      );
      await expect(handleMaterializedViewUpdate(payload)).rejects.toMatchObject(
        {
          code: "DATABASE_ERROR",
          retryable: false
        }
      );
    });
  });
});
