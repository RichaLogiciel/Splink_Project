import { Op, QueryTypes, Sequelize } from "sequelize";
import {
  ENTITY_TYPE,
  PROGRAM_APPROVAL_STATUS,
  ProgramsComplianceStatus,
  VISIBILITY_SCOPE
} from "../config/appConstants";
import { ERROR_MESSAGES } from "../config/errorMessages";
import { USER_ROLES } from "../config/roles";
import sequelize from "../db";
import { ApiError } from "../lib/errors/APIError";
import Distributor from "../models/Distributor";
import DistributorManagerWarehouse from "../models/DistributorManagerWarehouse";
import LineItem from "../models/LineItem";
import ManagerSalesRepMapping from "../models/ManagerSalesRepMapping";
import Manufacturer from "../models/Manufacturer";
import Product from "../models/Product";
import ProductCategory from "../models/ProductCategory";
import Program from "../models/Program";
import ProgramCompliance from "../models/ProgramCompliance";
import ProgramParticipant from "../models/ProgramParticipant";
import ProgramStoreIneligibility from "../models/ProgramStoreIneligibility";
import ProgramVisibility from "../models/ProgramVisibility";
import SalesSummary from "../models/SalesSummaryMaterializedView";
import StoreSalesRep from "../models/StoreSalesRep";
import User from "../models/User";
import UserRole from "../models/UserRole";
import Warehouse from "../models/Warehouse";
import { SalesRepEarnings } from "../types/SalesRepTypes";
import { SalesDataItem } from "../types/SalesTypes";
import { buildProgramTimelineSqlCondition } from "../utils/helpers";
import { getCurrentUser } from "../utils/requestContext";
import {
  getProgramComplianceEarningColumn,
  isDistributorSalesRepManager
} from "../utils/roles";
import ManufacturerRepository from "./ManufacturerRepository";
import ProgramRepository from "./ProgramRepository";
import SalesRepRepository from "./SalesRepRepository";
import StoreRepository from "./StoreRepository";

// Interface for CSV export data
export interface StoreEarningsCSVData {
  storeId: number;
  storeExternalId: string;
  storeName: string;
  storeDisplayName: string;
  programId: number;
  programName: string;
  programTier: number;
  salesRepName: string;
  manufacturerName: string;
  totalStoreEarnings: number;
}

export interface SalesRepEarningsCSVData {
  salesRepName: string;
  salesRepManager: string;
  totalEarnings: number;
  manufacturerName: string;
  programName: string;
  programOverview: string;
  programTier: number | null;
  programEarnings: number;
  programStartDate: Date;
  programEndDate: Date;
}

// Interface for Program Summary CSV data
export interface ProgramSummaryCSVData {
  programId: number;
  programDetailId: number;
  programName: string;
  programTier: number | null;
  programStartDate: Date;
  programEndDate: Date;
  storesEnrolled: number;
  storesInCompliance: number;
  totalEarnings: number;
  manufacturerName: string;
}

// Define interfaces for the raw query results
interface RebateResult {
  total_earned_rebate: number;
}

interface PurchaseVolumeResult {
  total_purchase_volume: number;
}

interface SavingsResult {
  manufacturerId: number;
  manufacturerName: string;
  totalSavings: number;
  salesVolume: number;
  logo: string | null;
}

class DistributorRepository {
  /**
   * Retrieves an array of sales representative IDs associated with a distributor.
   * @param {number} distributorId The ID of the distributor.
   * @returns {Promise<number[]>} A promise that resolves with an array of sales representative IDs.
   */
  public async getSalesRepIdsByDistributor(
    distributorIds: number[],
    warehouseId?: number
  ) {
    const result = await UserRole.findAll({
      attributes: [
        [
          Sequelize.fn("array_agg", Sequelize.col("associated_user_id")),
          "salesRepIds"
        ]
      ],
      where: {
        parent_entity_type: ENTITY_TYPE.DISTRIBUTOR,
        parent_entity_id: {
          [Op.in]: distributorIds
        },
        role: "DISTRIBUTOR_SALES_REP"
      },
      raw: true
    });

    return result[0].salesRepIds;
  }

  /**
   * Retrieves an array of sales representative IDs associated with a sales representative manager.
   * @param {number} salesRepManagerId The ID of the sales representative manager.
   * @returns {Promise<number[]>} A promise that resolves with an array of sales representative IDs.
   */
  public async getSalesRepIdsBySalesRepManagerId({
    salesRepManagerId
  }: {
    salesRepManagerId: number | string | undefined;
  }) {
    if (!salesRepManagerId || !Number(salesRepManagerId)) {
      return [];
    }
    const result = await ManagerSalesRepMapping.findAll({
      where: {
        sales_manager_id: salesRepManagerId
      },
      attributes: ["sales_rep_id"],
      raw: true
    });

    return result.map((row: any) => row.sales_rep_id);
  }

  /**
   * Retrieves sales representatives filtered by warehouse ID for a given distributor.
   * Returns sales reps that have the specified warehouse as their primary warehouse.
   * @param {number} distributorId The ID of the distributor (parent_entity_id).
   * @param {number} warehouseId The ID of the warehouse (primary_warehouse_id).
   * @param {boolean} returnFullDetails If true, returns full details (id, name, associatedUserId), otherwise returns just IDs.
   * @returns {Promise<number[] | Array<{id: number; name: string; associatedUserId: number}>>} A promise that resolves with an array of sales rep IDs or full details.
   */
  public async getSalesRepsByWarehouseId(
    distributorId: number,
    warehouseId: number,
    returnFullDetails?: false
  ): Promise<number[]>;
  public async getSalesRepsByWarehouseId(
    distributorId: number,
    warehouseId: number,
    returnFullDetails: true
  ): Promise<Array<{ id: number; name: string; associatedUserId: number }>>;
  public async getSalesRepsByWarehouseId(
    distributorId: number,
    warehouseId: number,
    returnFullDetails: boolean = false
  ): Promise<
    number[] | Array<{ id: number; name: string; associatedUserId: number }>
  > {
    if (returnFullDetails) {
      return this.getSalesRepsByWarehouseIdWithDetails(
        distributorId,
        warehouseId
      );
    }
    return this.getSalesRepIdsByWarehouseId(distributorId, warehouseId);
  }

