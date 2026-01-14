import { Op, QueryTypes, Sequelize } from "sequelize";
import sequelize from "../db";
import { ENTITY_TYPE, ProgramsComplianceStatus } from "../config/appConstants";
import ChainStore from "../models/ChainStore";
import Manufacturer from "../models/Manufacturer";
import Product from "../models/Product";
import Program from "../models/Program";
import ProgramCompliance from "../models/ProgramCompliance";
import ProgramParticipant from "../models/ProgramParticipant";
import SalesRepStoreEarnings from "../models/SalesRepStoreEarnings";
import Store from "../models/Store";
import StoreSalesRep from "../models/StoreSalesRep";
import User from "../models/User";
import UserRole from "../models/UserRole";
import Wishlist from "../models/Wishlists";
import ManufacturerRepository from "./ManufacturerRepository";
import { buildProgramTimelineSqlCondition } from "../utils/helpers";

class SalesRepRepository {
  /**
   * Retrieves the total earned rebate for a sales rep grouped by manufacturer
   * @param entityId The ID of the sales rep
   * @param entityType The type of the entity
   * @returns A promise that resolves to an array of objects containing the total earned rebate, manufacturer ID, manufacturer name, and manufacturer logo
   */
  public async getTotalEarnedRebateByManufacturer(
    distributorId: number,
    entityId: number,
    entityType: string,
    excludedProgramIds: number[] = []
  ): Promise<any[]> {
    // Retrieve the list of authorized manufacturers for the distributor
    const authorizedManufacturers =
      await ManufacturerRepository.getAuthorizedManufacturersIds(distributorId);
    const authorizedManufacturerIds = authorizedManufacturers.map((am) =>
      Number(am.manufacturerId)
    );

    const programWhere =
      excludedProgramIds?.length > 0
        ? {
            id: {
              [Op.notIn]: excludedProgramIds
            }
          }
        : {};

    const result: any[] = await Program.findAll({
      attributes: [
        [Sequelize.col("Manufacturer.id"), "ManufacturerId"],
        [Sequelize.col("Manufacturer.name"), "ManufacturerName"],
        [Sequelize.col("Manufacturer.logo"), "ManufacturerLogo"],
        [
          sequelize.fn("SUM", sequelize.col("earned_rebate")),
          "totalEarnedRebate"
        ]
      ],
      include: [
        {
          model: Manufacturer,
          required: true,
          attributes: [] // Exclude raw manufacturer data from the result to avoid duplication
        },
        {
          model: ProgramCompliance,
          required: false,
          attributes: [], // Exclude raw participant data
          where: {
            entityId,
            entityType,
            status: ProgramsComplianceStatus.Active
          }
        }
      ],
      where: {
        participant_type: ENTITY_TYPE.SALES_REP,
        manufacturer_id: { [Op.in]: authorizedManufacturerIds },
        deleted_at: null,
        ...programWhere
      },
      group: ["Manufacturer.name", "Manufacturer.logo", "Manufacturer.id"], // Group by manufacturer name and logo
      order: [[Sequelize.col("Manufacturer.id"), "ASC"]],
      raw: true // Return raw results
    });

    return result;
  }

  public async getTotalStore(entityId: number): Promise<number> {
    const storeCount = await StoreSalesRep.count({
      where: {
        sales_rep_id: entityId
      }
    });

    return storeCount;
  }

  public async getTotalActiveStores(entityId: number): Promise<number> {
    const totalStores = await this.getStoresBySalesRepId(entityId);
    if (totalStores.length === 0) {
      return 0;
    }

    const activeStores = await User.count({
      include: [
        {
          model: UserRole,
          where: {
            role: ENTITY_TYPE.STORE,
            associatedUserId: {
              [Op.in]: totalStores
            }
          },
          required: true
        }
      ],
      where: {
        status: "ACTIVE"
      }
    });

    return activeStores;
  }

  public async getStoresBySalesRepId(
    entityId: number,
    excludeChainStores?: boolean
  ): Promise<number[]> {
    const stores = await StoreSalesRep.findAll({
      include: excludeChainStores
        ? [
            {
              model: ChainStore,
              as: "SalesRepChainStore",
              attributes: [],
              required: false
            }
          ]
        : [],
      where: {
        sales_rep_id: entityId,
        ...(excludeChainStores
          ? {
              "$SalesRepChainStore.id$": {
                [Op.is]: null
              }
            }
          : {})
      },
      attributes: ["storeId"]
    });

    // Return an array of storeIds
    return stores.map((store) => store.storeId);
  }

