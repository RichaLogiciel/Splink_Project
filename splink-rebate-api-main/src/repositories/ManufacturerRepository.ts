import newrelic from "newrelic";
import { col, fn, literal, Op, QueryTypes, Sequelize } from "sequelize";

import {
  CACHE_TTL_TIME,
  DATE_STRING_LOCALE,
  ENTITY_TYPE,
  GROUP_PERIOD,
  useApiCaching
} from "../config/appConstants";
import sequelize from "../db";
import AuthorizedManufacturerDistributor from "../models/AuthorizedManufacturerDistributor";
import ExcludedDistributorManufacturerData from "../models/ExcludedDistributorManufacturerData";
import Distributor from "../models/Distributor";
import EntityAccessMapping from "../models/EntityAccessMapping";
import LineItem from "../models/LineItem";
import Manufacturer from "../models/Manufacturer";
import Product from "../models/Product";
import ProductCategory from "../models/ProductCategory";
import Program from "../models/Program";
import ProgramParticipant from "../models/ProgramParticipant";
import SalesSummary from "../models/SalesSummaryMaterializedView";
import StoreSalesRep from "../models/StoreSalesRep";
import TransactionsImportRecord from "../models/TransactionsImportRecord";
import User from "../models/User";
import UserRole from "../models/UserRole";
import { SalesDataItem } from "../types/SalesTypes";
import { getCacheKey, redisClient } from "../utils/redis";
import StoreRepository from "./StoreRepository";

class ManufacturerRepository {
  /**
   * Helper method to generate week filter for aggregated view queries
   * Handles year-end transitions where January 1st might be in a week that starts in the previous year
   * Calculates the Monday of the week containing startDate to ensure the week is included
   */
  private generateWeekFilter(startDate: Date, endDate: Date): string {
    // Calculate the Monday of the week containing startDate
    const startWeekStr = startDate.toISOString().split("T")[0];

    const endWeekStr = endDate.toISOString().split("T")[0];

    // Check if this is a year-end transition (start date is January 1st)
    if (startDate.getMonth() === 0 && startDate.getDate() === 1) {
      // For January 1st start dates, include the week that contains January 1st
      // even if it starts in the previous year
      const year = startDate.getFullYear();
      const prevYearWeekStart = `${year - 1}-12-30`;

      return `
        AND (
          (week_start::date BETWEEN '${startWeekStr}' AND '${endWeekStr}')
          OR 
          (week_start::date = '${prevYearWeekStart}' AND year = ${year})
        )
      `;
    } else {
      // For other dates, use calculated week boundaries
      return `
        AND week_start::date BETWEEN '${startWeekStr}' AND '${endWeekStr}'
      `;
    }
  }

  public async getActiveAuthorizedDistributorIds(
    manufacturerId: number
  ): Promise<number[]> {
    const [authorizedDistributors, excludedDistributors] = await Promise.all([
      AuthorizedManufacturerDistributor.findAll({
        attributes: ["distributor_id"],
        where: {
          manufacturer_id: manufacturerId,
          deleted_at: null
        },
        raw: true
      }),
      ExcludedDistributorManufacturerData.findAll({
        attributes: ["distributor_id"],
        where: {
          manufacturer_id: manufacturerId,
          deleted_at: null
        },
        raw: true
      })
    ]);

    const excludedSet = new Set(
      excludedDistributors.map((record: any) => Number(record.distributor_id))
    );

    const uniqueAuthorizedIds = new Set(
      authorizedDistributors
        .map((record: any) => Number(record.distributor_id))
        .filter(
          (distributorId: number) =>
            Number.isFinite(distributorId) && !excludedSet.has(distributorId)
        )
    );

    return Array.from(uniqueAuthorizedIds);
  }

  public async filterAllowedDistributorIds(
    manufacturerId: number,
    distributorIds: number[]
  ): Promise<number[]> {
    if (!Array.isArray(distributorIds) || distributorIds.length === 0) {
      return [];
    }

    const sanitizedIds = Array.from(
      new Set(
        distributorIds.filter(
          (id) => typeof id === "number" && Number.isFinite(id)
        )
      )
    );

    if (sanitizedIds.length === 0) {
      return [];
    }

    const allowedDistributorIds =
      await this.getActiveAuthorizedDistributorIds(manufacturerId);

    if (allowedDistributorIds.length === 0) {
      return [];
    }

    const allowedSet = new Set(allowedDistributorIds);

    return sanitizedIds.filter((id) => allowedSet.has(id));
  }
  /**
   * Retrieves the total number of stores associated with a list of distributors.
   *
   * This method calculates the count of stores by querying the UserRole model.
   * It filters the query based on the given distributor IDs, ensuring that only
   * those stores associated with the specified distributors are counted.
   *
   * @param {number[]} distributorIds - An array of distributor IDs for whom to retrieve the store count.
   * @returns {Promise<number>} - A promise that resolves to the count of stores associated with the distributors.
   */
  public async getTotalStores(distributorIds: number[]) {
    const storesCount = await UserRole.findAll({
      attributes: [["associated_user_id", "associatedUserId"]],
      where: {
        role: ENTITY_TYPE.STORE,
        parent_entity_id: { [Op.in]: distributorIds },
        parent_entity_type: ENTITY_TYPE.DISTRIBUTOR
      }
    });

    return storesCount;
  }

  /**
   * Retrieves a list of active stores associated with a manufacturer.
   *
   * This method queries the LineItem model to fetch a list of stores that have
   * made a purchase of a product from the given manufacturer. The results are grouped by
   * buyer ID and filtered to only include stores that are associated with the given list
   * of distributor IDs.
   *
   * @param {number[]} storeIds - An array of store IDs for whom to retrieve the active store count.
   * @param {number} manufacturerId - The ID of the manufacturer for whom to retrieve the active store count.
   * @returns {Promise<LineItem[]>} - A promise that resolves to an array of objects containing the active store ID.
   */
  public async getActiveStores(storeIds: number[], manufacturerId: number) {
    const productIds =
      await StoreRepository.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
        [],
        [manufacturerId]
      );

    const activeStores = await LineItem.findAll({
      attributes: ["buyer_id"],
      where: {
        product_id: {
          [Op.in]: productIds
        },
        buyer_id: {
          [Op.in]: storeIds
        },
        buyer_type: ENTITY_TYPE.STORE
      },
      group: ["buyer_id"],
      raw: true
    });