  /**
   * Retrieves sales rep IDs filtered by warehouse ID.
   * @private
   */
  private async getSalesRepIdsByWarehouseId(
    distributorId: number,
    warehouseId: number
  ): Promise<number[]> {
    const query = `
      SELECT ur.associated_user_id AS "salesRepId"
      FROM user_roles AS ur
      JOIN distributors ON ur.associated_user_id = distributors.id
      WHERE ur.parent_entity_type = :parentEntityType
        AND ur.parent_entity_id IN (:distributorIds)
        AND ur.role = :role
        AND distributors.primary_warehouse_id = :warehouseId
    `;

    const replacements = {
      role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
      parentEntityType: ENTITY_TYPE.DISTRIBUTOR,
      distributorIds: [distributorId],
      warehouseId: warehouseId
    };

    const result = await sequelize.query<{ salesRepId: number }>(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    return result
      .map((row) => row.salesRepId)
      .filter((id): id is number => id != null && !isNaN(Number(id)));
  }

  /**
   * Retrieves sales reps with full details (id, name, associatedUserId) filtered by warehouse ID.
   * @private
   */
  private async getSalesRepsByWarehouseIdWithDetails(
    distributorId: number,
    warehouseId: number
  ): Promise<Array<{ id: number; name: string; associatedUserId: number }>> {
    const query = `
      SELECT 
        u.id AS "id",
        CONCAT(u.first_name, ' ', u.last_name) AS "name",
        ur.associated_user_id AS "associatedUserId"
      FROM user_roles AS ur
      JOIN distributors d ON ur.associated_user_id = d.id
      JOIN users u ON ur.user_id = u.id
      WHERE ur.parent_entity_type = :parentEntityType
        AND ur.parent_entity_id IN (:distributorIds)
        AND ur.role = :role
        AND ur.associated_entity_type = :associatedEntityType
        AND d.primary_warehouse_id = :warehouseId
      GROUP BY ur.id, u.id, ur.associated_user_id
    `;

    const replacements = {
      role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
      parentEntityType: ENTITY_TYPE.DISTRIBUTOR,
      associatedEntityType: ENTITY_TYPE.DISTRIBUTOR,
      distributorIds: [distributorId],
      warehouseId: warehouseId
    };

    const result = await sequelize.query<{
      id: number;
      name: string;
      associatedUserId: number;
    }>(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    return result.filter((row) => row.id != null && !isNaN(Number(row.id)));
  }

  /**
   * Fetches sales representative IDs for the given distributor IDs.
   *
   * This function retrieves the list of sales rep IDs associated with each distributor.
   * It aggregates the `associated_user_id` values into an array grouped by `parent_entity_id`
   * (which represents the distributor ID).
   *
   * @param {number[]} distributorIds - An array of distributor IDs to fetch sales rep data for.
   * @returns {Promise<{ distributor_id: number; sales_rep_ids: number[] }[]>}
   *          A promise that resolves to an array of objects,
   *          each containing `distributor_id` and an array of `sales_rep_ids`.
   */
  public async getSalesRepIdsArrayByDistributorId(distributorIds: number[]) {
    const result = await UserRole.findAll({
      attributes: [
        "parent_entity_id",
        [
          Sequelize.fn("array_agg", Sequelize.col("associated_user_id")),
          "sales_rep_ids"
        ]
      ],
      where: {
        parent_entity_type: ENTITY_TYPE.DISTRIBUTOR,
        parent_entity_id: {
          [Op.in]: distributorIds
        },
        role: "DISTRIBUTOR_SALES_REP"
      },
      group: ["parent_entity_id"], // Group by distributor_id
      raw: true
    });

    // Transforming result to match the expected structure
    return result.map((row: any) => ({
      distributor_id: row.parent_entity_id,
      sales_rep_ids: row.sales_rep_ids
    }));
  }

  /**
   * Retrieves the total earned rebate for a distributor.
   * The total earned rebate is the sum of the earned rebate for all programs of the distributor.
   * @param {number} entityId The ID of the distributor.
   * @param {string} entityType The entity type of the distributor.
   * @returns {Promise<{ status: number; data: number | string }>} A promise that resolves with the total earned rebate.
   */
  public async getTotalEarnedRebate(
    entityId: number,
    entityType: string,
    loggedInUser?: UserRole,
    programTimeline?: string
  ): Promise<number> {
    let distributorId = 0;
    if (entityType == ENTITY_TYPE.DISTRIBUTOR) {
      distributorId = entityId;
    } else if (
      entityType == ENTITY_TYPE.SALES_REP ||
      entityType == ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE
    ) {
      distributorId = Number(loggedInUser?.parentEntityId ?? 0);
    }

    const authorizedManufacturers =
      await ManufacturerRepository.getAuthorizedManufacturersIds(distributorId);
    const authorizedManufacturerIds = authorizedManufacturers.map((am) =>
      Number(am.manufacturerId)
    );

    // If a record exists, proceed to calculate the total earned rebate
    const result: any = await Program.findAll({
      attributes: [
        [
          sequelize.fn(
            "SUM",
            sequelize.col("ProgramCompliances.earned_rebate")
          ),
          "total_earned_rebate"
        ]
      ],
      include: [
        {
          model: ProgramCompliance,
          attributes: [], // Exclude raw participant data
          where: {
            entityId,
            entityType,
            status: ProgramsComplianceStatus.Active
          }
        }
      ],
      where: {
        participant_type: entityType,
        manufacturer_id: { [Op.in]: authorizedManufacturerIds },
        ...Program.getProgramTimelineFilter(programTimeline)
      },
      raw: true // Return raw results
    });

    if (result[0] && result[0].total_earned_rebate !== null) {
      return parseFloat(result[0].total_earned_rebate.toString());
    }

    return 0;
  }

  private buildRelevantTransactionFilter = () => ({
    [Op.and]: [
      Sequelize.where(Sequelize.col("product_id"), {
        [Op.in]: Sequelize.literal(`(
          SELECT skus_id
          FROM (
            SELECT case_skus_id AS skus_id FROM products
            UNION
            SELECT unit_skus_id AS skus_id FROM products
            UNION
            SELECT box_skus_id AS skus_id FROM products
          ) AS combined_skus
        )`) // Compare with the string array
      })
    ]
  });

  /**
   * Retrieves the total purchase volume for a distributor.
   * @param {number} buyerId The ID of the distributor
   * @param {string} buyerType The type of the distributor (MANUFACTURER or DISTRIBUTOR)
   * @param {boolean} includeRelevantTransactions Whether to include only relevant transactions (filtered by authorized manufacturers and current year)
   * @returns {Promise<number>} The total purchase volume for the distributor
   */
  public async getTotalPurchaseVolume(
    buyerId: number,
    buyerType: string,
    includeRelevantTransactions?: boolean,
    warehouseIds?: number[]
  ): Promise<number> {
    const sequelize = LineItem.sequelize;
    if (!sequelize) {
      throw ApiError.internal(ERROR_MESSAGES.COMMON.DB_ERROR);
    }

    return includeRelevantTransactions
      ? await this.getRelevantPurchaseVolume(buyerId, buyerType, warehouseIds)
      : await this.getRegularPurchaseVolume(buyerId, buyerType);
  }

  /**
   * Retrieves the regular total purchase volume (all transactions regardless of year or manufacturer)
   * @param {number} buyerId The ID of the distributor
   * @param {string} buyerType The type of the distributor
   * @returns {Promise<number>} The total purchase volume
   */
  private async getRegularPurchaseVolume(
    buyerId: number,
    buyerType: string
  ): Promise<number> {
    const query = {
      attributes: [
        [
          sequelize.fn("SUM", sequelize.col("total_price")),
          "total_purchase_volume"
        ] as [any, string]
      ],
      where: {
        buyerId,
        buyerType,
        sellerType: ENTITY_TYPE.MANUFACTURER
      },
      subQuery: false,
      raw: true,
      rejectOnEmpty: false
    };

    const result = (await LineItem.findOne(
      query
    )) as unknown as PurchaseVolumeResult | null;
    return result?.total_purchase_volume
      ? parseFloat(result.total_purchase_volume.toString())
      : 0;
  }

  /**
   * Retrieves the relevant purchase volume (filtered by current year only)
   * @param {number} buyerId The ID of the distributor
   * @param {string} buyerType The type of the distributor
   * @returns {Promise<number>} The total purchase volume
   */
  private async getRelevantPurchaseVolume(
    buyerId: number,
    buyerType: string,
    warehouseIds?: number[]
  ): Promise<number> {
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const lineItemsWhere = warehouseIds
      ? { warehouse_id: { [Op.in]: warehouseIds } }
      : {};

    // Use a subquery approach to avoid duplicate JOIN issues
    const query = {
      attributes: [
        [
          sequelize.fn("SUM", sequelize.col("total_price")),
          "total_purchase_volume"
        ] as [any, string]
      ],
      where: {
        buyerId,
        buyerType,
        sellerType: ENTITY_TYPE.MANUFACTURER,
        transaction_date: {
          [Op.between]: [startOfYear, endOfYear]
        },
        ...lineItemsWhere,
        // Use EXISTS subquery instead of JOIN to avoid duplicates
        [Op.and]: [
          Sequelize.literal(`
            EXISTS (
              SELECT 1 FROM products p
              WHERE "LineItem"."splink_product_id" = p.id
                AND p.deleted_at IS NULL
            )
          `)
        ]
      },
      subQuery: false,
      raw: true,
      rejectOnEmpty: false
    };

    try {
      const result = (await LineItem.findOne(
        query
      )) as unknown as PurchaseVolumeResult | null;
      return result?.total_purchase_volume
        ? parseFloat(result.total_purchase_volume.toString())
        : 0;
    } catch (error) {
      console.error("Error in relevant purchase volume query:", error);
      return 0;
    }
  }

  /**
   * Retrieves the count of stores associated with a distributor.
   *
   * This method fetches the count of stores associated with a given distributor
   * by querying the UserRole model. The query filters on the parent entity ID
   * and type, as well as the associated entity type.
   *
   * @param {number} distributorId - The ID of the distributor for whom to retrieve the store count.
   * @returns {Promise<number>} - A promise that resolves to the count of stores associated with the distributor.
   */
  public async countStoresForDistributor(
    distributorId: number,
    warehouseIds?: number[]
  ): Promise<number> {
    if (warehouseIds && warehouseIds.length > 0) {
      // Get store IDs by warehouse IDs
      const storeIdsByWarehouse =
        await StoreRepository.getStoreIdsByWarehouseIds(warehouseIds);

      if (!storeIdsByWarehouse || storeIdsByWarehouse.length === 0) {
        return 0;
      }

      // Count stores that are both associated with the distributor and in the warehouse store IDs
      const count = await UserRole.count({
        where: {
          parentEntityId: distributorId,
          parentEntityType: ENTITY_TYPE.DISTRIBUTOR,
          associatedEntityType: ENTITY_TYPE.STORE,
          associatedUserId: { [Op.in]: storeIdsByWarehouse }
        }
      });

      return count;
    }

    const count = await UserRole.count({
      where: {
        parentEntityId: distributorId,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR,
        associatedEntityType: ENTITY_TYPE.STORE
      }
    });

    return count;
  }

  public async countActiveStoresForDistributor(
    distributorId: number
  ): Promise<number> {
    const count = await User.count({
      include: [
        {
          model: UserRole,
          where: {
            parentEntityId: distributorId,
            parentEntityType: ENTITY_TYPE.DISTRIBUTOR,
            associatedEntityType: ENTITY_TYPE.STORE
          }
        }
      ],
      where: {
        status: "ACTIVE"
      }
    });

    return count;
  }

  /**
   * Counts the number of unique stores under a distributor that are enrolled in at least one program.
   * @param {number} distributorId - The ID of the distributor.
   * @param {number[]} [authorizedManufacturerIds] - Optional array of manufacturer IDs to filter programs by.
   * @param {number[]} [warehouseIds] - Optional array of warehouse IDs to filter stores by.
   * @returns {Promise<number>} - The count of unique enrolled stores.
   */
  public async getDistinctEnrolledStoresCountForDistributor(
    distributorId: number,
    authorizedManufacturerIds?: number[],
    warehouseIds?: number[]
  ): Promise<number> {
    const user = getCurrentUser();
    const isSalesRepManager = isDistributorSalesRepManager(user?.role);

    // Step 1: Get all store IDs for this distributor
    const storeIdObjs = isSalesRepManager
      ? await StoreRepository.getStoresBySalesRepManagerId({
          salesRepManagerId: user?.associatedUserId
        })
      : await StoreRepository.getStoreIdsByDistributorId(distributorId);
    let storeIds = storeIdObjs.map((obj: any) =>
      isSalesRepManager ? obj.storeId : obj.associatedUserId
    );

    // Filter store IDs by warehouse if warehouseIds is provided
    if (warehouseIds && warehouseIds.length > 0) {
      const storeIdsByWarehouse =
        await StoreRepository.getStoreIdsByWarehouseIds(warehouseIds);
      if (!storeIdsByWarehouse || storeIdsByWarehouse.length === 0) {
        return 0;
      }
      // Filter to only include stores that are both in the distributor and in the warehouse
      storeIds = storeIds.filter((storeId: number) =>
        storeIdsByWarehouse.includes(storeId)
      );
    }

    if (!storeIds?.length) return 0;

    // Step 2: Get program IDs that are explicitly excluded for this distributor
    const excludedProgramIds =
      await ProgramRepository.getExcludedProgramIds(distributorId);

    // Step 3: Get all programs that are potentially visible to any of the stores
    const potentiallyValidProgramIds =
      await ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
        participantType: ENTITY_TYPE.STORE,
        creatorIds: authorizedManufacturerIds
          ? authorizedManufacturerIds
          : undefined,
        creatorType: authorizedManufacturerIds
          ? ENTITY_TYPE.MANUFACTURER
          : undefined,
        secondaryCreatorIds: [distributorId],
        secondaryCreatorType: ENTITY_TYPE.DISTRIBUTOR,
        visibilityEntitieIds: storeIds,
        distributorId: distributorId
      });

    if (!potentiallyValidProgramIds.length) return 0;

    // Filter out the excluded programs
    const validProgramIds = potentiallyValidProgramIds.filter(
      (id) => !excludedProgramIds.includes(id)
    );

    if (!validProgramIds.length) return 0;

    // Step 4: Fetch these programs to check their specific visibility rules
    const programsWithVisibility = await Program.findAll({
      where: { id: { [Op.in]: validProgramIds } },
      include: [
        {
          model: ProgramVisibility,
          as: "ProgramVisibility",
          attributes: ["entity_id"],
          required: false
        }
      ]
    });

    const specificStorePrograms = new Map<number, number[]>(); // programId -> [storeId]
    const generalPrograms: number[] = [];

    for (const program of programsWithVisibility) {
      if (program.visibilityScope === VISIBILITY_SCOPE.SPECIFIC_STORES) {
        const visibleStoreIds = (program.ProgramVisibility || []).map(
          (pv: any) => pv.entity_id
        );
        specificStorePrograms.set(program.id, visibleStoreIds);
      } else {
        generalPrograms.push(program.id);
      }
    }

    // Step 5: Build a query to count distinct stores that are validly enrolled
    const whereConditions = [];
    if (generalPrograms.length > 0) {
      whereConditions.push({ programId: { [Op.in]: generalPrograms } });
    }

    for (const [
      programId,
      visibleStoreIds
    ] of specificStorePrograms.entries()) {
      whereConditions.push({
        programId: programId,
        entityId: { [Op.in]: visibleStoreIds }
      });
    }

    if (whereConditions.length === 0) {
      return 0;
    }

    const result = await ProgramParticipant.count({
      distinct: true,
      col: "entity_id",
      include: [
        {
          model: ProgramStoreIneligibility,
          as: "ProgramParticipantStoreIneligibilities",
          required: false,
          attributes: [],
          where: {
            store_id: { [Op.col]: "ProgramParticipant.entity_id" },
            program_id: { [Op.col]: "ProgramParticipant.program_id" }
          }
        }
      ],
      where: {
        entityType: ENTITY_TYPE.STORE,
        entityId: { [Op.in]: storeIds },
        deletedAt: null,
        [Op.or]: whereConditions,
        "$ProgramParticipantStoreIneligibilities.id$": {
          [Op.is]: null
        }
      }
    });

    return result;
  }

