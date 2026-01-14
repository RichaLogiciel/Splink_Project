import { Router } from "express";
import asyncHandler from "../middleware/asyncHandler";
import ChainController from "../controllers/ChainController";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Chain
 *     description: API endpoints related to chain key metrics.
 *
 * /chain/key-metrics?userId={userId}:
 *   get:
 *     summary: Retrieve key metrics for a specific user.
 *     tags: [Chain]
 *     parameters:
 *       - name: userId
 *         in: query
 *         required: true
 *         description: The ID of the user for whom to retrieve key metrics.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successful retrieval of chain key metrics.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Status of the request.
 *                   example: success
 *                 data:
 *                   type: object
 *                   description: Object containing various key metrics.
 *                   properties:
 *                     TotalSavingsCardData:
 *                       type: object
 *                       description: Total savings data with year-over-year (YOY) and withdrawal info.
 *                       properties:
 *                         yoyValue:
 *                           type: integer
 *                           description: Year-over-year value.
 *                           example: 0
 *                         info:
 *                           type: string
 *                           description: Additional information.
 *                           example: "Total amount through November 6th, 2024"
 *                         value:
 *                           type: integer
 *                           description: Total savings value.
 *                           example: 4
 *                         footerInfo:
 *                           type: string
 *                           description: Footer information, including next withdrawal date.
 *                           example: "Next Withdrawal Date December 1, 2024"
 *                         link:
 *                           type: object
 *                           description: Link information for actions related to savings.
 *                           properties:
 *                             label:
 *                               type: string
 *                               description: Label for the link.
 *                               example: "Withdraw Funds"
 *                             href:
 *                               type: string
 *                               description: URL for the link.
 *                               example: "/"
 *                     TotalManufacturer:
 *                       type: object
 *                       description: Total number of manufacturers.
 *                       properties:
 *                         value:
 *                           type: integer
 *                           description: Total manufacturer count.
 *                           example: 1
 *                     TotalTier:
 *                       type: object
 *                       description: Total tier level achieved.
 *                       properties:
 *                         value:
 *                           type: integer
 *                           description: Current tier level.
 *                           example: 1
 *                     TierAchievedData:
 *                       type: object
 *                       description: Data for the tier level achieved.
 *                       properties:
 *                         value:
 *                           type: integer
 *                           description: Value representing the tier level achieved.
 *                           example: 1
 *       500:
 *         description: Internal server error.
 */

router.get("/key-metrics", asyncHandler(ChainController.getChainKeyMetrics));

