import newrelic from "newrelic";
import logger from "../../lib/logger";
import sequelize from "../../db";
import { WorkerError } from "../errors/WorkerError";

export interface MaterializedViewPayload {
  viewName: string;
  concurrently?: boolean;
}

/**
 * Whitelist of allowed materialized views
 * Only views in this list can be refreshed via worker jobs
 * This prevents SQL injection and ensures only known views are refreshed
 */
const ALLOWED_VIEWS = [
  "line_items_products_joined_mv",
  "product_insights_aggregated_view",
  "distributor_stores_programs_enrolled_mv",
  "sales_rep_spiff_earning_summary_mv"
];

/**
 * Handle materialized view refresh jobs
 * Executes REFRESH MATERIALIZED VIEW SQL commands
 */
export async function handleMaterializedViewUpdate(
  payload: MaterializedViewPayload
): Promise<void> {
  return newrelic.startSegment("MaterializedViewRefreshJob", true, async () => {
    logger.info("Refreshing materialized view", {
      viewName: payload.viewName,
      concurrently: payload.concurrently || false
    });

    // Validate required fields
    if (!payload.viewName) {
      throw WorkerError.validationFailed(
        "viewName is required for materialized view update"
      );
    }

    // Validate view name against whitelist (security measure)
    if (!ALLOWED_VIEWS.includes(payload.viewName)) {
      logger.error("Attempted to refresh invalid materialized view", {
        viewName: payload.viewName,
        allowedViews: ALLOWED_VIEWS
      });
      throw WorkerError.validationFailed(
        `Invalid materialized view: ${payload.viewName}. Must be one of: ${ALLOWED_VIEWS.join(", ")}`
      );
    }

    try {
      // Build SQL query
      const concurrently = payload.concurrently ? "CONCURRENTLY" : "";
      const query = `REFRESH MATERIALIZED VIEW ${concurrently} ${payload.viewName}`;

      logger.debug("Executing materialized view refresh", { query });

      // Execute refresh
      const startTime = Date.now();
      await sequelize.query(query);
      const duration = Date.now() - startTime;

      logger.info("Materialized view refreshed successfully", {
        viewName: payload.viewName,
        concurrently: payload.concurrently || false,
        durationMs: duration
      });

      // Add custom attributes to New Relic
      newrelic.addCustomAttributes({
        jobType: "UPDATE_MATERIALIZED_VIEW",
        viewName: payload.viewName,
        concurrently: payload.concurrently || false,
        durationMs: duration
      });
    } catch (error) {
      logger.error("Materialized view refresh failed", {
        viewName: payload.viewName,
        error
      });

      // Determine if error is retryable
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const isRetryable = !errorMessage.includes("does not exist");

      throw WorkerError.databaseError(
        `Failed to refresh materialized view: ${payload.viewName}`,
        isRetryable
      );
    }
  });
}