  /**
   * Retrieves the earnings data for sales representatives associated with a distributor.
   *
   * This method fetches the qualified sales representatives associated with a given distributor
   * by querying the UserRole model. The query filters on the parent entity ID and type, as well as
   * the role of the associated user. The results are then mapped to an array of objects, each
   * containing the user ID, name, and earned rebate of the sales representative.
   *
   * OPTIMIZED VERSION: Eliminates N+1 query problem by using bulk queries for earnings data.
   *
   * @param {number} distributorId - The ID of the distributor for whom to retrieve
   * the sales representative earnings data.
   * @param {number} [selectedWarehouseId] - Optional warehouse ID to filter data.
   * @param {string} [sortBy] - Column to sort by ('storesName', 'storesCount', 'storesEarnings').
   * @param {string} [sortOrder] - Sort order ('ASC' or 'DESC').
   * @returns {Promise<SalesRepEarnings[]>} - A promise that resolves to an array of objects containing
   * the user ID, name, and earned rebate of each sales representatives.
   */
  public async getSalesRepEarningsData({
    distributorId,
    selectedWarehouseId,
    sortBy = "storesName",
    sortOrder = "ASC",
    programTimeline = "Current"
  }: {
    distributorId: number;
    selectedWarehouseId?: number;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
    programTimeline?: string;
  }): Promise<SalesRepEarnings[]> {
    const user = getCurrentUser();
    const isSalesRepManager = isDistributorSalesRepManager(user?.role);
    const isGeneralManager =
      user?.role === ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER;

    // Get Sales Rep Ids
    const salesRepIds = isSalesRepManager
      ? await this.getSalesRepIdsBySalesRepManagerId({
          salesRepManagerId: user?.associatedUserId
        })
      : isGeneralManager
        ? await this.getSalesRepIdsForGeneralManager(
            Number(user?.associatedUserId)
          )
        : selectedWarehouseId
          ? await this.getSalesRepsByWarehouseId(
              distributorId,
              selectedWarehouseId
            )
          : await this.getSalesRepIdsByDistributor([distributorId]);

    if (!salesRepIds || salesRepIds.length === 0) {
      return [];
    }
    // Validate sort parameters
    const validSortColumns = ["storesName", "storesCount", "storesEarnings"];
    const validSortOrders = ["ASC", "DESC"];

    const effectiveSortBy = validSortColumns.includes(sortBy)
      ? sortBy
      : "storesName";
    const effectiveSortOrder = validSortOrders.includes(sortOrder)
      ? sortOrder
      : "ASC";

    // Get store ids for selected warehouse (if applicable)
    const storeIds = selectedWarehouseId
      ? await StoreRepository.getStoreIdsByWarehouseIds([selectedWarehouseId])
      : [];

    // OPTIMIZATION: Use bulk query to get all sales rep data with earnings in one go
    const salesRepData = await this.getSalesRepDataWithBulkEarnings({
      salesRepIds,
      distributorId,
      selectedWarehouseId,
      storeIds,
      effectiveSortBy,
      effectiveSortOrder,
      programTimeline
    });

    console.log("-------------salesRepData", salesRepData.length);

    // Sort by earnings if requested (since earnings are calculated in the bulk query)
    if (effectiveSortBy === "storesEarnings") {
      salesRepData?.sort((a: any, b: any) => {
        const aValue = parseFloat(String(a.totalEarnedRebate || 0));
        const bValue = parseFloat(String(b.totalEarnedRebate || 0));

        if (effectiveSortOrder === "ASC") {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });
    }

    return salesRepData;
  }

  /**
   * OPTIMIZED: Bulk query to get sales rep data with earnings in a single database operation.
   * This eliminates the N+1 query problem by fetching all earnings data at once.
   *
   * @param {Object} params - Parameters for the query
   * @param {number[]} params.salesRepIds - Array of sales rep IDs
   * @param {number} params.distributorId - Distributor ID
   * @param {number} [params.selectedWarehouseId] - Optional warehouse ID for SPIFF earnings
   * @param {number[]} [params.storeIds] - Store IDs for warehouse filtering
   * @param {string} params.effectiveSortBy - Sort column
   * @param {string} params.effectiveSortOrder - Sort order
   * @returns {Promise<SalesRepEarnings[]>} Sales rep data with earnings
   */
  private async getSalesRepDataWithBulkEarnings({
    salesRepIds,
    distributorId,
    selectedWarehouseId,
    storeIds,
    effectiveSortBy,
    effectiveSortOrder,
    programTimeline = "Current"
  }: {
    salesRepIds: number[];
    distributorId: number;
    selectedWarehouseId?: number;
    storeIds: number[];
    effectiveSortBy: string;
    effectiveSortOrder: string;
    programTimeline?: string;
  }): Promise<SalesRepEarnings[]> {
    // Get user role
    const user = getCurrentUser();
    // Get the program compliance earning column based on the role
    const earningColumn = getProgramComplianceEarningColumn(user?.role);

    // Get authorized manufacturers for the distributor (needed for both query types)
    const authorizedManufacturers =
      await ManufacturerRepository.getAuthorizedManufacturersIds(distributorId);
    const authorizedManufacturerIds = authorizedManufacturers.map((am) =>
      Number(am.manufacturerId)
    );

    // Build timeline filter condition for the subquery
    const timelineCondition = buildProgramTimelineSqlCondition(
      programTimeline,
      "p"
    );

    // Build the base query attributes (common to both query types)
    const baseAttributes: any[] = [
      ["associated_user_id", "salesRepId"],
      [
        Sequelize.fn(
          "CONCAT",
          Sequelize.col("user.first_name"),
          " ",
          Sequelize.col("user.last_name")
        ),
        "name"
      ],
      [
        Sequelize.fn("COUNT", Sequelize.col("store_sales_reps.store_id")),
        "storesCount"
      ],
      [
        Sequelize.fn("ARRAY_AGG", Sequelize.col("store_sales_reps.store_id")),
        "storeIds"
      ],
      [
        Sequelize.fn(
          "MAX",
          Sequelize.literal(`"ManagerSalesRepMappings"."sales_manager_id"`)
        ),
        "salesManagerId"
      ],
      [
        Sequelize.fn(
          "MAX",
          Sequelize.literal(
            `"ManagerSalesRepMappings->SalesManagerDistributor"."name"`
          )
        ),
        "salesManagerName"
      ],
      [
        Sequelize.fn(
          "MAX",
          Sequelize.literal(
            `"ManagerSalesRepMappings->SalesManagerDistributor"."title"`
          )
        ),
        "salesManagerTitle"
      ]
    ];

    // Add earnings calculation based on query type
    if (selectedWarehouseId) {
      // For warehouse-specific queries, we'll get SPIFF earnings separately
      baseAttributes.push([Sequelize.literal("0"), "totalEarnedRebate"]);
    } else {
      // For regular queries, calculate earnings directly in the main query
      // get unadjusted earned rebate as this is for distributor dashboard
      baseAttributes.push([
        Sequelize.literal(`(
          SELECT COALESCE(SUM(pc.${earningColumn}), 0) 
          FROM program_compliances pc
          INNER JOIN programs p ON pc.program_id = p.id
          WHERE pc.entity_id = "UserRole"."associated_user_id"
            AND pc.entity_type = '${ENTITY_TYPE.SALES_REP}'
            AND pc.status = '${ProgramsComplianceStatus.Active}'
            AND p.participant_type = '${ENTITY_TYPE.SALES_REP}'
            AND p.manufacturer_id = ANY(ARRAY[${authorizedManufacturerIds.join(",")}])
            AND p.deleted_at IS NULL
            ${timelineCondition}
        )`),
        "totalEarnedRebate"
      ]);
    }

    // Execute the main query
    const salesRepData = await UserRole.findAll({
      where: {
        associated_entity_type: ENTITY_TYPE.DISTRIBUTOR,
        role: "DISTRIBUTOR_SALES_REP",
        associated_user_id: {
          [Op.in]: salesRepIds
        }
      },
      include: [
        {
          model: ManagerSalesRepMapping,
          as: "ManagerSalesRepMappings",
          required: false,
          attributes: [],
          include: [
            {
              model: Distributor,
              as: "SalesManagerDistributor",
              required: false,
              attributes: []
            }
          ]
        },
        {
          model: User,
          as: "user",
          required: true,
          attributes: []
        },
        {
          model: StoreSalesRep,
          as: "store_sales_reps",
          required: false,
          attributes: [],
          where: {
            sales_rep_id: {
              [Op.in]: salesRepIds
            }
          }
        }
      ],
      attributes: baseAttributes,
      group: [
        "user.first_name",
        "user.last_name",
        "UserRole.associated_user_id"
      ],
      order: [
        this.getOrderClause(
          effectiveSortBy,
          effectiveSortOrder as "ASC" | "DESC"
        )
      ],
      raw: true
    });

    // For warehouse-specific queries, get SPIFF earnings separately and merge
    if (selectedWarehouseId) {
      const spiffEarnings =
        await SalesRepRepository.getBulkSalesRepSpiffEarnings({
          distributorId,
          storeIds,
          authorizedManufacturers: authorizedManufacturerIds,
          programTimeline
        });

      // Create a map for quick lookup
      const earningsMap = new Map<number, number>();
      spiffEarnings.forEach((earning: any) => {
        earningsMap.set(earning.sales_rep_id, earning.total_earnings || 0);
      });

      // Combine the data
      return salesRepData.map((rep: any) => ({
        ...rep,
        totalEarnedRebate: earningsMap.get(rep.salesRepId) || 0
      }));
    }

    // For regular queries, earnings are already calculated in the main query
    return salesRepData.map((rep: any) => ({
      ...rep,
      totalEarnedRebate: parseFloat(rep.totalEarnedRebate) || 0
    }));
  }

  /**
   * SIMPLIFIED: Get entity data with earnings from program compliance.
   * This function accepts entity type and entity ID only and gets earnings directly from program compliance.
   *
   * @param {string} entityType - Entity type (e.g., 'DISTRIBUTOR_SALES_REP', 'SALES_REP_MANAGER')
   * @param {number} entityId - Specific entity ID to fetch
   * @param {number} distributorId - Distributor ID for authorization
   * @returns {Promise<SalesRepEarnings>} Entity data with earnings from program compliance
   */
  public async getSalesRepManagerEarnings({
    entityType,
    entityId,
    distributorId,
    authorizedManufacturerIds
  }: {
    entityType: any;
    entityId: number;
    distributorId: number;
    authorizedManufacturerIds?: number[];
  }) {
    // Get user role
    const user = getCurrentUser();
    // Get the program compliance earning column based on the role
    const earningColumn = getProgramComplianceEarningColumn(user?.role);

    if (!authorizedManufacturerIds) {
      // Get authorized manufacturers for the distributor
      const authorizedManufacturers =
        await ManufacturerRepository.getAuthorizedManufacturersIds(
          distributorId
        );
      authorizedManufacturerIds = authorizedManufacturers.map((am) =>
        Number(am.manufacturerId)
      );
    }

    // Get earnings directly from program compliance
    const entityTypeString = entityType
      .map((et: string) => `'${et}'`)
      .join(",");
    const earningsQuery = `
      SELECT COALESCE(SUM(pc.${earningColumn}), 0) as total_earned_rebate
      FROM program_compliances pc
      INNER JOIN programs p ON pc.program_id = p.id
      WHERE pc.entity_id = :entityId
        AND pc.entity_type in (${entityTypeString})
        AND pc.status = :status
        AND p.participant_type in (${entityTypeString})
        AND p.manufacturer_id = ANY(ARRAY[:manufacturerIds])
        AND p.deleted_at IS NULL
    `;

    const earningsResult = await sequelize.query(earningsQuery, {
      replacements: {
        entityId,
        status: ProgramsComplianceStatus.Active,
        manufacturerIds: authorizedManufacturerIds
      },
      type: QueryTypes.SELECT
    });

    const totalEarnedRebate = parseFloat(
      (earningsResult[0] as any)?.total_earned_rebate || "0"
    );

    return totalEarnedRebate;
  }

  /**
   * Retrieves total earned rebate for a sales rep manager by aggregating earnings
   * from stores managed through the sales rep manager relationship chain.
   *
   * This method calculates total earnings by:
   * 1. Joining program_compliances with store_sales_reps to get store compliance data
   * 2. Joining with manager_sales_rep_mapping to filter by sales rep manager
   * 3. Joining with stores to optionally filter by warehouse
   *
   * @param {number} salesRepManagerId - The associated user ID of the sales rep manager
   * @param {number[]} authorizedProgramIds - Array of program IDs the manager is authorized to view
   * @param {number[]} [warehouseIds] - Optional array of warehouse IDs to filter by
   * @returns {Promise<number>} Total earned rebate as a number
   */
  public async getSalesRepManagerTotalEarnings({
    salesRepManagerId,
    authorizedProgramIds,
    warehouseIds,
    authorizedManufacturerIds
  }: {
    salesRepManagerId: number;
    authorizedProgramIds: number[];
    warehouseIds?: number[];
    authorizedManufacturerIds?: number[];
  }): Promise<number> {
    try {
      // Build conditional WHERE clauses with positional parameters
      // $1 = salesRepManagerId, $2 = status
      const queryParams: any[] = [
        salesRepManagerId,
        ProgramsComplianceStatus.Active
      ];
      let paramIndex = 3; // Start at $3 since $1 and $2 are already used

      // Filter by authorized manufacturers instead of program IDs
      // This matches the programs API which doesn't filter by program approvals
      const manufacturerFilter =
        authorizedManufacturerIds && authorizedManufacturerIds.length > 0
          ? `AND EXISTS (
              SELECT 1
              FROM programs p2
              WHERE p2.id = pc.program_id
                AND p2.manufacturer_id = ANY($${paramIndex++})
                AND p2.deleted_at IS NULL
            )`
          : "";

      if (authorizedManufacturerIds && authorizedManufacturerIds.length > 0) {
        queryParams.push(authorizedManufacturerIds);
      }

      const warehouseFilter =
        warehouseIds && warehouseIds.length > 0
          ? `AND s.warehouse_id = ANY($${paramIndex++})`
          : "";

      if (warehouseIds && warehouseIds.length > 0) {
        queryParams.push(warehouseIds);
      }

      // Filter to only include Current and Historical programs (exclude Future)
      // Dashboard should show Current + Historical, matching the programs API
      const timelineFilter = `
        AND EXISTS (
          SELECT 1
          FROM programs p
          WHERE p.id = pc.program_id
            AND p.deleted_at IS NULL
            AND (
              -- Current: start_date <= now AND end_date >= now
              (p.start_date <= CURRENT_DATE AND p.end_date >= CURRENT_DATE)
              OR
              -- Historical: end_date < now
              (p.end_date < CURRENT_DATE)
            )
        )
      `;

      const query = `
        SELECT COALESCE(SUM(pc.earned_rebate), 0) as total_earned_rebate
        FROM (
          SELECT DISTINCT ON (pc.id) pc.id, pc.earned_rebate
          FROM program_compliances pc
          INNER JOIN stores s 
            ON pc.entity_id = s.id
          INNER JOIN program_participants pp 
            ON pp.entity_id = pc.entity_id 
            AND pp.program_id = pc.program_id 
            AND pp.deleted_at IS NULL
          LEFT JOIN program_store_ineligibility psi 
            ON psi.store_id = pc.entity_id 
            AND psi.program_id = pc.program_id 
            AND psi.deleted_at IS NULL
          WHERE pc.entity_type = 'STORE'
            AND pc.status = $2
            AND pc.deleted_at IS NULL
            AND s.deleted_at IS NULL
            AND psi.id IS NULL
            AND EXISTS (
              SELECT 1
              FROM store_sales_reps ssr
              INNER JOIN manager_sales_rep_mapping msrm 
                ON ssr.sales_rep_id = msrm.sales_rep_id
              WHERE ssr.store_id = pc.entity_id
                AND msrm.sales_manager_id = $1
                AND ssr.deleted_at IS NULL
                AND msrm.deleted_at IS NULL
            )
            ${timelineFilter}
            ${manufacturerFilter}
            ${warehouseFilter}
          ORDER BY pc.id
        ) pc
      `;

      const result = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        bind: queryParams
      });
      const totalEarnedRebate = parseFloat(
        (result[0] as any)?.total_earned_rebate || "0"
      );

      return totalEarnedRebate;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(
          `Error calculating sales rep manager total earnings: ${error.message}`
        );
      } else {
        throw ApiError.internal(
          "An unknown error occurred while calculating sales rep manager total earnings"
        );
      }
    }
  }

  /**
   * Retrieves sales data for a distributor.
   * @param {number} distributorId The ID of the distributor
   * @param {Date} startDate The start date of the period for which to retrieve sales data
   * @param {Date} endDate The end date of the period for which to retrieve sales data
   * @param {boolean} isDaily Whether to fetch daily or monthly sales data
   * @returns {Promise<SalesDataItem[]>} A promise that resolves to an array of objects containing the
   * date, total sales, and total number of transactions for each period.
   */
  public async getSalesForDistributor(
    distributorIds: number | number[], // Accept a single ID or an array of IDs
    startDate: Date,
    endDate: Date,
    isDaily: boolean,
    categoryId?: number, // Optional categoryId parameter
    manufacturerId?: number,
    includeRelevantTransactions?: boolean
  ): Promise<SalesDataItem[]> {
    // Define the where condition for the query
    const whereCondition: any = {
      seller_type: ENTITY_TYPE.DISTRIBUTOR,
      transaction_date: { [Op.between]: [startDate, endDate] }
    };

    // Handle single distributor ID or multiple distributor IDs
    if (Array.isArray(distributorIds)) {
      whereCondition.seller_id = { [Op.in]: distributorIds };
    } else {
      whereCondition.seller_id = distributorIds;
    }

    let lineItemsFilter = {};

    // Add category filtering if categoryId is provided
    if (categoryId || manufacturerId) {
      const productSKUsIds =
        await StoreRepository.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
          [],
          manufacturerId ? [manufacturerId] : undefined,
          categoryId
        );
      lineItemsFilter = {
        product_id: {
          [Op.in]: productSKUsIds
        }
      };
    } else if (includeRelevantTransactions) {
      lineItemsFilter = this.buildRelevantTransactionFilter();
    }

    // Execute the query
    return (await LineItem.findAll({
      attributes: [
        [
          Sequelize.fn(
            "DATE_TRUNC",
            isDaily ? "day" : "month",
            Sequelize.col("transaction_date")
          ),
          "date"
        ],
        [Sequelize.fn("SUM", Sequelize.col("total_price")), "total_sales"]
      ],
      where: {
        ...whereCondition,
        ...lineItemsFilter
      },
      group: [
        Sequelize.fn(
          "DATE_TRUNC",
          isDaily ? "day" : "month",
          Sequelize.col("transaction_date")
        )
      ],
      order: [
        [
          Sequelize.fn(
            "DATE_TRUNC",
            isDaily ? "day" : "month",
            Sequelize.col("transaction_date")
          ),
          "ASC"
        ]
      ],
      raw: true
    })) as unknown as Promise<SalesDataItem[]>;
  }

  /**
   * Retrieves sales volume and total savings data for sales reps grouped by manufacturer,
   * ordered by total savings in descending order by default.
   *
   * @param {number[]} salesRepIds - An array of sales representative IDs to filter the results.
   * @param {string} [orderBy="DESC"] - The order in which the results are sorted.
   *
   * @returns {Promise<SalesDataItem[]>} - A promise that resolves to an array of objects containing
   * the sales volume and total savings data, grouped by manufacturer and sorted by total savings.
   */
  public async getStoreProgramOverviewData(
    salesRepIds: number[],
    orderBy: string = "DESC",
    manufacturerIds: number | number[] = []
  ) {
    if (!Array.isArray(manufacturerIds)) {
      manufacturerIds = [manufacturerIds];
    }
    const result = await StoreSalesRep.findAll({
      attributes: [
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              `CASE WHEN "SalesRepStoreProgramCompliance".status = '${ProgramsComplianceStatus.InProgress}' THEN "SalesRepStoreProgramCompliance".total_purchase_volume ELSE 0 END`
            )
          ),
          "salesVolume"
        ],
        [
          sequelize.fn(
            "SUM",
            sequelize.literal(
              `CASE WHEN "SalesRepStoreProgramCompliance".status = '${ProgramsComplianceStatus.Active}' THEN "SalesRepStoreProgramCompliance".earned_rebate ELSE 0 END`
            )
          ),
          "totalSavings"
        ],
        [
          sequelize.col(
            "SalesRepStoreProgramCompliance.Program.Manufacturer.id"
          ),
          "manufacturerId"
        ],
        [
          sequelize.col(
            "SalesRepStoreProgramCompliance.Program.Manufacturer.name"
          ),
          "manufacturerName"
        ],
        "SalesRepStoreProgramCompliance.Program.Manufacturer.logo"
      ],
      include: [
        {
          model: ProgramCompliance,
          as: "SalesRepStoreProgramCompliance",
          attributes: [],
          required: true,
          where: {
            entity_type: "STORE"
          },
          include: [
            {
              model: Program,
              as: "Program",
              attributes: [],
              required: true,
              include: [
                {
                  model: Manufacturer,
                  as: "Manufacturer",
                  attributes: [],
                  required: true
                }
              ]
            }
          ]
        }
      ],
      where: {
        sales_rep_id: {
          [Op.in]: salesRepIds || []
        },
        ...(manufacturerIds.length > 0
          ? {
              "$SalesRepStoreProgramCompliance.Program.Manufacturer.id$": {
                [Op.in]: manufacturerIds
              }
            }
          : {})
      },
      group: [
        "SalesRepStoreProgramCompliance.Program.Manufacturer.id",
        "SalesRepStoreProgramCompliance.Program.Manufacturer.name",
        "SalesRepStoreProgramCompliance.Program.Manufacturer.logo"
      ],
      order: [
        [
          sequelize.literal(
            `SUM("SalesRepStoreProgramCompliance"."earned_rebate")`
          ),
          orderBy
        ]
      ],
      raw: true
    });
    return result;
  }

  /**
   * Retrieves all categories with at least one product that has been sold.
   * @returns A promise that resolves to an array of objects containing the id and name of each category.
   */
  public async getCategories(): Promise<Array<{ id: number; name: string }>> {
    const categories = await ProductCategory.findAll({
      include: [
        {
          model: Product,
          as: "products",
          required: true,
          attributes: [],
          where: {
            deleted_at: null
          },
          include: [
            {
              model: LineItem,
              as: "line_items",
              required: true,
              attributes: []
            }
          ]
        }
      ],
      where: {
        deleted_at: null
      },
      attributes: ["id", "name"],
      group: ["ProductCategory.id", "ProductCategory.name"]
    });

    return categories.map((category) => ({
      id: category.id,
      name: category.name
    }));
  }

  /**
   * Retrieves the total sales amount for specified distributors.
   *
   * This method calculates the total sales for each distributor by summing
   * the `total_price` of all associated line items in transactions. The results
   * are filtered by the given distributor IDs and optionally by product IDs.
   *
   * @param {number[]} distributorIds - Array of distributor IDs to filter the transactions.
   * @param {number[]} [productIds=[]] - Optional array of product IDs to filter the line items.
   * @returns {Promise<{ seller_id: number; totalAmount: number }[]>} - A promise that resolves to
   * an array of objects containing the `seller_id` and the `totalAmount` of sales for each distributor.
   */
  public async getDistributorTotalSale(
    distributorIds: number[],
    productIds: number[] = []
  ): Promise<{ seller_id: number; totalAmount: number }[]> {
    let productSKUsIds: string[] = [];

    if (productIds.length) {
      productSKUsIds =
        await StoreRepository.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
          productIds
        );
    }

    const lineItemsWhere =
      productSKUsIds.length > 0
        ? { product_id: { [Op.in]: productSKUsIds } }
        : {};

    const totalSaleResponse: any[] = await LineItem.findAll({
      attributes: [
        "seller_id",
        [sequelize.fn("SUM", sequelize.col("total_price")), "totalAmount"]
      ],
      where: {
        deleted_at: null,
        seller_id: { [Op.in]: distributorIds },
        seller_type: ENTITY_TYPE.DISTRIBUTOR,
        ...lineItemsWhere
      },
      group: ["seller_id"],
      raw: true
    });

    return totalSaleResponse;
  }

  /**
   * Retrieves the store programs with participants for the given store IDs and authorized manufacturer IDs.
   * @param {number[]} totalStoresIds - The array of store IDs associated with the sales representative.
   * @param {number[]} authorizedManufacturerIds - The array of authorized manufacturer IDs.
   * @returns {Promise<any>} - A promise that resolves with the store programs and their participants.
   */
  public async getStoreProgramsWithParticipants({
    totalStoresIds,
    authorizedManufacturerIds,
    excludedProgramIds = [],
    storeManufacturerPairs,
    distributorId
  }: {
    totalStoresIds: number[];
    authorizedManufacturerIds: number[];
    excludedProgramIds: number[];
    storeManufacturerPairs?: { store_id: number; manufacturer_id: number }[];
    distributorId: number | number[];
  }) {
    const programWhere =
      excludedProgramIds?.length > 0
        ? {
            id: {
              [Op.notIn]: excludedProgramIds
            }
          }
        : {};

    const programs = await Program.findAll({
      attributes: [
        [Sequelize.col("Manufacturer.id"), "ManufacturerId"],
        [Sequelize.col("Manufacturer.name"), "ManufacturerName"],
        [Sequelize.col("Manufacturer.logo"), "ManufacturerLogo"],
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.fn(
              "DISTINCT",
              Sequelize.col("ProgramParticipants.entity_id")
            )
          ),
          "EnrolledStroes"
        ],
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.fn(
              "DISTINCT",
              Sequelize.col("ProgramParticipants.entity_id")
            )
          ),
          "ProgramEnrollment"
        ],
        [
          Sequelize.literal(`(
            WITH tier_compliance AS (
              SELECT 
                p.id as program_id,
                COUNT(CASE WHEN pc.is_qualified = true THEN 1 END)::decimal / COUNT(DISTINCT pp.entity_id) as qualified_ratio
              FROM programs p
              INNER JOIN program_details pd ON p.id = pd.program_id
              INNER JOIN program_participants pp ON p.id = pp.program_id
              LEFT JOIN program_compliances pc ON pc.entity_id = pp.entity_id 
                AND pc.program_detail_id = pd.id 
                AND pc.entity_type = 'STORE'
              WHERE p.manufacturer_id = "Manufacturer"."id"
                AND p.participant_type = 'STORE'
                AND p.deleted_at IS NULL
                AND pp.entity_type = 'STORE'
                AND pp.deleted_at IS NULL
                AND pp.entity_id = ANY(ARRAY[${totalStoresIds.join(",")}])
                AND CURRENT_DATE BETWEEN p.start_date::date AND p.end_date::date
                AND EXISTS (
                  SELECT 1 FROM program_approvals pa 
                  WHERE pa.program_id = p.id 
                    AND pa.approver_id = ${Number(distributorId)}
                    AND pa.status = 'APPROVED' 
                    AND pa.deleted_at IS NULL
                )
              GROUP BY p.id, pd.id, pd.tier
            ),
            program_compliance AS (
              SELECT 
                program_id,
                SUM(qualified_ratio) / COUNT(*) as program_compliance_ratio
              FROM tier_compliance
              GROUP BY program_id
            )
            SELECT COALESCE(ROUND(SUM(program_compliance_ratio) * 100 / COUNT(DISTINCT program_id), 2), 0)
            FROM program_compliance
          )`),
          "CompliancePercentage"
        ]
      ],
      include: [
        {
          model: Manufacturer,
          required: true,
          attributes: [] // Exclude raw manufacturer data from the result to avoid duplication
        },
        {
          model: ProgramParticipant,
          as: "ProgramParticipants",
          required: false,
          attributes: [], // Exclude raw participant data
          include: [
            {
              model: ProgramCompliance,
              as: "ParticipantProgramCompliance",
              attributes: [],
              required: false,
              where: {
                entity_type: ENTITY_TYPE.STORE,
                entity_id: { [Op.col]: "ProgramParticipants.entity_id" },
                program_id: { [Op.col]: "ProgramParticipants.program_id" }
              }
            }
          ],
          where: {
            ...(storeManufacturerPairs
              ? {
                  [Op.or]: storeManufacturerPairs?.map((pair) => ({
                    entity_id: pair.store_id,
                    "$Manufacturer.id$": pair.manufacturer_id // Using nested include filtering
                  }))
                }
              : { entity_id: { [Op.in]: totalStoresIds } }),
            entity_type: ENTITY_TYPE.STORE,
            deleted_at: null // Exclude soft-deleted participants
          }
        }
      ],
      where: {
        participant_type: ENTITY_TYPE.STORE,
        manufacturer_id: { [Op.in]: authorizedManufacturerIds },
        deleted_at: null,
        ...programWhere,
        [Op.and]: [
          Sequelize.literal(`EXISTS (
            SELECT 1
            FROM program_approvals pa
            WHERE pa.program_id = "Program"."id"
              AND pa.approver_id = ${Number(distributorId)}
              AND pa.status = 'APPROVED'
              AND pa.deleted_at IS NULL
          )`),
          Sequelize.literal(
            `CURRENT_DATE BETWEEN "Program"."start_date"::date AND "Program"."end_date"::date`
          )
        ]
      },
      group: ["Manufacturer.name", "Manufacturer.logo", "Manufacturer.id"], // Group by manufacturer name and logo
      order: [
        [
          Sequelize.fn(
            "COUNT",
            Sequelize.fn(
              "DISTINCT",
              Sequelize.col("ProgramParticipants.entity_id")
            )
          ),
          "DESC"
        ],
        [Sequelize.col("Manufacturer.id"), "ASC"]
      ],
      raw: true // Return raw results,
    });

    return programs;
  }

  /**
   * Retrieves the store programs with participants for the given store IDs and authorized manufacturer IDs.
   * @param {number[]} totalStoresIds - The array of store IDs associated with the sales representative.
   * @param {number[]} authorizedManufacturerIds - The array of authorized manufacturer IDs.
   * @returns {Promise<any>} - A promise that resolves with the store programs and their participants.
   */
  public async getStoreProgramsWithParticipantsOptimized({
    totalStoresIds,
    authorizedManufacturerIds,
    excludedProgramIds = [],
    storeManufacturerPairs,
    distributorId,
    userRole,
    excludeChainStores,
    selectedWarehouseId,
    programTimeline
  }: {
    totalStoresIds: number[];
    authorizedManufacturerIds: number[];
    excludedProgramIds: number[];
    storeManufacturerPairs?: { store_id: number; manufacturer_id: number }[];
    distributorId: number | number[];
    userRole?: string;
    excludeChainStores?: boolean;
    selectedWarehouseId?: number;
    programTimeline?: string;
  }) {
    // console.log("------------getStoreProgramsWithParticipantsOptimized", {
    //   totalStoresIds,
    //   authorizedManufacturerIds,
    //   excludedProgramIds,
    //   storeManufacturerPairs,
    //   distributorId,
    //   userRole,
    //   excludeChainStores,
    //   selectedWarehouseId,
    //   programTimeline
    // });

    const approverIds = Array.isArray(distributorId)
      ? distributorId
      : [distributorId];

    if (!authorizedManufacturerIds?.length || !approverIds?.length) return [];
    if (!totalStoresIds?.length && !storeManufacturerPairs?.length) return [];

    // For enrollment queries, prefer totalStoresIds over storeManufacturerPairs
    // because enrollment is independent of transactions - stores can be enrolled
    // even if they haven't made purchases yet
    // Only use pairs if totalStoresIds is not available (for backward compatibility)
    const usePairs = Boolean(
      storeManufacturerPairs?.length && !totalStoresIds?.length
    );

    // Build timeline filter conditions for different table aliases
    const timelineCondition = buildProgramTimelineSqlCondition(
      programTimeline,
      "p"
    );
    const timelineConditionInner = buildProgramTimelineSqlCondition(
      programTimeline,
      "p_inner"
    );

    // For DISTRIBUTOR_ADMIN, use aggregations table for better performance
    // Aggregations now support warehouse filtering
    if (userRole === ENTITY_TYPE.DISTRIBUTOR_ADMIN) {
      // Conditionally include chain stores based on excludeChainStores flag
      const enrolledExpr = excludeChainStores
        ? "dpa.stores_enrolled"
        : "(dpa.stores_enrolled + dpa.chains_stores_enrolled)";

      const totalStoresExpr = excludeChainStores
        ? "dpa.total_stores"
        : "(dpa.total_stores + dpa.total_chain_stores)";

      const compliantExpr = excludeChainStores
        ? "dpa.stores_compliant"
        : "(dpa.stores_compliant + dpa.chains_stores_compliant)";

      // Build warehouse filter condition
      // Note: Treat null, undefined, or 0 as "no warehouse filter"
      const hasWarehouseFilter =
        selectedWarehouseId !== undefined &&
        selectedWarehouseId !== null &&
        selectedWarehouseId !== 0;
      const warehouseFilter = hasWarehouseFilter
        ? "AND dpa.warehouse_id = $" +
          (excludedProgramIds?.length ? 5 : 4) +
          "::int"
        : "AND dpa.warehouse_id IS NOT NULL";

      let sql: string;
      if (hasWarehouseFilter) {
        // Simple case: warehouse filter provided
        // Direct aggregation from distributor_program_aggregations table
        sql = `
          WITH filtered_aggregations AS (
            SELECT
              dpa.program_id,
              dpa.manufacturer_id,
              ${enrolledExpr} AS stores_enrolled,
              ${totalStoresExpr} AS total_stores,
              ${compliantExpr} AS stores_compliant
            FROM distributor_program_aggregations dpa
            INNER JOIN programs p ON p.id = dpa.program_id
            INNER JOIN program_approvals pa ON (
              pa.program_id = p.id
              AND pa.approver_id = ANY($2::int[])
              AND pa.status = 'APPROVED'
              AND pa.deleted_at IS NULL
            )
            WHERE dpa.distributor_id = $3
              AND dpa.participant_type = 'STORE'
              AND p.manufacturer_id = ANY($1::int[])
              AND p.deleted_at IS NULL
              ${timelineCondition}
              ${excludedProgramIds?.length ? "AND p.id <> ALL($4::int[])" : ""}
              ${warehouseFilter}
              AND dpa.deleted_at IS NULL
          ),
          program_tier_counts AS (
            SELECT
              program_id,
              manufacturer_id,
              MAX(stores_enrolled) AS stores_enrolled,
              MAX(total_stores) AS total_stores,
              SUM(stores_compliant) AS stores_compliant,
              COUNT(*) AS tier_count
            FROM filtered_aggregations
            GROUP BY program_id, manufacturer_id
          ),
          distinct_enrolled_stores AS (
            SELECT
              p.manufacturer_id,
              COUNT(DISTINCT pp.entity_id) AS distinct_stores_enrolled
            FROM program_participants pp
            INNER JOIN programs p ON p.id = pp.program_id
            INNER JOIN program_approvals pa ON (
              pa.program_id = p.id
              AND pa.approver_id = ANY($2::int[])
              AND pa.status = 'APPROVED'
              AND pa.deleted_at IS NULL
            )
            WHERE pp.entity_type = 'STORE'
              AND pp.deleted_at IS NULL
              AND p.manufacturer_id = ANY($1::int[])
              AND p.deleted_at IS NULL
              ${timelineCondition}
              ${excludedProgramIds?.length ? "AND p.id <> ALL($4::int[])" : ""}
              AND pp.entity_id IN (
                SELECT DISTINCT ur.associated_user_id
                FROM user_roles ur
                WHERE ur.parent_entity_type = 'DISTRIBUTOR'
                  AND ur.parent_entity_id = $3
                  AND ur.role = 'STORE'
                  AND ur.deleted_at IS NULL
              )
              ${
                hasWarehouseFilter
                  ? `AND pp.entity_id IN (
                SELECT id FROM stores WHERE warehouse_id = $${excludedProgramIds?.length ? 5 : 4}::int AND deleted_at IS NULL
              )`
                  : ""
              }
            GROUP BY p.manufacturer_id
          ),
          manufacturers_with_programs AS (
            SELECT DISTINCT agg.manufacturer_id
            FROM program_tier_counts agg
          )
          SELECT
            m.id AS "ManufacturerId",
            m.name AS "ManufacturerName",
            m.logo AS "ManufacturerLogo",
            COALESCE(des.distinct_stores_enrolled, 0) AS "EnrolledStroes",
            COALESCE(des.distinct_stores_enrolled, 0) AS "ProgramEnrollment",
            MAX(agg.total_stores) AS "TotalStores",
            COALESCE(
              ROUND(
                (SUM(agg.stores_compliant)::decimal / NULLIF(SUM(agg.stores_enrolled * agg.tier_count), 0)) * 100,
                2
              ),
              0
            ) AS "CompliancePercentage"
          FROM program_tier_counts agg
          INNER JOIN manufacturers m ON m.id = agg.manufacturer_id
          INNER JOIN manufacturers_with_programs mwp ON mwp.manufacturer_id = m.id
          LEFT JOIN distinct_enrolled_stores des ON des.manufacturer_id = m.id
          GROUP BY m.id, m.name, m.logo, des.distinct_stores_enrolled
          ORDER BY COALESCE(des.distinct_stores_enrolled, 0) DESC, m.id ASC
        `;
      } else {
        // Complex case: no warehouse filter, calculate SUM(MAX per warehouse) per program
        // Keep enrollment/total stores logic unchanged, only fix compliance %
        const enrolledColumnExpr = excludeChainStores
          ? "dpa_inner.stores_enrolled"
          : "(dpa_inner.stores_enrolled + dpa_inner.chains_stores_enrolled)";

        const totalStoresColumnExpr = excludeChainStores
          ? "dpa_inner.total_stores"
          : "(dpa_inner.total_stores + dpa_inner.total_chain_stores)";

        sql = `
          WITH warehouse_maxes AS (
            SELECT
              dpa.program_id,
              dpa.manufacturer_id,
              SUM(max_enrolled) AS stores_enrolled_sum,
              SUM(max_total_stores) AS total_stores_sum
            FROM (
              SELECT
                dpa_inner.program_id,
                dpa_inner.manufacturer_id,
                dpa_inner.warehouse_id,
                MAX(${enrolledColumnExpr}) AS max_enrolled,
                MAX(${totalStoresColumnExpr}) AS max_total_stores
              FROM distributor_program_aggregations dpa_inner
              INNER JOIN programs p_inner ON p_inner.id = dpa_inner.program_id
              INNER JOIN program_approvals pa_inner ON (
                pa_inner.program_id = p_inner.id
                AND pa_inner.approver_id = ANY($2::int[])
                AND pa_inner.status = 'APPROVED'
                AND pa_inner.deleted_at IS NULL
              )
              WHERE dpa_inner.distributor_id = $3
                AND dpa_inner.participant_type = 'STORE'
                AND p_inner.manufacturer_id = ANY($1::int[])
                AND p_inner.deleted_at IS NULL
                ${timelineConditionInner}
                ${excludedProgramIds?.length ? "AND p_inner.id <> ALL($4::int[])" : ""}
                AND dpa_inner.warehouse_id IS NOT NULL
                AND dpa_inner.deleted_at IS NULL
              GROUP BY dpa_inner.program_id, dpa_inner.manufacturer_id, dpa_inner.warehouse_id
            ) dpa
            GROUP BY dpa.program_id, dpa.manufacturer_id
          ),
          aggregations AS (
            SELECT
              wm.manufacturer_id,
              wm.program_id,
              wm.stores_enrolled_sum AS stores_enrolled,
              wm.total_stores_sum AS total_stores
            FROM warehouse_maxes wm
          ),
          distinct_enrolled_stores AS (
            SELECT
              p.manufacturer_id,
              COUNT(DISTINCT pp.entity_id) AS distinct_stores_enrolled
            FROM program_participants pp
            INNER JOIN programs p ON p.id = pp.program_id
            INNER JOIN program_approvals pa ON (
              pa.program_id = p.id
              AND pa.approver_id = ANY($2::int[])
              AND pa.status = 'APPROVED'
              AND pa.deleted_at IS NULL
            )
            WHERE pp.entity_type = 'STORE'
              AND pp.deleted_at IS NULL
              AND p.manufacturer_id = ANY($1::int[])
              AND p.deleted_at IS NULL
              ${timelineCondition}
              ${excludedProgramIds?.length ? "AND p.id <> ALL($4::int[])" : ""}
              AND pp.entity_id IN (
                SELECT DISTINCT ur.associated_user_id
                FROM user_roles ur
                WHERE ur.parent_entity_type = 'DISTRIBUTOR'
                  AND ur.parent_entity_id = $3
                  AND ur.role = 'STORE'
                  AND ur.deleted_at IS NULL
              )
            GROUP BY p.manufacturer_id
          ),
          manufacturers_with_programs AS (
            SELECT DISTINCT agg.manufacturer_id
            FROM aggregations agg
          )
          SELECT
            m.id AS "ManufacturerId",
            m.name AS "ManufacturerName",
            m.logo AS "ManufacturerLogo",
            COALESCE(des.distinct_stores_enrolled, 0) AS "EnrolledStroes",
            COALESCE(des.distinct_stores_enrolled, 0) AS "ProgramEnrollment",
            MAX(agg.total_stores) AS "TotalStores",
            COALESCE(
              ROUND(
                (
                  SELECT SUM(${compliantExpr})::decimal
                  FROM distributor_program_aggregations dpa
                  INNER JOIN programs p ON p.id = dpa.program_id
                  INNER JOIN program_approvals pa ON (
                    pa.program_id = p.id
                    AND pa.approver_id = ANY($2::int[])
                    AND pa.status = 'APPROVED'
                    AND pa.deleted_at IS NULL
                  )
                  WHERE dpa.distributor_id = $3
                    AND dpa.participant_type = 'STORE'
                    AND p.manufacturer_id = m.id
                    AND p.deleted_at IS NULL
                    ${timelineCondition}
                    ${excludedProgramIds?.length ? "AND p.id <> ALL($4::int[])" : ""}
                    AND dpa.warehouse_id IS NOT NULL
                    AND dpa.deleted_at IS NULL
                ) / NULLIF(
                  (
                    SELECT SUM(${enrolledExpr})::decimal
                    FROM distributor_program_aggregations dpa
                    INNER JOIN programs p ON p.id = dpa.program_id
                    INNER JOIN program_approvals pa ON (
                      pa.program_id = p.id
                      AND pa.approver_id = ANY($2::int[])
                      AND pa.status = 'APPROVED'
                      AND pa.deleted_at IS NULL
                    )
                    WHERE dpa.distributor_id = $3
                      AND dpa.participant_type = 'STORE'
                      AND p.manufacturer_id = m.id
                      AND p.deleted_at IS NULL
                      ${timelineCondition}
                      ${excludedProgramIds?.length ? "AND p.id <> ALL($4::int[])" : ""}
                      AND dpa.warehouse_id IS NOT NULL
                      AND dpa.deleted_at IS NULL
                  ), 0
                ) * 100,
                2
              ),
              0
            ) AS "CompliancePercentage"
          FROM aggregations agg
          INNER JOIN manufacturers m ON m.id = agg.manufacturer_id
          INNER JOIN manufacturers_with_programs mwp ON mwp.manufacturer_id = m.id
          LEFT JOIN distinct_enrolled_stores des ON des.manufacturer_id = m.id
          GROUP BY m.id, m.name, m.logo, des.distinct_stores_enrolled
          ORDER BY COALESCE(des.distinct_stores_enrolled, 0) DESC, m.id ASC
        `;
      }

      const params: any[] = [
        authorizedManufacturerIds,
        approverIds,
        approverIds[0]
      ];
      if (excludedProgramIds?.length) {
        params.push(excludedProgramIds);
      }
      if (hasWarehouseFilter) {
        params.push(selectedWarehouseId);
      }

      const result = await sequelize.query(sql, {
        bind: params,
        type: QueryTypes.SELECT
      });

      return result;
    }

    // ---- UNIFIED QUERY: Same filtering logic for both enrollment and compliance ----
    const sql = `
    WITH base_programs AS (
      -- Get all active, approved programs for authorized manufacturers
      SELECT DISTINCT
        p.id AS program_id,
        p.manufacturer_id,
        m.name AS manufacturer_name,
        m.logo AS manufacturer_logo
      FROM programs p
      INNER JOIN manufacturers m ON m.id = p.manufacturer_id
      INNER JOIN program_approvals pa ON (
        pa.program_id = p.id
        AND pa.approver_id = ANY($2::int[])
        AND pa.status = 'APPROVED'
        AND pa.deleted_at IS NULL
      )
      WHERE p.manufacturer_id = ANY($1::int[])
        AND p.deleted_at IS NULL
        AND p.participant_type = 'STORE'
        ${timelineCondition}
        ${excludedProgramIds?.length ? "AND p.id <> ALL($" + (usePairs ? "5" : "4") + "::int[])" : ""}
    ),
    valid_participants AS (
      -- Get participants using SAME filtering logic as enrollment
      SELECT DISTINCT
        bp.program_id,
        bp.manufacturer_id,
        bp.manufacturer_name,
        bp.manufacturer_logo,
        pp.entity_id
      FROM base_programs bp
      INNER JOIN program_participants pp ON pp.program_id = bp.program_id
      WHERE pp.entity_type = 'STORE'
        AND pp.deleted_at IS NULL
        AND ${
          usePairs
            ? `
          EXISTS (
            SELECT 1 FROM unnest($3::int[], $4::int[]) 
            AS pairs(store_id, manufacturer_id)
            WHERE pairs.store_id = pp.entity_id 
            AND pairs.manufacturer_id = bp.manufacturer_id
          )
        `
            : `pp.entity_id = ANY($3::int[])`
        }
    ),
    -- Calculate compliance at the most granular level (store + program_detail)
    store_tier_compliance AS (
      SELECT
        vp.manufacturer_id,
        vp.program_id,
        pd.id AS program_detail_id,
        vp.entity_id,
        -- Each store is either qualified (1) or not qualified (0) for each tier
        CASE WHEN pc.is_qualified = true THEN 1 ELSE 0 END AS is_qualified,
        1 AS participation_count
      FROM valid_participants vp
      INNER JOIN program_details pd ON pd.program_id = vp.program_id
      LEFT JOIN program_compliances pc ON (
        pc.program_detail_id = pd.id
        AND pc.entity_id = vp.entity_id
        AND pc.entity_type = 'STORE'
      )
    ),
    -- Aggregate to program level: sum compliant and enrolled across all tiers
    program_compliance_aggregates AS (
      SELECT
        manufacturer_id,
        program_id,
        SUM(is_qualified) AS stores_compliant,
        SUM(participation_count) AS stores_enrolled
      FROM store_tier_compliance
      GROUP BY manufacturer_id, program_id
    ),
    -- Final manufacturer level: weighted average (sum of compliant / sum of enrolled)
    manufacturer_compliance AS (
      SELECT
        manufacturer_id,
        SUM(stores_compliant)::decimal / NULLIF(SUM(stores_enrolled), 0) AS manufacturer_qualified_ratio
      FROM program_compliance_aggregates
      GROUP BY manufacturer_id
    ),
    -- Get enrollment counts (distinct stores per manufacturer)
    manufacturer_enrollment AS (
      SELECT 
        manufacturer_id,
        manufacturer_name,
        manufacturer_logo,
        COUNT(DISTINCT entity_id) AS enrolled_stores
      FROM valid_participants
      GROUP BY manufacturer_id, manufacturer_name, manufacturer_logo
    ),
    -- Get manufacturers that have programs in the specified timeline
    manufacturers_with_programs AS (
      SELECT DISTINCT
        bp.manufacturer_id,
        bp.manufacturer_name,
        bp.manufacturer_logo
      FROM base_programs bp
    )
    -- Final result set - only include manufacturers with programs in timeline
    SELECT 
      mwp.manufacturer_id AS "ManufacturerId",
      mwp.manufacturer_name AS "ManufacturerName",
      mwp.manufacturer_logo AS "ManufacturerLogo",
      COALESCE(me.enrolled_stores, 0) AS "EnrolledStroes", -- keeping typo for compatibility
      COALESCE(me.enrolled_stores, 0) AS "ProgramEnrollment",
      COALESCE(ROUND(mc.manufacturer_qualified_ratio * 100, 2), 0) AS "CompliancePercentage"
    FROM manufacturers_with_programs mwp
    LEFT JOIN manufacturer_enrollment me ON me.manufacturer_id = mwp.manufacturer_id
    LEFT JOIN manufacturer_compliance mc ON mc.manufacturer_id = mwp.manufacturer_id
    ORDER BY COALESCE(me.enrolled_stores, 0) DESC, mwp.manufacturer_id ASC
  `;

    // Fix parameter handling
    const params: any[] = [authorizedManufacturerIds, approverIds];

    if (usePairs) {
      params.push(
        storeManufacturerPairs!.map((p) => p.store_id),
        storeManufacturerPairs!.map((p) => p.manufacturer_id)
      );
      if (excludedProgramIds?.length) {
        params.push(excludedProgramIds);
      }
    } else {
      params.push(totalStoresIds);
      if (excludedProgramIds?.length) {
        params.push(excludedProgramIds);
      }
    }

    const result = await sequelize.query(sql, {
      bind: params,
      type: QueryTypes.SELECT
    });

    return result;
  }

  public async getProductInsights(
    distributorId: number,
    startDate: Date,
    endDate: Date,
    manufacturerIds: number[],
    manufacturerId?: number,
    productIds?: number[],
    warehouseIds?: number[],
    sortByDate?: boolean
  ) {
    try {
      const whereClause: any = {
        transaction_date: {
          [Op.between]: [startDate, endDate]
        },
        distributor_id: distributorId
      };

      if (manufacturerId) {
        whereClause.manufacturer_id = manufacturerId;
      } else if (manufacturerIds?.length) {
        whereClause.manufacturer_id = {
          [Op.in]: manufacturerIds
        };
      }

      if (productIds?.length) {
        whereClause.product_id = {
          [Op.in]: productIds
        };
      }

      if (warehouseIds) {
        whereClause.warehouse_id = {
          [Op.in]: warehouseIds
        };
      }

      const results = await SalesSummary.findAll({
        where: whereClause,
        order: sortByDate ? [["transaction_date", "ASC"]] : undefined,
        raw: true
      });

      return results;
    } catch (error) {
      return [];
    }
  }

  public async getDistRecommendedProducts(manufacturerId: number) {
    const where = manufacturerId ? { manufacturer_id: manufacturerId } : {};

    const products = await Product.findAll({
      attributes: [
        "id",
        "name",
        "size",
        ["unit_skus_id", "unitSkusId"],
        ["case_skus_id", "caseSkusId"],
        ["box_skus_id", "boxSkusId"]
      ],
      // Note: Recommendation flags have been deprecated. This now returns Flex-tagged
      // products to preserve a stable response shape.
      where: { ...where, CategoryTagsJson: { [Op.contains]: ["Flex"] } },
      raw: true
    });

    const response = {
      Flex: {
        requiredProducts: products
      }
    };

    return response;
  }

  public async getDistributorNameAndLogo(id: number) {
    const distributor = await Distributor.findOne({
      attributes: ["logo", "organizationName", "name"],
      where: { id },
      raw: true
    });

    return {
      name: distributor?.organizationName || distributor?.name,
      logo: distributor?.logo || ""
    };
  }

  public async updateStoreSalesRepRelation(
    salesRepId: number,
    storeId: number
  ) {
    const existingRepMapping = await StoreSalesRep.findOne({
      where: {
        storeId: storeId
      }
    });

    if (existingRepMapping) {
      // just update its store assignment
      existingRepMapping.salesRepId = salesRepId;
      await existingRepMapping.save();

      return {
        status: "assigned",
        id: salesRepId
      };
    }

    // No changes made
    return {
      status: "no_action",
      id: null
    };
  }

  /**
   * Retrieves the list of warehouses associated with a specific distributor.
   *
   * This function queries the `Warehouse` model to fetch all warehouses linked to the given distributor ID.
   * Each warehouse includes details such as the associated user ID and the warehouse name.
   *
   * @param {number} distributorId - The ID of the distributor whose warehouses are to be retrieved.
   * @returns {Promise<Array<{ id: number; name: string }>>}
   *          A promise that resolves to an array of objects, each containing the `id` and `name` of a warehouse.
   * @throws Will throw an error if the distributor ID is invalid or if the data cannot be retrieved.
   */
  public async getDistributorWarehouses(
    distributorId: number,
    warehouseIds?: number[],
    returnDefaultWarehouseId: boolean = false
  ) {
    const where = warehouseIds ? { id: { [Op.in]: warehouseIds } } : {};
    const warehouses = await Warehouse.findAll({
      attributes: ["id", "name"],
      where: {
        distributorId: distributorId,
        ...(returnDefaultWarehouseId ? { isDefault: true } : {}),
        ...where
      },
      raw: true
    });

    return warehouses;
  }

  /**
   * Retrieves the list of warehouses associated with a distributor manager.
   *
   * This function queries the `DistributorManagerWarehouse` model to fetch all warehouses linked to the given manager ID.
   * Each warehouse includes details such as the warehouse ID and the role of the distributor manager.
   *
   * @param {number} managerId - The ID of the distributor manager whose warehouses are to be retrieved.
   * @param {number} distributor - The ID of the distributor for which the warehouses are to be retrieved.
   * @param {boolean} returnAssigned - Whether to return assigned or unassigned warehouses.
   * @returns {Promise<Array<{ id: number; name: string }>>}
   *          A promise that resolves to an array of objects, each containing the `id` and `name` of a warehouse.
   */
  public async getDistributorManagerWarehouses(
    managerId: number,
    distributor: number,
    returnAssigned: boolean = true,
    isAdminOrExecutive?: boolean,
    userRole?: string
  ) {
    const distributorWarehouses =
      await this.getDistributorWarehouses(distributor);
    // If admin/executive and role is not DISTRIBUTOR_GENERAL_MANAGER or DISTRIBUTOR_SALES_MANAGER, return all warehouses
    if (
      isAdminOrExecutive &&
      userRole !== ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER &&
      userRole !== ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER
    ) {
      return distributorWarehouses;
    }

    // If role is DISTRIBUTOR_SALES_MANAGER, get primary_warehouse_id from distributors table
    if (userRole === ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER) {
      const distributorRecord = await Distributor.findByPk(distributor, {
        attributes: ["primaryWarehouseId"],
        raw: true
      });
      if (distributorRecord && (distributorRecord as any).primaryWarehouseId) {
        const primaryWarehouseId = Number(
          (distributorRecord as any).primaryWarehouseId
        );
        const filteredWarehouses = distributorWarehouses.filter(
          (wh: any) => wh.id === primaryWarehouseId
        );
        return filteredWarehouses;
      }
      // If no primary warehouse found, return empty array
      return [];
    }

    const relatedWarehouses = await DistributorManagerWarehouse.findAll({
      attributes: ["warehouse_id"],
      where: {
        distributorId: managerId,
        role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER
      },
      raw: true
    });
    const relatedWarehousIds = [
      ...new Set(relatedWarehouses.map((r: any) => r.warehouse_id))
    ];
    const warehouses = returnAssigned
      ? distributorWarehouses.filter((wh: any) =>
          relatedWarehousIds.includes(wh.id)
        )
      : distributorWarehouses.filter(
          (wh: any) => !relatedWarehousIds.includes(wh.id)
        );

    return warehouses;
  }

  /**
   * Retrieves the primary warehouse for a distributor sales rep manager.
   * This method queries the distributor's primary warehouse based on the distributor ID.
   *
   * @param {number} distributorId - The ID of the distributor (from user's associatedUserId).
   * @returns {Promise<Array<{ id: number; name: string }>>} - A promise that resolves to an array containing the warehouse id and name.
   */
  public async getDistributorSalesRepManagerWarehouse(
    distributorId: number
  ): Promise<Array<{ id: number; name: string }>> {
    const query = `
      SELECT 
        d.primary_warehouse_id AS warehouse_id, 
        w.name AS name 
      FROM distributors d
      INNER JOIN warehouses w ON w.id = d.primary_warehouse_id
      WHERE d.id = :distributorId
    `;

    const replacements = {
      distributorId: distributorId
    };

    const result = await sequelize.query<{
      warehouse_id: number;
      name: string;
    }>(query, {
      replacements,
      type: QueryTypes.SELECT
    });

    // Map warehouse_id to id to match the expected format
    return result.map((row) => ({
      id: row.warehouse_id,
      name: row.name
    }));
  }

  /**
   * Updates the assignment of a warehouse to a distributor manager.
   * If the warehouse is already assigned, it will be unassigned.
   * If it is not assigned, it will be assigned to the distributor manager.
   *
   * @param {number} distributorId - The ID of the distributor.
   * @param {number} managerId - The ID of the distributor manager.
   * @param {number} warehouseId - The ID of the warehouse to be assigned/unassigned.
   * @returns {Promise<{ status: string; id: number | null }>} - A promise that resolves with the status and ID of the warehouse.
   */
  public async updateDistributorManagerWarehouseAssignment(
    distributorId: number,
    managerId: number,
    warehouseId: number
  ) {
    const distributorWarehouses =
      await this.getDistributorWarehouses(distributorId);

    const isWarehouseUnderDistributor = distributorWarehouses.some(
      (dt: any) => warehouseId == dt.id
    );

    const existingRelation = await DistributorManagerWarehouse.findOne({
      attributes: ["id"],
      where: {
        distributor_id: managerId,
        role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
        warehouse_id: warehouseId
      },
      raw: true
    });

    if (existingRelation) {
      await DistributorManagerWarehouse.destroy({
        where: { id: existingRelation.id }
      });

      return {
        status: "unassigned",
        id: warehouseId
      };
    } else if (isWarehouseUnderDistributor) {
      await DistributorManagerWarehouse.create({
        distributorId: managerId,
        role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER,
        warehouseId: warehouseId,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      return {
        status: "assigned",
        id: warehouseId
      };
    }

    // No changes made
    return {
      status: "no_action",
      id: null
    };
  }

  public async getWarehouseIds(
    distributorId: number,
    managerId?: number,
    isGeneralManager?: boolean,
    selectedWarehouseId?: number,
    returnDefaultWarehouseId: boolean = false
  ) {
    if (selectedWarehouseId && !isNaN(selectedWarehouseId)) {
      return [selectedWarehouseId];
    }

    const relatedWarehouses = !isGeneralManager
      ? []
      : await DistributorManagerWarehouse.findAll({
          attributes: ["warehouse_id"],
          where: {
            distributorId: managerId,
            role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER
          },
          raw: true
        });

    const relatedWarehousIds = [
      ...new Set(relatedWarehouses.map((r: any) => r.warehouse_id))
    ];

    const result = await this.getDistributorWarehouses(
      distributorId,
      isGeneralManager ? relatedWarehousIds : undefined,
      returnDefaultWarehouseId && !selectedWarehouseId
    );

    return result.map((wh: any) => wh.id);
  }

  /**
   * Retrieves warehouse ids assigned to a general manager from distributor_manager_warehouses.
   * This uses the provided general manager user id, which is stored as distributor_id in the mapping table.
   */
  public async getWarehouseIdsByGeneralManager({
    generalManagerUserId,
    fetchWarehouseName = false
  }: {
    generalManagerUserId: number;
    fetchWarehouseName?: boolean;
  }): Promise<
    number[] | Array<{ warehouseId: number; warehouseName: string }>
  > {
    const attributes: any[] = [["warehouse_id", "warehouseId"]];
    if (fetchWarehouseName) {
      attributes.push([Sequelize.col("Warehouse.name"), "warehouseName"]);
    }

    const warehouseAssignments = await DistributorManagerWarehouse.findAll({
      attributes,
      include: fetchWarehouseName
        ? [
            {
              model: Warehouse,
              attributes: [],
              required: false
            }
          ]
        : [],
      where: {
        distributor_id: generalManagerUserId,
        role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER
      },
      raw: true
    });

    const uniqueWarehouses = [
      ...new Map(
        warehouseAssignments.map((row: any) => [row.warehouseId, row])
      ).values()
    ];

    if (!fetchWarehouseName) {
      return uniqueWarehouses.map((row: any) => Number(row.warehouseId));
    }

    return uniqueWarehouses.map((row: any) => ({
      warehouseId: Number(row.warehouseId),
      warehouseName: row.warehouseName
    }));
  }

  /**
   * Retrieves sales rep ids for a distributor general manager.
   * Finds GM warehouse assignments, maps to distributors via primary warehouse,
   * then returns sales reps for those distributors.
   */
  public async getSalesRepIdsForGeneralManager(
    generalManagerUserId: number
  ): Promise<number[]> {
    if (!generalManagerUserId) {
      return [];
    }
    const gmWarehouses = await DistributorManagerWarehouse.findAll({
      attributes: ["warehouse_id"],
      where: {
        distributor_id: generalManagerUserId,
        role: ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER
      },
      raw: true
    });
    console.log("-------------gmWarehouses", gmWarehouses);

    const warehouseIds = [
      ...new Set(gmWarehouses.map((w: any) => w.warehouse_id))
    ];
    if (!warehouseIds.length) {
      return [];
    }

    const distributors = await Distributor.findAll({
      attributes: ["id"],
      where: {
        primaryWarehouseId: {
          [Op.in]: warehouseIds
        }
      },
      raw: true
    });
    const salesRepIds: number[] = [
      ...new Set(distributors.map((d: any) => d.id))
    ];
    if (!salesRepIds.length) {
      return [];
    }
    return salesRepIds;
  }

  /**
   * Retrieves total store earnings and top earning stores for a specific distributor.
   *
   * This method fetches the aggregated total earnings of all stores under a distributor,
   * as well as detailed information about the top 10 highest-earning stores. The distributor
   * ID is determined based on the authenticated user's role.
   *
   * Only includes earnings from stores that are enrolled in the programs (via ProgramParticipant join).
   * This ensures consistency with the key metrics API calculation.
   *
   * If the distributor ID is missing or invalid, a bad request error is returned.
   * @method getDistributorStoreEarnings()
   * @param {number[]} totalStoreIds - An array of store IDs for which to retrieve earnings data.
   * @param {string} [sortBy] - Column to sort by ('storeName', 'storeEarnings'). Defaults to 'storeEarnings'.
   * @param {string} [sortOrder] - Sort order ('ASC' or 'DESC'). Defaults to 'DESC'.
   * @param {number[]} [authorizedProgramIds] - Optional array of authorized program IDs to filter results.
   * @returns {Promise<{ stores: Array<{ storeId: number; storeName: string; storeEarnings: number }>; totalEarnings: number }>}
   *          A promise that resolves to an object containing an array of store earnings data and the
   */
  public async getDistributorStoreEarnings(
    totalStoreIds: number[],
    sortBy: string = "storeEarnings",
    sortOrder: "ASC" | "DESC" = "DESC",
    authorizedProgramIds?: number[],
    programTimeline: string = "Current"
  ) {
    // Early return if no authorized programs
    if (!authorizedProgramIds || authorizedProgramIds.length === 0) {
      return {
        stores: [],
        totalEarnings: 0
      };
    }

    // Validate sort parameters - handle both "storeName" and "storesName" for backward compatibility
    const sortByNormalized = sortBy === "storesName" ? "storeName" : sortBy;
    const validSortColumns = ["storeName", "storeEarnings"];
    const effectiveSortBy = validSortColumns.includes(sortByNormalized)
      ? sortByNormalized
      : "storeEarnings";
    const effectiveSortOrder = ["ASC", "DESC"].includes(sortOrder)
      ? sortOrder
      : "DESC";

    // Build timeline filter condition
    const timelineCondition = buildProgramTimelineSqlCondition(
      programTimeline,
      "p"
    );

    // **OPTIMIZED: Using CTE with pre-filtering for better performance**
    // CTE filters data early before aggregation, reducing GROUP BY workload
    // NOT EXISTS is more efficient than LEFT JOIN for exclusion checks
    // Query only fetches top 10 stores - totalEarnings not calculated (returns 0) since not used in frontend
    // Join with programs table to filter by timeline
    const query = `
      WITH filtered_aggregates AS (
        SELECT 
          sla.store_id,
          sla.earnings,
          sla.program_id
        FROM store_listing_aggregates sla
        INNER JOIN programs p ON p.id = sla.program_id
        WHERE sla.program_enrolled = true
          AND sla.store_id IN (:storeIds)
          AND sla.store_id != 24180
          AND sla.program_id IN (:programIds)
          AND p.deleted_at IS NULL
          ${timelineCondition}
          AND NOT EXISTS (
            SELECT 1 
            FROM program_store_ineligibility psi
            WHERE psi.store_id = sla.store_id 
              AND psi.program_id = sla.program_id
              AND psi.deleted_at IS NULL
          )
      )
      SELECT 
        fa.store_id, 
        SUM(fa.earnings) as store_earnings,
        s.name as store_name
      FROM filtered_aggregates fa
      INNER JOIN stores s ON s.id = fa.store_id AND s.deleted_at IS NULL
      GROUP BY fa.store_id, s.name
      HAVING SUM(fa.earnings) > 0
      ORDER BY ${effectiveSortBy === "storeName" ? "s.name" : "store_earnings"} ${effectiveSortOrder}
      LIMIT 10
    `;

    const results = await sequelize.query(query, {
      replacements: {
        storeIds: totalStoreIds,
        programIds: authorizedProgramIds
      },
      type: QueryTypes.SELECT,
      raw: true
    });

    // **OPTIMIZATION: Extract data without additional processing**
    // totalEarnings returns 0 since it's not used in frontend (commented out in ListingDataTable)
    if (!results || results.length === 0) {
      return {
        stores: [],
        totalEarnings: 0
      };
    }

    const stores = (results as any).map((row: any) => ({
      storeId: row.store_id,
      storeName: row.store_name,
      storeEarnings: parseFloat(row.store_earnings) || 0
    }));

    return {
      stores,
      totalEarnings: 0
    };
  }

  /**
   * Counts the number of stores that have enrolled in at least one program.
   * Uses materialized view for distributor admin for optimal performance.
   * @param {number} distributorId - The ID of the distributor.
   * @returns {Promise<number>} - A promise that resolves to the number of stores that have enrolled in at least one program.
   */
  public async countStoresProgramsEnrolled(
    distributorId: number,
    warehouseIds?: number[]
  ): Promise<number> {
    const user = getCurrentUser();
    const isSalesRepManager = isDistributorSalesRepManager(user?.role);

    // For sales rep managers, use the original complex query
    if (isSalesRepManager) {
      const result = (await sequelize.query(
        `
        SELECT COUNT(DISTINCT pp.program_id || '-' || pp.entity_id) AS total
        FROM program_participants pp
        INNER JOIN user_roles ur
          ON pp.entity_id = ur.associated_user_id
          AND ur.parent_entity_type = 'DISTRIBUTOR'
          AND ur.role = 'STORE'
          AND ur.associated_entity_type = 'STORE'
        INNER JOIN store_sales_reps ssr
          ON ur.associated_user_id = ssr.store_id
          AND ssr.deleted_at IS NULL
        INNER JOIN manager_sales_rep_mapping msrm
          ON ssr.sales_rep_id = msrm.sales_rep_id
          AND msrm.deleted_at IS NULL
        WHERE pp.entity_type = 'STORE'
          AND pp.deleted_at IS NULL
          AND NOT EXISTS (
            SELECT 1 
            FROM program_store_ineligibility psi
            WHERE psi.program_id = pp.program_id
              AND psi.store_id = pp.entity_id
              AND psi.deleted_at IS NULL
          )
          AND msrm.sales_manager_id = :salesManagerId
        `,
        {
          replacements: { salesManagerId: user?.associatedUserId },
          type: QueryTypes.SELECT,
          plain: true
        }
      )) as unknown as { total: string };

      return parseInt(result?.total ?? "0", 10);
    }

    // For distributor admin, use optimized materialized view lookup
    // If warehouseIds is provided, filter by those warehouses
    // Otherwise, sum all warehouses (including NULL) for the distributor
    let query = `
      SELECT SUM(enrolled_stores_count) AS total
      FROM distributor_stores_programs_enrolled_mv
      WHERE distributor_id = :distributorId
    `;

    const replacements: any = { distributorId };

    if (warehouseIds && warehouseIds.length > 0) {
      // Filter by specific warehouse IDs only (exclude NULL warehouse_ids)
      // Manually expand the array to avoid Sequelize array parameter issues
      const warehousePlaceholders = warehouseIds
        .map((_, index) => `:warehouseId${index}`)
        .join(", ");

      query += ` AND warehouse_id IN (${warehousePlaceholders})`;

      // Add each warehouse ID as a separate replacement
      warehouseIds.forEach((id, index) => {
        replacements[`warehouseId${index}`] = id;
      });
    }

    const result = (await sequelize.query(query, {
      replacements,
      type: QueryTypes.SELECT,
      plain: true
    })) as unknown as { total: number | null };

    // Return 0 if distributor not found in materialized view (no enrolled stores)
    return result?.total ?? 0;
  }

  /**
   * Helper method to generate order clause for sales rep earnings sorting.
   * @param {string} sortBy - The column to sort by.
   * @param {string} sortOrder - The sort order ('ASC' or 'DESC').
   * @returns {any} - Sequelize order clause.
   */
  private getOrderClause(sortBy: string, sortOrder: "ASC" | "DESC"): any {
    return this.getSortOrderClause(sortBy, sortOrder, "salesRepEarnings");
  }

  /**
   * Common helper method to generate order clause for different entity types.
   * @param {string} sortBy - The column to sort by.
   * @param {string} sortOrder - The sort order ('ASC' or 'DESC').
   * @param {string} entityType - The type of entity ('salesRep' or 'store').
   * @returns {any} - Sequelize order clause.
   */
  private getSortOrderClause(
    sortBy: string,
    sortOrder: "ASC" | "DESC",
    entityType: "salesRepEarnings" | "distributorStoreEarnings"
  ): any {
    switch (entityType) {
      case "salesRepEarnings":
        switch (sortBy) {
          case "storesCount":
            return [
              Sequelize.fn("COUNT", Sequelize.col("store_sales_reps.store_id")),
              sortOrder
            ];
          case "storesEarnings": // For earnings, we'll sort by name first since earnings are calculated later
          case "salesRepName": // For earnings, we'll sort by name first since earnings are calculated later
          default: // Fallback to name sorting
            return [
              Sequelize.fn(
                "CONCAT",
                Sequelize.col("user.first_name"),
                " ",
                Sequelize.col("user.last_name")
              ),
              sortOrder ? sortOrder : "ASC"
            ];
        }
      case "distributorStoreEarnings":
        switch (sortBy) {
          case "storeEarnings":
            return [
              Sequelize.fn("SUM", Sequelize.col("earned_rebate")),
              sortOrder
            ];
          case "storeName":
          default: // Fallback to name sorting
            return [Sequelize.col("store.name"), sortOrder ? sortOrder : "ASC"];
        }
      default:
        return [];
    }
  }

  /**
   * Get store earnings data for CSV export
   * @param distributorId - The distributor ID
   * @param startDate - Start date for filtering
   * @param endDate - End date for filtering
   * @returns Promise<StoreEarningsCSVData[]>
   */
  async getStoreEarningsForCSV({
    distributorId,
    startDate,
    endDate,
    manufacturerId,
    programTimeline
  }: {
    distributorId: number;
    startDate: Date;
    endDate: Date;
    manufacturerId?: number;
    programTimeline?: string;
  }): Promise<StoreEarningsCSVData[]> {
    // Build program timeline filter conditions for raw SQL
    let timelineFilter = "";
    if (programTimeline) {
      const nowDate = new Date();
      const nowDateStr = nowDate.toISOString().split("T")[0];

      switch (programTimeline.toLowerCase()) {
        case "historical":
          // Historical: programs that ended before today (date-only comparison)
          timelineFilter = `AND DATE(p.end_date) < DATE('${nowDateStr}')`;
          break;
        case "current":
          // Current: programs that are active today (date-only comparison)
          timelineFilter = `AND DATE(p.end_date) >= DATE('${nowDateStr}') AND DATE(p.start_date) <= DATE('${nowDateStr}')`;
          break;
        case "upcoming":
          // Upcoming: programs that start within 30 days (date-only comparison)
          timelineFilter = `AND DATE(p.start_date) >= DATE('${nowDateStr}') AND DATE(p.start_date) <= DATE_ADD(DATE('${nowDateStr}'), INTERVAL 30 DAY)`;
          break;
        default:
          timelineFilter = "";
      }
    }

    const query = `
      SELECT 
        s.name AS "storeName",
        s.id AS "storeId",
        COALESCE(s.external_store_id, s.id::text) AS "storeExternalId",
        s.name AS "storeDisplayName",
        p.id AS "programId",
        CASE 
          WHEN pd.tier > 0 THEN p.program_header || ' - ' || pd.program_line
          ELSE p.program_header
        END AS "programName",
        CASE 
          WHEN pd.tier > 0 THEN pd.tier
          ELSE NULL
        END AS "programTier",
        COALESCE(d.name, 'N/A') AS "salesRepName",
        COALESCE(m.organization_name, m.name, 'N/A') AS "manufacturerName",
        COALESCE(SUM(pc_tier.earned_rebate), 0) AS "totalStoreEarnings"
      FROM program_participants pp
      JOIN programs p 
        ON pp.program_id = p.id
      JOIN manufacturers m
        ON p.manufacturer_id = m.id
      JOIN stores s 
        ON pp.entity_id = s.id
      LEFT JOIN store_sales_reps sr 
        ON s.id = sr.store_id
      LEFT JOIN distributors d 
        ON sr.sales_rep_id = d.id
      LEFT JOIN program_compliances pc 
        ON pp.program_id = pc.program_id
        AND pp.entity_id = pc.entity_id
        AND pc.status = '${ProgramsComplianceStatus.Active}'
        AND pc.deleted_at IS NULL
      JOIN program_details pd 
        ON p.id = pd.program_id
      LEFT JOIN program_compliances pc_tier
        ON pc_tier.program_id = pp.program_id
        AND pc_tier.entity_id = pp.entity_id
        AND pc_tier.program_detail_id = pd.id
        AND pc_tier.status = '${ProgramsComplianceStatus.Active}'
        AND pc_tier.deleted_at IS NULL
      WHERE pp.entity_id IN (
        SELECT associated_user_id 
        FROM user_roles 
        WHERE parent_entity_id = :distributorId
          AND parent_entity_type = '${ENTITY_TYPE.DISTRIBUTOR}'
      )
        AND pp.entity_type = '${ENTITY_TYPE.STORE}'
        AND pp.deleted_at IS NULL
        AND p.start_date <= :endDate
        AND p.end_date >= :startDate
        AND p.deleted_at IS NULL
        AND s.deleted_at IS NULL
        ${manufacturerId ? "AND p.manufacturer_id = :manufacturerId" : ""}
        ${timelineFilter}
      GROUP BY 
        s.name, s.id, s.external_store_id, s.store_name, p.id, p.program_header, pd.tier, pd.program_line, d.name, m.organization_name, m.name
      ORDER BY s.name
    `;

    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: {
        distributorId,
        startDate,
        endDate,
        ...(manufacturerId && { manufacturerId })
      }
    });

    return results as StoreEarningsCSVData[];
  }

  /**
   * Get program summary data for CSV export
   * @param distributorId - The distributor ID
   * @param startDate - Start date for filtering
   * @param endDate - End date for filtering
   * @returns Promise<ProgramSummaryCSVData[]>
   */
  async getStoreEarningsAggregatedForCSV({
    distributorId,
    startDate,
    endDate,
    manufacturerId,
    programTimeline
  }: {
    distributorId: number;
    startDate: Date;
    endDate: Date;
    manufacturerId?: number;
    programTimeline?: string;
  }): Promise<ProgramSummaryCSVData[]> {
    // Build program timeline filter conditions for raw SQL
    let timelineFilter = "";
    if (programTimeline) {
      const nowDate = new Date();
      const nowDateStr = nowDate.toISOString().split("T")[0];

      switch (programTimeline.toLowerCase()) {
        case "historical":
          // Historical: programs that ended before today (date-only comparison)
          timelineFilter = `AND DATE(p.end_date) < DATE('${nowDateStr}')`;
          break;
        case "current":
          // Current: programs that are active today (started before/on today AND end after/on today) (date-only comparison)
          timelineFilter = `AND DATE(p.start_date) <= DATE('${nowDateStr}') AND DATE(p.end_date) >= DATE('${nowDateStr}')`;
          break;
        case "upcoming":
          // Upcoming: programs that start within 30 days (date-only comparison)
          timelineFilter = `AND DATE(p.start_date) >= DATE('${nowDateStr}') AND DATE(p.start_date) <= DATE_ADD(DATE('${nowDateStr}'), INTERVAL 30 DAY)`;
          break;
        default:
          timelineFilter = "";
      }
    }

    const query = `
    WITH distributor_stores AS (
      SELECT associated_user_id 
      FROM user_roles 
      WHERE parent_entity_id = :distributorId
        AND parent_entity_type = '${ENTITY_TYPE.DISTRIBUTOR}'
        AND role = '${ENTITY_TYPE.STORE}'
    ),
    distinct_participants AS (
      SELECT DISTINCT program_id, entity_id
      FROM program_participants
      WHERE entity_type = '${ENTITY_TYPE.STORE}'
        AND deleted_at IS NULL
    ),
    compliance_aggregated AS (
      SELECT 
        program_id,
        program_detail_id, 
        entity_id,
        SUM(earned_rebate) AS earned_rebate
      FROM program_compliances
      WHERE status = '${ProgramsComplianceStatus.Active}'
        AND deleted_at IS NULL
      GROUP BY program_id, program_detail_id, entity_id
    ),
    program_tiers AS (
      SELECT DISTINCT
        p.id as program_id,
        pd.id as program_detail_id,
        pd.tier,
        CASE 
          WHEN pd.tier > 0 THEN p.program_header || ' - ' || pd.program_line
          ELSE p.program_header
        END AS program_name,
        p.start_date,
        p.end_date,
        COALESCE(m.organization_name, m.name, 'N/A') AS manufacturer_name
      FROM programs p
      JOIN manufacturers m ON p.manufacturer_id = m.id
      JOIN program_details pd ON p.id = pd.program_id
      JOIN program_approvals pa ON pa.program_id = p.id
        AND pa.approver_id = :distributorId
        AND pa.approver_type = '${ENTITY_TYPE.DISTRIBUTOR}'
        AND pa.status = '${PROGRAM_APPROVAL_STATUS.APPROVED}'
        AND pa.deleted_at IS NULL
      WHERE p.start_date <= :endDate
        AND p.end_date >= :startDate
        AND p.deleted_at IS NULL
        AND p.participant_type = '${ENTITY_TYPE.STORE}'
        ${manufacturerId ? "AND p.manufacturer_id = :manufacturerId" : ""}
        ${timelineFilter}
    ),
    eligible_compliance AS (
      SELECT 
        ca.program_id,
        ca.program_detail_id,
        ca.entity_id,
        ca.earned_rebate
      FROM compliance_aggregated ca
      WHERE ca.entity_id IN (SELECT associated_user_id FROM distributor_stores)
        AND NOT EXISTS (
          SELECT 1 
          FROM program_store_ineligibility psi
          WHERE psi.program_id = ca.program_id
            AND psi.store_id = ca.entity_id
            AND psi.deleted_at IS NULL
        )
    )
    SELECT 
      pt.program_id AS "programId",
      pt.program_detail_id AS "programDetailId",
      pt.program_name AS "programName",
      pt.tier AS "programTier",
      pt.start_date AS "programStartDate",
      pt.end_date AS "programEndDate",
      
      -- Stores Enrolled (from program_participants only)
      COUNT(DISTINCT pp.entity_id) AS "storesEnrolled",
      
      -- Stores in Compliance (cascading - higher tiers count in lower tiers)   
      COUNT(DISTINCT
        CASE
          WHEN ec.earned_rebate > 0
            AND ec.program_detail_id IN (
              SELECT pd2.id
              FROM program_details pd2
              WHERE pd2.program_id = pt.program_id
                AND pd2.tier >= pt.tier
            )
          THEN ec.entity_id
        END
      ) AS "storesInCompliance",
      
      -- Total Earnings (tier-specific from pre-aggregated data)
      COALESCE(SUM(
        CASE
          WHEN ec.program_detail_id = pt.program_detail_id
          THEN ec.earned_rebate
          ELSE 0
        END
      ), 0) AS "totalEarnings",
      
      pt.manufacturer_name AS "manufacturerName"

    FROM program_tiers pt
    LEFT JOIN distinct_participants pp 
      ON pt.program_id = pp.program_id
      AND pp.entity_id IN (SELECT associated_user_id FROM distributor_stores)
    LEFT JOIN eligible_compliance ec 
      ON ec.entity_id = pp.entity_id
      AND ec.program_id = pt.program_id

    GROUP BY 
      pt.program_id, pt.program_name, pt.start_date, pt.end_date, 
      pt.program_detail_id, pt.tier, pt.manufacturer_name

    ORDER BY pt.start_date DESC, pt.program_name, pt.tier
  `;

    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements: {
        distributorId,
        startDate,
        endDate,
        ...(manufacturerId && { manufacturerId })
      }
    });

    return results as ProgramSummaryCSVData[];
  }

  /**
   * Get sales rep earnings data for CSV export
   * @param distributorId - The distributor ID
   * @param startDate - Start date for filtering
   * @param endDate - End date for filtering
   * @param manufacturerId - Optional manufacturer ID filter
   * @param programTimeline - Optional program timeline filter
   * @returns Promise<SalesRepEarningsCSVData[]>
   */
  async getSalesRepEarningsForCSV({
    distributorId,
    startDate,
    endDate,
    manufacturerId,
    programTimeline,
    salesRepIds
  }: {
    distributorId: number;
    startDate: Date;
    endDate: Date;
    manufacturerId?: number;
    programTimeline?: string;
    salesRepIds?: number[];
  }): Promise<SalesRepEarningsCSVData[]> {
    // Build program timeline filter conditions for raw SQL
    let timelineFilter = "";
    if (programTimeline) {
      const nowDate = new Date();
      const nowDateStr = nowDate.toISOString().split("T")[0];

      switch (programTimeline.toLowerCase()) {
        case "historical":
          // Historical: programs that ended before today (date-only comparison)
          timelineFilter = `AND DATE(p.end_date) < DATE('${nowDateStr}')`;
          break;
        case "current":
          // Current: programs that are active today (started before/on today AND end after/on today) (date-only comparison)
          timelineFilter = `AND DATE(p.start_date) <= DATE('${nowDateStr}') AND DATE(p.end_date) >= DATE('${nowDateStr}')`;
          break;
        case "upcoming":
          // Upcoming: programs that start within 30 days (date-only comparison)
          timelineFilter = `AND DATE(p.start_date) >= DATE('${nowDateStr}') AND DATE(p.start_date) <= DATE_ADD(DATE('${nowDateStr}'), INTERVAL 30 DAY)`;
          break;
        default:
          timelineFilter = "";
      }
    }

    // Build sales rep filter condition with parameterized query
    let salesRepFilter = "";
    const replacements: any = {
      distributorId,
      startDate,
      endDate,
      ...(manufacturerId && { manufacturerId })
    };

    if (salesRepIds && salesRepIds.length > 0) {
      // Create parameterized placeholders for the IN clause
      const placeholders = salesRepIds
        .map((_, index) => `:salesRepId${index}`)
        .join(",");
      salesRepFilter = `AND associated_user_id IN (${placeholders})`;
      // Add each sales rep ID to replacements
      salesRepIds.forEach((id, index) => {
        replacements[`salesRepId${index}`] = id;
      });
    }

    const query = `
    WITH distributor_sales_reps AS (
      -- Get all sales reps for the distributor (or filtered by salesRepIds if provided)
      SELECT associated_user_id
      FROM user_roles
      WHERE parent_entity_id = :distributorId
        AND role = '${USER_ROLES.DISTRIBUTOR_SALES_REP}'
        ${salesRepFilter}
        AND deleted_at IS NULL
    ),
    sales_rep_compliances AS (
      -- Get all active compliances for sales reps within date range
      SELECT
        pc.entity_id,
        pc.program_id,
        pc.program_detail_id,
        pc.unadjusted_earned_rebate
      FROM program_compliances pc
      WHERE pc.entity_type = '${ENTITY_TYPE.SALES_REP}'
        AND pc.status = '${ProgramsComplianceStatus.Active}'
        AND pc.entity_id IN (SELECT associated_user_id FROM distributor_sales_reps)
        AND pc.compliance_date >= :startDate
        AND pc.compliance_date <= :endDate
        AND pc.deleted_at IS NULL
    ),
    sales_rep_info AS (
      -- Get sales rep details and their manager
      SELECT DISTINCT
        d.id as sales_rep_id,
        COALESCE(d.organization_name, d.name) as sales_rep_name,
        msrm.sales_manager_id,
        COALESCE(dm.organization_name, dm.name) as manager_name
      FROM distributors d
      INNER JOIN distributor_sales_reps dsr ON d.id = dsr.associated_user_id
      LEFT JOIN manager_sales_rep_mapping msrm ON msrm.sales_rep_id = d.id
        AND msrm.deleted_at IS NULL
      LEFT JOIN distributors dm ON dm.id = msrm.sales_manager_id
    ),
    program_info AS (
      -- Get program and tier information
      SELECT
        p.id as program_id,
        p.program_header as program_name,
        p.start_date as program_start_date,
        p.end_date as program_end_date,
        pd.id as program_detail_id,
        pd.tier as program_tier,
        pd.overview as program_overview,
        COALESCE(m.organization_name, m.name, 'N/A') as manufacturer_name
      FROM programs p
      JOIN program_details pd ON p.id = pd.program_id
      JOIN manufacturers m ON p.manufacturer_id = m.id
      WHERE p.deleted_at IS NULL
        AND p.start_date <= :endDate
        AND p.end_date >= :startDate
        ${manufacturerId ? "AND p.manufacturer_id = :manufacturerId" : ""}
        ${timelineFilter}
    ),
    earnings_by_program AS (
      -- Calculate earnings per sales rep per program
      SELECT
        src.entity_id as sales_rep_id,
        src.program_id,
        src.program_detail_id,
        SUM(src.unadjusted_earned_rebate) as program_earnings
      FROM sales_rep_compliances src
      GROUP BY src.entity_id, src.program_id, src.program_detail_id
    ),
    total_earnings AS (
      -- Calculate total earnings per sales rep across all programs
      SELECT
        entity_id as sales_rep_id,
        SUM(unadjusted_earned_rebate) as total_earnings
      FROM sales_rep_compliances
      GROUP BY entity_id
    ),
    sales_rep_programs AS (
      -- Cross join sales reps with programs to get all combinations
      SELECT
        sri.sales_rep_id,
        sri.sales_rep_name,
        sri.manager_name,
        pi.program_id,
        pi.program_detail_id,
        pi.program_name,
        pi.program_start_date,
        pi.program_end_date,
        pi.program_overview,
        pi.program_tier,
        pi.manufacturer_name
      FROM sales_rep_info sri
      CROSS JOIN program_info pi
    )
    SELECT
      srp.sales_rep_name AS "salesRepName",
      COALESCE(srp.manager_name, 'N/A') AS "salesRepManager",
      COALESCE(te.total_earnings, 0) AS "totalEarnings",
      COALESCE(srp.manufacturer_name, 'N/A') AS "manufacturerName",
      srp.program_name AS "programName",
      srp.program_start_date AS "programStartDate",
      srp.program_end_date AS "programEndDate",
      srp.program_overview AS "programOverview",
      COALESCE(srp.program_tier, 0) AS "programTier",
      COALESCE(ebp.program_earnings, 0) AS "programEarnings"
    FROM sales_rep_programs srp
    LEFT JOIN total_earnings te ON te.sales_rep_id = srp.sales_rep_id
    LEFT JOIN earnings_by_program ebp ON ebp.sales_rep_id = srp.sales_rep_id
      AND ebp.program_id = srp.program_id
      AND ebp.program_detail_id = srp.program_detail_id
    ORDER BY 
      srp.sales_rep_name,
      srp.program_name,
      srp.program_tier
  `;

    const results = await sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements
    });

    return results as SalesRepEarningsCSVData[];
  }
}

export default new DistributorRepository();
