import { Op, QueryTypes } from "sequelize";
import { ProgramsComplianceStatus } from "../config/appConstants";
import sequelize from "../db";
import { ApiError } from "../lib/errors/APIError";
import ProgramCompliance from "../models/ProgramCompliance";
import ProgramParticipant from "../models/ProgramParticipant";
import ProgramStoreIneligibility from "../models/ProgramStoreIneligibility";

interface Compliance {
  id: number;
  programId: number;
  entityId: number;
  entityType: string;
  isQualified: boolean;
  totalPurchaseVolume: number;
  totalCasePurchases: number;
  earnedRebate: number;
  complianceDate: Date;
  createdAt: Date;
  updatedAt: Date;
  status: string;
}

class ComplianceRepository {
  /**
   * Find compliance by entity ID and entity type
   *
   * This method retrieves a compliance record based on the provided entity ID and entity type.
   *
   * @param entityId The ID of the entity
   * @param entityType The type of the entity
   * @param {number[]} [programIds] Optional parameter. The list of program IDs to filter the results.
   * @returns A promise that resolves to a compliance record
   */
  async findComplianceByEntityIdAndEntityType({
    entityId,
    entityType,
    programIds,
    includeOnlyParticipatedProgramCompliances,
    returnRawData,
    complianceStatus,
    excludeIneligibleStores
  }: {
    entityId: number[];
    entityType: string[];
    programIds?: number[];
    includeOnlyParticipatedProgramCompliances?: boolean;
    returnRawData?: boolean;
    complianceStatus?: string;
    excludeIneligibleStores?: boolean;
  }): Promise<Compliance[]> {
    try {
      const compliancesFilter = {
        ...(programIds ? { program_id: { [Op.in]: programIds } } : {})
      };

      const compliances = await ProgramCompliance.findAll({
        include: includeOnlyParticipatedProgramCompliances
          ? excludeIneligibleStores
            ? [
                {
                  model: ProgramParticipant,
                  as: "ProgramComplianceParticipant",
                  attributes: [],
                  required: true, // Ensures only matching rows are included
                  where: {
                    entity_id: { [Op.col]: "ProgramCompliance.entity_id" },
                    program_id: { [Op.col]: "ProgramCompliance.program_id" }
                  }
                },
                {
                  model: ProgramStoreIneligibility,
                  as: "ProgramComplianceStoreIneligibilities",
                  attributes: [],
                  required: false,
                  where: {
                    store_id: { [Op.col]: "ProgramCompliance.entity_id" },
                    program_id: { [Op.col]: "ProgramCompliance.program_id" }
                  }
                }
              ]
            : [
                {
                  model: ProgramParticipant,
                  as: "ProgramComplianceParticipant",
                  attributes: [],
                  required: true, // Ensures only matching rows are included
                  where: {
                    entity_id: { [Op.col]: "ProgramCompliance.entity_id" },
                    program_id: { [Op.col]: "ProgramCompliance.program_id" }
                  }
                }
              ]
          : excludeIneligibleStores
            ? [
                {
                  model: ProgramStoreIneligibility,
                  as: "ProgramComplianceStoreIneligibilities",
                  attributes: [],
                  required: false,
                  where: {
                    store_id: { [Op.col]: "ProgramCompliance.entity_id" },
                    program_id: { [Op.col]: "ProgramCompliance.program_id" }
                  }
                }
              ]
            : [],
        where: {
          entityType: {
            [Op.or]: entityType // Use Op.or to match any of the provided entity types
          },
          entityId: {
            [Op.in]: entityId
          },
          ...compliancesFilter,
          ...(complianceStatus
            ? { status: complianceStatus } // Filter by compliance status if provided
            : {}),
          ...(excludeIneligibleStores
            ? {
                "$ProgramComplianceStoreIneligibilities.id$": {
                  [Op.is]: null
                }
              }
            : {})
        },
        attributes: [
          "programId",
          "programDetailId",
          "totalPurchaseVolume",
          "earnedRebate",
          "isQualified",
          "entityId",
          "status"
        ],
        group: ["ProgramCompliance.id"],
        raw: returnRawData
      });

      return compliances;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(` ${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  /**
   * Get aggregated compliance data for key metrics calculation
   * Uses distributor_program_aggregations materialized view for optimal performance
   */
  async getComplianceAggregates({
    distributorId,
    programIds,
    warehouseIds
  }: {
    distributorId: number;
    programIds?: number[];
    warehouseIds?: number[];
  }): Promise<{
    totalSavings: number;
    totalStores: number;
    enrolledStores: number;
  }> {
    try {
      const baseQuery = `
        SELECT
          COALESCE(SUM(dpa.stores_earnings + dpa.chains_stores_earnings), 0) as total_savings
        FROM distributor_program_aggregations dpa
        WHERE dpa.deleted_at IS NULL
          AND dpa.distributor_id = $1
          AND dpa.participant_type = 'STORE'
          ${warehouseIds && warehouseIds.length > 0 ? "AND dpa.warehouse_id = ANY($2)" : ""}
          ${programIds && programIds.length > 0 ? `AND dpa.program_id = ANY($${warehouseIds && warehouseIds.length > 0 ? "3" : "2"})` : ""}
      `;

      const queryParams = [
        distributorId,
        ...(warehouseIds && warehouseIds.length > 0 ? [warehouseIds] : []),
        ...(programIds && programIds.length > 0 ? [programIds] : [])
      ];

      const result = await sequelize.query(baseQuery, {
        type: QueryTypes.SELECT,
        bind: queryParams
      });

      const aggregates = result[0] as any;
      return {
        totalSavings: Number(aggregates.total_savings) || 0,
        totalStores: 0,
        enrolledStores: 0
      };
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(
          `Compliance aggregation error: ${error.message}`
        );
      } else {
        throw ApiError.internal(
          "An unknown error occurred during compliance aggregation"
        );
      }
    }
  }
}

export default new ComplianceRepository();
