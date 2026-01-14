import newrelic from "newrelic";
import { QueryTypes } from "sequelize";
import sequelize from "../db";
import logger from "../lib/logger";
import StoreEnrollmentStatus, {
  StoreEnrollmentAction,
  StoreEnrollmentStatusValue
} from "../models/StoreEnrollmentStatus";

export class StoreEnrollmentStatusRepository {
  /**
   * UPSERT statuses for a request across storeIds x agreementIds.
   * Manufacturer is derived from program_agreements.
   *
   * This uses a Postgres ON CONFLICT clause with a WHERE predicate to match the
   * partial unique index:
   *   (request_id, store_id, agreement_id, action) WHERE deleted_at IS NULL
   */
  public async upsertStatusesForRequest(params: {
    requestId: string;
    action: StoreEnrollmentAction;
    status: StoreEnrollmentStatusValue;
    storeIds: number[];
    agreementIds: number[];
  }): Promise<void> {
    return newrelic.startSegment(
      "StoreEnrollmentStatusRepository.upsertStatusesForRequest",
      true,
      async () => {
        const { requestId, action, status, storeIds, agreementIds } = params;

        if (!requestId) {
          throw new Error("requestId is required");
        }
        if (!storeIds?.length || !agreementIds?.length) {
          return;
        }

        logger.debug("Upserting store enrollment statuses", {
          requestId,
          action,
          status,
          storeCount: storeIds.length,
          agreementCount: agreementIds.length
        });

        // NOTE: agreementIds here refer to program_agreements.id (as used by ProgramAgreementService)
        const sql = `
          WITH agreements AS (
            SELECT
              pa.id AS agreement_id,
              pa.manufacturer_id AS manufacturer_id
            FROM program_agreements pa
            WHERE pa.id = ANY(ARRAY[:agreementIds])
              AND pa.deleted_at IS NULL
          ),
          stores AS (
            SELECT unnest(ARRAY[:storeIds])::integer AS store_id
          ),
          pairs AS (
            SELECT
              s.store_id,
              a.agreement_id,
              a.manufacturer_id
            FROM stores s
            CROSS JOIN agreements a
          )
          INSERT INTO store_enrollment_statuses (
            request_id,
            store_id,
            agreement_id,
            manufacturer_id,
            action,
            status,
            created_at,
            updated_at,
            deleted_at
          )
          SELECT
            :requestId,
            p.store_id,
            p.agreement_id,
            p.manufacturer_id,
            :action,
            :status,
            NOW(),
            NOW(),
            NULL
          FROM pairs p
          ON CONFLICT (request_id, store_id, agreement_id, action)
          WHERE deleted_at IS NULL
          DO UPDATE SET
            status = EXCLUDED.status,
            manufacturer_id = EXCLUDED.manufacturer_id,
            updated_at = NOW(),
            deleted_at = NULL;
        `;

        await sequelize.query(sql, {
          replacements: {
            requestId,
            action,
            status,
            storeIds,
            agreementIds
          }
        });
      }
    );
  }

  public async getByRequestId(
    requestId: string
  ): Promise<StoreEnrollmentStatus[]> {
    return newrelic.startSegment(
      "StoreEnrollmentStatusRepository.getByRequestId",
      true,
      async () => {
        return await StoreEnrollmentStatus.findAll({
          where: { requestId },
          order: [["updatedAt", "DESC"]]
        });
      }
    );
  }

  /**
   * Returns the latest statuses (potentially multiple rows, different actions)
   * for a store + agreement.
   */
  public async getLatestByStoreAgreement(params: {
    storeId: number;
    agreementId: number;
    limit?: number;
  }): Promise<
    Array<{
      id: number;
      storeId: number;
      requestId: string;
      action: StoreEnrollmentAction;
      agreementId: number;
      manufacturerId: number;
      status: StoreEnrollmentStatusValue;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    return newrelic.startSegment(
      "StoreEnrollmentStatusRepository.getLatestByStoreAgreement",
      true,
      async () => {
        const { storeId, agreementId, limit = 20 } = params;

        const sql = `
          SELECT
            ses.id AS "id",
            ses.store_id AS "storeId",
            ses.request_id AS "requestId",
            ses.action AS "action",
            ses.agreement_id AS "agreementId",
            ses.manufacturer_id AS "manufacturerId",
            ses.status AS "status",
            ses.created_at AS "createdAt",
            ses.updated_at AS "updatedAt"
          FROM store_enrollment_statuses ses
          WHERE ses.store_id = :storeId
            AND ses.agreement_id = :agreementId
            AND ses.deleted_at IS NULL
          ORDER BY ses.updated_at DESC
          LIMIT :limit;
        `;

        return await sequelize.query(sql, {
          replacements: { storeId, agreementId, limit },
          type: QueryTypes.SELECT
        });
      }
    );
  }

  /**
   * Returns one status per store for a given manufacturer.
   * Logic:
   * - If any row for that store+manufacturer is `processing`, return `processing`
   * - Otherwise return the most recently updated status.
   */
  public async getLatestByStoresAndManufacturer(params: {
    storeIds: number[];
    manufacturerId: number;
    startDate?: Date;
  }): Promise<Map<number, StoreEnrollmentStatusValue>> {
    return newrelic.startSegment(
      "StoreEnrollmentStatusRepository.getLatestByStoresAndManufacturer",
      true,
      async () => {
        const { storeIds, manufacturerId } = params;

        if (!storeIds?.length || !manufacturerId) {
          return new Map();
        }

        const sql = `
          SELECT DISTINCT ON (ses.store_id)
            ses.store_id AS "storeId",
            ses.status AS "status"
          FROM store_enrollment_statuses ses
          WHERE ses.store_id = ANY(ARRAY[:storeIds])
            AND ses.manufacturer_id = :manufacturerId
            AND ses.deleted_at IS NULL
            AND (:startDate::timestamp IS NULL OR ses.created_at >= :startDate)
          ORDER BY
            ses.store_id,
            CASE WHEN ses.status = 'processing' THEN 0 ELSE 1 END,
            ses.updated_at DESC;
        `;

        const rows = (await sequelize.query(sql, {
          replacements: {
            storeIds,
            manufacturerId,
            startDate: params.startDate || null
          },
          type: QueryTypes.SELECT
        })) as Array<{
          storeId: number;
          status: StoreEnrollmentStatusValue;
        }>;

        const resultMap = new Map(
          rows.map((row) => [Number(row.storeId), row.status])
        );

        // If startDate was provided, populate missing stores with "succeeded" default
        if (params.startDate) {
          for (const storeId of params.storeIds) {
            if (!resultMap.has(storeId)) {
              resultMap.set(storeId, "succeeded");
            }
          }
        }

        return resultMap;
      }
    );
  }
}

export default new StoreEnrollmentStatusRepository();