/**
 * @swagger
 * tags:
 *   - name: Chain
 *     description: API endpoints related to chain dashboard metrics.
 *
 * /chain/get-stores:
 *   get:
 *     summary: Retrieve a list of stores associated with the chain.
 *     tags: [Chain]
 *     parameters:
 *       - name: chainId
 *         in: query
 *         required: true
 *         description: The ID of the chain for whom to retrieve key metrics.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved list of stores.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Status of the response.
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   description: Array of stores associated with the chain.
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Full name of the distributor.
 *                         example: "David"
 *                       userId:
 *                         type: integer
 *                         description: Unique identifier for the user.
 *                         example: 2
 *                       associatedUserId:
 *                         type: integer
 *                         description: Unique identifier for the associated distributor.
 *                         example: 1
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get("/get-stores", asyncHandler(ChainController.getStores));

/**
 * @swagger
 * tags:
 *   - name: Chain
 *     description: API endpoints related to chain store listings and their sales volumes.
 *
 * /chain/chains-with-stores:
 *   get:
 *     summary: Get chains with their stores by distributor (efficient structure)
 *     tags: [Chain]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: distributorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The distributor ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Sort order
 *       - in: query
 *         name: sortKey
 *         schema:
 *           type: string
 *           enum: [chain_name, total_stores, total_purchase_volume, total_rebate_amount, compliance_percentage]
 *           default: chain_name
 *         description: Field to sort by
 *       - in: query
 *         name: searchQuery
 *         schema:
 *           type: string
 *         description: Search query for chain names
 *       - in: query
 *         name: programTimeline
 *         schema:
 *           type: string
 *           enum: [Current, Past, Future]
 *           default: Current
 *         description: Program timeline filter
 *     responses:
 *       200:
 *         description: Chains with stores retrieved successfully (efficient structure with deduplicated programs)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     chains:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           totalStores:
 *                             type: integer
 *                           totalPurchaseVolume:
 *                             type: number
 *                           totalEarnedRebate:
 *                             type: number
 *                           compliancePercentage:
 *                             type: number
 *                           programs:
 *                             type: array
 *                             description: Deduplicated programs with store compliance data
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                 name:
 *                                   type: string
 *                                 manufacturer:
 *                                   type: object
 *                                 storeCompliance:
 *                                   type: array
 *                                   description: Compliance data for each store in this program
 *                           stores:
 *                             type: array
 *                             description: Simplified store data without duplicate program details
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: integer
 *                                 name:
 *                                   type: string
 *                                 address:
 *                                   type: string
 *                                 totalPrograms:
 *                                   type: integer
 *                                 enrolledPrograms:
 *                                   type: integer
 *                                 compliantPrograms:
 *                                   type: integer
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalChains:
 *                           type: integer
 *                         totalStores:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/chains-with-stores",
  asyncHandler(ChainController.getChainsWithStores)
);

/**
 * @swagger
 * tags:
 *   - name: Chain
 *     description: API endpoints related to chain store listings and their sales volumes.
 *
 * /chain/store/listing:
 *   get:
 *     summary: Retrieve a list of stores and their sales volumes for a chain.
 *     tags: [Chain]
 *     parameters:
 *       - name: searchQuery
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Search query to filter stores by name or other criteria.
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number for pagination (default is 1).
 *       - name: sort
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Sort order for the store listing (default is ASC).
 *     responses:
 *       200:
 *         description: Successful retrieval of store listings and sales volume.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Status of the request.
 *                   example: success
 *                 data:
 *                   type: array
 *                   description: List of stores with their sales volume data.
 *                   items:
 *                     type: object
 *                     properties:
 *                       storeId:
 *                         type: integer
 *                         nullable: true
 *                         description: The unique ID of the store.
 *                         example: 123
 *                       storeName:
 *                         type: string
 *                         nullable: true
 *                         description: The name of the store.
 *                         example: "Central Grocery"
 *                       salesVolume:
 *                         type: string
 *                         description: Total sales volume associated with the store.
 *                         example: "150000.00"
 *                       region:
 *                         type: string
 *                         description: The region where the store is located.
 *                         example: "East Coast"
 *                       category:
 *                         type: string
 *                         description: The category of the store.
 *                         example: "Grocery"
 *       400:
 *         description: Invalid query parameters.
 *       500:
 *         description: Internal server error.
 */
router.get("/store/listing", asyncHandler(ChainController.getStoresListing));

/**
 * @swagger
 * tags:
 *   - name: Chain
 *     description: API endpoints related to chain listings and metrics.
 *
 * /chain/listing:
 *   get:
 *     summary: Get lightweight chain listing for better performance
 *     tags: [Chain]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: distributorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The distributor ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page (max 50)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Sort order
 *       - in: query
 *         name: sortKey
 *         schema:
 *           type: string
 *           enum: [chain_name, total_stores, total_purchase_volume, total_rebate_amount, compliance_percentage]
 *           default: chain_name
 *         description: Field to sort by
 *       - in: query
 *         name: searchQuery
 *         schema:
 *           type: string
 *         description: Search query for chain names
 *       - in: query
 *         name: programTimeline
 *         schema:
 *           type: string
 *           enum: [Current, Past, Future]
 *           default: Current
 *         description: Program timeline filter
 *     responses:
 *       200:
 *         description: Lightweight chain listing retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     chains:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           totalStores:
 *                             type: integer
 *                           enrolledStores:
 *                             type: integer
 *                           compliantStores:
 *                             type: integer
 *                           compliancePercentage:
 *                             type: number
 *                           totalPurchaseVolume:
 *                             type: number
 *                           totalEarnedRebate:
 *                             type: number
 *                           programCount:
 *                             type: integer
 *                           storeCount:
 *                             type: integer
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalChains:
 *                           type: integer
 *                         totalStores:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get("/listing", asyncHandler(ChainController.getChainListing));

/**
 * @swagger
 * tags:
 *   - name: Chain
 *     description: API endpoints for detailed chain information.
 *
 * /chain/{chainId}:
 *   get:
 *     summary: Get detailed information for a specific chain
 *     tags: [Chain]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chainId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The chain ID
 *       - in: query
 *         name: distributorId
 *         schema:
 *           type: integer
 *         description: The distributor ID for filtering
 *       - in: query
 *         name: programTimeline
 *         schema:
 *           type: string
 *           enum: [Current, Past, Future]
 *           default: Current
 *         description: Program timeline filter
 *       - in: query
 *         name: includePrograms
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Include detailed program information
 *       - in: query
 *         name: includeStores
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Include detailed store information
 *       - in: query
 *         name: includeManufacturerSummaries
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Include manufacturer purchase summaries for this chain
 *     responses:
 *       200:
 *         description: Detailed chain information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     distributorId:
 *                       type: integer
 *                     totalStores:
 *                       type: integer
 *                     enrolledStores:
 *                       type: integer
 *                     compliantStores:
 *                       type: integer
 *                     compliancePercentage:
 *                       type: number
 *                     totalEarnedRebate:
 *                       type: number
 *                     totalPurchaseVolume:
 *                       type: number
 *                     programs:
 *                       type: array
 *                       description: Detailed program information (only if includePrograms=true)
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           programType:
 *                             type: string
 *                           manufacturer:
 *                             type: object
 *                           storeCompliance:
 *                             type: array
 *                     stores:
 *                       type: array
 *                       description: Detailed store information (only if includeStores=true)
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           address:
 *                             type: string
 *                           totalPrograms:
 *                             type: integer
 *                           enrolledPrograms:
 *                             type: integer
 *                           compliantPrograms:
 *                             type: integer
 *                     manufacturerSummaries:
 *                       type: array
 *                       description: Manufacturer purchase summaries (only if includeManufacturerSummaries=true)
 *                       items:
 *                         type: object
 *                         properties:
 *                           manufacturerId:
 *                             type: integer
 *                           manufacturerName:
 *                             type: string
 *                           manufacturerLogo:
 *                             type: string
 *                           authorized:
 *                             type: boolean
 *                           totalPurchaseVolume:
 *                             type: number
 *                           totalEarnedRebate:
 *                             type: number
 *                           totalPrograms:
 *                             type: integer
 *                           enrolledPrograms:
 *                             type: integer
 *                           compliantPrograms:
 *                             type: integer
 *                           compliancePercentage:
 *                             type: number
 *                           totalStores:
 *                             type: integer
 *                           enrolledStores:
 *                             type: integer
 *                           compliantStores:
 *                             type: integer
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to this chain
 *       404:
 *         description: Chain not found
 *       500:
 *         description: Internal server error
 */
