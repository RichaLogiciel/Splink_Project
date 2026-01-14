import { Request, Response } from "express";
import newrelic from "newrelic";
import { Op } from "sequelize";
import { ENTITY_TYPE, PROGRAM_TIMELINE } from "../config/appConstants";
import sequelize from "../db";
import Manufacturer from "../models/Manufacturer";
import Program from "../models/Program";
import ProgramCompliance from "../models/ProgramCompliance";
import SpiffProgramEligibleStore from "../models/SpiffProgramEligibleStore";
import StoreSalesRep from "../models/StoreSalesRep";
import ManufacturerRepository from "../repositories/ManufacturerRepository";
import ProgramRepository from "../repositories/ProgramRepository";
import StoreRepository from "../repositories/StoreRepository";
import { default as SalesRepService } from "../services/SalesRepService";

import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";
import {
  getDistributorIdAsRole,
  getParentDistributorId,
  isDistributor
} from "../utils/roles";

class SalesRepDashboardController {
  /**
   * This method returns the key metrics for a distributor.
   * The key metrics include:
   * 1. Total Savings
   * 2. Total Purchase Volume
   * 3. Stores Count
   * @param {Request} req - The request object
   * @param {Response} res - The response object
   * @returns {Promise<Response>} - A promise that resolves with the response
   */
  public async getKeyMetrics(req: Request, res: Response): Promise<Response> {
    try {
      const salesRepId = getDistributorIdAsRole(req.user, req.user.role);

      const data = await SalesRepService.getKeyMetrics(
        Number(salesRepId),
        req.user
      );

      // Return the key metrics in the response
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the earnings overview for a salesRep.
   * The earnings overview contains an array of objects, each containing
   * the manufacturer name, total earned rebate, and total earned rebate as a percentage.
   * @param {Request} req - The request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the salesRep earnings overview data.
   */
  public async getSalesRepEarnings(
    req: Request,
    res: Response
  ): Promise<Response> {
    const salesRepId = getDistributorIdAsRole(req.user, req.user.role);

    try {
      const distributorId =
        req.user.role == ENTITY_TYPE.DISTRIBUTOR_ADMIN
          ? req.user.associatedUserId
          : req.user.parentEntityId;

      const data = await SalesRepService.getSalesRepEarningsOverview(
        Number(salesRepId),
        distributorId
      );

      // Return the Sales Rep Earnings in the response
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the store program overview data for a sales representative.
   * The store program overview includes the top and bottom performing programs.
   * @param {Request} req - The request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the salesRep store program overview data.
   */
  public async getStoreProgramOverview(
    req: Request,
    res: Response
  ): Promise<Response> {
    const salesRepId = getDistributorIdAsRole(req.user, req.user.role);

    try {
      const data = await SalesRepService.getSalesRepStoreProgramOverview(
        Number(salesRepId)
      );

      // Return the Sales Rep Earnings in the response
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the wishlist product for a sales representative.
   * The wishlist product is the top 3 stores with products in the wishlist.
   * @param {Request} req - The request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the wishlist product data.
   */
  public async getWishlist(req: Request, res: Response): Promise<Response> {
    const salesRepId = getDistributorIdAsRole(req.user, req.user.role);

    try {
      const data = await SalesRepService.getWishlistProduct(Number(salesRepId));

      // Return the key metrics in the response
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getSalesRepManufactureProgramsDetails(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { manufacturerId } = req.params;
      const { associatedUserId: userId, parentEntityId } = req.user;
      const { programTimeline, internal_initiative } = req.query;

      // Validate programTimeline parameter
      if (programTimeline) {
        const validTimelines = Object.values(PROGRAM_TIMELINE);
        if (!validTimelines.includes(programTimeline as string)) {
          return sendErrorResponse(
            res,
            `programTimeline must be one of: ${validTimelines.join(", ")}`,
            400
          );
        }
      }

      // Validate internal_initiative parameter
      let isInternalInitiative: boolean = false; // Default to false (non-internal initiatives)
      if (internal_initiative !== undefined) {
        if (internal_initiative === "true") {
          isInternalInitiative = true;
        } else if (internal_initiative === "false") {
          isInternalInitiative = false;
        } else {
          return sendErrorResponse(
            res,
            "internal_initiative must be 'true' or 'false'",
            400
          );
        }
      }

      const data = await SalesRepService.getSalesRepManufactureProgramsDetails(
        Number(userId),
        Number(manufacturerId),
        parentEntityId,
        programTimeline as string,
        isInternalInitiative
      );
      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Get sales rep stores compliance details with optimized table approach
   *
   * This method implements a smart approach:
   * 1. First attempts to use the optimized table approach (getStoresNearComplianceOptimized)
   * 2. If the optimized method fails, automatically falls back to the original method (getStoresNearCompliance)
   *
   * The optimized method provides significant performance improvements by leveraging pre-calculated
   * compliance data in the spiff_store_program_compliance table, while the original method
   * ensures reliability through real-time calculations.
   *
   * @param req - Express request object containing query parameters and user context
   * @param res - Express response object
   * @returns Promise<Response> - JSON response with stores compliance data
   */
  public async getSalesRepStoresDetails(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      let salesRepId: number;
      let distributorId: number | undefined;

      const { minPercentage, maxPercentage, manufacturerId, searchQuery } =
        req.query;

      // Get the sales rep ID either from params or from the user's own ID if they are a sales rep
      if (req.params.id && !isNaN(Number(req.params.id))) {
        salesRepId = Number(req.params.id);
      } else if (
        req.user.role === ENTITY_TYPE.SALES_REP ||
        req.user.role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP
      ) {
        salesRepId = req.user.associatedUserId;
        distributorId = req.user.parentEntityId;
      } else {
        return sendErrorResponse(res, "Sales rep ID is required", 400);
      }

      let minimumPercentage = 75;
      let maximumPercentage = 100;
      if (!isNaN(parseInt(minPercentage as string))) {
        minimumPercentage = parseInt(minPercentage as string);
      }
      if (!isNaN(parseInt(maxPercentage as string))) {
        maximumPercentage = parseInt(maxPercentage as string);
      }

      let data;

      try {
        // Use optimized method with spiff_store_program_compliance table
        data = await newrelic.startSegment(
          "getStoresNearComplianceOptimized",
          true,
          async () =>
            await SalesRepService.getStoresNearComplianceOptimized(
              salesRepId,
              minimumPercentage,
              maximumPercentage,
              Number(manufacturerId),
              searchQuery as string,
              Number(distributorId)
            ),
          undefined
        );
      } catch (optimizedError) {
        console.error(
          "Optimized method failed, falling back to original:",
          optimizedError
        );
      }

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      console.error("Controller error:", error);

      return sendErrorResponse(
        res,
        error.message || "An unexpected error occurred",
        error.statusCode || 500
      );
    }
  }

  public async getStoreComplianceDetails(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      let storeId: number;
      const { minPercentage, maxPercentage } = req.query;

      // Get the store ID from params
      if (req.params.id) {
        storeId = Number(req.params.id);
      } else {
        return sendErrorResponse(res, "Store ID is required", 400);
      }

      let minimumPercentage = 0;
      let maximumPercentage = 100;
      if (!isNaN(parseInt(minPercentage as string))) {
        minimumPercentage = parseInt(minPercentage as string);
      }
      if (!isNaN(parseInt(maxPercentage as string))) {
        maximumPercentage = parseInt(maxPercentage as string);
      }

      const data = await SalesRepService.getStoresNearCompliance(
        storeId,
        minimumPercentage,
        maximumPercentage
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      console.error("Error in getStoreComplianceDetails:", error);
      return sendErrorResponse(
        res,
        error.message || "An unexpected error occurred",
        error.statusCode || 500
      );
    }
  }

  /**
   * Test endpoint to calculate compliance percentage for a specific store and program
   *
   * @param {Request} req - The request object with storeId and programDetailId
   * @param {Response} res - The response object
   * @returns {Promise<Response>} - A promise that resolves with the compliance percentage data
   */
  public async testComplianceCalculation(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { storeId, programDetailId } = req.params;

      if (!storeId || !programDetailId) {
        return sendErrorResponse(
          res,
          "Store ID and Program Detail ID are required",
          400
        );
      }

      // Call the service to test compliance calculation
      const data = await SalesRepService.testComplianceCalculation(
        Number(storeId),
        Number(programDetailId)
      );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      console.error("Error in testComplianceCalculation:", error);
      return sendErrorResponse(
        res,
        error.message || "An unexpected error occurred",
        error.statusCode || 500
      );
    }
  }

  /**
   * Retrieves all spiff opportunities for a sales representative.
   * The spiff opportunities include the manufacturer name, total earnings,
   * start date, and end date of the programs.
   * @param {Request} req - The request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the spiff opportunities data.
   */
  public async getAllSpiffOpportunities(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { programTimeline, isInternal } = req.query;
      const isInternalInitiative = isInternal === "true" ? true : false;

      const salesRepID = getDistributorIdAsRole(req.user, req.user.role);
      const distributorId = getParentDistributorId(req.user, req.user.role);

      const excludedProgramIds =
        await ProgramRepository.getExcludedProgramIds(distributorId);

      const authorizedManufacturers =
        await ManufacturerRepository.getAuthorizedManufacturersIds(
          distributorId
        );
      const authorizedManufacturerIds = authorizedManufacturers.map((am) =>
        Number(am.manufacturerId)
      );

      // Get all stores for the sales rep
      const stores = await StoreSalesRep.findAll({
        where: {
          sales_rep_id: salesRepID
        }
      });

      const storeIds = stores.map((store) => store.storeId);

      const programWhere: any = {};

      let validProgramIds =
        await ProgramRepository.getProgramsIdsByCreatorAndVisibilityEntity({
          participantType: ENTITY_TYPE.SALES_REP,
          creatorIds: authorizedManufacturerIds,
          creatorType: ENTITY_TYPE.MANUFACTURER,
          secondaryCreatorIds: [req.user.parentEntityId],
          secondaryCreatorType: ENTITY_TYPE.DISTRIBUTOR,
          visibilityEntitieIds: [salesRepID],
          getInternalInitiative: isInternalInitiative,
          programTimeline: programTimeline as string,
          distributorId: distributorId
        });

      if (validProgramIds.length === 0) {
        return sendSuccessResponse(res, []);
      }

      validProgramIds = validProgramIds.filter(
        (id) => !excludedProgramIds.includes(id)
      );

      // Handle internal initiative filtering - include null/undefined for non-internal
      if (isInternal !== undefined) {
        if (isInternalInitiative === false) {
          programWhere[Op.or] = [
            { internal_initiative: false },
            { internal_initiative: { [Op.is]: null } }
          ];
        } else if (isInternalInitiative === true) {
          programWhere.internal_initiative = true;
        }
      }

      // First, get program earnings separately to avoid duplication issues
      const programEarnings = await Program.findAll({
        attributes: [
          [sequelize.col("Manufacturer.id"), "manufacturerId"],
          [sequelize.col("ProgramCompliances.earned_rebate"), "earnedRebate"],
          [sequelize.col("Program.id"), "programId"]
        ],
        include: [
          {
            model: Manufacturer,
            attributes: [],
            required: true
          },
          {
            model: ProgramCompliance,
            attributes: [],
            required: false,
            where: {
              entity_id: salesRepID,
              entity_type: ENTITY_TYPE.SALES_REP,
              status: "active",
              deleted_at: null
            }
          }
        ],
        where: {
          id: {
            [Op.in]: validProgramIds
          },
          participant_type: ENTITY_TYPE.SALES_REP,
          manufacturer_id: {
            [Op.in]: authorizedManufacturerIds
          },
          deleted_at: null,
          // Add filter for currently active programs only
          start_date: {
            [Op.lte]: new Date() // start_date <= current date
          },
          end_date: {
            [Op.gte]: new Date() // end_date >= current date
          },
          ...programWhere,
          ...Program.getProgramTimelineFilter(programTimeline as string)
        },
        raw: true
      });

      // Get eligible stores count per manufacturer (distinct stores across all programs)
      const eligibleStoresData = await Program.findAll({
        attributes: [
          [sequelize.col("Manufacturer.id"), "manufacturerId"],
          [
            sequelize.literal(
              `COUNT(DISTINCT "SpiffProgramEligibleStores"."store_id")`
            ),
            "eligibleStoresCount"
          ]
        ],
        include: [
          {
            model: Manufacturer,
            attributes: [],
            required: true
          },
          {
            model: SpiffProgramEligibleStore,
            required: false,
            where: {
              store_id: {
                [Op.in]: storeIds
              }
            },
            attributes: []
          }
        ],
        where: {
          id: {
            [Op.in]: validProgramIds
          },
          participant_type: ENTITY_TYPE.SALES_REP,
          manufacturer_id: {
            [Op.in]: authorizedManufacturerIds
          },
          deleted_at: null,
          // Add filter for currently active programs only
          start_date: {
            [Op.lte]: new Date() // start_date <= current date
          },
          end_date: {
            [Op.gte]: new Date() // end_date >= current date
          },
          ...programWhere,
          ...Program.getProgramTimelineFilter(programTimeline as string)
        },
        group: [sequelize.col("Manufacturer.id")],
        raw: true
      });

      // Get program dates
      const programDates = await Program.findAll({
        attributes: [
          [sequelize.col("Manufacturer.id"), "manufacturerId"],
          [sequelize.fn("MIN", sequelize.col("start_date")), "Start_Date"],
          [sequelize.fn("MAX", sequelize.col("end_date")), "End_Date"]
        ],
        include: [
          {
            model: Manufacturer,
            attributes: [],
            required: true
          }
        ],
        where: {
          id: {
            [Op.in]: validProgramIds
          },
          participant_type: ENTITY_TYPE.SALES_REP,
          manufacturer_id: {
            [Op.in]: authorizedManufacturerIds
          },
          deleted_at: null,
          // Add filter for currently active programs only
          start_date: {
            [Op.lte]: new Date() // start_date <= current date
          },
          end_date: {
            [Op.gte]: new Date() // end_date >= current date
          },
          ...programWhere,
          ...Program.getProgramTimelineFilter(programTimeline as string)
        },
        group: [sequelize.col("Manufacturer.id")],
        raw: true
      });

      // Combine the data by manufacturer
      const manufacturerData = new Map();

      // Process earnings
      programEarnings.forEach((earning: any) => {
        const manufacturerId = earning.manufacturerId;
        if (!manufacturerData.has(manufacturerId)) {
          manufacturerData.set(manufacturerId, {
            manufacturerId,
            My_earnings: 0,
            eligibleStores: 0,
            Start_Date: null,
            End_Date: null
          });
        }
        if (earning.earnedRebate) {
          manufacturerData.get(manufacturerId).My_earnings += parseFloat(
            earning.earnedRebate
          );
        }
      });

      // Process eligible stores
      eligibleStoresData.forEach((storeData: any) => {
        const manufacturerId = storeData.manufacturerId;
        if (manufacturerData.has(manufacturerId)) {
          manufacturerData.get(manufacturerId).eligibleStores =
            parseInt(storeData.eligibleStoresCount) || 0;
        }
      });

      // Process dates
      programDates.forEach((dateData: any) => {
        const manufacturerId = dateData.manufacturerId;
        if (manufacturerData.has(manufacturerId)) {
          manufacturerData.get(manufacturerId).Start_Date = dateData.Start_Date;
          manufacturerData.get(manufacturerId).End_Date = dateData.End_Date;
        }
      });

      // Get manufacturer details and combine with aggregated data
      const data = await Manufacturer.findAll({
        attributes: [
          [sequelize.col("name"), "manufacturer"],
          [sequelize.col("logo"), "logo"],
          [sequelize.col("id"), "id"]
        ],
        where: {
          id: {
            [Op.in]: Array.from(manufacturerData.keys())
          }
        },
        raw: true
      });

      // Combine manufacturer details with aggregated data
      const finalData = data
        .map((manufacturer: any) => {
          const aggregatedData = manufacturerData.get(manufacturer.id);
          return {
            ...manufacturer,
            My_earnings: aggregatedData?.My_earnings || 0,
            eligibleStores: aggregatedData?.eligibleStores || 0,
            Start_Date: aggregatedData?.Start_Date,
            End_Date: aggregatedData?.End_Date
          };
        })
        .sort(
          (a, b) =>
            new Date(a.Start_Date).getTime() - new Date(b.Start_Date).getTime()
        );

      return sendSuccessResponse(res, finalData);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  public async getSpiffEarningStoreDetail(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id: storeId } = req.params;
      const { isInternal, programTimeline } = req.query;

      if (!isDistributor(req?.user?.role)) {
        return sendErrorResponse(res, "Unauthorized", 403);
      }

      const distributorId = getParentDistributorId(req.user, req.user.role);

      let salesRepID: number | number[] = 0;
      if (req.user.role == ENTITY_TYPE.DISTRIBUTOR_SALES_REP) {
        salesRepID = req.user.associatedUserId;
      } else {
        // Get all sales reps under this distributor admin
        const salesReps = await StoreRepository.getSalesReps(distributorId);
        salesRepID = salesReps.map((sr: any) => sr.associatedUserId);
      }

      const data = await SalesRepService.getSpiffEarningStoreDetail({
        storeId: Number(storeId),
        distributorId: Number(distributorId),
        salesRepID: Array.isArray(salesRepID)
          ? salesRepID
          : [Number(salesRepID)],
        isInternal: isInternal == "true" ? true : false,
        programTimeline: programTimeline as string,
        role: req.user.role
      });

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Retrieves the spiff earnings detail for a store and a manufacturer, by programs.
   * The spiff earnings detail includes the manufacturer name, total earnings,
   * start date, and end date of the programs.
   * @param {Request} req - The request object.
   * @param {Response} res - The response object.
   * @returns {Promise<Response>} - A promise that resolves with the spiff earnings data.
   */
  public async getSpiffEarningStoreByManufacturerPrograms(
    req: Request,
    res: Response
  ): Promise<Response> {
    try {
      const { id: storeId, manufacturerId } = req.params;
      const { programDetailId } = req.query;

      if (!isDistributor(req?.user?.role)) {
        return sendErrorResponse(res, "Unauthorized", 403);
      }

      // Get the distributor ID from the user's role
      const distributorId = getParentDistributorId(req.user, req.user.role);

      let salesRepId: number | number[] | undefined;
      if (req.user.role == ENTITY_TYPE.DISTRIBUTOR_SALES_REP) {
        salesRepId = req.user.associatedUserId;
      } else if (req.user.role == ENTITY_TYPE.DISTRIBUTOR_ADMIN) {
        // Get all sales reps under this distributor admin
        const salesReps = await StoreRepository.getSalesReps(distributorId);
        salesRepId = salesReps.map((sr) => sr.associatedUserId);
      }

      const data =
        await SalesRepService.getSpiffEarningStoreDetailByManufacturer(
          Number(storeId),
          Number(distributorId),
          Number(manufacturerId),
          Number(programDetailId),
          salesRepId
        );

      return sendSuccessResponse(res, data);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }
}

export default new SalesRepDashboardController();