  public async getTotalStoreProgram(entityId: number): Promise<number> {
    const uniqueProgramCount = await ProgramCompliance.count({
      distinct: true,
      col: "program_id",
      include: {
        model: StoreSalesRep,
        required: true,
        where: {
          store_id: entityId,
          deleted_at: null
        }
      },
      where: {
        entity_type: "STORE"
      }
    });

    return uniqueProgramCount;
  }

  public async getStoresEnrolledInPrograms(salesRepId: number) {
    const storesEnrolledInProgram = StoreSalesRep.count({
      attributes: [
        [
          sequelize.fn(
            "COUNT",
            sequelize.fn(
              "DISTINCT",
              sequelize.col("storeProgramParticipant.program_id")
            )
          ),
          "programsCount"
        ]
      ],
      include: [
        {
          model: ProgramParticipant,
          as: "storeProgramParticipant",
          attributes: [],
          required: true,
          where: {
            entity_type: "STORE"
          }
        }
      ],
      where: {
        sales_rep_id: salesRepId
      }
    });

    return storesEnrolledInProgram;
  }

  public async getStoresWithWishlistProducts(salesRepId: number) {
    const result = await StoreSalesRep.findAll({
      where: {
        sales_rep_id: salesRepId
      },
      include: [
        {
          model: Wishlist,
          as: "wishlists",
          attributes: [],
          required: true,
          include: [
            {
              model: Product,
              as: "product",
              attributes: [],
              required: true
            }
          ]
        },
        {
          model: Store,
          attributes: [],
          required: true
        }
      ],
      attributes: [
        [Sequelize.col("Store.id"), "storeId"],
        [Sequelize.col("Store.name"), "storeName"],
        [
          Sequelize.fn("COUNT", Sequelize.col("wishlists.product_id")),
          "productCount"
        ],
        [
          Sequelize.fn("MAX", Sequelize.col("wishlists.created_at")),
          "lastUpdateDate"
        ]
      ],
      group: ["Store.id"],
      order: [[Sequelize.col("lastUpdateDate"), "DESC"]],
      raw: true
    });

    return result;
  }

  public async getSalesRepSpiffEarningByStoreAndManufacturer(
    storeId: number,
    distributorId: number,
    excludedProgramIds: number[] = [],
    manufacturerId?: number,
    returnByProgramDetails?: boolean,
    programDetailIds?: number[],
    salesRepId?: number | number[],
    role?: string
  ): Promise<any[]> {
    // Retrieve the list of authorized manufacturers for the distributor
    const authorizedManufacturers =
      await ManufacturerRepository.getAuthorizedManufacturersIds(distributorId);
    const authorizedManufacturerIds = authorizedManufacturers.map((am) =>
      Number(am.manufacturerId)
    );

    const programWhere =
      excludedProgramIds?.length > 0
        ? {
            program_id: {
              [Op.notIn]: excludedProgramIds
            }
          }
        : {};

    const salesRepWhere = salesRepId
      ? Array.isArray(salesRepId)
        ? { sales_rep_id: { [Op.in]: salesRepId } }
        : { sales_rep_id: salesRepId }
      : {};

    // If role is DISTRIBUTOR_ADMIN, use unadjusted_earned_rebate instead of earning
    const earningColumn =
      role === "DISTRIBUTOR_ADMIN" ? "unadjusted_earned_rebate" : "earning";

    const result: any[] = await SalesRepStoreEarnings.findAll({
      where: {
        distributor_id: distributorId,
        manufacturer_id: { [Op.in]: authorizedManufacturerIds },
        store_id: storeId,
        ...(manufacturerId ? { manufacturer_id: manufacturerId } : {}),
        ...(programDetailIds
          ? { program_detail_id: { [Op.in]: programDetailIds } }
          : {}),
        ...programWhere,
        ...salesRepWhere
      },
      attributes: [
        "store_id",
        returnByProgramDetails ? "program_detail_id" : "store_id",
        "manufacturer_id",
        [sequelize.fn("SUM", sequelize.col("earning")), "total_earning"],
        [
          sequelize.fn("SUM", sequelize.col("total_quantity")),
          "total_quantity"
        ],
        [
          sequelize.fn("SUM", sequelize.col("unique_products")),
          "total_unique_products"
        ]
      ],
      group: returnByProgramDetails
        ? ["store_id", "manufacturer_id", "program_detail_id"]
        : ["store_id", "manufacturer_id"],
      raw: true // Return raw results
    });

    return result;
  }