/**
 * @swagger
 * tags:
 *   - name: Chain
 *     description: API endpoints for chain programs and stores.
 *
 * /chain/{chainId}/details:
 *   get:
 *     summary: Get refactored chain details with nested program structure
 *     tags: [Chain]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chainId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The chain ID
 *       - in: query
 *         name: distributorId
 *         schema:
 *           type: integer
 *         description: Optional distributor ID for filtering
 *       - in: query
 *         name: programTimeline
 *         schema:
 *           type: string
 *           enum: [Current, Past, Future]
 *           default: Current
 *         description: Program timeline filter
 *     responses:
 *       200:
 *         description: Chain details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 167
 *                     name:
 *                       type: string
 *                       example: "ATLANTIS MANAGEMENT GROUP"
 *                     distributorId:
 *                       type: integer
 *                       nullable: true
 *                       example: 166
 *                     summary:
 *                       type: object
 *                       properties:
 *                         totalStores:
 *                           type: integer
 *                         enrolledStores:
 *                           type: integer
 *                         compliantStores:
 *                           type: integer
 *                         compliancePercentage:
 *                           type: number
 *                         totalPurchaseVolume:
 *                           type: number
 *                         totalEarnedRebate:
 *                           type: number
 *                     programs:
 *                       type: object
 *                       properties:
 *                         enrolled:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               tiers:
 *                                 type: array
 *                                 items:
 *                                   type: object
 *                                   properties:
 *                                     programDetailId:
 *                                       type: integer
 *                                     tier:
 *                                       type: integer
 *                                     stores:
 *                                       type: object
 *                                       properties:
 *                                         compliant:
 *                                           type: array
 *                                           items:
 *                                             type: object
 *                                             properties:
 *                                               id:
 *                                                 type: integer
 *                                               name:
 *                                                 type: string
 *                                         nonCompliant:
 *                                           type: array
 *                                           items:
 *                                             type: object
 *                                             properties:
 *                                               id:
 *                                                 type: integer
 *                                               name:
 *                                                 type: string
 *                         unenrolled:
 *                           type: array
 *                           items:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Chain not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:chainId/details",
  asyncHandler(ChainController.getRefactoredChainDetails)
);

/**
 * @swagger
 * /chain/{chainId}/programs:
 *   get:
 *     summary: Get programs for a specific chain with pagination and filtering
 *     tags: [Chain]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chainId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The chain ID
 *       - in: query
 *         name: distributorId
 *         schema:
 *           type: integer
 *         description: The distributor ID for filtering
 *       - in: query
 *         name: programTimeline
 *         schema:
 *           type: string
 *           enum: [Current, Past, Future]
 *           default: Current
 *         description: Program timeline filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page (max 50)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Sort order
 *       - in: query
 *         name: sortKey
 *         schema:
 *           type: string
 *           enum: [program_name, manufacturer_name, compliance_percentage, total_earned_rebate]
 *           default: program_name
 *         description: Field to sort by
 *       - in: query
 *         name: searchQuery
 *         schema:
 *           type: string
 *         description: Search query for program or manufacturer names
 *     responses:
 *       200:
 *         description: Chain programs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     programs:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           programId:
 *                             type: integer
 *                           programDetailId:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           programType:
 *                             type: string
 *                           programHeader:
 *                             type: string
 *                           tier:
 *                             type: integer
 *                           paymentTerms:
 *                             type: string
 *                           startDate:
 *                             type: string
 *                             format: date-time
 *                           endDate:
 *                             type: string
 *                             format: date-time
 *                           manufacturer:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               logo:
 *                                 type: string
 *                               authorized:
 *                                 type: boolean
 *                           rebateType:
 *                             type: string
 *                           rebateAmount:
 *                             type: number
 *                           rebatePercentage:
 *                             type: number
 *                           overview:
 *                             type: string
 *                           criteria:
 *                             type: string
 *                           minSpend:
 *                             type: number
 *                           minQty:
 *                             type: integer
 *                           maxQty:
 *                             type: integer
 *                           productsTags:
 *                             type: string
 *                           rebateCalculation:
 *                             type: string
 *                           storeCompliance:
 *                             type: array
 *                             items:
 *                               type: object
 *                               properties:
 *                                 storeId:
 *                                   type: integer
 *                                 storeName:
 *                                   type: string
 *                                 isEnrolled:
 *                                   type: boolean
 *                                 isCompliant:
 *                                   type: boolean
 *                                 complianceStatus:
 *                                   type: string
 *                                   enum: [Compliant, Non-Compliant, Pending]
 *                                 earnedRebate:
 *                                   type: number
 *                                 totalPurchaseVolume:
 *                                   type: number
 *                           totalStores:
 *                             type: integer
 *                           enrolledStores:
 *                             type: integer
 *                           compliantStores:
 *                             type: integer
 *                           compliancePercentage:
 *                             type: number
 *                           totalEarnedRebate:
 *                             type: number
 *                           totalPurchaseVolume:
 *                             type: number
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalPrograms:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to this chain
 *       404:
 *         description: Chain not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:chainId/programs",
  asyncHandler(ChainController.getChainPrograms)
);

/**
 * @swagger
 * tags:
 *   - name: Chain
 *     description: API endpoints for chain programs and stores.
 *
 * /chain/{chainId}/stores:
 *   get:
 *     summary: Get stores for a specific chain with pagination and filtering
 *     tags: [Chain]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chainId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The chain ID
 *       - in: query
 *         name: distributorId
 *         schema:
 *           type: integer
 *         description: The distributor ID for filtering
 *       - in: query
 *         name: manufacturerId
 *         schema:
 *           type: integer
 *         description: The manufacturer ID for filtering stores by manufacturer programs
 *       - in: query
 *         name: programTimeline
 *         schema:
 *           type: string
 *           enum: [Current, Past, Future]
 *           default: Current
 *         description: Program timeline filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page (max 50)
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Sort order
 *       - in: query
 *         name: sortKey
 *         schema:
 *           type: string
 *           enum: [store_name, total_programs, enrolled_programs, compliant_programs, total_earned_rebate, total_purchase_volume]
 *           default: store_name
 *         description: Field to sort by
 *       - in: query
 *         name: searchQuery
 *         schema:
 *           type: string
 *         description: Search query for store names or addresses
 *     responses:
 *       200:
 *         description: Chain stores retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     stores:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           address:
 *                             type: string
 *                           city:
 *                             type: string
 *                           state:
 *                             type: string
 *                           zip:
 *                             type: string
 *                           phone:
 *                             type: string
 *                           externalStoreId:
 *                             type: string
 *                           totalPrograms:
 *                             type: integer
 *                           enrolledPrograms:
 *                             type: integer
 *                           compliantPrograms:
 *                             type: integer
 *                           totalEarnedRebate:
 *                             type: number
 *                           totalPurchaseVolume:
 *                             type: number
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                         totalPages:
 *                           type: integer
 *                         totalStores:
 *                           type: integer
 *                         limit:
 *                           type: integer
 *                         hasNextPage:
 *                           type: boolean
 *                         hasPrevPage:
 *                           type: boolean
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to this chain
 *       404:
 *         description: Chain not found
 *       500:
 *         description: Internal server error
 */
