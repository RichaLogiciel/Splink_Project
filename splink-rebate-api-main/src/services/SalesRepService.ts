import newrelic from "newrelic";
import {
  DISTRIBUTOR_IDS,
  DISTRIBUTORS,
  ENTITY_TYPE,
  PROGRAM_TIMELINE,
  PROGRAM_TYPE,
  SALES_REP,
  SalesRepSpiffProgramsDetailCriteria
} from "../config/appConstants";
import { ApiError } from "../lib/errors/APIError";
import logger from "../lib/logger";
import sequelize from "../db";
import { QueryTypes } from "sequelize";
import LineItem from "../models/LineItem";
import Manufacturer from "../models/Manufacturer";
import Product from "../models/Product";
import ProductCodeMapping from "../models/ProductCodeMapping";
import Program from "../models/Program";
import ProgramDetail from "../models/ProgramDetail";
import Store from "../models/Store";
import StoreSalesRep from "../models/StoreSalesRep";
import UserRole from "../models/UserRole";
import Warehouse from "../models/Warehouse";
import DistributorRepository from "../repositories/DistributorRepository";
import ManufacturerRepository from "../repositories/ManufacturerRepository";
import ProgramProductRepository from "../repositories/ProgramProductRepository";
import ProgramRepository from "../repositories/ProgramRepository";
import SalesRepRepository from "../repositories/SalesRepRepository";
import StoreRepository from "../repositories/StoreRepository";
import StoreVoidFillTargetRepository from "../repositories/StoreVoidFillTargetRepository";
import { SalesRepKeyMetrics } from "../types/KeyMetricsTypes";
import {
  ManufacturerTierDetail,
  SalesRepEaring,
  SPIFFOpportunityModalData,
  SPIFFOpportunityTierDetails
} from "../types/SalesRepTypes";
import { StoreProgramOverviewData } from "../types/StoreProgramTypes";
import {
  SpiffEarningManufacturerProgramDetail,
  SpiffEarningStoreDetail,
  SpiffEarningStoreManufacturerDetail
} from "../types/StoreTypes";
import {
  getEnvironment,
  getTierToAchieve,
  getActiveInternalCode,
  updateProductInternalCodesByPurchasedItems,
  resolveProductName
} from "../utils/helpers";
import { overrideProgramDetailOverviewText } from "../utils/programHelper";
import { getCurrentUser } from "../utils/requestContext";
import DistributorService from "./DistributorService";
import StoreService from "./StoreService";

// Interface for compliance data returned from repository
type NearComplianceGroupedPrograms = {
  [manufacturerId: number]: {
    [storeId: number]: any[];
  };
};

interface NearComplianceProgramData {
  manufacturer_id: number;
  manufacturer_name: string;
  program_id: number;
  program_detail_id: number;
  program_name: string;
  compliance_percentage: number;
  missing_products?: any;
  purchased_products?: any;
  earning_opportunity: number;
  manufacturer: {
    id: number;
    name: string;
    avatar: string;
    authorized: boolean;
  };
}

interface NearComplianceStoreData {
  store_id: number;
  store_name: string;
  programs: NearComplianceProgramData[];
}

class SalesRepDashboardService {
  /**
   * Retrieves the key metrics for a salesRep.
   * The key metrics include:
   * - Total Savings
   * - Stores Count
   * - Stores Program Count
   * @param {number} salesRepId The ID of the salesRep
   * @returns {Promise<SalesRepKeyMetrics>} The key metrics data including total earning, total stores count, and total stores program count
   */
  public async getKeyMetrics(
    salesRepId: number,
    loggedInUser: UserRole
  ): Promise<SalesRepKeyMetrics> {
    const [
      rebateResponse,
      pendingPayoutRebateResponse,
      storesCount,
      authorizedManufacturers
      // ,activeStores
    ] = await Promise.all([
      DistributorRepository.getTotalEarnedRebate(
        salesRepId,
        ENTITY_TYPE.SALES_REP,
        loggedInUser,
        PROGRAM_TIMELINE.CURRENT
      ),
      DistributorRepository.getTotalEarnedRebate(
        salesRepId,
        ENTITY_TYPE.SALES_REP,
        loggedInUser,
        PROGRAM_TIMELINE.HISTORICAL
      ),
      SalesRepRepository.getTotalStore(salesRepId),
      ManufacturerRepository.getAuthorizedManufacturers(
        loggedInUser.parentEntityId
      )
      // ,SalesRepRepository.getTotalActiveStores(salesRepId)
    ]);

    const distributorIds = [loggedInUser.parentEntityId];

    // get excluded program_detail_ids using related distributor ids
    const excludedProgramDetailIds =
      await ProgramRepository.getExcludedProgramDetailIds(distributorIds);

    const manufacturerIds = authorizedManufacturers?.map((au) =>
      parseInt(au.manufacturerId)
    );

    // get programs using manufacturer and excluded program_detail_ids
    const programs = await ProgramRepository.getProgramsByParticipantType({
      participantType: ENTITY_TYPE.STORE,
      authorizedManufacturerIds: manufacturerIds,
      excludedProgramDetailIds,
      distributorId: loggedInUser.parentEntityId
    });

    // get the manufacturer ids for only which have the any pprogram enabled
    const enabledManufacturerIds = new Set(
      programs.map(
        (pro) => pro?.Manufacturer?.id ?? pro?.Manufacturer?.get("id") ?? 0
      )
    );

    const totalEarning = rebateResponse as number;
    const totalStores = storesCount as number;
    const totalStoreProgram = enabledManufacturerIds.size as number;
    // const totalActiveStores = activeStores as number;
    const totalActiveStores = 0;
    const pendingPayoutEarning = pendingPayoutRebateResponse as number;

    return {
      totalEarning,
      pendingPayoutEarning,
      totalStores,
      totalStoreProgram,
      totalActiveStores
    };
  }

  /**
   * Retrieves the earnings overview for a salesRep.
   * The earnings overview contains an array of objects, each containing
   * the manufacturer name, total earned rebate, and total earned rebate as a percentage.
   * @param {number} salesRepId The ID of the salesRep
   * @returns {Promise<SalesRepEaring[]>} An array of objects containing the manufacturer name, total earned rebate, and total earned rebate as a percentage
   */
  public async getSalesRepEarningsOverview(
    salesRepId: number,
    distributorId: number
  ): Promise<SalesRepEaring[]> {
    const excludedProgramIds =
      await ProgramRepository.getExcludedProgramIds(distributorId);
    const salesRepEarnings: SalesRepEaring[] =
      await SalesRepRepository.getTotalEarnedRebateByManufacturer(
        distributorId,
        salesRepId,
        ENTITY_TYPE.SALES_REP,
        excludedProgramIds
      );

    return salesRepEarnings;
  }

  /**
   * Retrieves the store program overview data for a given sales representative.
   *
   * This function makes an API call to retrieve the top and bottom performing
   * programs for the sales representative's stores, grouped by manufacturers.
   *
   * @param {number} salesRepId - The ID of the sales representative for whom
   * the store program overview data is to be fetched.
   * @returns {Promise<StoreProgramOverviewData>} - A promise that resolves to the store program
   * overview data, or null if an error occurs.
   */
  public async getSalesRepStoreProgramOverview(
    salesRepId: number
  ): Promise<StoreProgramOverviewData> {
    return await DistributorService.getStoreProgramOverview(0, salesRepId);
  }

  /**
   * Retrieves the top 3 stores with products in the wishlist for a sales
   * representative.
   * @param {number} salesRepId The ID of the sales representative
   * @returns {Promise<StoreWithWishlistProduct[]>} The top 3 stores with
   * products in the wishlist for the sales representative
   */
  public async getWishlistProduct(salesRepId: number) {
    const storesWithWishlistProducts =
      await SalesRepRepository.getStoresWithWishlistProducts(salesRepId);
    return storesWithWishlistProducts.slice(0, 3);
  }