  /**
   * Retrieves the total spiff earning for a sales rep for a list of stores.
   * The total earning is the sum of the `earning` column of the
   * `sales_rep_store_earnings` table for the given `distributor_id`, `store_ids`
   * and authorized manufacturer IDs.
   * @param {number} distributorId The ID of the distributor
   * @param {number[]} storeIds The list of store IDs
   * @returns {Promise<number>} A promise that resolves to the total spiff earning
   */
  public async getSalesRepTotalSpiffEarning(
    distributorId: number,
    storeIds: number[]
  ): Promise<number> {
    // Retrieve the list of authorized manufacturers for the distributor
    const authorizedManufacturers =
      await ManufacturerRepository.getAuthorizedManufacturersIds(distributorId);
    const authorizedManufacturerIds = authorizedManufacturers.map((am) =>
      Number(am.manufacturerId)
    );

    const result: any = await SalesRepStoreEarnings.findOne({
      where: {
        distributor_id: distributorId,
        manufacturer_id: { [Op.in]: authorizedManufacturerIds },
        store_id: { [Op.in]: storeIds }
      },
      attributes: [
        [sequelize.fn("SUM", sequelize.col("earning")), "total_earning"]
      ],
      raw: true // Return raw results
    });

    return (result?.total_earning ?? "0") as number;
  }

  /**
   * OPTIMIZED: Retrieves SPIFF earnings for all sales reps in a single bulk query.
   * This eliminates the N+1 query problem by fetching all earnings at once.
   *
   * @param {number} distributorId The ID of the distributor
   * @param {number[]} storeIds The list of store IDs
   * @returns {Promise<Array<{sales_rep_id: number, total_earnings: number}>>} A promise that resolves to an array of sales rep earnings
   */
  public async getBulkSalesRepSpiffEarnings({
    distributorId,
    storeIds,
    authorizedManufacturers,
    programTimeline = "Current"
  }: {
    distributorId: number;
    storeIds: number[];
    authorizedManufacturers?: number[];
    programTimeline?: string;
  }): Promise<Array<{ sales_rep_id: number; total_earnings: number }>> {
    let authorizedManufacturerIds = [];

    // If authorized manufacturers are provided, use them, otherwise fetch them from the distributor
    if (authorizedManufacturers && authorizedManufacturers?.length > 0) {
      authorizedManufacturerIds = authorizedManufacturers;
    } else {
      // Fetch the list of authorized manufacturers for the distributor
      const authorizedManufacturers =
        await ManufacturerRepository.getAuthorizedManufacturersIds(
          distributorId
        );
      authorizedManufacturerIds = authorizedManufacturers.map((am) =>
        Number(am.manufacturerId)
      );
    }

    if (!storeIds || storeIds.length === 0) {
      return [];
    }

    // Build timeline filter condition
    const timelineCondition = buildProgramTimelineSqlCondition(
      programTimeline,
      "p"
    );

    // OPTIMIZATION: Single query to get earnings for all sales reps
    // Use raw SQL query to join with programs table for timeline filtering
    const query = `
      SELECT 
        srse.sales_rep_id,
        SUM(srse.earning) as total_earnings
      FROM sales_rep_store_earnings srse
      INNER JOIN programs p ON p.id = srse.program_id
      WHERE srse.distributor_id = :distributorId
        AND srse.manufacturer_id = ANY(ARRAY[:manufacturerIds])
        AND srse.store_id = ANY(ARRAY[:storeIds])
        AND p.deleted_at IS NULL
        ${timelineCondition}
      GROUP BY srse.sales_rep_id
    `;

    const result: any[] = await sequelize.query(query, {
      replacements: {
        distributorId,
        manufacturerIds: authorizedManufacturerIds,
        storeIds
      },
      type: QueryTypes.SELECT
    });

    return result.map((item: any) => ({
      sales_rep_id: item.sales_rep_id,
      total_earnings: parseFloat(item.total_earnings) || 0
    }));
  }
}

export default new SalesRepRepository();