router.get("/:chainId/stores", asyncHandler(ChainController.getChainStores));

/**
 * @swagger
 * tags:
 *   - name: Chain
 *     description: API endpoints for detailed chain information.
 *
 * /chain/{chainId}:
 *   get:
 *     summary: Get detailed information for a specific chain
 *     tags: [Chain]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chainId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The chain ID
 *       - in: query
 *         name: distributorId
 *         schema:
 *           type: integer
 *         description: The distributor ID for filtering
 *       - in: query
 *         name: programTimeline
 *         schema:
 *           type: string
 *           enum: [Current, Past, Future]
 *           default: Current
 *         description: Program timeline filter
 *       - in: query
 *         name: includePrograms
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Include detailed program information
 *       - in: query
 *         name: includeStores
 *         schema:
 *           type: string
 *           enum: [true, false]
 *           default: false
 *         description: Include detailed store information
 *     responses:
 *       200:
 *         description: Detailed chain information retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     name:
 *                       type: string
 *                     distributorId:
 *                       type: integer
 *                     totalStores:
 *                       type: integer
 *                     enrolledStores:
 *                       type: integer
 *                     compliantStores:
 *                       type: integer
 *                     compliancePercentage:
 *                       type: number
 *                     totalEarnedRebate:
 *                       type: number
 *                     totalPurchaseVolume:
 *                       type: number
 *                     programs:
 *                       type: array
 *                       description: Detailed program information (only if includePrograms=true)
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           programType:
 *                             type: string
 *                           manufacturer:
 *                             type: object
 *                           storeCompliance:
 *                             type: array
 *                     stores:
 *                       type: array
 *                       description: Detailed store information (only if includeStores=true)
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           name:
 *                             type: string
 *                           address:
 *                             type: string
 *                           totalPrograms:
 *                             type: integer
 *                           enrolledPrograms:
 *                             type: integer
 *                           compliantPrograms:
 *                             type: integer
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Access denied to this chain
 *       404:
 *         description: Chain not found
 *       500:
 *         description: Internal server error
 */