  public async getSalesRepManufactureProgramsDetails(
    salesRepId: number,
    manufacturerId: number,
    distributorId?: number,
    programTimeline?: string,
    isInternalInitiative: boolean = false
  ) {
    const validProgramIds =
      await ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
        participantType: ENTITY_TYPE.SALES_REP,
        visibilityEntitieIds: [salesRepId],
        distributorId: distributorId
      });

    // Default to current programs if no timeline specified
    const timeline = programTimeline || PROGRAM_TIMELINE.CURRENT;

    // Fetch Store Programs and Manufacturer Products
    const programsResult = await ProgramRepository.getProgramsByParticipantType(
      {
        participantType: ENTITY_TYPE.SALES_REP,
        authorizedManufacturerIds: [manufacturerId],
        excludedProgramDetailIds: [],
        programIds: validProgramIds,
        programTimeline: timeline,
        isInternalInitiative: isInternalInitiative
      }
    );

    // TODO: get rid of below
    let adjustedRebateAmount = SALES_REP.REDUCE_REBATE_PERCENTAGE;

    if (distributorId) {
      const env = getEnvironment();
      const envDistributors: any = DISTRIBUTOR_IDS[env];
      adjustedRebateAmount =
        envDistributors?.[DISTRIBUTORS.SANDSTROM] == distributorId
          ? SALES_REP.REDUCE_REBATE_PERCENTAGE_SANDSTROM
          : adjustedRebateAmount;
    }

    const programTierDetails = [];
    for (const program of programsResult) {
      if (program.ProgramDetails) {
        for (const programDetail of program.ProgramDetails.sort(
          (a, b) => a.tier - b.tier
        )) {
          try {
            const { newOverview } = (await overrideProgramDetailOverviewText({
              rebateType: programDetail.rebateType,
              criteria: programDetail.criteria,
              rebateAmount: Number(programDetail.rebateAmount),
              rebatePercentage: Number(programDetail.rebatePercentage) || 0,
              distributorId: distributorId || 0,
              overview: programDetail.overview
            })) as { newOverview: string; newAmount: number };
            programDetail.overview = newOverview;
          } catch (error) {
            console.error("Error in overrideProgramDetailOverviewText:", error);
          }
          programTierDetails.push(programDetail);
        }
      }
    }
    return {
      tierDetails: programTierDetails
    };
  }

  /**
   * Gets stores that are near compliance (75-99%) for a given sales rep
   *
   * @param salesRepId The ID of the sales rep
   * @returns List of stores with programs that are near compliance
   */
  public async getStoresNearCompliance(
    salesRepId: number,
    minPercentage: number,
    maxPercentage: number,
    manufacturerId?: number,
    searchQuery?: string,
    distributorId?: number
  ) {
    // Set New Relic transaction name
    newrelic.setTransactionName("SalesRepService/getStoresNearCompliance");

    try {
      // 1. Get all stores tagged to this sales rep
      const storeIds =
        await StoreRepository.getStoreIdsBySalesRepId(salesRepId);

      if (!storeIds || storeIds.length === 0) {
        return {
          salesRepId,
          stores: []
        };
      }

      // Extract just the IDs
      const storeIdArray = storeIds.map((store) => store.storeId);

      const excludedProgramIds = distributorId
        ? await ProgramRepository.getExcludedProgramIds(distributorId)
        : undefined;

      // 2. Get compliance data for these stores using ProgramRepository
      const complianceData =
        await ProgramRepository.getStoresNearComplianceData(
          storeIdArray,
          manufacturerId,
          searchQuery,
          distributorId,
          excludedProgramIds
        );

      const responseData: NearComplianceStoreData[] = [];

      const groupedResult =
        complianceData.reduce<NearComplianceGroupedPrograms>((acc, item) => {
          const { manufacturer_id, store_id } = item;

          if (!acc[manufacturer_id]) {
            acc[manufacturer_id] = {};
          }

          if (!acc[manufacturer_id][store_id]) {
            acc[manufacturer_id][store_id] = [];
          }

          acc[manufacturer_id][store_id].push(item);

          return acc;
        }, {});

      await Promise.all(
        Object.entries(groupedResult).map(
          async ([manufacturerIdString, storeProgramsGroup]) => {
            const manufacturerId = Number(manufacturerIdString);

            const products = await StoreRepository.getManufacturerProducts({
              manufacturerId,
              distributorId
            });

            await Promise.all(
              Object.entries(storeProgramsGroup).map(
                async ([storeIdString, programs]) => {
                  const storeId = Number(storeIdString);

                  const storePrograms =
                    await this.processProgramsForStoreFromMV(
                      storeId,
                      manufacturerId,
                      programs,
                      products,
                      minPercentage,
                      maxPercentage
                    );

                  if (storePrograms) responseData.push(storePrograms);
                }
              )
            );
          }
        )
      );

      const storeComplianceData = responseData.reduce(
        (acc, curr) => {
          const existing = acc.find((item) => item.store_id === curr.store_id);

          if (existing) {
            existing.programs.push(...curr.programs);
          } else {
            acc.push({ ...curr });
          }

          return acc;
        },
        [] as typeof responseData
      );

      if (
        !storeComplianceData ||
        !Array.isArray(storeComplianceData) ||
        storeComplianceData.length === 0
      ) {
        return {
          salesRepId,
          stores: []
        };
      }

      return {
        salesRepId,
        stores: storeComplianceData
      };
    } catch (error) {
      // Report error to New Relic
      newrelic.noticeError(
        error instanceof Error ? error : new Error(String(error))
      );

      console.error("Error in getStoresNearCompliance:", error);
      throw error;
    }
  }

  /**
   * New table path (Phase-1) for near-compliance. Uses the new spiff_store_program_compliance table
   * to eliminate N+1 queries and improve performance.
   */
  public async getStoresNearComplianceFromMV(
    salesRepId: number,
    minPercentage: number,
    maxPercentage: number,
    manufacturerId?: number,
    searchQuery?: string,
    distributorId?: number
  ) {
    // Set New Relic transaction name
    newrelic.setTransactionName(
      "SalesRepService/getStoresNearComplianceFromMV"
    );

    try {
      // 1. Get all stores tagged to this sales rep
      const storeIds =
        await StoreRepository.getStoreIdsBySalesRepId(salesRepId);

      if (!storeIds || storeIds.length === 0) {
        return {
          salesRepId,
          stores: []
        };
      }

      // Extract just the IDs
      const storeIdArray = storeIds.map((store) => store.storeId);

      // 2. Get excluded program IDs if distributor scoped
      const excludedProgramIds = distributorId
        ? await ProgramRepository.getExcludedProgramIds(distributorId)
        : undefined;

      // 3. Get compliance data from MV (single query)
      const complianceData =
        await StoreRepository.getStoresNearComplianceFromMV(
          storeIdArray,
          manufacturerId,
          searchQuery,
          distributorId,
          excludedProgramIds
        );

      // 4. Cache category tags once for all programs
      const productCategoryTags =
        await StoreRepository.getCategoryTagsReference();

      const responseData: NearComplianceStoreData[] = [];

      // 5. Group data by manufacturer and store
      const groupedResult =
        complianceData.reduce<NearComplianceGroupedPrograms>((acc, item) => {
          const { manufacturer_id, store_id } = item;

          if (!acc[manufacturer_id]) {
            acc[manufacturer_id] = {};
          }

          if (!acc[manufacturer_id][store_id]) {
            acc[manufacturer_id][store_id] = [];
          }

          acc[manufacturer_id][store_id].push(item);

          return acc;
        }, {});

      // 6. Process each manufacturer and store group
      await Promise.all(
        Object.entries(groupedResult).map(
          async ([manufacturerIdString, storeProgramsGroup]) => {
            const manufacturerId = Number(manufacturerIdString);

            // Get unique product IDs from all programs for this manufacturer
            const allProductIds = new Set<number>();
            Object.values(storeProgramsGroup).forEach((programs) => {
              programs.forEach((pr: any) => {
                if (pr.purchased_distinct_product_ids) {
                  try {
                    const productIds = JSON.parse(
                      pr.purchased_distinct_product_ids
                    );
                    if (Array.isArray(productIds)) {
                      productIds.forEach((id: number) => allProductIds.add(id));
                    }
                  } catch (e) {
                    console.warn(
                      `[MV] Failed to parse purchased_distinct_product_ids for program ${pr.program_detail_id}`
                    );
                  }
                }
              });
            });

            // 7. Get product metadata once per manufacturer
            const products =
              allProductIds.size > 0
                ? await StoreRepository.getProductsByIds(
                    Array.from(allProductIds)
                  )
                : [];

            // 8. Process each store
            await Promise.all(
              Object.entries(storeProgramsGroup).map(
                async ([storeIdString, programs]) => {
                  const storeId = Number(storeIdString);

                  const storePrograms =
                    await this.processProgramsForStoreFromMV(
                      storeId,
                      manufacturerId,
                      programs,
                      products,
                      minPercentage,
                      maxPercentage,
                      productCategoryTags
                    );

                  if (storePrograms) responseData.push(storePrograms);
                }
              )
            );
          }
        )
      );

      const storeComplianceData = responseData.reduce(
        (acc, curr) => {
          const existing = acc.find((item) => item.store_id === curr.store_id);

          if (existing) {
            existing.programs.push(...curr.programs);
          } else {
            acc.push({ ...curr });
          }

          return acc;
        },
        [] as typeof responseData
      );

      if (
        !storeComplianceData ||
        !Array.isArray(storeComplianceData) ||
        storeComplianceData.length === 0
      ) {
        return {
          salesRepId,
          stores: []
        };
      }

      return {
        salesRepId,
        stores: storeComplianceData
      };
    } catch (error) {
      // Report error to New Relic
      newrelic.noticeError(
        error instanceof Error ? error : new Error(String(error))
      );

      throw error;
    }
  }

  /**
   * Process programs for store using MV data (no N+1 queries)
   */
  private async processProgramsForStoreFromMV(
    storeId: number,
    manufacturerId: number,
    programs: any[],
    products: any[],
    minPercentage: number,
    maxPercentage: number,
    productCategoryTags?: any[]
  ): Promise<NearComplianceStoreData | null> {
    // Get distributorId from storeId
    const distributorId = await StoreRepository.getDistributorId(storeId);

    // Use passed category tags or fallback to query
    const categoryTags =
      productCategoryTags || (await StoreRepository.getCategoryTagsReference());

    const matchedProgramResults = await Promise.all(
      programs
        .filter((pr) => pr.tier)
        .map(async (pr) => {
          // Extract purchased product IDs from MV jsonb field
          let purchasedProductIds: number[] = [];
          try {
            if (pr.purchased_distinct_product_ids) {
              const parsed = JSON.parse(pr.purchased_distinct_product_ids);
              if (Array.isArray(parsed)) {
                purchasedProductIds = parsed;
              }
            }
          } catch (e) {
            console.warn(
              `[MV] Failed to parse purchased_distinct_product_ids for program ${pr.program_detail_id}`
            );
          }

          // Calculate compliance percentage from raw data
          let compliancePercentage = 0;

          if (purchasedProductIds.length > 0) {
            // Create minimal lineItems structure for compatibility
            const lineItems = purchasedProductIds.map((productId: number) => ({
              product_id: productId
              // Add other required fields as needed
            })) as any[];

            const { graph } = StoreService.generateGraphAndProgressText(
              pr,
              products,
              categoryTags,
              lineItems,
              undefined,
              purchasedProductIds
            );

            if (graph) {
              const firstKey = Object.keys(graph)[0];
              if (firstKey) {
                const { completed, total } = graph[firstKey] || {
                  completed: 0,
                  total: 0
                };
                compliancePercentage =
                  total > 0 ? (completed / total) * 100 : 0;
              }
            }
          }

          const diffCat: string[] =
            pr.products_tags?.split(",")?.map((cat: string) => cat.trim()) ??
            [];

          const diffCatQty: string[] = pr.products_tags_qty?.split(",") ?? [];

          // Create minimal lineItems for compatibility with existing methods
          const lineItems = purchasedProductIds.map((productId: number) => ({
            product_id: productId
            // Add other required fields as needed
          })) as any[];

          // Get distributorId from storeId
          const storeDistributorId =
            await StoreRepository.getDistributorId(storeId);

          const categorizedProducts = await StoreService.getCategorizedProducts(
            diffCat,
            products,
            purchasedProductIds,
            diffCatQty,
            true,
            true,
            undefined,
            true,
            undefined,
            true,
            lineItems,
            storeDistributorId
          );

          const productsResult = updateProductInternalCodesByPurchasedItems(
            products,
            lineItems as any
          );

          const { purchasedProducts } =
            StoreService.getRecommendedAndPurchasedProducts(
              productsResult,
              purchasedProductIds,
              true
            );

          return {
            manufacturer_id: manufacturerId,
            manufacturer_name: pr.manufacturer_name,
            program_id: pr.program_id,
            program_detail_id: pr.program_detail_id,
            program_name:
              pr.program_type === PROGRAM_TYPE.TIER
                ? `${pr.program_header} - Tier ${pr.tier}`
                : pr.program_header,
            compliance_percentage: compliancePercentage,
            missing_products: categorizedProducts,
            purchased_products: purchasedProducts,
            earning_opportunity: pr.rebate_amount || 0,
            manufacturer: {
              id: manufacturerId,
              name: pr.manufacturer_name,
              avatar: pr.manufacturer_logo,
              authorized: pr.manufacturer_authorized
            }
          };
        })
    );

    const matchedPrograms = matchedProgramResults.filter(
      (pr) =>
        pr.compliance_percentage >= minPercentage &&
        pr.compliance_percentage < maxPercentage
    );

    if (!matchedPrograms.length) return null;

    return {
      store_id: storeId,
      store_name: programs[0].name || programs[0].store_name,
      programs: matchedPrograms
    };
  }

  /**
   * Get stores that are near compliance (between minPercentage and maxPercentage)
   *
   * This method retrieves stores that have programs with compliance percentage
   * between the specified minimum and maximum values. For each store, it returns
   * program details and missing products needed to reach full compliance.
   *
   * @param storeIds Array of store IDs to check
   * @param minPercentage Minimum compliance percentage (default: 75)
   * @param maxPercentage Maximum compliance percentage (default: 99)
   * @returns Array of store compliance data with program details and missing products
   */
  // ... existing code ...

  /**
   * Test method to calculate compliance percentage for a specific store and program
   *
   * @param storeId Store ID to check compliance for
   * @param programDetailId Program detail ID to check compliance against
   * @returns Object with compliance calculation details
   */
  public async testComplianceCalculation(
    storeId: number,
    programDetailId: number
  ) {
    try {
      // Fetch the program detail with its associated program
      const programDetail: any = await ProgramDetail.findByPk(programDetailId, {
        include: [
          {
            model: Program,
            include: [{ model: Manufacturer }]
          }
        ]
      });

      if (!programDetail) {
        throw new ApiError(
          404,
          `Program detail not found with ID ${programDetailId}`
        );
      }

      // Get manufacturer ID from the program
      const manufacturerId = programDetail.Program?.manufacturer_id;

      if (!manufacturerId) {
        throw new ApiError(
          404,
          `Manufacturer not found for program detail ${programDetailId}`
        );
      }

      // Fetch products for this manufacturer
      const products = await Product.findAll({
        where: { manufacturer_id: manufacturerId },
        attributes: [
          "id",
          "name",
          "size",
          "case_skus_id",
          "unit_skus_id",
          "box_skus_id",
          "primary_variant",
          "category_flags",
          "category_tags_json"
        ],
        raw: true
      });

      // Fetch purchased product IDs for the store
      const purchasedProductIds =
        (await StoreRepository.getPurchasedProductIdsByProgramIds(
          storeId,
          ENTITY_TYPE.STORE
        )) as number[];

      const productCategoryTags =
        await StoreRepository.getCategoryTagsReference();

      // Fetch transaction line items for the store
      const transactionLineItems = await LineItem.findAll({
        where: {
          buyer_id: storeId,
          buyer_type: ENTITY_TYPE.STORE
        },
        raw: true
      });

      // Calculate compliance percentage
      const compliancePercentage = StoreService.calculateCompliancePercentage(
        programDetail,
        products,
        transactionLineItems,
        purchasedProductIds,
        productCategoryTags
      );

      // Return detailed results
      return {
        storeId,
        programDetailId,
        programName: programDetail.Program?.name || "Unknown Program",
        manufacturerName:
          programDetail.Program?.Manufacturer?.name || "Unknown Manufacturer",
        criteria: programDetail.criteria,
        productTags: programDetail.products_tags,
        productTagsQty: programDetail.products_tags_qty,
        purchasedProductCount: purchasedProductIds.length,
        lineItemCount: transactionLineItems.length,
        compliancePercentage: compliancePercentage
      };
    } catch (error) {
      console.error("Error in testComplianceCalculation:", error);
      throw error;
    }
  }

  public async getSpiffEarningStoreDetail({
    storeId,
    distributorId,
    salesRepID,
    isInternal,
    programTimeline,
    role
  }: {
    storeId: number;
    distributorId: number;
    salesRepID: number | number[];
    isInternal?: boolean;
    programTimeline?: string;
    role?: string;
  }) {
    try {
      let availableProgramsCount = 0;
      const excludedProgramDetailIds =
        await ProgramRepository.getExcludedProgramDetailIds([distributorId]);

      const authorizedManufacturers =
        await ManufacturerRepository.getAuthorizedManufacturersIds(
          distributorId
        );
      const authorizedManufacturerIds = authorizedManufacturers.map((am) =>
        Number(am.manufacturerId)
      );
      const validProgramIds =
        await ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
          participantType: ENTITY_TYPE.SALES_REP,
          visibilityEntitieIds: Array.isArray(salesRepID)
            ? salesRepID
            : [salesRepID],
          getInternalInitiative: isInternal,
          storeIds: [storeId],
          distributorId: distributorId
        });

      const salesRepPrograms =
        await ProgramRepository.getProgramsByParticipantType({
          participantType: ENTITY_TYPE.SALES_REP,
          authorizedManufacturerIds,
          excludedProgramDetailIds,
          programIds: validProgramIds
        });

      // Filter programs based on timeline parameter
      let filteredPrograms = salesRepPrograms;
      const currentDate = new Date();

      // Default to current programs if no timeline specified
      const timeline = programTimeline || "Current";

      filteredPrograms = salesRepPrograms.filter((program) => {
        const startDate = new Date(program.startDate);
        const endDate = new Date(program.endDate);

        switch (timeline.toLowerCase()) {
          case "current":
            return startDate <= currentDate && endDate >= currentDate;
          case "historical":
            return endDate < currentDate;
          default:
            return startDate >= currentDate && endDate >= currentDate; // Default to current
        }
      });

      const store = await Store.findByPk(storeId);

      // maybe add type below

      const salesRepSpiffEarnings =
        await SalesRepRepository.getSalesRepSpiffEarningByStoreAndManufacturer(
          storeId,
          distributorId,
          excludedProgramDetailIds,
          undefined,
          true,
          undefined,
          salesRepID,
          role
        );

      // Combine program and earnings data by manufacturer_id
      const result: SpiffEarningStoreDetail = {
        name: store?.name || "",
        storeId: storeId,
        totalSpiffEarning: 0,
        manufacturers: [],
        totalAvailablePrograms: 0
      };

      const manufacturerMap = new Map<
        number,
        SpiffEarningStoreManufacturerDetail
      >();

      await Promise.all(
        filteredPrograms.map(async (program) => {
          const manufacturer = program.Manufacturer;
          if (!manufacturer?.id) return;

          if (!manufacturerMap.has(manufacturer.id)) {
            manufacturerMap.set(manufacturer.id, {
              id: manufacturer.id,
              name: manufacturer.name,
              logo: manufacturer.logo,
              spiffEarning: 0,
              programs: []
            });
          }

          const programDetails = program.ProgramDetails || [];

          await Promise.all(
            programDetails.map(async (detail) => {
              const earning = salesRepSpiffEarnings.find(
                (e) =>
                  e.manufacturer_id === manufacturer.id &&
                  e.program_detail_id === detail.id
              );

              // Overide Overview Text
              const newOverview = await overrideProgramDetailOverviewText({
                rebateType: detail.rebateType,
                criteria: detail.criteria,
                rebateAmount: Number(detail.rebateAmount) || 0,
                rebatePercentage: Number(detail.rebatePercentage) || 0,
                distributorId: distributorId,
                storeId: storeId,
                overview: detail.overview
              });

              const tierDetail: SpiffEarningManufacturerProgramDetail = {
                id: detail.id,
                name: `${detail.programLine} ${detail.tier ? ` - ${detail.tier}` : ""}`,
                overview: newOverview?.newOverview || detail.overview,
                startDate: program.startDate,
                endDate: program.endDate,
                spiffEarning: earning?.total_earning
                  ? Number(earning?.total_earning)
                  : 0,
                rebate: {
                  rebateAmount: Number(detail.rebateAmount) || 0,
                  rebatePercentage: Number(detail.rebatePercentage) || 0,
                  rebateType: detail.rebateType,
                  criteria: detail.criteria
                }
                // spiffOpportunityAmount: opportunityAmount
              };

              const manu = manufacturerMap.get(manufacturer.id);
              if (manu) {
                manu.spiffEarning += Number(tierDetail.spiffEarning);
                result.totalSpiffEarning = result.totalSpiffEarning
                  ? result.totalSpiffEarning + Number(tierDetail.spiffEarning)
                  : Number(tierDetail.spiffEarning);

                if (manu.programs) {
                  availableProgramsCount++;
                  manu.programs.push(tierDetail);
                }
              }
            })
          );
        })
      );

      result.manufacturers = Array.from(manufacturerMap.values());
      result.totalAvailablePrograms = availableProgramsCount;

      // Return detailed results
      return result;
    } catch (error) {
      console.error("Error in getSpiffEarningStoreDetail:", error);
      throw error;
    }
  }

  /**
   * Generates categorized products for SPIFF programs based on manufacturer and distributor
   * @param {number} manufacturerId The ID of the manufacturer
   * @param {number} distributorId The ID of the distributor
   * @param {string} programTimeline The program timeline (Current/Historical)
   * @returns {Promise<any>} Categorized products object
   */
  private async generateCategorizedProductsForSpliff(
    manufacturerId: number,
    distributorId: number,
    programTimeline: string = "Current"
  ): Promise<any> {
    try {
      const { Op, Sequelize } = require("sequelize");

      // Step 1: Get all products_tags from matching programs
      const participantType = "SALES_REP";
      const programDetails = await ProgramDetail.findAll({
        attributes: ["productsTags"],
        where: {
          program_id: {
            [Op.in]: Sequelize.literal(`(
              SELECT id FROM programs
              WHERE manufacturer_id = ${Number(manufacturerId)}
              AND participant_type = '${participantType}'
              AND end_date ${programTimeline === "Historical" ? "<" : ">"} NOW()
              AND deleted_at IS NULL
            )`)
          }
        },
        raw: true
      });

      // Step 2: Parse and normalize tags
      const tagSet = new Set<string>();
      let hasProgramsWithoutTags = false;

      for (const row of programDetails) {
        if (row.productsTags && row.productsTags.trim()) {
          row.productsTags
            .split(",")
            .map((t: string) => t.trim().replace(/\s+/g, "_"))
            .forEach((tag: string) => tagSet.add(tag));
        } else {
          hasProgramsWithoutTags = true;
        }
      }

      const productTags = Array.from(tagSet);

      // Step 3: Get warehouse ID
      const warehouse = await Warehouse.findOne({
        where: { distributor_id: distributorId },
        attributes: ["id"],
        raw: true
      });

      if (!warehouse) {
        return {};
      }

      const warehouseId = warehouse.id;

      // Step 4: Get all products for the manufacturer
      const products = await Product.findAll({
        where: {
          manufacturer_id: manufacturerId,
          primary_variant: true,
          deleted_at: null
        },
        attributes: [
          "id",
          "name",
          "size",
          "caseSkusId",
          "unitSkusId",
          "boxSkusId",
          "category_tags_json"
        ],
        raw: true
      });

      const productIds = products.map((p: any) => p.id);

      // Step 5: Get codes and last_transaction_date from product_code_mappings
      const codeMappings = await ProductCodeMapping.findAll({
        where: {
          distributor_id: distributorId,
          warehouse_id: warehouseId,
          product_id: { [Op.in]: productIds }
        },
        attributes: [
          ["product_id", "productId"],
          "code",
          ["last_transaction_date", "lastTransactionDate"]
        ],
        raw: true
      });

      const codeMap: Record<number, string> = {};
      const lastTransactionDateMap: Record<number, Date | string | null> = {};
      for (const row of codeMappings) {
        codeMap[row.productId] = row.code;
        // Handle both camelCase (model) and snake_case (raw query) property names
        lastTransactionDateMap[row.productId] =
          (row as any).lastTransactionDate ||
          (row as any).last_transaction_date ||
          null;
      }

      // Step 6: Group by tag and enrich with code
      const productsByTag: Record<string, any> = {};

      // Always create "All Products" tab if any program has no tags
      if (hasProgramsWithoutTags) {
        productsByTag["All Products"] = {
          sortOrder: 0,
          purchasedProducts: [],
          requiredProducts: products.map((p: any) => {
            const lastTransactionDate = lastTransactionDateMap[p.id] || null;
            const originalCode = codeMap[p.id] || null;
            const internalCode = getActiveInternalCode(
              originalCode,
              lastTransactionDate,
              distributorId
            );
            // oldInternalCode should always contain the original code for reference/troubleshooting
            // It should be NULL only if there was no original code in the database
            const oldInternalCode = originalCode;

            return {
              id: p.id,
              name: p.name,
              size: p.size,
              caseSkusId: p.caseSkusId,
              unitSkusId: p.unitSkusId,
              boxSkusId: p.boxSkusId,
              wishlist: false,
              internalCode: internalCode,
              oldInternalCode: oldInternalCode,
              lastTransactionDate: lastTransactionDate
            };
          })
        };
      }

      // Create specific tag tabs if there are tags
      if (productTags.length > 0) {
        let sortOrder = hasProgramsWithoutTags ? 1 : 0;
        for (const tag of productTags) {
          const tagProducts = products.filter((p: any) =>
            Array.isArray(p.category_tags_json)
              ? p.category_tags_json.includes(tag)
              : false
          );

          // Set Flex category to have the highest sort order (at the end)
          const isFlexCategory =
            tag.replace(/_/g, " ")?.toLowerCase() == "flex" ||
            tag.replace(/_/g, " ")?.toLowerCase() == "recommended flex";
          const currentSortOrder = isFlexCategory
            ? hasProgramsWithoutTags
              ? productTags.length + 1
              : productTags.length
            : sortOrder++;

          productsByTag[tag.replace(/_/g, " ")] = {
            sortOrder: currentSortOrder,
            purchasedProducts: [],
            requiredProducts: tagProducts.map((p: any) => {
              const lastTransactionDate = lastTransactionDateMap[p.id] || null;
              const originalCode = codeMap[p.id] || null;
              const internalCode = getActiveInternalCode(
                originalCode,
                lastTransactionDate,
                distributorId
              );
              // oldInternalCode should always contain the original code for reference/troubleshooting
              // It should be NULL only if there was no original code in the database
              const oldInternalCode = originalCode;

              return {
                id: p.id,
                name: p.name,
                size: p.size,
                caseSkusId: p.caseSkusId,
                unitSkusId: p.unitSkusId,
                boxSkusId: p.boxSkusId,
                wishlist: false,
                internalCode: internalCode,
                oldInternalCode: oldInternalCode,
                lastTransactionDate: lastTransactionDate
              };
            })
          };
        }
      }

      return productsByTag;
    } catch (error) {
      console.error("Error generating categorized products for SPIFF:", error);
      return {};
    }
  }

  /**
   * Retrieves the spiff earning store detail by manufacturer.
   * The method gets the program and earning data by manufacturer_id and
   * combines the data by manufacturer_id. It then adds the tier details
   * to the result and calculates the total spiff earning opportunity.
   * If the rebate calculation criteria is store compliance, it also
   * gets the store tier details and calculates the highest tier to achieve.
   * @param {number} storeId The ID of the store
   * @param {number} distributorId The ID of the distributor
   * @param {number} manufacturerId The ID of the manufacturer
   * @returns {Promise<SPIFFOpportunityModalData>}
   */
  public async getSpiffEarningStoreDetailByManufacturer(
    storeId: number,
    distributorId: number,
    manufacturerId: number,
    programDetailId: number,
    salesRepId?: number | number[],
    selectedWarehouseId?: number
  ) {
    try {
      // Track if we need to include store tier details for compliance-based programs
      let includeStoreTierDetails = false;
      let isPODProgram = false;
      let isCategoryPODProgram = false;
      let programProductsTags = "";
      let nonProductTagsCategory = false;
      let isAllSpliffPOD = false;
      let isVoidFillProgram = false;
      let isSpiffCategorySkusProgram = false;
      // Array to store tier numbers that need to be achieved
      const highestTierToAchive: number[] = [];

      // Get excluded program IDs based on distributor settings
      const excludedProgramDetailIds =
        await ProgramRepository.getExcludedProgramDetailIds([distributorId]);

      // Fetch all SPIFF programs for this sales rep and manufacturer
      const salesRepProgram =
        await ProgramRepository.getProgramsByParticipantType({
          participantType: ENTITY_TYPE.SALES_REP,
          authorizedManufacturerIds: [manufacturerId],
          excludedProgramDetailIds,
          programDetailIds: [programDetailId]
        });
      // Get SPIFF earnings for this specific store and manufacturer
      const salesRepSpiffEarnings =
        await SalesRepRepository.getSalesRepSpiffEarningByStoreAndManufacturer(
          storeId,
          distributorId,
          excludedProgramDetailIds,
          manufacturerId,
          true,
          [programDetailId],
          salesRepId
        );

      const earning = salesRepSpiffEarnings.find(
        (e) =>
          e.manufacturer_id === manufacturerId &&
          e.program_detail_id === programDetailId
      );

      // Check if the logged-in user is a Secondary sales rep for this store
      // If they are, set totalSpiffEarning to null (only Primary should see earnings)
      let isSecondarySalesRep = false;
      const currentUser = getCurrentUser();
      if (currentUser && currentUser.role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP) {
        const salesRepAssociatedUserId = currentUser.associatedUserId;
        try {
          // Check if this sales rep has SECONDARY assignment for this store
          const storeSalesRepAssignment = await StoreSalesRep.findOne({
            where: {
              storeId: storeId,
              salesRepId: salesRepAssociatedUserId,
              deletedAt: null
            },
            attributes: ["assignmentType"]
          });
          isSecondarySalesRep = storeSalesRepAssignment?.assignmentType === "SECONDARY";
        } catch (error) {
          // If query fails, log error but default to showing earnings (fail-safe)
          logger.error(
            `[getSpiffEarningStoreDetailByManufacturer] Error checking assignment type for store ${storeId}, salesRep ${salesRepAssociatedUserId}:`,
            error
          );
          // Default to false (show earnings) if we can't determine assignment type
          isSecondarySalesRep = false;
        }
      }

      // Initialize result object with earnings and quantity data
      // Set totalSpiffEarning to null if user is Secondary sales rep (only Primary should see earnings)
      const result: SPIFFOpportunityModalData = {
        totalSpiffEarning: isSecondarySalesRep
          ? null
          : Number(earning?.total_earning) || 0,
        tierDetails: []
      };

      // Get warehouse ID from store if not provided and storeId is available
      let resolvedWarehouseId: number | undefined = selectedWarehouseId;
      if (storeId && !resolvedWarehouseId) {
        const storeWarehouseId = await newrelic.startSegment(
          "SalesRepService.getSpiffEarningStoreDetailByManufacturer.getWarehouseId",
          true,
          async () => {
            return await StoreRepository.getWarehouseId(Number(storeId));
          }
        );
        resolvedWarehouseId = storeWarehouseId || undefined;
      }

      // Fallback: If no warehouse found, get first warehouse from distributor
      if (!resolvedWarehouseId && distributorId) {
        const warehouseIds = await DistributorRepository.getWarehouseIds(
          distributorId,
          undefined,
          undefined,
          undefined,
          true
        );
        resolvedWarehouseId = warehouseIds?.length
          ? warehouseIds[0]
          : undefined;
      }

      // Use resolved warehouse ID for product fetching
      selectedWarehouseId = resolvedWarehouseId;

      //to be refactored---
      // Process each program and its details
      for (const item of salesRepProgram || []) {
        for (const detail of item?.ProgramDetails || []) {
          // Override Overview Text
          const programDetails = await overrideProgramDetailOverviewText({
            rebateType: detail.rebateType,
            criteria: detail.criteria,
            rebateAmount: Number(detail.rebateAmount) || 0,
            rebatePercentage: Number(detail.rebatePercentage) || 0,
            distributorId: distributorId,
            storeId: storeId,
            overview: detail.overview
          });

          // Create tier detail object for each program detail
          const tierDetal: SPIFFOpportunityTierDetails = {
            overview: programDetails?.newOverview || detail?.overview,
            programId: item.id,
            rebateAmount: detail.rebateAmount,
            programDetailId: detail?.id
          };

          // Add tier detail to result
          if (result.tierDetails) result.tierDetails.push(tierDetal);
          // Set quantity type if not already set
          if (
            !result.quantityType &&
            detail.quantityType &&
            detail.rebateCalculation ==
              SalesRepSpiffProgramsDetailCriteria.PerQuantity
          ) {
            result.quantityType = detail.quantityType + " sold";
            result.quantitySold = earning?.total_quantity || 0;
          }

          // Set quantity type if not already set for POD
          if (
            detail.rebateCalculation ==
              SalesRepSpiffProgramsDetailCriteria.POD ||
            detail.rebateCalculation ==
              SalesRepSpiffProgramsDetailCriteria.PODPerCategory
          ) {
            isPODProgram = true;
            result.quantityType = "POD";

            // Only set quantitySold for PODPerCategory
            if (
              detail.rebateCalculation ==
              SalesRepSpiffProgramsDetailCriteria.PODPerCategory
            ) {
              result.quantitySold = earning?.total_unique_products || 0;
              isCategoryPODProgram = true;
              programProductsTags = detail.productsTags ?? "";
            }
          }
          if (
            detail.rebateCalculation ==
              SalesRepSpiffProgramsDetailCriteria.PerQuantity ||
            detail.rebateCalculation == SalesRepSpiffProgramsDetailCriteria.POD
          ) {
            isPODProgram = true;
            isAllSpliffPOD = true;
            if (
              !detail.productsTags ||
              detail.productsTags === "" ||
              detail.productsTags === "[null]" ||
              detail.productsTags === "null"
            ) {
              // Fetch all product tags from product_category_tags table
              const allProductTags =
                await StoreRepository.getCategoryTagsReference();
              // Extract tagKey values from allProductTags and create an array
              const tagKeysArray = allProductTags.map((tag: any) => tag.tagKey);
              // Assign the tagKeysArray to programProductsTags
              programProductsTags = tagKeysArray.join(",");
              nonProductTagsCategory = true;
            } else {
              programProductsTags = detail.productsTags;
            }
          }
          // Handle store compliance-based SPIFF programs
          if (
            detail.rebateCalculation ==
            SalesRepSpiffProgramsDetailCriteria.StoreCompliance
          ) {
            includeStoreTierDetails = true;
            // Calculate total SPIFF earning opportunity
            result.totalSpiffEarningOpp = result.totalSpiffEarningOpp
              ? result.totalSpiffEarningOpp +
                Number(detail?.rebateAmount?.toString())
              : Number(detail?.rebateAmount?.toString());
            // Track maximum value for progress tracking
            result.maxValue = result.maxValue ? result.maxValue + 1 : 1;
            // Extract tier number from overview text
            const currentTier = getTierToAchieve(detail?.overview) || 0;
            highestTierToAchive.push(currentTier);
          }
          // Handle VOID_FILL programs
          if (
            detail.criteria === SalesRepSpiffProgramsDetailCriteria.VOID_FILL &&
            detail.rebateCalculation === SalesRepSpiffProgramsDetailCriteria.POD
          ) {
            isVoidFillProgram = true;
            result.quantityType = "VOID_FILL";
          }

          // Handle SPIFF Category SKUs programs
          if (
            detail.criteria ===
            SalesRepSpiffProgramsDetailCriteria.SPIFF_CATEGORY_SKUS
          ) {
            isSpiffCategorySkusProgram = true;
            result.quantityType = "SKUs";
            result.quantitySold = earning?.total_unique_products || 0;
            programProductsTags = detail.productsTags ?? "";
          }
        }
      }

      // If program includes store compliance criteria
      if (includeStoreTierDetails) {
        // Get store's current tier achievement details
        const storeTierDetails =
          await StoreService.getStoreProgramsDetailsByManufacturerId({
            storeId,
            manufacturerId,
            isEnrolledPrograms: null,
            includeProgramDetailInTier: true,
            isManufacturerUser: false,
            programTimeline: "Current"
          });

        // Filter tier details to only include relevant tiers
        result.storeTierDetails = (storeTierDetails.tierDetails?.filter(
          (dtl: any) => {
            // TEMPORARY SHOW ONLY CORE DISTRIBUTION TIER
            //  CODE ONLY FOR NCD AND NEW DEMO DISTRIBUTOR AND Haribo MANUFACTURER
            // if (
            //   (distributorId == 166 || distributorId == 298) &&
            //   manufacturerId == 72
            // ) {
            //   const programsToSkip = [248, 249, 312, 313];
            //   if (programsToSkip.includes(dtl.programId)) return false;
            // }
            return highestTierToAchive.includes(dtl.tier);
          }
        ) ?? []) as ManufacturerTierDetail[];

        // Find highest tier for this program
        const maxTier = Math.max(
          ...result.storeTierDetails.map((td) => td.tier ?? 0)
        );

        // Get categorized products for highest tier
        result.categorizedProducts = result.storeTierDetails.find(
          (td) => td.tier === maxTier
        )?.categorizedProducts;

        // Calculate number of achieved tiers
        result.achivedValue = result.storeTierDetails.filter(
          (dt) => dt.isProgramComplianceQualified
        ).length;

        // Set achievement type label
        result.achivedValueType = "Store Program Compliance";
      }
      if (isPODProgram || nonProductTagsCategory) {
        // Fetch transaction line items for program date range for store and manufacturer IDs provided
        const transactionLineItems =
          await StoreRepository.getTransactionsByManufacturerId(
            [storeId],
            [manufacturerId],
            ENTITY_TYPE.STORE,
            false,
            undefined,
            undefined,
            undefined,
            undefined,
            {
              startDate: salesRepProgram[0].startDate.toString(),
              endDate: salesRepProgram[0].endDate.toString()
            },
            true
          );

        // Get list of purchased product IDs from transactions
        const purchasedProductIds = transactionLineItems?.map(
          (item: any) => item.product_id
        );

        if (isCategoryPODProgram || isPODProgram || nonProductTagsCategory) {
          const productTagsArray = programProductsTags
            ?.split(",")
            ?.map((tag: string) => tag.trim());
          const products = await StoreRepository.getManufacturerProducts({
            manufacturerId,
            storeId,
            distributorId,
            selectedWarehouseId,
            categoryTagsJSON: productTagsArray
          });
          // Generate categorized products list
          // Sales rep endpoints are never manufacturer users, so isManufacturerUser = false
          result.categorizedProducts =
            await StoreService.getCategorizedProducts(
              productTagsArray,
              products,
              purchasedProductIds,
              [],
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              undefined,
              transactionLineItems,
              distributorId,
              false // isManufacturerUser - always false for sales rep endpoints
            );
          if (nonProductTagsCategory && result.categorizedProducts) {
            // Consolidate all products from all categories into "All Products"
            const allPurchasedProducts: any[] = [];
            const allRequiredProducts: any[] = [];

            // Collect all purchased and required products from all categories
            Object.keys(result.categorizedProducts).forEach((categoryKey) => {
              const categoryData = result.categorizedProducts![categoryKey];

              if (
                categoryData.purchasedProducts &&
                categoryData.purchasedProducts.length > 0
              ) {
                allPurchasedProducts.push(...categoryData.purchasedProducts);
              }

              if (
                categoryData.requiredProducts &&
                categoryData.requiredProducts.length > 0
              ) {
                allRequiredProducts.push(...categoryData.requiredProducts);
              }
            });

            // Remove duplicates based on product ID
            const uniquePurchasedProducts = allPurchasedProducts.filter(
              (product, index, self) =>
                index === self.findIndex((p) => p.id === product.id)
            );

            const uniqueRequiredProducts = allRequiredProducts.filter(
              (product, index, self) =>
                index === self.findIndex((p) => p.id === product.id)
            );

            // Replace categorizedProducts with single "All Products" category
            result.categorizedProducts = {
              "All Products": {
                sortOrder: 0,
                purchasedProducts: uniquePurchasedProducts,
                requiredProducts: uniqueRequiredProducts
              }
            };
          }
        }
      }
      // Handle VOID_FILL programs
      if (isVoidFillProgram) {
        const voidFillData = await this.getVoidFillProgramData(
          storeId,
          distributorId,
          manufacturerId,
          programDetailId,
          salesRepProgram[0],
          selectedWarehouseId
        );

        if (voidFillData) {
          result.categorizedProducts = voidFillData.categorizedProducts;
          // Set totalSpiffEarning to null if user is Secondary sales rep (only Primary should see earnings)
          result.totalSpiffEarning = isSecondarySalesRep
            ? null
            : voidFillData.totalSpiffEarning;
          result.storeTierDetails = voidFillData.storeTierDetails;

          // Only set quantitySold for VOID_FILL if it's PODPerCategory or PerQuantity
          const programDetail = salesRepProgram[0]?.ProgramDetails?.[0];
          if (
            programDetail &&
            (programDetail.rebateCalculation ===
              SalesRepSpiffProgramsDetailCriteria.PODPerCategory ||
              programDetail.rebateCalculation ===
                SalesRepSpiffProgramsDetailCriteria.PerQuantity)
          ) {
            result.quantitySold = voidFillData.quantitySold;
          }
        }
      }

      // Handle SPIFF Category SKUs programs - create simple tracker
      if (isSpiffCategorySkusProgram) {
        // Get manufacturer products filtered by category tags
        const productTagsArray = programProductsTags
          ?.split(",")
          ?.map((tag: string) => tag.trim()) || ["Shipper"];

        const products = await StoreRepository.getManufacturerProducts({
          manufacturerId,
          storeId,
          distributorId,
          categoryTagsJSON: productTagsArray,
          selectedWarehouseId
        });

        // Get program start date for purchase calculation
        const programStartDate = salesRepProgram[0].startDate;

        // Get actual purchased products from line_items/transactions after program start date
        // Use the program's full date range (startDate to endDate)
        // Note: endDate is on the Program model, not ProgramDetail
        const programEndDate = salesRepProgram[0]?.endDate;
        const actualPurchasedProducts = await this.getActualPurchasedProducts(
          storeId,
          distributorId,
          manufacturerId,
          products.map((p) => p.id),
          programStartDate,
          products,
          selectedWarehouseId,
          programEndDate // Pass end date to use program date range
        );

        // The actualPurchasedProducts are already filtered to only include
        // products from this manufacturer and are already from the program's product set
        const purchasedProducts = actualPurchasedProducts;

        // Get the required quantity from program detail
        const programDetail = salesRepProgram[0]?.ProgramDetails?.[0];
        const requiredQuantity = programDetail?.productsTagsQty
          ? Number(programDetail.productsTagsQty)
          : programDetail?.minQty
            ? Number(programDetail.minQty)
            : 2; // fallback to 2 if not specified

        // Create simple categorized products with tracker
        const categorizedProducts: any = {};

        for (const tag of productTagsArray) {
          const tagProducts = products.filter(
            (product: any) =>
              product.category_flags && product.category_flags[tag] === true
          );

          const tagPurchasedProducts = purchasedProducts.filter(
            (product: any) =>
              product.category_flags && product.category_flags[tag] === true
          );

          const completed = tagPurchasedProducts.length;
          const total = tagProducts.length;
          const progressText = `${completed}/${total}`;

          // Transform products to match expected format
          const transformedEligibleProducts = tagProducts.map(
            (product: any) => {
              const lastTransactionDate =
                product.last_transaction_date ||
                product.lastTransactionDate ||
                null;
              const internalCode = getActiveInternalCode(
                product.internal_code,
                lastTransactionDate,
                distributorId
              );

              return {
                id: product.id,
                name: product.name,
                size: product.size,
                caseSkusId: product.case_skus_id,
                unitSkusId: product.unit_skus_id,
                boxSkusId: product.box_skus_id,
                wishlist: false,
                internalCode: internalCode,
                lastTransactionDate: lastTransactionDate
              };
            }
          );

          const transformedPurchasedProducts = tagPurchasedProducts.map(
            (product: any) => {
              const lastTransactionDate =
                product.last_transaction_date ||
                product.lastTransactionDate ||
                null;
              const internalCode = getActiveInternalCode(
                product.internal_code,
                lastTransactionDate,
                distributorId
              );

              return {
                id: product.id,
                name: product.name,
                size: product.size,
                caseSkusId: product.case_skus_id,
                unitSkusId: product.unit_skus_id,
                boxSkusId: product.box_skus_id,
                wishlist: false,
                internalCode: internalCode,
                lastTransactionDate: lastTransactionDate
              };
            }
          );

          const requiredProducts = transformedEligibleProducts.filter(
            (product) =>
              !transformedPurchasedProducts.some(
                (purchased) => purchased.id === product.id
              )
          );

          categorizedProducts[tag.replace(/_/g, " ")] = {
            sortOrder: Object.keys(categorizedProducts).length,
            purchasedProducts: transformedPurchasedProducts,
            requiredProducts: requiredProducts,
            graph: {
              SKUs: {
                completed,
                total: requiredQuantity
              }
            }
          };
        }

        // If no categories with data, create default "All Products" category
        if (Object.keys(categorizedProducts).length === 0) {
          const completed = purchasedProducts.length;
          const total = products.length;
          const progressText = `${completed}/${total}`;

          const transformedEligibleProducts = products.map((product: any) => {
            const lastTransactionDate =
              product.last_transaction_date ||
              product.lastTransactionDate ||
              null;
            const internalCode = getActiveInternalCode(
              product.internal_code,
              lastTransactionDate,
              distributorId
            );

            return {
              id: product.id,
              name: product.name,
              size: product.size,
              caseSkusId: product.case_skus_id,
              unitSkusId: product.unit_skus_id,
              boxSkusId: product.box_skus_id,
              wishlist: false,
              internalCode: internalCode,
              lastTransactionDate: lastTransactionDate
            };
          });

          const transformedPurchasedProducts = purchasedProducts.map(
            (product: any) => {
              const lastTransactionDate =
                product.last_transaction_date ||
                product.lastTransactionDate ||
                null;
              const internalCode = getActiveInternalCode(
                product.internal_code,
                lastTransactionDate,
                distributorId
              );

              return {
                id: product.id,
                name: product.name,
                size: product.size,
                caseSkusId: product.case_skus_id,
                unitSkusId: product.unit_skus_id,
                boxSkusId: product.box_skus_id,
                wishlist: false,
                internalCode: internalCode,
                lastTransactionDate: lastTransactionDate
              };
            }
          );

          const requiredProducts = transformedEligibleProducts.filter(
            (product) =>
              !transformedPurchasedProducts.some(
                (purchased) => purchased.id === product.id
              )
          );

          categorizedProducts["All Products"] = {
            sortOrder: 0,
            purchasedProducts: transformedPurchasedProducts,
            requiredProducts: requiredProducts,
            graph: {
              SKUs: {
                completed,
                total: requiredQuantity
              }
            }
          };
        }

        result.categorizedProducts = categorizedProducts;
        result.quantitySold = purchasedProducts.length;

        // Add progress text for UI display
        result.progressText = `${purchasedProducts.length}/${requiredQuantity}`;

        // Create store tier details from actual program data for graph display compatibility
        result.storeTierDetails = [
          {
            title: `${salesRepProgram[0].Manufacturer?.name || "Manufacturer"} - SPIFF Category SKUs`,
            overview:
              programDetail?.overview ||
              "Track SKU purchases for SPIFF rewards",
            tier: programDetail?.tier || 1,
            rebate_calculation:
              programDetail?.rebateCalculation || "Fixed $ amount Per SKU",
            rebate_amount: programDetail?.rebateAmount?.toString() || "0.00",
            rebate_type: programDetail?.rebateType || "fixed",
            graph: {
              SKUs: {
                completed: purchasedProducts.length,
                total: requiredQuantity
              }
            },
            progressAchieved: [
              `${purchasedProducts.length}/${requiredQuantity} SKUs purchased`
            ],
            isProgramComplianceQualified:
              purchasedProducts.length >= requiredQuantity,
            isRebateBasedOnListPrice:
              programDetail?.rebateCalculationType === "list_price",
            programId: salesRepProgram[0].id,
            categorizedProducts: categorizedProducts,
            programDetailId: Number(programDetailId)
          }
        ] as any;
      }

      // Filter out tags that have no purchased and required products from categorizedProducts
      if (result.categorizedProducts) {
        const filteredCategorizedProducts: any = {};

        Object.keys(result.categorizedProducts).forEach((tagKey) => {
          const tagData = result.categorizedProducts![tagKey];

          // Check if tag has any purchased or required products
          const hasPurchasedProducts =
            tagData.purchasedProducts && tagData.purchasedProducts.length > 0;
          const hasRequiredProducts =
            tagData.requiredProducts && tagData.requiredProducts.length > 0;

          // Only include tag if it has either purchased or required products
          if (hasPurchasedProducts || hasRequiredProducts) {
            filteredCategorizedProducts[tagKey] = tagData;
          }
        });

        result.categorizedProducts = filteredCategorizedProducts;
      }

      // Only map over result.storeTierDetails if it exists and is an array, otherwise set to empty array
      const newStoreTierDetails =
        result?.storeTierDetails && Array.isArray(result?.storeTierDetails)
          ? await Promise.all(
              result?.storeTierDetails.map(async (tier: any) => {
                // Handle both camelCase and snake_case property names
                const rebateType =
                  tier.rebateType || tier.rebate_type || "fixed";
                const rebateAmount =
                  tier.rebateAmount || tier.rebate_amount || 0;
                const rebatePercentage =
                  tier.rebatePercentage || tier.rebate_percentage || 0;

                const updatedOverview = await overrideProgramDetailOverviewText(
                  {
                    rebateType: rebateType,
                    criteria: null,
                    rebateAmount: Number(rebateAmount) || 0,
                    rebatePercentage: Number(rebatePercentage) || 0,
                    distributorId: distributorId,
                    storeId: storeId,
                    overview: tier.overview
                  }
                );

                return {
                  ...tier,
                  overview: updatedOverview?.newOverview || tier.overview
                };
              })
            )
          : [];

      // Override Overview Text
      result.storeTierDetails = newStoreTierDetails;
      return result;
    } catch (error) {
      console.error(
        "Error in getSpiffEarningStoreDetailByManufacturer:",
        error
      );
      throw error;
    }
  }

  /**
   * Optimized method to get stores near compliance using the spiff_store_program_compliance table
   *
   * This method provides a high-performance alternative to the complex getStoresNearCompliance
   * by leveraging pre-aggregated table data and simplified data processing.
   *
   * Architecture Overview:
   * 1. Fetches sales rep's assigned stores from SalesRepRepository
   * 2. Retrieves pre-calculated compliance data from spiff_store_program_compliance table
   * 3. Groups and transforms data into the expected API response format
   * 4. Applies percentage-based filtering directly in the database query
   *
   * Key Performance Improvements:
   * - Eliminates complex real-time compliance calculations
   * - Reduces database query count from N+1 to 2 queries
   * - Pre-calculated compliance percentages in spiff_store_program_compliance table
   * - Simplified data transformation without product fetching
   *
   * @param salesRepId - The ID of the sales representative
   * @param minPercentage - Minimum compliance percentage threshold (e.g., 70 for 70%)
   * @param maxPercentage - Maximum compliance percentage threshold (e.g., 100 for 100%)
   * @param manufacturerId - Optional manufacturer filter
   * @param searchQuery - Optional search term for store/manufacturer name filtering
   * @param distributorId - Optional distributor ID for access control and exclusion logic
   * @returns Promise<{salesRepId: number, stores: any[]}> - Structured response with stores and their programs
   *
   * @example
   * const result = await getStoresNearComplianceOptimized(
   *   338,    // salesRepId
   *   70,     // minPercentage (70%)
   *   100,    // maxPercentage (100%)
   *   46,     // manufacturerId (optional)
   *   "store", // searchQuery (optional)
   *   298     // distributorId (optional)
   * );
   */
  public async getStoresNearComplianceOptimized(
    salesRepId: number,
    minPercentage: number,
    maxPercentage: number,
    manufacturerId?: number,
    searchQuery?: string,
    distributorId?: number,
    programTimeline: string = "Current"
  ) {
    try {
      // 1. Get sales rep's stores first
      const storeIds =
        await SalesRepRepository.getStoresBySalesRepId(salesRepId);

      if (!storeIds || storeIds.length === 0) {
        return {
          salesRepId,
          stores: []
        };
      }
      const excludedProgramIds = distributorId
        ? await ProgramRepository.getExcludedProgramIds(distributorId)
        : [];

      // 2. Get compliance data from spiff_store_program_compliance table with percentage filter
      const complianceData =
        await StoreRepository.getStoresNearComplianceFromMV(
          storeIds,
          manufacturerId,
          searchQuery,
          distributorId,
          excludedProgramIds,
          minPercentage,
          maxPercentage,
          programTimeline
        );

      if (!complianceData || complianceData.length === 0) {
        return {
          salesRepId,
          stores: []
        };
      }

      // 3. Group compliance data by store
      const storesMap = new Map();

      for (const item of complianceData) {
        const { store_id } = item;

        if (!storesMap.has(store_id)) {
          storesMap.set(store_id, {
            store_id,
            store_name: item.name || item.store_name,
            programs: []
          });
        }

        const productTags = item.products_tags
          ? item.products_tags
              .split(",")
              .map((tag: string) => tag.trim())
              .filter((tag: string) => tag.length > 0)
          : ["Default"];

        // Create missing_products object with separate entry for each tag
        const missingProducts: Record<
          string,
          {
            sortOrder: number;
            purchasedProducts: any[];
            requiredProducts: any[];
          }
        > = {};

        productTags.forEach((tag: string, index: number) => {
          missingProducts[tag] = {
            sortOrder: index,
            purchasedProducts: [],
            requiredProducts: []
          };
        });

        // Create program object directly from MV data
        const program = {
          manufacturer_id: item.manufacturer_id,
          manufacturer_name: item.manufacturer_name,
          program_id: item.program_id,
          program_detail_id: item.program_detail_id,
          program_name:
            item.program_type === PROGRAM_TYPE.TIER
              ? `${item.program_header} - Tier-${item.tier}`
              : item.program_header,
          compliance_percentage: item.compliance_percentage || 0,
          missing_products: missingProducts,
          earning_opportunity: item.earning_opportunity || 0,
          manufacturer: {
            id: item.manufacturer_id,
            name: item.manufacturer_name,
            avatar: item.manufacturer_logo,
            authorized: item.manufacturer_authorized
          },
          skuNeeded:
            item.total_product_tags -
            (item.total_purchased_distinct_product_ids || 0)
        };

        storesMap.get(store_id).programs.push(program);
      }

      const stores = Array.from(storesMap.values()).filter(
        (store) => store.programs.length > 0
      );

      return {
        salesRepId,
        stores
      };
    } catch (error) {
      console.error("Error in getStoresNearComplianceOptimized:", error);
    }
  }

  /**
   * Get void fill program data for a specific store and program
   */
  private async getVoidFillProgramData(
    storeId: number,
    distributorId: number,
    manufacturerId: number,
    programDetailId: number,
    program: any,
    selectedWarehouseId?: number
  ) {
    try {
      // Get void fill targets for this store and program
      const voidFillTarget =
        await StoreVoidFillTargetRepository.getVoidFillTargetsByStoreAndProgram(
          storeId,
          program.id,
          programDetailId
        );

      // Get program products to filter by
      const programProductIds =
        await ProgramProductRepository.getProductIdsByProgramDetail(
          programDetailId
        );

      if (programProductIds.length === 0) {
        return null;
      }

      // Get program start date for purchase calculation
      const programStartDate = program.startDate || program.ProgramDetails?.[0]?.startDate;
      // For VOID_FILL programs, use the program's full date range (startDate to endDate)
      const programEndDate = program.endDate;

      // Get all products to match against
      const allProducts = await StoreRepository.getManufacturerProducts({
        manufacturerId,
        storeId,
        distributorId,
        selectedWarehouseId
      });

      // Get actual purchased products from line_items/transactions after program start date
      // If programStartDate is missing, we can still return eligible products,
      // but we can't reliably compute purchased products.
      const actualPurchasedProducts = programStartDate
        ? await this.getActualPurchasedProducts(
            storeId,
            distributorId,
            manufacturerId,
            programProductIds,
            programStartDate,
            allProducts,
            selectedWarehouseId,
            programEndDate // Pass end date to use program date range instead of "today"
          )
        : [];

      // Extract category data from JSONB
      const categoryPurchases = voidFillTarget?.categoryPurchases || {};
      const categories = Object.keys(categoryPurchases);
      // Helper function to format category keys for display
      const formatCategoryKey = (key: string): string => {
        if (key === "all_products") {
          return "All Products";
        }
        return key;
      };

      // Build categorized products structure
      const categorizedProducts: any = {};
      let totalEarningOpportunity = 0;
      let totalCompleted = 0;
      let totalEligible = 0;

      for (const category of categories) {
        const categoryData = categoryPurchases[category];
        // Get eligible products, but filter by program products
        const eligibleProductIds = (
          categoryData.eligible_products || []
        ).filter((id: any) => programProductIds.includes(parseInt(id)));

        const [eligibleProducts] = await Promise.all([
          StoreVoidFillTargetRepository.getProductsWithCodes(
            eligibleProductIds,
            distributorId,
            selectedWarehouseId
          )
        ]);

        // For purchased products, use actual transaction data instead of category_purchases
        // Filter actualPurchasedProducts to only include products from this category
        const categoryPurchasedProducts = actualPurchasedProducts.filter(
          (product) => eligibleProductIds.includes(String(product.id))
        );

        // Transform products to match expected format
        const transformedEligibleProducts = eligibleProducts.map(
          (product: any) => {
            const lastTransactionDate =
              product.lastTransactionDate ||
              product.last_transaction_date ||
              null;
            const code = product.distributorCode || product.internal_code;
            const internalCode = getActiveInternalCode(
              code,
              lastTransactionDate,
              distributorId
            );
            // Resolve product name (warehouse-specific or default)
            // Sales rep endpoints are never manufacturer users, so isManufacturerUser = false
            const { name, is_warehouse_specific_product } = resolveProductName(
              product,
              false
            );

            return {
              id: product.id,
              name: name,
              size: null, // Product model doesn't have size field
              caseSkusId: product.caseSkusId,
              unitSkusId: product.unitSkusId,
              boxSkusId: product.boxSkusId,
              wishlist: false,
              internalCode: internalCode,
              lastTransactionDate: lastTransactionDate,
              is_warehouse_specific_product: is_warehouse_specific_product
            };
          }
        );

        const transformedPurchasedProducts = categoryPurchasedProducts.map(
          (product: any) => {
            const lastTransactionDate =
              product.lastTransactionDate ||
              product.last_transaction_date ||
              null;
            const code = product.internal_code || product.distributorCode;
            const internalCode = getActiveInternalCode(
              code,
              lastTransactionDate,
              distributorId
            );
            // Resolve product name (warehouse-specific or default)
            // Sales rep endpoints are never manufacturer users, so isManufacturerUser = false
            const { name, is_warehouse_specific_product } = resolveProductName(
              product,
              false
            );

            return {
              id: product.id,
              name: name,
              size: null, // Product model doesn't have size field
              caseSkusId: product.caseSkusId,
              unitSkusId: product.unitSkusId,
              boxSkusId: product.boxSkusId,
              wishlist: false,
              internalCode: internalCode,
              lastTransactionDate: lastTransactionDate,
              is_warehouse_specific_product: is_warehouse_specific_product
            };
          }
        );

        // Calculate progress for this category
        const completed = transformedPurchasedProducts.length;
        const total = transformedEligibleProducts.length; // Total is just eligible products
        const progressText = `${completed}/${total}`;

        // Update totals
        totalCompleted += completed;
        totalEligible += transformedEligibleProducts.length;

        // Calculate earning opportunity for this category
        const categoryEarningOpportunity =
          transformedEligibleProducts.length *
          (categoryData.rebate_amount || 0);
        totalEarningOpportunity += categoryEarningOpportunity;

        // For required products, exclude the ones that are already purchased
        const requiredProducts = transformedEligibleProducts.filter(
          (product) =>
            !transformedPurchasedProducts.some(
              (purchased) => purchased.id === product.id
            )
        );

        categorizedProducts[formatCategoryKey(category)] = {
          sortOrder: Object.keys(categorizedProducts).length,
          purchasedProducts: transformedPurchasedProducts,
          requiredProducts: requiredProducts, // Use filtered required products
          progress: {
            completed,
            total,
            text: progressText
          }
        };
      }

      // If no categories with data, create default "All Products" category with filtered products
      if (Object.keys(categorizedProducts).length === 0) {
        // If we have store_void_fill_targets categories, use their eligible list.
        // Otherwise, fall back to the program's product set (program_products).
        let filteredEligibleIds: string[] = [];
        if (categories.length > 0) {
          // Get all eligible products from store_void_fill_targets
          const allEligibleProductIds: string[] = [];

          for (const category of Object.keys(categoryPurchases)) {
            const categoryData = categoryPurchases[category];
            allEligibleProductIds.push(
              ...(categoryData.eligible_products || [])
            );
          }

          // Filter by program products
          filteredEligibleIds = allEligibleProductIds.filter((id: any) =>
            programProductIds.includes(parseInt(id))
          );
        } else {
          filteredEligibleIds = programProductIds.map(String);
        }

        const [eligibleProducts] = await Promise.all([
          StoreVoidFillTargetRepository.getProductsWithCodes(
            filteredEligibleIds,
            distributorId,
            selectedWarehouseId
          )
        ]);

        const transformedEligibleProducts = eligibleProducts.map(
          (product: any) => {
            const lastTransactionDate =
              product.lastTransactionDate ||
              product.last_transaction_date ||
              null;
            const originalCode =
              product.distributorCode || product.internal_code || null;
            const internalCode = getActiveInternalCode(
              originalCode,
              lastTransactionDate,
              distributorId
            );
            // oldInternalCode should always contain the original code for reference/troubleshooting
            // It should be NULL only if there was no original code in the database
            const oldInternalCode = originalCode;

            return {
              id: product.id,
              name: product.name,
              size: null,
              caseSkusId: product.caseSkusId,
              unitSkusId: product.unitSkusId,
              boxSkusId: product.boxSkusId,
              wishlist: false,
              internalCode: internalCode,
              oldInternalCode: oldInternalCode,
              lastTransactionDate: lastTransactionDate
            };
          }
        );

        // Get purchased products from actual transaction data
        const purchasedProducts = actualPurchasedProducts.filter(
          (product: any) => filteredEligibleIds.includes(String(product.id))
        );

        const transformedPurchasedProducts = purchasedProducts.map(
          (product: any) => {
            const lastTransactionDate =
              product.lastTransactionDate ||
              product.last_transaction_date ||
              null;
            const originalCode =
              product.distributorCode || product.internal_code || null;
            const internalCode = getActiveInternalCode(
              originalCode,
              lastTransactionDate,
              distributorId
            );
            // oldInternalCode should always contain the original code for reference/troubleshooting
            // It should be NULL only if there was no original code in the database
            const oldInternalCode = originalCode;

            return {
              id: product.id,
              name: product.name,
              size: null,
              caseSkusId: product.caseSkusId,
              unitSkusId: product.unitSkusId,
              boxSkusId: product.boxSkusId,
              wishlist: false,
              internalCode: internalCode,
              oldInternalCode: oldInternalCode,
              lastTransactionDate: lastTransactionDate
            };
          }
        );

        const requiredProducts = transformedEligibleProducts.filter(
          (product: any) =>
            !transformedPurchasedProducts.some(
              (purchased) => purchased.id === product.id
            )
        );

        categorizedProducts["All Products"] = {
          sortOrder: 0,
          purchasedProducts: transformedPurchasedProducts,
          requiredProducts: requiredProducts,
          progress: {
            completed: transformedPurchasedProducts.length,
            total: transformedEligibleProducts.length,
            text: `${transformedPurchasedProducts.length}/${transformedEligibleProducts.length}`
          }
        };

        // Update totals for storeTierDetails
        totalCompleted = transformedPurchasedProducts.length;
        totalEligible = transformedEligibleProducts.length;
      }

      // Create storeTierDetails with graph structure
      const storeTierDetails = voidFillTarget
        ? [
            {
              title: program.name || "VOID_FILL Program",
              overview: `Earn rebates for placing eligible products`,
              tier: 1,
              rebate_calculation: "Fixed $ amount Per Item Per Store (Per POD)",
              rebate_percentage: undefined,
              rebate_amount:
                program.ProgramDetails?.[0]?.rebateAmount?.toString() || "0",
              rebate_type: "fixed",
              fixed_rebate_amount:
                program.ProgramDetails?.[0]?.rebateAmount?.toString() || "0",
              graph: {
                SKUs: {
                  completed: totalCompleted,
                  total: voidFillTarget.remainingTarget // Use remaining_target for total
                }
              },
              progressAchieved: [
                `${totalCompleted}/${voidFillTarget.remainingTarget}`
              ],
              isProgramComplianceQualified:
                totalCompleted >= voidFillTarget.remainingTarget,
              isRebateBasedOnListPrice: false,
              programId: program.id
            }
          ]
        : [];

      const totalSpiffEarning =
        await SalesRepRepository.getSalesRepSpiffEarningByStoreAndManufacturer(
          storeId,
          distributorId,
          undefined,
          manufacturerId,
          false,
          [programDetailId]
        );

      return {
        categorizedProducts,
        totalSpiffEarning: totalSpiffEarning[0]?.total_earning || 0, // Historical earnings
        quantitySold: voidFillTarget?.productsPurchasedLookback || 0,
        storeTierDetails
      };
    } catch (error) {
      console.error("Error in getVoidFillProgramData:", error);
      return null;
    }
  }

  /**
   * Get actual purchased products from line_items/transactions after program start date
   */
  /**
   * Get actual purchased products for a store within a program's date range
   * Uses raw SQL query with LATERAL JOIN to match product variants correctly
   * This matches the ETL logic used in materialized views and validation queries
   * 
   * @param storeId - Store ID to query purchases for
   * @param distributorId - Distributor ID
   * @param manufacturerId - Manufacturer ID to filter products
   * @param programProductIds - Array of product IDs that are eligible for this program
   * @param programStartDate - Program start date (string or Date)
   * @param allProducts - All products available for this program
   * @param selectedWarehouseId - Optional warehouse ID
   * @param programEndDate - Optional program end date (if not provided, uses today)
   * @returns Array of purchased products that match the program's eligible products
   */
  private async getActualPurchasedProducts(
    storeId: number,
    distributorId: number,
    manufacturerId: number,
    programProductIds: number[],
    programStartDate: string | Date,
    allProducts: any[],
    selectedWarehouseId?: number,
    programEndDate?: string | Date
  ): Promise<any[]> {
    try {
      // Convert program start date to Date object if it's a string
      const startDate =
        typeof programStartDate === "string"
          ? new Date(programStartDate)
          : programStartDate;

      // Use program end date if provided, otherwise use today
      // This ensures we query transactions within the program's actual date range
      const endDate = programEndDate
        ? typeof programEndDate === "string"
          ? new Date(programEndDate)
          : programEndDate
        : new Date();

      const startDateStr = startDate.toISOString().split("T")[0];
      const endDateStr = endDate.toISOString().split("T")[0];

      // Use raw SQL query matching the validation query logic to properly handle variant matching
      // This matches the ETL logic used in the materialized view and validation queries
      const purchasedProductIdsResult = await sequelize.query(
        `
        SELECT DISTINCT
          p.id as product_id
        FROM line_items li
        JOIN LATERAL (
          SELECT 
            p_variant.id as variant_id,
            COALESCE(p_variant.parent_product_id, p_variant.id) as primary_id
          FROM products p_variant
          WHERE (
            (p_variant.primary_variant = true AND li.product_id = p_variant.unit_skus_id)
            OR
            (p_variant.primary_variant = true 
             AND (p_variant.unit_skus_id IS NULL OR li.product_id != p_variant.unit_skus_id)
             AND li.product_id = p_variant.box_skus_id)
            OR
            (p_variant.primary_variant = true 
             AND (p_variant.unit_skus_id IS NULL OR li.product_id != p_variant.unit_skus_id)
             AND (p_variant.box_skus_id IS NULL OR li.product_id != p_variant.box_skus_id)
             AND li.product_id = p_variant.case_skus_id)
            OR
            (p_variant.primary_variant = false AND (
              li.product_id = p_variant.unit_skus_id
              OR li.product_id = p_variant.case_skus_id
              OR li.product_id = p_variant.box_skus_id
            ))
          )
          AND p_variant.deleted_at IS NULL
          AND p_variant.manufacturer_id = :manufacturerId
          ORDER BY 
            CASE 
              WHEN p_variant.primary_variant = true AND li.product_id = p_variant.unit_skus_id THEN 1
              WHEN p_variant.primary_variant = true AND li.product_id = p_variant.box_skus_id THEN 2
              WHEN p_variant.primary_variant = true AND li.product_id = p_variant.case_skus_id THEN 3
              ELSE 4
            END,
            p_variant.primary_variant DESC NULLS LAST,
            p_variant.id
          LIMIT 1
        ) p_variant_match ON true
        JOIN products p ON p.id = p_variant_match.primary_id AND p.deleted_at IS NULL
        WHERE li.buyer_id = :storeId
          AND li.buyer_type = 'STORE'
          AND li.seller_type = 'DISTRIBUTOR'
          AND DATE(li.transaction_date) >= DATE(:startDate)
          AND DATE(li.transaction_date) <= DATE(:endDate)
          AND p.id = ANY(ARRAY[:programProductIds]::integer[])
          AND li.deleted_at IS NULL
          AND p.manufacturer_id = :manufacturerId
        GROUP BY p.id
        HAVING SUM(li.total_price) > 0
        ORDER BY p.id
        `,
        {
          replacements: {
            storeId,
            manufacturerId,
            startDate: startDateStr,
            endDate: endDateStr,
            programProductIds
          },
          type: QueryTypes.SELECT
        }
      );

      const purchasedProductIds = (purchasedProductIdsResult as any[]).map(
        (row: any) => row.product_id
      );

      logger.info(
        `[getActualPurchasedProducts] Found ${purchasedProductIds.length} purchased products matching program eligible list: [${purchasedProductIds.join(", ")}]`
      );

      // Get full product details with category_flags for purchased products
      if (purchasedProductIds.length > 0) {
        const fullProductDetails =
          await StoreRepository.getManufacturerProducts({
            manufacturerId,
            storeId,
            distributorId,
            selectedWarehouseId
          });

        // Filter to only include purchased products
        const purchasedProducts = fullProductDetails.filter((product: any) =>
          purchasedProductIds.includes(product.id)
        );

        return purchasedProducts;
      }

      return [];
    } catch (error) {
      logger.error("[getActualPurchasedProducts] Error getting actual purchased products:", error);
      return [];
    }
  }
}

export default new SalesRepDashboardService();