    return activeStores;
  }

  /**
   * Retrieves a list of stores that are enrolled in any programs associated with the specified manufacturer.
   *
   * This method queries the ProgramParticipant model to find the store IDs associated with programs
   * that are associated with the specified manufacturer ID. It groups the results by store ID and
   * returns the resulting list of enrolled stores.
   *
   * @param {number[]} storeIds - An array of store IDs for which to check the program enrollment.
   * @param {number} manufacturerId - The ID of the manufacturer to filter the programs.
   * @returns {Promise<any[]>} - A promise that resolves to an array of store IDs that are enrolled in any programs associated with the manufacturer.
   */
  public async getStoresEnrolledInPrograms(
    storeIds: number[],
    manufacturerId?: number
  ) {
    const storesEnrolledInProgram = await ProgramParticipant.findAll({
      attributes: ["entity_id"],
      where: {
        entity_id: {
          [Op.in]: storeIds
        },
        entity_type: ENTITY_TYPE.STORE
      },
      include: [
        {
          model: Program,
          attributes: [],
          required: true,
          include: [
            {
              model: Manufacturer,
              attributes: [],
              required: true,
              where: {
                id: manufacturerId
              }
            }
          ]
        }
      ],
      group: ["entity_id"],
      raw: true
    });
    return storesEnrolledInProgram;
  }

  public async getDistributorStoresCount(params: {
    distributorId?: number;
    managerDistributors?: number[];
  }): Promise<number> {
    const { distributorId, managerDistributors } = params;

    // Determine which distributor IDs to query
    const distributorIds = distributorId
      ? [distributorId]
      : managerDistributors || [];

    // Early return if no distributor IDs provided
    if (distributorIds.length === 0) {
      return 0;
    }

    const query = `
      SELECT COUNT(DISTINCT "UserRolesSelfRel"."associated_user_id") AS "storeCount"
      FROM "user_roles" AS "UserRole"
      INNER JOIN "distributors" AS "distributor" 
        ON "UserRole"."associated_user_id" = "distributor"."id"
        AND "distributor"."deleted_at" IS NULL 
        AND "distributor"."is_disabled" = false
      LEFT OUTER JOIN "user_roles" AS "UserRolesSelfRel" 
        ON "UserRole"."associated_user_id" = "UserRolesSelfRel"."parent_entity_id"
        AND "UserRolesSelfRel"."role" = 'STORE'
        AND "UserRolesSelfRel"."parent_entity_type" = 'DISTRIBUTOR'
      WHERE "UserRole"."associated_user_id" IN (:distributorIds)
        AND "UserRole"."role" = 'DISTRIBUTOR_ADMIN'
    `;

    const result: any = await sequelize.query(query, {
      replacements: { distributorIds },
      type: QueryTypes.SELECT,
      plain: true // Returns single row as object instead of array
    });

    return result;
  }

  /**
   * Retrieves the distributors associated with a manufacturer and their respective store IDs.
   * If a distributor ID is provided, the result will be filtered by the distributor ID.
   * @param {number} manufacturerId - The ID of the manufacturer to associate the distributors with.
   * @param {number} [distributorId] - The ID of the distributor to filter the result by.
   * @returns {Promise<any[]>} - A promise that resolves to an array of objects containing the distributor ID, name, city, state, and an array of store IDs associated with the distributor.
   */
  public async getDistributorWithStoreIds(
    manufacturerId: number,
    distributorId?: number,
    managerDistributors?: number[],
    authorizedDistributorIds?: any[]
  ) {
    // const productSKUsIds =
    //   await StoreRepository.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
    //     [],
    //     [manufacturerId]
    //   );

    // If authorizedDistributorIds is provided AND has items, use it as the source of distributor IDs
    // Otherwise, fetch from transactions
    const shouldUseAuthorizedIds =
      authorizedDistributorIds && authorizedDistributorIds.length > 0;
    const distributorTransactions =
      distributorId || managerDistributors?.length || shouldUseAuthorizedIds
        ? []
        : await this.fetchDistributorTransactionsOptimized(manufacturerId);

    let distributorIds = managerDistributors?.length
      ? managerDistributors
      : shouldUseAuthorizedIds
        ? authorizedDistributorIds
        : [
            ...new Set(
              distributorTransactions.map((tr: any) =>
                tr.sellerType == ENTITY_TYPE.MANUFACTURER
                  ? tr.buyerId
                  : tr.sellerId
              )
            )
          ];

    // Fallback: If distributorIds is empty and no specific distributorId is provided,
    // fetch all distributors for the manufacturer
    if (
      distributorIds.length === 0 &&
      !distributorId &&
      !managerDistributors?.length
    ) {
      const allDistributors = await this.getDistributors(manufacturerId);
      distributorIds = allDistributors.map((dt: any) => dt.associatedUserId);
    }

    // Temporarily filter out distributor ID 51 for manufacturer ID 4
    let filteredDistributorIds = distributorIds;
    let filteredDistributorId = distributorId;

    if (manufacturerId === 4) {
      filteredDistributorIds = distributorIds.filter((id) => id !== 51);

      // Also clear distributorId if it matches the restricted one
      if (distributorId === 51) {
        filteredDistributorId = undefined;
      }
    }

    // Filter distributors to only include authorized ones
    if (authorizedDistributorIds && authorizedDistributorIds.length > 0) {
      filteredDistributorIds = filteredDistributorIds.filter((id: number) =>
        authorizedDistributorIds.includes(id)
      );

      // Also clear distributorId if it's not authorized
      if (distributorId && !authorizedDistributorIds.includes(distributorId)) {
        filteredDistributorId = undefined;
      }
    }

    const distributors = await UserRole.findAll({
      attributes: [
        [sequelize.col("user.city"), "city"],
        [sequelize.col("user.state"), "state"],
        [sequelize.col("UserRole.associated_user_id"), "distributorId"],
        [sequelize.col("distributor.organization_name"), "name"],
        [
          sequelize.fn(
            "ARRAY_AGG",
            sequelize.fn(
              "DISTINCT",
              sequelize.col("UserRolesSelfRel.associated_user_id")
            )
          ),
          "storeIds"
        ]
      ],
      include: [
        {
          model: Distributor,
          attributes: [],
          as: "distributor",
          required: true
        },
        {
          model: User,
          as: "user",
          attributes: []
        },
        {
          model: UserRole,
          as: "UserRolesSelfRel",
          required: false,
          where: {
            role: ENTITY_TYPE.STORE,
            parent_entity_type: ENTITY_TYPE.DISTRIBUTOR
          },
          attributes: []
        }
      ],
      where: {
        associated_user_id: {
          [Op.in]: filteredDistributorId
            ? [filteredDistributorId]
            : filteredDistributorIds
        },
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      },
      group: [
        "user.city",
        "user.state",
        "UserRole.associated_user_id",
        "distributor.organization_name"
      ],
      raw: true
    });

    return distributors;
  }

  private async fetchDistributorTransactions(manufacturerId: number) {
    const manufacturerWhere =
      manufacturerId && !isNaN(manufacturerId)
        ? { manufacturer_id: manufacturerId }
        : {};

    const result = await LineItem.findAll({
      attributes: [
        [sequelize.col("seller_id"), "sellerId"],
        [sequelize.col("buyer_id"), "buyerId"],
        [sequelize.col("seller_type"), "sellerType"]
      ],
      include: [
        {
          model: Product,
          as: "product",
          attributes: [],
          required: true,
          where: {
            ...manufacturerWhere
          },
          on: literal(
            `(("product_id" = "product"."unit_skus_id" AND "product"."primary_variant" = true)
            OR "product_id" IN ("product"."case_skus_id", "product"."box_skus_id"))`
          )
        }
      ],
      where: {
        [Op.or]: [
          {
            seller_type: ENTITY_TYPE.MANUFACTURER,
            buyer_type: ENTITY_TYPE.DISTRIBUTOR
          },
          {
            seller_type: ENTITY_TYPE.DISTRIBUTOR,
            buyer_type: ENTITY_TYPE.STORE
          }
        ]
      },
      group: ["seller_id", "buyer_id", "seller_type"],
      raw: true
    });

    return result;
  }

  /**
   * Optimized version of fetchDistributorTransactions using line_items_products_joined_materialized_view
   * This avoids the expensive Product table join by using the pre-joined materialized view
   */
  private async fetchDistributorTransactionsOptimized(manufacturerId: number) {
    const query = `
      SELECT DISTINCT
        seller_id,
        buyer_id,
        seller_type
      FROM line_items_products_joined_materialized_view
      WHERE manufacturer_id = :manufacturerId
        AND (
          (seller_type = :manufacturerType AND buyer_type = :distributorType)
          OR (seller_type = :distributorType AND buyer_type = :storeType)
        )
      ORDER BY seller_id, buyer_id, seller_type
    `;

    const result = await sequelize.query(query, {
      replacements: {
        manufacturerId: manufacturerId,
        manufacturerType: ENTITY_TYPE.MANUFACTURER,
        distributorType: ENTITY_TYPE.DISTRIBUTOR,
        storeType: ENTITY_TYPE.STORE
      },
      type: QueryTypes.SELECT
    });

    return result;
  }

  /**
   * Retrieves sales data for a manufacturer over a specified time period.
   *
   * This method queries the Transaction model to aggregate sales totals
   * either daily or monthly, based on the provided parameters. It calculates
   * the total sales amount for each period within the specified date range
   * and returns the result as an array of SalesDataItem objects.
   *
   * @param {number} manufacturerId - The ID of the manufacturer for whom to retrieve sales data.
   * @param {Date} startDate - The start date of the period for which to retrieve sales data.
   * @param {Date} endDate - The end date of the period for which to retrieve sales data.
   * @param {boolean} isDaily - A flag indicating whether to fetch daily or monthly sales data.
   * @returns {Promise<SalesDataItem[]>} A promise that resolves to an array of SalesDataItem objects,
   * each containing the date and total sales amount for the period.
   */
  public async getSalesForManufacturer(
    manufacturerId: number,
    startDate: Date,
    endDate: Date,
    isDaily: boolean,
    categoryId?: number,
    distributorId?: number // Add distributorId as an optional parameter
  ): Promise<SalesDataItem[]> {
    const whereCondition: any = {
      seller_type: ENTITY_TYPE.MANUFACTURER,
      transaction_date: { [Op.between]: [startDate, endDate] }
    };

    // Add category filter if categoryId is provided
    // if (categoryId) {
    //   whereCondition["$lineItems.product.category.id$"] = categoryId;
    // }

    // Add distributor filter if distributorId is provided
    if (distributorId) {
      whereCondition["buyer_id"] = distributorId;
    }

    const productSKUsIds =
      await StoreRepository.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
        [],
        [manufacturerId],
        categoryId
      );

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
        product_id: {
          [Op.in]: productSKUsIds
        }
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
   * Retrieves a list of product categories.
   *
   * This function fetches categories from the ProductCategory model. By default,
   * it returns only categories with at least one product that has been sold.
   * However, if the `returnAllCategories` parameter is set to true, it returns
   * all categories, regardless of whether they have associated line items or not.
   *
   * @param {boolean} includeNonPurchasedCategories - A flag indicating whether to return all
   * categories or only those with sold products. Default is false.
   * @returns {Promise<Array<{ id: number; name: string }>>} A promise that resolves
   * to an array of objects, each containing the id and name of a product category.
   */
  public async getCategories(
    includeNonPurchasedCategories: boolean = false
  ): Promise<Array<{ id: number; name: string }>> {
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
              required: !includeNonPurchasedCategories,
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
   * Retrieves a list of distributors associated with a manufacturer.
   *
   * This function takes two parameters: the ID of the manufacturer and an optional
   * distributor ID. If the distributor ID is provided, the function will return only
   * the specified distributor. Otherwise, it will return all distributors associated
   * with the given manufacturer.
   *
   * The returned objects contain the name, user ID, and associated user ID of each
   * distributor. The results are filtered by the given manufacturer ID and only
   * include distributors that have been involved in transactions with the manufacturer.
   *
   * @param {number} manufacturerId - The ID of the manufacturer for whom to retrieve
   * distributors.
   * @param {number | null} distributorId - An optional distributor ID to filter the
   * results.
   * @param {number | undefined} accountManagerId - An optional manufacturer account manager ID to filter the
   * results.
   * @returns {Promise<Array<{ name: string; userId: number; associatedUserId: number }>>} A
   * promise that resolves to an array of objects containing the name, user ID, and
   * associated user ID of each distributor.
   */

  //TO BE REFACTORED
  //THIS METHOD IS ALREADY USED AT MANY PLACES AND FOR PRODUCT-INSIGHTS-OPTIMZIED API WE HAVE TO USE THE OPTIMIZED VERSION getDistributorsOptimized
  public async getDistributors(
    manufacturerId: number,
    selectedDistributorId?: number | null,
    accountManagerId?: number
  ) {
    // const productSKUsIds =
    //   await StoreRepository.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
    //     [],
    //     [manufacturerId]
    //   );

    let distributorId = selectedDistributorId;

    const distributorTransactions = distributorId
      ? []
      : await this.fetchDistributorTransactionsOptimized(manufacturerId);
    const allowedDistributorIds =
      await this.getActiveAuthorizedDistributorIds(manufacturerId);

    if (allowedDistributorIds.length === 0) {
      return [];
    }

    const allowedDistributorSet = new Set(allowedDistributorIds);

    let distributorIds = [
      ...new Set(
        distributorTransactions.map((tr: any) =>
          tr.seller_type == ENTITY_TYPE.MANUFACTURER
            ? tr.buyer_id
            : tr.seller_id
        )
      )
    ].filter((id: number) => allowedDistributorSet.has(id));

    // Temporarily filter out distributor ID 51 (Pitco) for manufacturer ID 4 (Highline)
    if (manufacturerId === 4) {
      distributorIds = distributorIds.filter((id) => id !== 51);

      // Also clear selectedDistributorId if it matches the restricted one
      if (distributorId === 51) {
        distributorId = undefined;
      }
    }

    // Validate selectedDistributorId is authorized for this manufacturer
    if (distributorId && !allowedDistributorSet.has(distributorId)) {
      distributorId = undefined;
    }

    if (accountManagerId) {
      const managerDistributors = await EntityAccessMapping.findAll({
        attributes: ["associated_entity_id"],
        where: {
          parent_entity_id: accountManagerId,
          parent_entity_type: ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER,
          associated_entity_type: ENTITY_TYPE.DISTRIBUTOR_ADMIN
        },
        raw: true
      });

      const managerAssignedDistributorIds = managerDistributors.map((r: any) =>
        Number(r.associated_entity_id)
      );

      distributorIds = distributorIds.filter((id: number) =>
        managerAssignedDistributorIds.includes(id)
      );

      distributorId =
        distributorId &&
        managerAssignedDistributorIds.includes(distributorId) &&
        allowedDistributorSet.has(distributorId)
          ? distributorId
          : undefined;
    }

    const targetDistributorIds = distributorId
      ? [distributorId]
      : distributorIds;

    if (targetDistributorIds.length === 0) {
      return [];
    }

    const distributors = await UserRole.findAll({
      attributes: [
        [sequelize.col("user_id"), "userId"],
        [sequelize.col("associated_user_id"), "associatedUserId"],
        [sequelize.col("distributor.organization_name"), "name"]
      ],
      include: [
        {
          model: Distributor,
          attributes: [],
          as: "distributor",
          required: true
        }
      ],
      where: {
        associated_user_id: {
          [Op.in]: targetDistributorIds
        },
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      },
      raw: true
    });

    return distributors;
  }

  /**
   * Optimized version of getDistributors for product insights optimized API
   * Queries distributor records directly and filters to only include distributors
   * that have at least one line item for the manufacturer's products
   */
  public async getDistributorsOptimized(
    manufacturerId: number,
    accountManagerId?: number
  ) {
    const allowedDistributorIds =
      await this.getActiveAuthorizedDistributorIds(manufacturerId);

    if (allowedDistributorIds.length === 0) {
      return [];
    }

    const effectiveAllowedIds =
      manufacturerId === 4
        ? allowedDistributorIds.filter((id) => id !== 51)
        : allowedDistributorIds;

    if (effectiveAllowedIds.length === 0) {
      return [];
    }

    let targetDistributorIds = Array.from(new Set(effectiveAllowedIds));

    // Handle account manager filtering if provided
    if (accountManagerId) {
      const managerDistributors = await EntityAccessMapping.findAll({
        attributes: ["associated_entity_id"],
        where: {
          parent_entity_id: accountManagerId,
          parent_entity_type: ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER,
          associated_entity_type: ENTITY_TYPE.DISTRIBUTOR_ADMIN
        },
        raw: true
      });

      const managerAssignedDistributorIds = managerDistributors.map((r: any) =>
        Number(r.associated_entity_id)
      );

      const allowedDistributorSet = new Set(targetDistributorIds);
      targetDistributorIds = managerAssignedDistributorIds.filter(
        (id: number) => allowedDistributorSet.has(id)
      );
    }

    if (targetDistributorIds.length === 0) {
      return [];
    }

    // Filter to only include distributors that have at least one line item
    // for this manufacturer's products
    // Query for distributors as buyers (manufacturer -> distributor transactions)
    // Use 'allData' scope to bypass the default year filter
    const distributorsAsBuyers = await LineItem.scope("allData").findAll({
      attributes: [
        [sequelize.fn("DISTINCT", sequelize.col("buyer_id")), "distributorId"]
      ],
      include: [
        {
          model: Product,
          as: "product",
          attributes: [],
          required: true,
          where: {
            manufacturer_id: manufacturerId
          },
          on: literal(`"product"."id" = "LineItem"."splink_product_id"`)
        }
      ],
      where: {
        seller_type: ENTITY_TYPE.MANUFACTURER,
        buyer_type: ENTITY_TYPE.DISTRIBUTOR,
        buyer_id: {
          [Op.in]: targetDistributorIds
        },
        splink_product_id: { [Op.ne]: null }
      },
      raw: true
    });

    // Query for distributors as sellers (distributor -> store transactions)
    // Use 'allData' scope to bypass the default year filter
    const distributorsAsSellers = await LineItem.scope("allData").findAll({
      attributes: [
        [sequelize.fn("DISTINCT", sequelize.col("seller_id")), "distributorId"]
      ],
      include: [
        {
          model: Product,
          as: "product",
          attributes: [],
          required: true,
          where: {
            manufacturer_id: manufacturerId
          },
          on: literal(`"product"."id" = "LineItem"."splink_product_id"`)
        }
      ],
      where: {
        seller_type: ENTITY_TYPE.DISTRIBUTOR,
        buyer_type: ENTITY_TYPE.STORE,
        seller_id: {
          [Op.in]: targetDistributorIds
        },
        splink_product_id: { [Op.ne]: null }
      },
      raw: true
    });

    // Combine and extract unique distributor IDs that have line items
    const allDistributorIds = [
      ...distributorsAsBuyers.map((item: any) => Number(item.distributorId)),
      ...distributorsAsSellers.map((item: any) => Number(item.distributorId))
    ].filter((id: number) => !isNaN(id));

    const distributorIdsWithLineItems = new Set(allDistributorIds);

    // Filter targetDistributorIds to only those with line items
    targetDistributorIds = targetDistributorIds.filter((id) =>
      distributorIdsWithLineItems.has(id)
    );

    if (targetDistributorIds.length === 0) {
      return [];
    }

    const distributors = await Distributor.findAll({
      attributes: ["id", "organizationName", "name"],
      where: {
        id: {
          [Op.in]: targetDistributorIds
        }
      },
      raw: true
    });

    const targetSet = new Set(targetDistributorIds);

    return distributors
      .filter((dist: any) => targetSet.has(Number(dist.id)))
      .map((dist: any) => ({
        userId: Number(dist.id),
        associatedUserId: Number(dist.id),
        name: dist.organizationName || dist.name || ""
      }));
  }

  public async getManagerDistributors(
    managerId: number,
    manufacturerId: number,
    returnAssigned: boolean = true
  ) {
    const distributorTransactions =
      await this.fetchDistributorTransactions(manufacturerId);

    let distributorIds = [
      ...new Set(
        distributorTransactions.map((tr: any) =>
          tr.sellerType == ENTITY_TYPE.MANUFACTURER ? tr.buyerId : tr.sellerId
        )
      )
    ];

    // Temporarily filter out distributor ID 51 for manufacturer ID 4
    if (manufacturerId === 4) {
      distributorIds = distributorIds.filter((id) => id !== 51);
    }

    const managerDistributors = await EntityAccessMapping.findAll({
      attributes: ["associated_entity_id"],
      where: {
        parent_entity_id: managerId,
        parent_entity_type: ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER,
        associated_entity_type: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      },
      raw: true
    });

    const managerDistributorIds = [
      ...new Set(managerDistributors.map((r: any) => r.associated_entity_id))
    ];

    distributorIds = returnAssigned
      ? distributorIds.filter((id) => managerDistributorIds.includes(id))
      : distributorIds.filter((id) => !managerDistributorIds.includes(id));

    const distributors = await UserRole.findAll({
      attributes: [
        [sequelize.col("user_id"), "userId"],
        [sequelize.col("associated_user_id"), "associatedUserId"],
        [sequelize.col("distributor.organization_name"), "name"]
      ],
      include: [
        {
          model: Distributor,
          attributes: [],
          as: "distributor",
          required: true
        }
      ],
      where: {
        associated_user_id: {
          [Op.in]: distributorIds
        },
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN
      },
      raw: true
    });

    return distributors;
  }

  public async updateManagerDistributorRelation(
    manufacturerId: number,
    managerId: number,
    distributorId: number
  ) {
    const distributors = await this.getDistributors(manufacturerId);

    const isDistributorUnderManufacturer = distributors.some(
      (dt: any) => distributorId == dt.associatedUserId
    );

    const existingMapping = await EntityAccessMapping.findOne({
      attributes: ["id"],
      where: {
        parent_entity_id: managerId,
        parent_entity_type: ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER,
        associated_entity_type: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associated_entity_id: distributorId
      },
      raw: true
    });

    if (existingMapping) {
      await EntityAccessMapping.destroy({
        where: { id: existingMapping.id }
      });

      return {
        status: "unassigned",
        id: distributorId
      };
    } else if (isDistributorUnderManufacturer) {
      await EntityAccessMapping.create({
        parentEntityId: managerId,
        parentEntityType: ENTITY_TYPE.MANUFACTURER_ACCOUNT_MANAGER,
        associatedEntityType: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedEntityId: distributorId,
        createdAt: new Date()
      });

      return {
        status: "assigned",
        id: distributorId
      };
    }

    // No changes made
    return {
      status: "no_action",
      id: null
    };
  }

  //get products by manufacturer id
  public async getProducts(manufacturerId: number) {
    const manufacturerIdWhere = manufacturerId
      ? { manufacturer_id: manufacturerId }
      : {};
    const products = await Product.findAll({
      attributes: [
        [sequelize.col("id"), "id"],
        [sequelize.col("name"), "name"],
        [sequelize.col("size"), "size"]
      ],
      where: {
        ...manufacturerIdWhere
      },
      raw: true
    });

    return products;
  }

  public async getStoreMonthlyPurchaseByDistributorId(
    distributorId: number,
    storeId: number,
    productIds: number[],
    currentYear: number
  ) {
    let productSKUsIds: string[] = [];

    if (productIds.length) {
      productSKUsIds =
        await StoreRepository.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
          productIds
        );
    }

    // Fetch purchase data aggregated by month
    const purchaseData: any[] = await LineItem.findAll({
      attributes: [
        [fn("TO_CHAR", col("transaction_date"), "YYYY-MM"), "month"],
        [fn("SUM", col("total_price")), "total_purchase"]
      ],
      where: {
        seller_id: distributorId,
        buyer_id: storeId,
        seller_type: ENTITY_TYPE.DISTRIBUTOR,
        buyer_type: ENTITY_TYPE.STORE,
        [Op.and]: [
          sequelize.where(
            fn("EXTRACT", literal("YEAR FROM transaction_date")),
            currentYear
          )
        ],
        product_id: {
          [Op.in]: productSKUsIds
        }
      },
      group: [fn("TO_CHAR", col("transaction_date"), "YYYY-MM")],
      raw: true
    });

    return purchaseData;
  }

  public async getDistributorSalesOverview({
    manufacturerId,
    distributorIds,
    salesRepIds,
    categoryId = null,
    startDate,
    endDate,
    groupBy = GROUP_PERIOD.DAY
  }: {
    manufacturerId: number;
    distributorIds: number[];
    salesRepIds: number[];
    categoryId?: number | null;
    startDate?: string;
    endDate?: string;
    groupBy?: GROUP_PERIOD;
  }) {
    startDate =
      startDate ??
      new Date(new Date().getFullYear(), 0, 1).toLocaleDateString(
        DATE_STRING_LOCALE
      );
    endDate = endDate ?? new Date().toLocaleDateString(DATE_STRING_LOCALE);

    const whereCondition: any = {
      deleted_at: null,
      sales_rep_id: { [Op.in]: salesRepIds ?? [] }
    };

    const productSKUsIds =
      await StoreRepository.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
        [],
        [manufacturerId],
        categoryId ?? undefined
      );

    // Initialize the base query options
    const queryOptions: any = {
      attributes: [
        [
          fn(
            "EXTRACT",
            literal(`${groupBy} FROM "SalesRepLineItem"."transaction_date"`)
          ),
          "groupPeriod"
        ],

        [fn("SUM", col("SalesRepLineItem.total_price")), "total_sales"],
        [fn("COUNT", fn("DISTINCT", col("store_id"))), "total_stores"]
      ],
      include: [
        {
          model: LineItem,
          as: "SalesRepLineItem",
          required: true,
          attributes: [],
          where: {
            deleted_at: null,
            product_id: {
              [Op.in]: productSKUsIds
            },
            seller_id: { [Op.in]: distributorIds },
            transaction_date: { [Op.between]: [startDate, endDate] },
            buyer_type: "STORE",
            seller_type: "DISTRIBUTOR"
          }
        }
      ],
      where: whereCondition,
      group: [
        "groupPeriod",
        ...(groupBy == GROUP_PERIOD.DAY
          ? [Sequelize.col("SalesRepLineItem.transaction_date")]
          : [])
      ],
      order: [
        [
          literal(`EXTRACT(MONTH FROM "SalesRepLineItem"."transaction_date")`),
          "ASC"
        ]
      ],
      raw: true
    };

    if (categoryId) {
      whereCondition["$SalesRepLineItem.product.category.id$"] = categoryId;
    }

    // Execute the query with the modified options
    const results = await StoreSalesRep.findAll(queryOptions);

    return results;
  }

  /**
   * Retrieves the number of distinct SKUs purchased by each store for a given manufacturer.
   *
   * This method queries the Transaction model to fetch the number of distinct SKUs
   * purchased by each store for the given manufacturer. The results are grouped by
   * store ID and include the store ID and the number of distinct SKUs.
   *
   * @param {number} manufacturerId - The ID of the manufacturer to retrieve the SKU count for.
   * @returns {Promise<{ buyer_id: number, sku_count: number }[]>} - A promise that resolves to an array of objects containing the store ID and the number of distinct SKUs purchased by the store.
   */
  public async getSkusPerStore(
    manufacturerId: number,
    distributorId: number | null,
    categoryId: string | null,
    startDate?: Date,
    endDate?: Date,
    managerId?: number,
    warehouseIds?: number[]
  ) {
    if (!startDate) {
      startDate = new Date(new Date().getFullYear(), 0, 1);
    }

    if (!endDate) {
      endDate = new Date();
    }

    if (useApiCaching) {
      const cacheKey = getCacheKey(
        "getSkusPerStore",
        manufacturerId.toString(),
        startDate.toString(),
        endDate.toString(),
        (categoryId ?? "all").toString(),
        (managerId ?? "all").toString(),
        distributorId?.toString() || "all"
      );

      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error("Cache error:", error);
      }
    }

    // Track SKUs fetch
    const skusSegment = newrelic.startSegment(
      "fetchProductSKUs",
      false,
      async () => {
        return await StoreRepository.getProductSKUsByProductIdsOrManufacturerIdOrCategoryId(
          [],
          !isNaN(manufacturerId) ? [manufacturerId] : [],
          categoryId ? parseInt(categoryId) : undefined
        );
      }
    );

    const skus = await skusSegment;

    const whereCondition: any = {
      seller_type: "DISTRIBUTOR",
      buyer_type: "STORE"
    };

    if (distributorId) {
      whereCondition["seller_id"] = distributorId;
    } else {
      // Track distributors fetch
      const distributorsSegment = newrelic.startSegment(
        "fetchDistributors",
        false,
        async () => {
          const distributors = await this.getDistributors(
            manufacturerId,
            distributorId,
            managerId
          );
          return distributors.map((dt: any) => dt.associatedUserId);
        }
      );
      whereCondition["seller_id"] = { [Op.in]: await distributorsSegment };
    }

    if (startDate && endDate) {
      whereCondition["transaction_date"] = {
        [Op.between]: [startDate, endDate]
      };
    }

    if (warehouseIds) {
      whereCondition["warehouse_id"] = { [Op.in]: warehouseIds };
    }

    const productsWhere = !isNaN(manufacturerId)
      ? { manufacturer_id: manufacturerId }
      : {};

    // Track SKU counts query
    const skuCountsSegment = newrelic.startSegment(
      "fetchSKUCountsPerStore",
      false,
      async () => {
        return await LineItem.findAll({
          attributes: [
            "LineItem.buyer_id",
            [
              Sequelize.fn(
                "COUNT",
                Sequelize.fn("DISTINCT", Sequelize.col("LineItem.skus_id"))
              ),
              "sku_count"
            ]
          ],
          include: [
            {
              model: Product,
              as: "product",
              attributes: [],
              required: true,
              on: sequelize.literal(
                `(("LineItem"."product_id" = "product"."unit_skus_id" AND "product"."primary_variant" = true) OR "LineItem"."product_id" IN ("product"."case_skus_id", "product"."box_skus_id"))`
              ),
              where: {
                ...productsWhere
              }
            }
          ],
          where: {
            ...whereCondition,
            product_id: skus
          },
          group: ["LineItem.buyer_id"],
          raw: true,
          subQuery: false
        });
      }
    );

    const skuCountsPerStore = await skuCountsSegment;

    if (useApiCaching && skuCountsPerStore.length > 0) {
      const cacheKey = getCacheKey(
        "getSkusPerStore",
        manufacturerId.toString(),
        startDate.toString(),
        endDate.toString(),
        (categoryId ?? "all").toString(),
        (managerId ?? "all").toString(),
        distributorId?.toString() || "all"
      );
      await redisClient.setEx(
        cacheKey,
        CACHE_TTL_TIME,
        JSON.stringify(skuCountsPerStore)
      );
    }

    return skuCountsPerStore;
  }

  /**
   * Retrieves the number of SKUs associated with each store for a given manufacturer (optimized version).
   * The result is a list of objects, each containing the store ID and the number of distinct SKUs.
   *
   * @param {number} manufacturerId - The ID of the manufacturer to retrieve the SKU count for.
   * @param {number | null} distributorId - Optional distributor ID to filter the data
   * @param {string | null} categoryId - Optional category ID to filter the data
   * @param {Date} [startDate] - Optional start date for filtering
   * @param {Date} [endDate] - Optional end date for filtering
   * @param {number} [managerId] - Optional manager ID for filtering
   * @param {number[]} [warehouseIds] - Optional warehouse IDs for filtering
   * @returns {Promise<{ buyer_id: number, sku_count: number }[]>} - A promise that resolves to an array of objects containing the store ID and the number of distinct SKUs purchased by the store.
   */
  public async getSkusPerStoreOptimized(
    manufacturerId: number,
    categoryId: string | null,
    startDate?: Date,
    endDate?: Date,
    managerId?: number,
    warehouseIds?: number[],
    distributorIds?: number[]
  ) {
    if (!startDate) {
      startDate = new Date(new Date().getFullYear(), 0, 1);
    }

    if (!endDate) {
      endDate = new Date();
    }

    if (useApiCaching) {
      const cacheKey = getCacheKey(
        "getSkusPerStoreOptimized",
        manufacturerId.toString(),
        startDate.toString(),
        endDate.toString(),
        (categoryId ?? "all").toString(),
        (managerId ?? "all").toString(),
        distributorIds?.toString() || "all"
      );

      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error("Cache error:", error);
      }
    }

    // SKU fetching is now handled directly by the materialized view
    // No need to fetch SKUs separately since line_items_products_joined_materialized_view
    // already contains all the necessary product and SKU information

    // All filtering is now handled directly in the materialized view query
    // No need for separate whereCondition and productsWhere objects

    // Track SKU counts query - ULTRA-OPTIMIZED VERSION using materialized view
    const skuCountsSegment = newrelic.startSegment(
      "fetchSKUCountsPerStoreOptimized",
      false,
      async () => {
        // Use the pre-joined materialized view for maximum performance
        const query = `
          SELECT 
            buyer_id,
            COUNT(DISTINCT product_id) as sku_count
          FROM line_items_products_joined_materialized_view
          WHERE manufacturer_id = :manufacturerId
            AND seller_type = 'DISTRIBUTOR'
            AND buyer_type = 'STORE'
            AND seller_id = ANY(ARRAY[:distributorIds])
            AND transaction_date::date BETWEEN :startDate AND :endDate
            ${warehouseIds ? "AND warehouse_id = ANY(ARRAY[:warehouseIds])" : ""}
          GROUP BY buyer_id
          ORDER BY buyer_id
        `;

        const replacements: any = {
          manufacturerId,
          distributorIds,
          startDate,
          endDate
        };

        if (warehouseIds) {
          replacements.warehouseIds = warehouseIds;
        }

        return await sequelize.query(query, {
          replacements,
          type: QueryTypes.SELECT
        });
      }
    );

    const skuCountsPerStore = await skuCountsSegment;

    if (useApiCaching && skuCountsPerStore.length > 0) {
      const cacheKey = getCacheKey(
        "getSkusPerStoreOptimized",
        manufacturerId.toString(),
        startDate.toString(),
        endDate.toString(),
        (categoryId ?? "all").toString(),
        (managerId ?? "all").toString(),
        distributorIds?.toString() || "all"
      );
      await redisClient.setEx(
        cacheKey,
        CACHE_TTL_TIME,
        JSON.stringify(skuCountsPerStore)
      );
    }

    return skuCountsPerStore;
  }

  /**
   * Retrieves the number of SKUs associated with each store for a given manufacturer (optimized version).
   * The result includes data for both current and previous periods.
   *
   * @param {number} manufacturerId - The ID of the manufacturer to retrieve the SKU count for.
   * @param {string | null} categoryId - Optional category ID to filter the data
   * @param {Date} [startDate] - Optional start date for current period filtering
   * @param {Date} [endDate] - Optional end date for current period filtering
   * @param {Date} [previousStartDate] - Optional start date for previous period filtering
   * @param {Date} [previousEndDate] - Optional end date for previous period filtering
   * @param {number} [managerId] - Optional manager ID for filtering
   * @param {number[]} [warehouseIds] - Optional warehouse IDs for filtering
   * @param {number[]} [distributorIds] - Optional distributor IDs for filtering
   * @returns {Promise<{ current: Array<{ buyer_id: number, sku_count: number }>, previous: Array<{ buyer_id: number, sku_count: number }> }>} - A promise that resolves to an object containing current and previous period data
   */
  public async getSkusPerStoreCombinedOptimized(
    manufacturerId: number,
    categoryId: string | null,
    startDate?: Date,
    endDate?: Date,
    previousStartDate?: Date,
    previousEndDate?: Date,
    managerId?: number,
    warehouseIds?: number[],
    distributorIds?: number[]
  ) {
    if (!startDate) {
      startDate = new Date(new Date().getFullYear(), 0, 1);
    }

    if (!endDate) {
      endDate = new Date();
    }

    // Calculate previous dates if not provided
    // if (!previousStartDate || !previousEndDate) {
    //   const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    //   previousEndDate = new Date(startDate.getTime() - 1);
    //   previousStartDate = new Date(previousEndDate.getTime() - (daysDiff * 24 * 60 * 60 * 1000));
    // }

    if (useApiCaching) {
      const cacheKey = getCacheKey(
        "getSkusPerStoreCombinedOptimized",
        manufacturerId.toString(),
        startDate.toString(),
        endDate.toString(),
        previousStartDate?.toString(),
        previousEndDate?.toString(),
        (categoryId ?? "all").toString(),
        (managerId ?? "all").toString(),
        distributorIds?.toString() || "all"
      );

      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error("Cache error:", error);
      }
    }

    // Track SKU counts query - ULTRA-OPTIMIZED VERSION using materialized view
    const skuCountsSegment = newrelic.startSegment(
      "fetchSKUCountsPerStoreOptimized",
      false,
      async () => {
        // Use UNION ALL to fetch both current and previous period data in a single query
        const query = `
        WITH current_period AS (
          SELECT 
            buyer_id,
            COUNT(DISTINCT product_id) as sku_count
          FROM line_items_products_joined_materialized_view
          WHERE manufacturer_id = :manufacturerId
            AND seller_type = 'DISTRIBUTOR'
            AND buyer_type = 'STORE'
            AND seller_id = ANY(ARRAY[:distributorIds])
            AND transaction_date::date BETWEEN :startDate AND :endDate
            ${warehouseIds ? "AND warehouse_id = ANY(ARRAY[:warehouseIds])" : ""}
          GROUP BY buyer_id
        ),
        previous_period AS (
          SELECT 
            buyer_id,
            COUNT(DISTINCT product_id) as sku_count
          FROM line_items_products_joined_materialized_view
          WHERE manufacturer_id = :manufacturerId
            AND seller_type = 'DISTRIBUTOR'
            AND buyer_type = 'STORE'
            AND seller_id = ANY(ARRAY[:distributorIds])
            AND transaction_date::date BETWEEN :previousStartDate AND :previousEndDate
            ${warehouseIds ? "AND warehouse_id = ANY(ARRAY[:warehouseIds])" : ""}
          GROUP BY buyer_id
        )
        SELECT 
          'current' as period,
          buyer_id,
          sku_count
        FROM current_period
        UNION ALL
        SELECT 
          'previous' as period,
          buyer_id,
          sku_count
        FROM previous_period
        ORDER BY period DESC, buyer_id
      `;

        const replacements: any = {
          manufacturerId,
          distributorIds,
          startDate,
          endDate,
          previousStartDate,
          previousEndDate
        };

        if (warehouseIds) {
          replacements.warehouseIds = warehouseIds;
        }

        return await sequelize.query(query, {
          replacements,
          type: QueryTypes.SELECT
        });
      }
    );

    const rawResults = await skuCountsSegment;

    // Transform the results into current and previous objects
    const result = {
      current: rawResults
        .filter((row: any) => row.period === "current")
        .map((row: any) => ({
          buyer_id: row.buyer_id,
          sku_count: row.sku_count
        })),
      previous: rawResults
        .filter((row: any) => row.period === "previous")
        .map((row: any) => ({
          buyer_id: row.buyer_id,
          sku_count: row.sku_count
        }))
    };

    if (
      useApiCaching &&
      (result.current.length > 0 || result.previous.length > 0)
    ) {
      const cacheKey = getCacheKey(
        "getSkusPerStoreOptimized",
        manufacturerId.toString(),
        startDate.toString(),
        endDate.toString(),
        previousStartDate?.toString(),
        previousEndDate?.toString(),
        (categoryId ?? "all").toString(),
        (managerId ?? "all").toString(),
        distributorIds?.toString() || "all"
      );
      await redisClient.setEx(cacheKey, CACHE_TTL_TIME, JSON.stringify(result));
    }

    return result;
  }

  // /**
  //  * Retrieves an overview of programs for a specific manufacturer.
  //  *
  //  * This method fetches a list of programs associated with the given manufacturer ID,
  //  * including details such as the program name, the number of completed compliances,
  //  * the total number of compliances, the total earned rebate, and the program's start
  //  * and end dates. The results are grouped by program ID and ordered by program name.
  //  *
  //  * @param manufacturerId The ID of the manufacturer for whom to retrieve the programs overview.
  //  * @param {number} [distributorId] - Optional ID of the distributor to filter the compliance details.
  //  * @returns A promise that resolves to an array of objects containing program details.
  //  */
  // public async getProgramsOverview(
  //   manufacturerId: number,
  //   distributorId?: number
  // ) {
  //   const distributorFilter = {
  //     ...(distributorId ? { entity_id: distributorId } : {})
  //   };

  //   const results = await Program.findAll({
  //     attributes: [
  //       ["name", "program_name"],
  //       [
  //         fn(
  //           "SUM",
  //           literal(
  //             'CASE WHEN "ProgramDetails->ProgramCompliances".is_qualified THEN 1 ELSE 0 END'
  //           )
  //         ),
  //         "completed"
  //       ],
  //       [
  //         fn("SUM", col("ProgramDetails.ProgramCompliances.earned_rebate")),
  //         "total_rebate"
  //       ],
  //       [Sequelize.col("ProgramDetails.id"), "program_detail_id"],
  //       [Sequelize.col("ProgramDetails.tier"), "tier"],
  //       "program_header",
  //       "start_date",
  //       "end_date"
  //     ],
  //     include: [
  //       {
  //         model: ProgramDetail,
  //         attributes: [],
  //         required: true,
  //         include: [
  //           {
  //             model: ProgramCompliance,
  //             attributes: [],
  //             required: false,
  //             where: {
  //               ...distributorFilter
  //             }
  //           }
  //         ]
  //       }
  //     ],
  //     where: {
  //       manufacturer_id: manufacturerId,
  //       participant_type: ENTITY_TYPE.DISTRIBUTOR
  //     },
  //     group: ["Program.id", "ProgramDetails.id"],
  //     order: [[col("name"), "ASC"]],
  //     raw: true
  //   });

  //   return results;
  // }

  public async count(participantType: string = "") {
    let participantTypeWhere = {};
    if (participantType) {
      participantTypeWhere = {
        participant_type: participantType
      };
    }
    return await Program.count({
      distinct: true,
      col: "manufacturer_id",
      where: {
        ...participantTypeWhere
      }
    });
  }

  public async getManufacturerDetails(
    manufacturerId: number,
    attributes: string[] = []
  ) {
    return await Manufacturer.findOne({
      where: { id: manufacturerId },
      attributes: attributes
    });
  }

  public async getAuthorizedManufacturers(
    distributorId?: number,
    distributorIds?: number[]
  ) {
    return await AuthorizedManufacturerDistributor.findAll({
      attributes: [
        "manufacturer_id",
        "distributor_id", // Keep this for safety
        [Sequelize.col("Manufacturer.name"), "name"],
        [Sequelize.col("Manufacturer.id"), "associatedUserId"],
        [Sequelize.col("Manufacturer.id"), "manufacturerId"]
      ],
      where: {
        distributor_id: distributorIds?.length
          ? { [Op.in]: distributorIds }
          : distributorId
      },
      include: [
        {
          model: Manufacturer,
          attributes: []
        }
      ],
      raw: true,
      group: [
        "manufacturer_id",
        "distributor_id",
        "Manufacturer.name",
        "Manufacturer.id"
      ]
    });
  }

  /**
   * Retrieves the IDs of authorized manufacturers for a given distributor.
   * @param {number} distributorId - The ID of the distributor.
   * @returns {Promise<{ manufacturerId: number }[]>} - A promise that resolves with an array of objects containing the manufacturer IDs.
   */
  public async getAuthorizedManufacturersIds(
    distributorId: number,
    excludeManufacturers?: number[],
    fetchManufacturerDetails?: boolean
  ) {
    const manufacturerWhere =
      excludeManufacturers && excludeManufacturers.length > 0
        ? { id: { [Op.notIn]: excludeManufacturers } }
        : {};
    const attributes: any[] = ["manufacturerId"];
    if (fetchManufacturerDetails) {
      attributes.push(
        [sequelize.col("Manufacturer.name"), "manufacturerName"],
        [sequelize.col("Manufacturer.logo"), "manufacturerLogo"]
      );
    }

    return await AuthorizedManufacturerDistributor.findAll({
      attributes,
      where: {
        distributor_id: distributorId
      },
      include: [
        {
          model: Manufacturer,
          attributes: [],
          where: { ...manufacturerWhere }
        }
      ],
      raw: true
    });
  }

  public async getLatestTransactionDateByManufacturersAndDistributors(
    distributorIds: number[],
    manufacturerIds?: number[]
  ) {
    const where = manufacturerIds
      ? { manufacturer_id: { [Op.in]: manufacturerIds } }
      : {};
    const result = await TransactionsImportRecord.findAll({
      attributes: [
        [
          Sequelize.fn("MAX", Sequelize.col("latest_transaction_date")),
          "latestTransactionDate"
        ]
      ],
      where: {
        ...where,
        distributor_id: { [Op.in]: distributorIds }
      },
      group: ["manufacturer_id", "distributor_id"],
      raw: true
    });

    if (!result || result?.length === 0) return null;

    // Find the min date among all the grouped max dates
    const minDate = result?.reduce((min, curr) => {
      const currDate = new Date(curr.latestTransactionDate);
      return currDate < min ? currDate : min;
    }, new Date(result[0].latestTransactionDate));

    return minDate;
  }

  public async getProductInsights(
    manufacturerId: number,
    startDate: Date,
    endDate: Date,
    distributorIds: number[],
    distributorId?: number
  ) {
    try {
      if (useApiCaching) {
        const cacheKey = getCacheKey(
          "getProductInsights",
          manufacturerId.toString(),
          startDate.toString(),
          endDate.toString(),
          distributorIds.toString(),
          distributorId?.toString() || "all"
        );

        try {
          const cached = await redisClient.get(cacheKey);
          if (cached) {
            return JSON.parse(cached);
          }
        } catch (error) {
          console.error("Cache error:", error);
        }
      }

      const whereClause: any = {
        transaction_date: {
          [Op.between]: [startDate, endDate]
        },
        manufacturer_id: manufacturerId
      };

      // Use specific distributor if provided
      if (distributorId) {
        whereClause.distributor_id = distributorId;
      } else if (distributorIds?.length) {
        whereClause.distributor_id = {
          [Op.in]: distributorIds
        };
      }

      const results = await SalesSummary.findAll({
        where: whereClause,
        order: [["transaction_date", "ASC"]]
      });

      if (useApiCaching && results.length > 0) {
        const cacheKey = getCacheKey(
          "getProductInsights",
          manufacturerId.toString(),
          startDate.toString(),
          endDate.toString(),
          distributorIds.toString(),
          distributorId?.toString() || "all"
        );
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(results)
        );
      }

      return results;
    } catch {
      return [];
    }
  }

  /**
   * Retrieves top products from the product_insights_aggregated_view materialized view.
   *
   * @param {number} manufacturerId - The ID of the manufacturer
   * @param {Date} startDate - The start date for the query
   * @param {Date} endDate - The end date for the query
   * @param {number[]} distributorIds - Array of distributor IDs (optional)
   * @param {number} distributorId - Specific distributor ID (optional)
   * @param {number} limit - Maximum number of products to return (default: 10)
   * @returns {Promise<any[]>} - Array of top products with aggregated data
   */
  public async getTopProductsFromAggregatedView(
    manufacturerId: number,
    startDate: Date,
    endDate: Date,
    distributorIds?: number[],
    distributorId?: number,
    limit: number = 10,
    prevYearStartDate?: Date,
    prevYearEndDate?: Date,
    selectedProductIds?: number[]
  ) {
    try {
      // Format dates for SQL
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      // Note: For consistency with regular API, we use the exact start date without adjusting for week boundaries

      // Build the WHERE clause for distributor filtering
      let distributorWhereClause = "";
      let totalStoresSubquery = "";

      if (
        distributorId !== undefined &&
        distributorId !== null &&
        distributorId > 0
      ) {
        distributorWhereClause = `AND distributor_id = ${distributorId}`;
        totalStoresSubquery = `
          (SELECT COUNT(DISTINCT ur.associated_user_id) 
           FROM user_roles ur 
           WHERE ur.parent_entity_id = ${distributorId}
             AND ur.parent_entity_type = 'DISTRIBUTOR' 
             AND ur.role = 'STORE')
        `;
      } else if (distributorIds && distributorIds.length > 0) {
        const distributorIdsStr = distributorIds.join(",");
        distributorWhereClause = `AND distributor_id IN (${distributorIdsStr})`;
        totalStoresSubquery = `
          (SELECT COUNT(DISTINCT ur.associated_user_id) 
           FROM user_roles ur 
           WHERE ur.parent_entity_id IN (${distributorIdsStr})
             AND ur.parent_entity_type = 'DISTRIBUTOR' 
             AND ur.role = 'STORE')
        `;
      } else {
        // If no specific distributors, get total stores for all distributors of this manufacturer
        totalStoresSubquery = `
          (SELECT COUNT(DISTINCT ur.associated_user_id) 
           FROM user_roles ur 
           INNER JOIN product_insights_aggregated_view piv ON ur.parent_entity_id = piv.distributor_id
           WHERE piv.manufacturer_id = ${manufacturerId}
             AND ur.parent_entity_type = 'DISTRIBUTOR' 
             AND ur.role = 'STORE')
        `;
      }

      // Build product filter if provided
      let productFilter = "";
      if (selectedProductIds && selectedProductIds.length > 0) {
        const productIdsStr = selectedProductIds.join(",");
        productFilter = `AND product_id IN (${productIdsStr})`;
      }

      // Handle week boundaries correctly for all month ranges
      // We need to include weeks that contain any transactions within the date range
      // not just weeks that start within the date range
      const weekFilter = this.generateWeekFilter(startDate, endDate);

      // OPTIMIZED: Use a more efficient query structure
      const currentYearQuery = `
        WITH product_aggregates AS (
          SELECT 
              product_id, 
              product_name, 
              SUM(total_units) as units, 
              SUM(total_sales) as sales, 
              COUNT(DISTINCT store_id) as unique_stores
          FROM product_insights_aggregated_view 
          WHERE manufacturer_id = ${manufacturerId}
            ${weekFilter}
            ${distributorWhereClause}
            ${productFilter}
          GROUP BY product_id, product_name
        ),
        total_stores_count AS (
          ${totalStoresSubquery}
        )
        SELECT 
            product_id as id, 
            product_name, 
            units, 
            sales, 
            unique_stores,
            ROUND(
                (unique_stores::decimal / 
                 (SELECT count FROM total_stores_count)) * 100, 2
            ) as store_penetration
        FROM product_aggregates
        ORDER BY sales DESC 
        LIMIT ${limit}
      `;

      const currentResults = await sequelize.query(currentYearQuery, {
        type: QueryTypes.SELECT
      });

      // Fetch previous year data if dates are provided
      let previousResults: any[] = [];
      if (prevYearStartDate && prevYearEndDate) {
        const prevYearStartStr = prevYearStartDate.toISOString().split("T")[0];
        const prevYearEndStr = prevYearEndDate.toISOString().split("T")[0];
        const prevStartYear = prevYearStartDate.getFullYear();
        const prevEndYear = prevYearEndDate.getFullYear();

        // Build dynamic WHERE clause for previous year with corrected week boundaries
        const prevWeekFilter = this.generateWeekFilter(
          prevYearStartDate,
          prevYearEndDate
        );

        // OPTIMIZED: Use the same efficient query structure for previous year
        const previousYearQuery = `
          WITH product_aggregates AS (
            SELECT 
                product_id, 
                product_name, 
                SUM(total_units) as units, 
                SUM(total_sales) as sales, 
                COUNT(DISTINCT store_id) as unique_stores
            FROM product_insights_aggregated_view 
            WHERE manufacturer_id = ${manufacturerId}
              ${prevWeekFilter}
              ${distributorWhereClause}
              ${productFilter}
            GROUP BY product_id, product_name
          ),
          total_stores_count AS (
            ${totalStoresSubquery}
          )
          SELECT 
              product_id as id, 
              product_name, 
              units, 
              sales, 
              unique_stores,
              ROUND(
                  (unique_stores::decimal / 
                   (SELECT count FROM total_stores_count)) * 100, 2
              ) as store_penetration
          FROM product_aggregates
          ORDER BY sales DESC 
          LIMIT ${limit}
        `;

        previousResults = await sequelize.query(previousYearQuery, {
          type: QueryTypes.SELECT
        });
      }

      return {
        current: currentResults,
        previous: previousResults
      };
    } catch (error) {
      console.error("Error fetching top products from aggregated view:", error);
      return {
        current: [],
        previous: []
      };
    }
  }

  public async getTopProductsFromAggregatedViewOptimized(
    manufacturerId: number,
    startDate: Date,
    endDate: Date,
    distributorIds?: number[],
    distributorId?: number,
    limit: number = 10,
    prevYearStartDate?: Date,
    prevYearEndDate?: Date,
    selectedProductIds?: number[]
  ) {
    try {
      const params: any = {
        manufacturerId,
        limit
      };

      let distributorCondition = "";
      let storeCountCondition = "";

      if (
        distributorId !== undefined &&
        distributorId !== null &&
        distributorId > 0
      ) {
        distributorCondition = "AND piv.distributor_id = :distributorId";
        storeCountCondition = "AND ur.parent_entity_id = :distributorId";
        params.distributorId = distributorId;
      } else if (distributorIds && distributorIds.length > 0) {
        distributorCondition = "AND piv.distributor_id IN (:distributorIds)";
        storeCountCondition = "AND ur.parent_entity_id IN (:distributorIds)";
        params.distributorIds = distributorIds;
      } else {
        storeCountCondition = `
          AND ur.parent_entity_id IN (
            SELECT DISTINCT distributor_id 
            FROM product_insights_aggregated_view 
            WHERE manufacturer_id = :manufacturerId
          )
        `;
      }

      let productCondition = "";
      if (selectedProductIds && selectedProductIds.length > 0) {
        productCondition = "AND piv.product_id IN (:selectedProductIds)";
        params.selectedProductIds = selectedProductIds;
      }

      const currentWeekFilter = this.generateWeekFilter(startDate, endDate);
      const prevWeekFilter =
        prevYearStartDate && prevYearEndDate
          ? this.generateWeekFilter(prevYearStartDate, prevYearEndDate)
          : "AND 1=0";

      // FIXED: Proper syntax for WHERE NOT EXISTS with CROSS JOIN
      const combinedQuery = `
        WITH total_stores AS (
          SELECT COUNT(DISTINCT ur.associated_user_id) as store_count
          FROM user_roles ur
          WHERE ur.parent_entity_type = 'DISTRIBUTOR'
            AND ur.role = 'STORE'
            ${storeCountCondition}
        ),
        all_data AS (
          SELECT 
            piv.product_id,
            piv.product_name,
            piv.total_units,
            piv.total_sales,
            piv.store_id,
            CASE 
              WHEN ${currentWeekFilter.replace("AND ", "")} THEN 'current'
              WHEN ${prevWeekFilter.replace("AND ", "")} THEN 'previous'
              ELSE NULL
            END as period
          FROM product_insights_aggregated_view piv
          WHERE piv.manufacturer_id = :manufacturerId
            ${distributorCondition}
            ${productCondition}
            AND (
              ${currentWeekFilter.replace("AND ", "")}
              OR ${prevWeekFilter.replace("AND ", "")}
            )
        ),
        product_metrics AS (
          SELECT 
            product_id,
            product_name,
            period,
            SUM(total_units) as units,
            SUM(total_sales) as sales,
            COUNT(DISTINCT store_id) as unique_stores
          FROM all_data
          WHERE period IS NOT NULL
          GROUP BY product_id, product_name, period
        ),
        top_products AS (
          SELECT product_id, product_name
          FROM product_metrics
          WHERE period = 'current'
          ORDER BY sales DESC
          LIMIT :limit
        ),
        combined_data AS (
          SELECT 
            pm.period,
            pm.product_id as id,
            pm.product_name,
            pm.units,
            pm.sales,
            pm.unique_stores,
            CASE 
              WHEN ts.store_count > 0 THEN
                ROUND((pm.unique_stores::decimal / ts.store_count) * 100, 2)
              ELSE 0
            END as store_penetration
          FROM product_metrics pm
          INNER JOIN top_products tp ON pm.product_id = tp.product_id
          CROSS JOIN total_stores ts
          
          UNION ALL
          
          SELECT 
            'previous' as period,
            tp.product_id as id,
            tp.product_name,
            0 as units,
            0 as sales,
            0 as unique_stores,
            0 as store_penetration
          FROM top_products tp
          CROSS JOIN total_stores ts
          WHERE NOT EXISTS (
            SELECT 1 FROM product_metrics pm
            WHERE pm.product_id = tp.product_id AND pm.period = 'previous'
          )
        )
        SELECT *
        FROM combined_data
        ORDER BY 
          CASE WHEN period = 'current' THEN 0 ELSE 1 END,
          sales DESC
      `;

      const results = await sequelize.query(combinedQuery, {
        replacements: params,
        type: QueryTypes.SELECT
      });

      const current = results
        .filter((row: any) => row.period === "current")
        .map(({ ...rest }) => rest);

      const previous = results
        .filter((row: any) => row.period === "previous")
        .map(({ ...rest }) => rest);

      return {
        current,
        previous
      };
    } catch (error) {
      console.error("Error fetching top products from aggregated view:", error);
      throw error;
    }
  }

  /**
   * Retrieves grouped sales data by week for multiple distributors for both current and previous periods
   * @param {number} manufacturerId - The ID of the manufacturer
   * @param {number[]} distributorIds - Array of distributor IDs
   * @param {Date} startDate - The start date for the current period
   * @param {Date} endDate - The end date for the current period
   * @param {Date} prevYearStartDate - The start date for the previous period
   * @param {Date} prevYearEndDate - The end date for the previous period
   * @param {number[]} selectedProductIds - Optional array of product IDs to filter
   * @returns {Promise<{current: any[], previous: any[]}>} - Object containing both current and previous period data
   */
  public async getGroupedSalesDataByWeekOptimized(
    manufacturerId: number,
    distributorIds: number[],
    startDate: Date,
    endDate: Date,
    prevYearStartDate: Date,
    prevYearEndDate: Date,
    selectedProductIds?: number[]
  ) {
    try {
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];
      const prevStartDateStr = prevYearStartDate.toISOString().split("T")[0];
      const prevEndDateStr = prevYearEndDate.toISOString().split("T")[0];
      const distributorIdsStr = distributorIds.join(",");

      let query: string;

      if (selectedProductIds && selectedProductIds.length > 0) {
        // When selectedProductIds are provided, group by week and product_id to get individual product data
        const productIdsStr = selectedProductIds.join(",");
        query = `
        WITH current_period AS (
          SELECT 
              'current' as period,
              DATE_TRUNC('week', transaction_date) AS week_start,
              product_id,
              SUM(sales) AS total_sales,
              SUM(total_units) AS total_units
          FROM sales_summary_materialized_view
          WHERE manufacturer_id = ${manufacturerId}
            AND distributor_id IN (${distributorIdsStr})
            AND transaction_date::date BETWEEN '${startDateStr}' AND '${endDateStr}'
            AND product_id IN (${productIdsStr})
          GROUP BY DATE_TRUNC('week', transaction_date), product_id
          HAVING DATE_TRUNC('week', transaction_date) >= '${startDateStr}'
        ),
        prev_period AS (
          SELECT 
              'previous' as period,
              DATE_TRUNC('week', transaction_date) AS week_start,
              product_id,
              SUM(sales) AS total_sales,
              SUM(total_units) AS total_units
          FROM sales_summary_materialized_view
          WHERE manufacturer_id = ${manufacturerId}
            AND distributor_id IN (${distributorIdsStr})
            AND transaction_date::date BETWEEN '${prevStartDateStr}' AND '${prevEndDateStr}'
            AND product_id IN (${productIdsStr})
          GROUP BY DATE_TRUNC('week', transaction_date), product_id
          HAVING DATE_TRUNC('week', transaction_date) >= '${prevStartDateStr}'
        )
        SELECT * FROM current_period
        UNION ALL
        SELECT * FROM prev_period
        ORDER BY period DESC, week_start, product_id
      `;
      } else {
        // When no selectedProductIds, aggregate all products together
        query = `
        WITH current_period AS (
          SELECT 
              'current' as period,
              DATE_TRUNC('week', transaction_date) AS week_start,
              SUM(sales) AS total_sales,
              SUM(total_units) AS total_units
          FROM sales_summary_materialized_view
          WHERE manufacturer_id = ${manufacturerId}
            AND distributor_id IN (${distributorIdsStr})
            AND transaction_date::date BETWEEN '${startDateStr}' AND '${endDateStr}'
          GROUP BY DATE_TRUNC('week', transaction_date)
          HAVING DATE_TRUNC('week', transaction_date) >= '${startDateStr}'
        ),
        prev_period AS (
          SELECT 
              'previous' as period,
              DATE_TRUNC('week', transaction_date) AS week_start,
              SUM(sales) AS total_sales,
              SUM(total_units) AS total_units
          FROM sales_summary_materialized_view
          WHERE manufacturer_id = ${manufacturerId}
            AND distributor_id IN (${distributorIdsStr})
            AND transaction_date::date BETWEEN '${prevStartDateStr}' AND '${prevEndDateStr}'
          GROUP BY DATE_TRUNC('week', transaction_date)
          HAVING DATE_TRUNC('week', transaction_date) >= '${prevStartDateStr}'
        )
        SELECT * FROM current_period
        UNION ALL
        SELECT * FROM prev_period
        ORDER BY period DESC, week_start
      `;
      }

      const results = await sequelize.query(query, {
        type: QueryTypes.SELECT
      });

      // Split results into current and previous
      const current = results
        .filter((r: any) => r.period === "current")
        .map((r: any) => {
          const { period, ...rest } = r;
          return rest;
        });

      const previous = results
        .filter((r: any) => r.period === "previous")
        .map((r: any) => {
          const { period, ...rest } = r;
          return rest;
        });

      return { current, previous };
    } catch (error) {
      console.error(
        "Error fetching grouped sales data by week for multiple distributors:",
        error
      );
      return { current: [], previous: [] };
    }
  }

  /**
   * Retrieves grouped sales data by month for multiple distributors for both current and previous periods
   * @param {number} manufacturerId - The ID of the manufacturer
   * @param {number[]} distributorIds - Array of distributor IDs
   * @param {Date} startDate - The start date for the current period
   * @param {Date} endDate - The end date for the current period
   * @param {Date} prevYearStartDate - The start date for the previous period
   * @param {Date} prevYearEndDate - The end date for the previous period
   * @param {number[]} selectedProductIds - Optional array of product IDs to filter
   * @returns {Promise<{current: any[], previous: any[]}>} - Object containing both current and previous period data
   */
  public async getGroupedSalesDataByMonthOptimized(
    manufacturerId: number,
    distributorIds: number[],
    startDate: Date,
    endDate: Date,
    prevYearStartDate: Date,
    prevYearEndDate: Date,
    selectedProductIds?: number[]
  ) {
    try {
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];
      const prevStartDateStr = prevYearStartDate.toISOString().split("T")[0];
      const prevEndDateStr = prevYearEndDate.toISOString().split("T")[0];
      const distributorIdsStr = distributorIds.join(",");

      // Get the first day of the start month for the CASE statement
      const startMonthFirstDay = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        1
      ).toISOString();

      const prevStartMonthFirstDay = new Date(
        prevYearStartDate.getFullYear(),
        prevYearStartDate.getMonth(),
        1
      ).toISOString();

      let query: string;

      if (selectedProductIds && selectedProductIds.length > 0) {
        // When selectedProductIds are provided, group by month and product_id to get individual product data
        const productIdsStr = selectedProductIds.join(",");
        query = `
        WITH current_period AS (
          SELECT 
              'current' as period,
              CASE 
                WHEN DATE_TRUNC('month', transaction_date) = '${startMonthFirstDay}'
                THEN '${startDateStr}'::timestamp
                ELSE DATE_TRUNC('month', transaction_date)
              END AS week_start,
              internal_product_id as product_id,
              SUM(total_price) AS total_sales,
              SUM(total_units) AS total_units
          FROM public.line_items_products_joined_materialized_view
          WHERE manufacturer_id = ${manufacturerId}
            AND seller_id IN (${distributorIdsStr})
            AND transaction_date::date BETWEEN '${startDateStr}' AND '${endDateStr}'
            AND internal_product_id IN (${productIdsStr})
          GROUP BY 
            CASE 
              WHEN DATE_TRUNC('month', transaction_date) = '${startMonthFirstDay}'
              THEN '${startDateStr}'::timestamp
              ELSE DATE_TRUNC('month', transaction_date)
            END,
            internal_product_id
        ),
        prev_period AS (
          SELECT 
              'previous' as period,
              CASE 
                WHEN DATE_TRUNC('month', transaction_date) = '${prevStartMonthFirstDay}'
                THEN '${prevStartDateStr}'::timestamp
                ELSE DATE_TRUNC('month', transaction_date)
              END AS week_start,
              internal_product_id as product_id,
              SUM(total_price) AS total_sales,
              SUM(total_units) AS total_units
          FROM public.line_items_products_joined_materialized_view
          WHERE manufacturer_id = ${manufacturerId}
            AND seller_id IN (${distributorIdsStr})
            AND transaction_date::date BETWEEN '${prevStartDateStr}' AND '${prevEndDateStr}'
            AND internal_product_id IN (${productIdsStr})
          GROUP BY 
            CASE 
              WHEN DATE_TRUNC('month', transaction_date) = '${prevStartMonthFirstDay}'
              THEN '${prevStartDateStr}'::timestamp
              ELSE DATE_TRUNC('month', transaction_date)
            END,
            internal_product_id
        )
        SELECT * FROM current_period
        UNION ALL
        SELECT * FROM prev_period
        ORDER BY period DESC, week_start, product_id
      `;
      } else {
        // When no selectedProductIds, aggregate all products together
        query = `
        WITH current_period AS (
          SELECT 
              'current' as period,
              CASE 
                WHEN DATE_TRUNC('month', transaction_date) = '${startMonthFirstDay}'
                THEN '${startDateStr}'::timestamp
                ELSE DATE_TRUNC('month', transaction_date)
              END AS week_start,
              internal_product_id as product_id,
              SUM(total_price) AS total_sales,
              SUM(total_units) AS total_units
          FROM public.line_items_products_joined_materialized_view
          WHERE manufacturer_id = ${manufacturerId}
            AND seller_id IN (${distributorIdsStr})
             AND transaction_date::date BETWEEN '${startDateStr}' AND '${endDateStr}'
          GROUP BY 
            CASE 
              WHEN DATE_TRUNC('month', transaction_date) = '${startMonthFirstDay}'
              THEN '${startDateStr}'::timestamp
              ELSE DATE_TRUNC('month', transaction_date)
            END,
            internal_product_id
        ),
        prev_period AS (
          SELECT 
              'previous' as period,
              CASE 
                WHEN DATE_TRUNC('month', transaction_date) = '${prevStartMonthFirstDay}'
                THEN '${prevStartDateStr}'::timestamp
                ELSE DATE_TRUNC('month', transaction_date)
              END AS week_start,
              internal_product_id as product_id,
              SUM(total_price) AS total_sales,
              SUM(total_units) AS total_units
          FROM public.line_items_products_joined_materialized_view
          WHERE manufacturer_id = ${manufacturerId}
            AND seller_id IN (${distributorIdsStr})
            AND transaction_date::date BETWEEN '${prevStartDateStr}' AND '${prevEndDateStr}'
          GROUP BY 
            CASE 
              WHEN DATE_TRUNC('month', transaction_date) = '${prevStartMonthFirstDay}'
              THEN '${prevStartDateStr}'::timestamp
              ELSE DATE_TRUNC('month', transaction_date)
            END,
            internal_product_id
        )
        SELECT * FROM current_period
        UNION ALL
        SELECT * FROM prev_period
        ORDER BY period DESC, week_start, product_id
      `;
      }

      const results = await sequelize.query(query, {
        type: QueryTypes.SELECT
      });

      // Split results into current and previous
      const current = results
        .filter((r: any) => r.period === "current")
        .map((r: any) => {
          const { period, ...rest } = r;
          return rest;
        });

      const previous = results
        .filter((r: any) => r.period === "previous")
        .map((r: any) => {
          const { period, ...rest } = r;
          return rest;
        });

      return { current, previous };
    } catch (error) {
      console.error(
        "Error fetching grouped sales data by month for multiple distributors:",
        error
      );
      return { current: [], previous: [] };
    }
  }

  /**
   * Retrieves store penetration data for multiple distributors for both current and previous periods
   * @param {number} manufacturerId - The ID of the manufacturer
   * @param {number[]} distributorIds - Array of distributor IDs
   * @param {Date} startDate - The start date for the current period
   * @param {Date} endDate - The end date for the current period
   * @param {Date} prevYearStartDate - The start date for the previous period
   * @param {Date} prevYearEndDate - The end date for the previous period
   * @param {boolean} isDaily - Whether to fetch daily data (for month range 1) or monthly data
   * @param {number[]} selectedProductIds - Optional array of product IDs to filter
   * @returns {Promise<{current: any[], previous: any[]}>} - Object containing both current and previous period data
   */
  public async getStorePenetrationDataOptimized(
    manufacturerId: number,
    distributorIds: number[],
    startDate: Date,
    endDate: Date,
    prevYearStartDate: Date,
    prevYearEndDate: Date,
    isDaily: boolean = false,
    selectedProductIds?: number[]
  ) {
    try {
      // Use date-only format (YYYY-MM-DD) for date comparisons with ::date casting
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];
      const prevStartDateStr = prevYearStartDate.toISOString().split("T")[0];
      const prevEndDateStr = prevYearEndDate.toISOString().split("T")[0];
      const distributorIdsStr = distributorIds.join(",");

      let dateTrunc: string;
      let groupBy: string;
      let dateField: string;

      if (isDaily) {
        dateTrunc = "DATE_TRUNC('day', transaction_date)";
        groupBy = "DATE_TRUNC('day', transaction_date)";
        dateField = "day";
      } else {
        dateTrunc = "DATE_TRUNC('month', transaction_date)";
        groupBy = "DATE_TRUNC('month', transaction_date)";
        dateField = "month";
      }

      // Build product filter if provided
      let productFilter = "";
      if (selectedProductIds && selectedProductIds.length > 0) {
        const productIdsStr = selectedProductIds.join(",");
        productFilter = `AND internal_product_id IN (${productIdsStr})`;
      }

      const query = `
      WITH current_period_buyers AS (
          SELECT 
              ${dateTrunc} AS ${dateField},
              buyer_id,
              ${selectedProductIds && selectedProductIds.length > 0 ? "internal_product_id as product_id" : "NULL as product_id"}
          FROM public.line_items_products_joined_materialized_view
          WHERE manufacturer_id = ${manufacturerId}
            AND seller_id IN (${distributorIdsStr})
             AND transaction_date::date BETWEEN '${startDateStr}' AND '${endDateStr}'
            ${productFilter}
          GROUP BY ${groupBy}, buyer_id${selectedProductIds && selectedProductIds.length > 0 ? ", internal_product_id" : ""}
      ),
      current_period_sales AS (
          SELECT 
              ${dateTrunc} AS ${dateField},
              SUM(total_price) AS total_sales,
              ${selectedProductIds && selectedProductIds.length > 0 ? "internal_product_id as product_id" : "NULL as product_id"}
          FROM public.line_items_products_joined_materialized_view
          WHERE manufacturer_id = ${manufacturerId}
            AND seller_id IN (${distributorIdsStr})
            AND transaction_date::date BETWEEN '${startDateStr}' AND '${endDateStr}'
            ${productFilter}
          GROUP BY ${groupBy}${selectedProductIds && selectedProductIds.length > 0 ? ", internal_product_id" : ""}
      ),
      prev_period_buyers AS (
          SELECT 
              ${dateTrunc} AS ${dateField},
              buyer_id,
              ${selectedProductIds && selectedProductIds.length > 0 ? "internal_product_id as product_id" : "NULL as product_id"}
          FROM public.line_items_products_joined_materialized_view
          WHERE manufacturer_id = ${manufacturerId}
            AND seller_id IN (${distributorIdsStr})
            AND transaction_date::date BETWEEN '${prevStartDateStr}' AND '${prevEndDateStr}'
            ${productFilter}
          GROUP BY ${groupBy}, buyer_id${selectedProductIds && selectedProductIds.length > 0 ? ", internal_product_id" : ""}
      ),
      prev_period_sales AS (
          SELECT 
              ${dateTrunc} AS ${dateField},
              SUM(total_price) AS total_sales,
              ${selectedProductIds && selectedProductIds.length > 0 ? "internal_product_id as product_id" : "NULL as product_id"}
          FROM public.line_items_products_joined_materialized_view
          WHERE manufacturer_id = ${manufacturerId}
            AND seller_id IN (${distributorIdsStr})
           AND transaction_date::date BETWEEN '${prevStartDateStr}' AND '${prevEndDateStr}'
            ${productFilter}
          GROUP BY ${groupBy}${selectedProductIds && selectedProductIds.length > 0 ? ", internal_product_id" : ""}
      ),
      current_results AS (
          SELECT 
              'current' as period,
              ms.${dateField},
              ms.total_sales,
              COUNT(DISTINCT mb.buyer_id) AS cumulative_buyers,
              ${selectedProductIds && selectedProductIds.length > 0 ? "ms.product_id" : "NULL as product_id"}
          FROM current_period_sales ms
          JOIN current_period_buyers mb 
            ON mb.${dateField} <= ms.${dateField}
            ${selectedProductIds && selectedProductIds.length > 0 ? "AND mb.product_id = ms.product_id" : ""}
          GROUP BY ms.${dateField}, ms.total_sales${selectedProductIds && selectedProductIds.length > 0 ? ", ms.product_id" : ""}
      ),
      prev_results AS (
          SELECT 
              'previous' as period,
              ms.${dateField},
              ms.total_sales,
              COUNT(DISTINCT mb.buyer_id) AS cumulative_buyers,
              ${selectedProductIds && selectedProductIds.length > 0 ? "ms.product_id" : "NULL as product_id"}
          FROM prev_period_sales ms
          JOIN prev_period_buyers mb 
            ON mb.${dateField} <= ms.${dateField}
            ${selectedProductIds && selectedProductIds.length > 0 ? "AND mb.product_id = ms.product_id" : ""}
          GROUP BY ms.${dateField}, ms.total_sales${selectedProductIds && selectedProductIds.length > 0 ? ", ms.product_id" : ""}
      )
      SELECT * FROM current_results
      UNION ALL
      SELECT * FROM prev_results
      ORDER BY period DESC, ${dateField}${selectedProductIds && selectedProductIds.length > 0 ? ", product_id" : ""}
    `;

      const results = await sequelize.query(query, {
        type: QueryTypes.SELECT
      });

      // Split results into current and previous
      const current = results
        .filter((r: any) => r.period === "current")
        .map((r: any) => {
          const { period, ...rest } = r;
          return rest;
        });

      const previous = results
        .filter((r: any) => r.period === "previous")
        .map((r: any) => {
          const { period, ...rest } = r;
          return rest;
        });

      return { current, previous };
    } catch (error) {
      console.error(
        "Error fetching store penetration data for multiple distributors:",
        error
      );
      return { current: [], previous: [] };
    }
  }

  /**
   * Retrieves units data by month for multiple distributors for both current and previous periods
   * @param {number} manufacturerId - The ID of the manufacturer
   * @param {number[]} distributorIds - Array of distributor IDs
   * @param {Date} startDate - The start date for the current period
   * @param {Date} endDate - The end date for the current period
   * @param {Date} prevYearStartDate - The start date for the previous period
   * @param {Date} prevYearEndDate - The end date for the previous period
   * @returns {Promise<{current: any[], previous: any[]}>} - Object containing both current and previous period data
   */
  public async getUnitsDataByMonthOptimized(
    manufacturerId: number,
    distributorIds: number[],
    startDate: Date,
    endDate: Date,
    prevYearStartDate: Date,
    prevYearEndDate: Date
  ) {
    try {
      const startDateStr = startDate;
      const endDateStr = endDate;
      const prevStartDateStr = prevYearStartDate;
      const prevEndDateStr = prevYearEndDate;
      const distributorIdsStr = distributorIds.join(",");

      const query = `
      WITH current_period AS (
        SELECT 
            'current' as period,
            DATE_TRUNC('month', transaction_date) AS week_start,
            SUM(total_units) AS total_units
        FROM public.line_items_products_joined_materialized_view
        WHERE manufacturer_id = ${manufacturerId}
          AND seller_id IN (${distributorIdsStr})
          AND transaction_date::date BETWEEN '${startDateStr}' AND '${endDateStr}'
        GROUP BY DATE_TRUNC('month', transaction_date)
      ),
      prev_period AS (
        SELECT 
            'previous' as period,
            DATE_TRUNC('month', transaction_date) AS week_start,
            SUM(total_units) AS total_units
        FROM public.line_items_products_joined_materialized_view
        WHERE manufacturer_id = ${manufacturerId}
          AND seller_id IN (${distributorIdsStr})
          AND transaction_date::date BETWEEN '${prevStartDateStr}' AND '${prevEndDateStr}'
        GROUP BY DATE_TRUNC('month', transaction_date)
      )
      SELECT * FROM current_period
      UNION ALL
      SELECT * FROM prev_period
      ORDER BY period DESC, week_start
    `;

      const results = await sequelize.query(query, {
        type: QueryTypes.SELECT
      });

      // Split results into current and previous
      const current = results
        .filter((r: any) => r.period === "current")
        .map((r: any) => {
          const { period, ...rest } = r;
          return rest;
        });

      const previous = results
        .filter((r: any) => r.period === "previous")
        .map((r: any) => {
          const { period, ...rest } = r;
          return rest;
        });

      return { current, previous };
    } catch (error) {
      console.error(
        "Error fetching units data by month for multiple distributors:",
        error
      );
      return { current: [], previous: [] };
    }
  }

  /**
   * Retrieves units data by week for multiple distributors for both current and previous periods
   * @param {number} manufacturerId - The ID of the manufacturer
   * @param {number[]} distributorIds - Array of distributor IDs
   * @param {Date} startDate - The start date for the current period
   * @param {Date} endDate - The end date for the current period
   * @param {Date} prevYearStartDate - The start date for the previous period
   * @param {Date} prevYearEndDate - The end date for the previous period
   * @param {number[]} selectedProductIds - Optional array of product IDs to filter
   * @returns {Promise<{current: any[], previous: any[]}>} - Object containing both current and previous period data
   */
  public async getUnitsDataByWeekOptimized(
    manufacturerId: number,
    distributorIds: number[],
    startDate: Date,
    endDate: Date,
    prevYearStartDate: Date,
    prevYearEndDate: Date,
    selectedProductIds?: number[]
  ) {
    try {
      const startDateStr = startDate.toISOString();
      const endDateStr = endDate.toISOString();
      const prevStartDateStr = prevYearStartDate.toISOString();
      const prevEndDateStr = prevYearEndDate.toISOString();
      const distributorIdsStr = distributorIds.join(",");

      const query = `
      WITH current_period AS (
        SELECT 
            'current' as period,
            DATE_TRUNC('week', transaction_date) AS week_start,
            SUM(total_units) AS total_units
        FROM sales_summary_materialized_view
        WHERE manufacturer_id = ${manufacturerId}
          AND distributor_id IN (${distributorIdsStr})
          AND transaction_date BETWEEN '${startDateStr}' 
                                   AND '${endDateStr}'
        GROUP BY DATE_TRUNC('week', transaction_date)
      ),
      prev_period AS (
        SELECT 
            'previous' as period,
            DATE_TRUNC('week', transaction_date) AS week_start,
            SUM(total_units) AS total_units
        FROM sales_summary_materialized_view
        WHERE manufacturer_id = ${manufacturerId}
          AND distributor_id IN (${distributorIdsStr})
          AND transaction_date BETWEEN '${prevStartDateStr}' 
                                   AND '${prevEndDateStr}'
        GROUP BY DATE_TRUNC('week', transaction_date)
      )
      SELECT * FROM current_period
      UNION ALL
      SELECT * FROM prev_period
      ORDER BY period DESC, week_start
    `;

      const results = await sequelize.query(query, {
        type: QueryTypes.SELECT
      });

      // Split results into current and previous
      const current = results
        .filter((r: any) => r.period === "current")
        .map((r: any) => {
          const { period, ...rest } = r;
          return rest;
        });

      const previous = results
        .filter((r: any) => r.period === "previous")
        .map((r: any) => {
          const { period, ...rest } = r;
          return rest;
        });

      return { current, previous };
    } catch (error) {
      console.error(
        "Error fetching units data by week for multiple distributors:",
        error
      );
      return { current: [], previous: [] };
    }
  }

  /**
   * Retrieves unique active stores data for both overall and filtered products from the materialized view
   * @param {number} manufacturerId - The ID of the manufacturer
   * @param {Date} startDate - The start date for the query
   * @param {Date} endDate - The end date for the query
   * @param {number[]} distributorIds - Array of distributor IDs (for multiple distributors)
   * @param {number} distributorId - Single distributor ID
   * @param {number[]} filteredProductIds - Array of product IDs to filter by for filtered metrics
   * @param {Date} prevYearStartDate - Previous year start date
   * @param {Date} prevYearEndDate - Previous year end date
   * @returns {Promise<{overall: {current: number, previous: number}, filtered: {current: number, previous: number}}>} - Overall and filtered unique store counts for both periods
   */
  public async getUniqueActiveStoresDataCombined(
    manufacturerId: number,
    startDate: Date,
    endDate: Date,
    distributorIds: number[],
    distributorId?: number,
    filteredProductIds?: number[],
    prevYearStartDate?: Date,
    prevYearEndDate?: Date
  ) {
    try {
      // Format dates for SQL
      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      // Build the WHERE clause for distributor filtering
      let distributorWhereClause = "";
      if (
        distributorId !== undefined &&
        distributorId !== null &&
        distributorId > 0
      ) {
        distributorWhereClause = `AND distributor_id = ${distributorId}`;
      } else if (distributorIds && distributorIds.length > 0) {
        const distributorIdsStr = distributorIds.join(",");
        distributorWhereClause = `AND distributor_id IN (${distributorIdsStr})`;
      }

      // Build product filter if provided
      let productFilter = "";
      if (filteredProductIds && filteredProductIds.length > 0) {
        const productIdsStr = filteredProductIds.join(",");
        productFilter = `AND product_id IN (${productIdsStr})`;
      }

      // Handle dynamic week boundaries for year-end transitions
      const weekFilter = this.generateWeekFilter(startDate, endDate);

      // Build the combined query
      let query = `
      WITH overall_current AS (
        SELECT 
          'overall_current' as metric_type,
          COUNT(DISTINCT store_id) as unique_stores
        FROM product_insights_aggregated_view
        WHERE manufacturer_id = ${manufacturerId}
          ${weekFilter}
          ${distributorWhereClause}
      ),
      filtered_current AS (
        SELECT 
          'filtered_current' as metric_type,
          COUNT(DISTINCT store_id) as unique_stores
        FROM product_insights_aggregated_view
        WHERE manufacturer_id = ${manufacturerId}
          ${weekFilter}
          ${distributorWhereClause}
          ${productFilter}
      )`;

      // Add previous year CTEs if dates are provided
      if (prevYearStartDate && prevYearEndDate) {
        const prevYearStartStr = prevYearStartDate.toISOString().split("T")[0];
        const prevYearEndStr = prevYearEndDate.toISOString().split("T")[0];
        const prevWeekFilter = this.generateWeekFilter(
          prevYearStartDate,
          prevYearEndDate
        );

        query += `,
      overall_previous AS (
        SELECT 
          'overall_previous' as metric_type,
          COUNT(DISTINCT store_id) as unique_stores
        FROM product_insights_aggregated_view
        WHERE manufacturer_id = ${manufacturerId}
          ${prevWeekFilter}
          ${distributorWhereClause}
      ),
      filtered_previous AS (
        SELECT 
          'filtered_previous' as metric_type,
          COUNT(DISTINCT store_id) as unique_stores
        FROM product_insights_aggregated_view
        WHERE manufacturer_id = ${manufacturerId}
          ${prevWeekFilter}
          ${distributorWhereClause}
          ${productFilter}
      )`;

        query += `
      SELECT * FROM overall_current
      UNION ALL
      SELECT * FROM filtered_current
      UNION ALL
      SELECT * FROM overall_previous
      UNION ALL
      SELECT * FROM filtered_previous
      `;
      } else {
        query += `
      SELECT * FROM overall_current
      UNION ALL
      SELECT * FROM filtered_current
      `;
      }

      const results = (await sequelize.query(query, {
        type: QueryTypes.SELECT
      })) as any[];

      // Parse results
      const overallCurrent =
        results.find((r) => r.metric_type === "overall_current")
          ?.unique_stores || 0;
      const filteredCurrent =
        results.find((r) => r.metric_type === "filtered_current")
          ?.unique_stores || 0;
      const overallPrevious =
        results.find((r) => r.metric_type === "overall_previous")
          ?.unique_stores || 0;
      const filteredPrevious =
        results.find((r) => r.metric_type === "filtered_previous")
          ?.unique_stores || 0;

      return {
        overall: {
          current: overallCurrent,
          previous: overallPrevious
        },
        filtered: {
          current: filteredCurrent,
          previous: filteredPrevious
        }
      };
    } catch (error) {
      console.error("Error fetching unique active stores data:", error);
      return {
        overall: {
          current: 0,
          previous: 0
        },
        filtered: {
          current: 0,
          previous: 0
        }
      };
    }
  }
}

export default new ManufacturerRepository();