router.get("/:chainId", asyncHandler(ChainController.getChainDetails));

/**
 * @swagger
 * /chain/{manufacturerId}/chains:
 *   get:
 *     summary: Get chains for a specific manufacturer
 *     description: Retrieve chains associated with a manufacturer, with pagination and filtering options
 *     tags: [Chains]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: manufacturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The manufacturer ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *           maximum: 50
 *         description: Number of chains per page
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Sort direction
 *       - in: query
 *         name: sortKey
 *         schema:
 *           type: string
 *           enum: [chain_name, total_stores, compliance_percentage, total_earned_rebate]
 *           default: chain_name
 *         description: Field to sort by
 *       - in: query
 *         name: searchQuery
 *         schema:
 *           type: string
 *         description: Search query for chain names
 *       - in: query
 *         name: programTimeline
 *         schema:
 *           type: string
 *           enum: [Past, Present, Future]
 *         description: Filter by program timeline
 *     responses:
 *       200:
 *         description: Successfully retrieved chains
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     chains:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           chainId:
 *                             type: integer
 *                             example: 1
 *                           chainName:
 *                             type: string
 *                             example: "Walmart"
 *                           totalStores:
 *                             type: integer
 *                             example: 25
 *                           enrolledStores:
 *                             type: integer
 *                             example: 20
 *                           compliantStores:
 *                             type: integer
 *                             example: 18
 *                           compliancePercentage:
 *                             type: number
 *                             format: float
 *                             example: 72.0
 *                           totalEarnedRebate:
 *                             type: number
 *                             format: float
 *                             example: 15000.50
 *                           totalPurchaseVolume:
 *                             type: number
 *                             format: float
 *                             example: 250000.00
 *                           programCount:
 *                             type: integer
 *                             example: 5
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         currentPage:
 *                           type: integer
 *                           example: 1
 *                         totalPages:
 *                           type: integer
 *                           example: 5
 *                         totalChains:
 *                           type: integer
 *                           example: 50
 *                         limit:
 *                           type: integer
 *                           example: 10
 *                         hasNextPage:
 *                           type: boolean
 *                           example: true
 *                         hasPrevPage:
 *                           type: boolean
 *                           example: false
 *       400:
 *         description: Bad request - Invalid parameters
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:manufacturerId/chains",
  asyncHandler(ChainController.getManufacturerChains)
);

export default router;
