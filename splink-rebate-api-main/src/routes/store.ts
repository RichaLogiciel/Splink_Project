import { Router } from "express";
import ManufacturerController from "../controllers/ManufacturerController";
import StoreController from "../controllers/StoreController";
import StoreEnrollmentStatusController from "../controllers/StoreEnrollmentStatusController";
import asyncHandler from "../middleware/asyncHandler";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Store
 *     description: API endpoints related to store key metrics.
 *
 * /store/key-metrics?userId={userId}:
 *   get:
 *     summary: Retrieve key metrics for a specific user.
 *     tags: [Store]
 *     parameters:
 *       - name: userId
 *         in: query
 *         required: true
 *         description: The ID of the user for whom to retrieve key metrics.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successful retrieval of store key metrics.
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

router.get("/key-metrics", asyncHandler(StoreController.getStoreKeyMetrics));

/**
 * @swagger
 * tags:
 *   - name: Store
 *     description: API endpoints for store chains.
 *
 * /store/get-store-chains:
 *   get:
 *     summary: Retrieve a list of store chains.
 *     tags:
 *       - Store
 *     responses:
 *       200:
 *         description: Successfully retrieved list of store chains.
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
 *                   description: Array of store chains.
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Full name of the distributor.
 *                         example: "David"
 *                       id:
 *                         type: integer
 *                         description: Unique identifier for the user.
 *                         example: 2
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get("/get-store-chains", asyncHandler(StoreController.getStoreChains));

/**
 * @swagger
 * tags:
 *   - name: Store
 *     description: API endpoints related to store listings and their sales volumes.
 *
 * /store/listing?distributorId={distributorId}&searchQuery={searchQuery}:
 *   get:
 *     summary: Retrieve a list of stores and their sales volumes for a given seller.
 *     tags: [Store]
 *     parameters:
 *       - name: distributorId
 *         in: query
 *         required: true
 *         description: The ID of the distributor for whom to retrieve key metrics.
 *         schema:
 *           type: integer
 *       - in: query
 *         name: searchQuery
 *         required: false
 *         schema:
 *           type: string
 *         description: Filter for stores by searchQuery.
 *       - name: selectedSalesRepId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: The ID of the selected sales representative to filter stores.
 *       - name: page
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: The page number for pagination (default is 1).
 *       - name: sort
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *         description: Sort order for store listing (default is ASC).
 *       - name: chainId
 *         in: query
 *         required: false
 *         description: The ID of the chain for whom to retrieve key metrics.
 *         schema:
 *           type: integer
 *       - name: sortKey
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *           enum: [sort, purchaseSort, potentialSavings, estimatedSavings, savingsOpp, chain, sales_rep, distributor, skus, programCompliance, prAvailable, nearCompliancePercentage]
 *           default: sort
 *         description: The field to sort by (default is sort for store name).
 *     responses:
 *       200:
 *         description: Successful retrieval of store listing and volume.
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
 *                   description: List of stores with their volume data.
 *                   items:
 *                     type: object
 *                     properties:
 *                       storeId:
 *                         type: integer
 *                         nullable: true
 *                         description: The ID of the store. Will be null if the store is not found.
 *                         example: 1
 *                       storeName:
 *                         type: string
 *                         nullable: true
 *                         description: Name of the store. Will be null if the store is not found.
 *                         example: "Middletown Market"
 *                       volume:
 *                         type: string
 *                         description: Sales volume associated with the store.
 *                         example: "40000.00"
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get("/listing", asyncHandler(StoreController.getListing));

/**
 * @swagger
 * /store/{id}:
 *   get:
 *     summary: Get Store Details by Store ID
 *     description: Retrieves the details of a store by its unique ID.
 *     tags:
 *       - Store
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the store to retrieve details for.
 *     responses:
 *       200:
 *         description: Successfully retrieved store details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                   description: The unique identifier of the store.
 *                 storeInfo:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                       example: "Middletown Market"
 *                       description: The name of the store.
 *                     rep:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *                           description: The name of the sales representative for the store.
 *                 salesData:
 *                   type: object
 *                   properties:
 *                     purchaseVolume:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                           example: 25537.30
 *                           description: The total purchase volume of the store.
 *                     totalSavings:
 *                       type: object
 *                       properties:
 *                         amount:
 *                           type: number
 *                           example: 45.00
 *                           description: The total savings or rebate earned by the store.
 *       404:
 *         description: Store not found.
 *       500:
 *         description: Server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get("/:id", asyncHandler(StoreController.getStoreDetails));

/**
 * @swagger
 * /store/{id}/manufacture/{manufacturerId}:
 *   get:
 *     summary: Get Store Programs Details by Manufacturer ID
 *     description: Retrieves the details of a store's Programs by its unique Manufacturer ID and Store ID.
 *     tags:
 *       - Store
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the store to retrieve details for.
 *       - in: path
 *         name: manufacturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the manufacturer to retrieve details for.
 *       - in: query
 *         name: isEnrolledPrograms
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter for enrolled programs (true) or not enrolled programs (false).
 *       - in: query
 *         name: isChainPrograms
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Include chain programs in product filtering (true) or only store programs (false).
 *     responses:
 *       200:
 *         description: Successfully retrieved store details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                   description: Response status.
 *                 data:
 *                   type: object
 *                   properties:
 *                     storeName:
 *                       type: string
 *                       nullable: true
 *                       example: "ABC Store"
 *                       description: The name of the store.
 *                     externalStoreId:
 *                       type: integer
 *                       nullable: true
 *                       example: 12345
 *                       description: The external store ID.
 *                     tierDetails:
 *                       type: array
 *                       items:
 *                         type: object
 *                         description: Details of each tier program.
 *                     additionalInfo:
 *                       type: object
 *                       properties:
 *                         note:
 *                           type: string
 *                           example: "Important note about the store's program status."
 *                           description: Additional note information about the store.
 *                         recommendedProducts:
 *                           type: array
 *                           description: List of recommended products for the store.
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: "Product Name"
 *                                 description: Name of the recommended product.
 *                         purchasedProducts:
 *                           type: array
 *                           description: List of purchased products by the store.
 *                           items:
 *                             type: object
 *                             properties:
 *                               name:
 *                                 type: string
 *                                 example: "Product Name"
 *                                 description: Name of the purchased product.
 *       404:
 *         description: Store not found.
 *       500:
 *         description: Server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id/manufacture/:manufacturerId",
  asyncHandler(StoreController.getStoreManufactureProgramsDetails)
);

/**
 * @swagger
 * tags:
 *   - name: Store
 *     description: API endpoint to get Distributor Sales Representatives.
 *
 * /store/getSalesReps/{distributorId}:
 *   get:
 *     summary: Retrieve a list of sales representatives for a given distributor.
 *     tags:
 *       - Store
 *     parameters:
 *       - in: path
 *         name: distributorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the manufacturer to retrieve details for.
 *     responses:
 *       200:
 *         description: Successful retrieval of the sales representatives.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 salesReps:
 *                   type: array
 *                   description: List of sales representatives.
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: The ID of the sales representative.
 *                         example: 123
 *                       name:
 *                         type: string
 *                         description: The name of the sales representative.
 *                         example: "John Doe"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Status of the request.
 *                   example: error
 *                 message:
 *                   type: string
 *                   description: Detailed error message.
 *                   example: "Internal server error."
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/getSalesReps/:distributorId",
  asyncHandler(StoreController.getDistributorSalesReps)
);

/**
 * @swagger
 * tags:
 *   - name: Store
 *     description: API endpoint to get Sales Representatives for a Sales Rep Manager.
 *
 * /store/getSalesRep/salesRepManager/{distributorId}:
 *   get:
 *     summary: Retrieve a list of sales representatives associated to a sales rep manager for a given distributor.
 *     tags:
 *       - Store
 *     parameters:
 *       - in: path
 *         name: distributorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the distributor to retrieve sales reps for.
 *       - in: query
 *         name: salesRepManagerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the sales rep manager whose associated sales reps should be retrieved.
 *     responses:
 *       200:
 *         description: Successful retrieval of the sales representatives.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 salesReps:
 *                   type: array
 *                   description: List of sales representatives associated to the manager.
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: The ID of the sales representative.
 *                         example: 123
 *                       name:
 *                         type: string
 *                         description: The name of the sales representative.
 *                         example: "John Doe"
 *                       associatedUserId:
 *                         type: integer
 *                         description: The associated user ID of the sales representative.
 *                         example: 456
 *       400:
 *         description: Bad request - missing required parameters.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Status of the request.
 *                   example: error
 *                 message:
 *                   type: string
 *                   description: Detailed error message.
 *                   example: "Distributor ID is required"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Status of the request.
 *                   example: error
 *                 message:
 *                   type: string
 *                   description: Detailed error message.
 *                   example: "Internal server error."
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/getSalesRep/salesRepManager/:distributorId",
  asyncHandler(StoreController.getSalesRepsForManager)
);

router.get(
  "/get-stores-by-chain/:chainId",
  asyncHandler(StoreController.getStoresByChainId)
);

router.get(
  "/get-distributor-stores/:distributorId",
  asyncHandler(StoreController.getDistibutorStores)
);

/**
 * @swagger
 * /store/manufacturer/{manufacturerId}:
 *   get:
 *     summary: Get stores that purchased products from a specific manufacturer
 *     description: Retrieves stores based on simple purchase criteria for a specific manufacturer
 *     tags:
 *       - Store
 *     parameters:
 *       - in: path
 *         name: manufacturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the manufacturer
 *       - in: query
 *         name: distributor_ids
 *         required: true
 *         schema:
 *           type: string
 *         description: Comma-separated list of distributor IDs
 *       - in: query
 *         name: min_products_purchased
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Minimum number of distinct products purchased
 *       - in: query
 *         name: criteria
 *         required: false
 *         schema:
 *           type: string
 *           enum: [core_retail, core_wholesale, core_product, flex]
 *           default: core_retail
 *         description: Product criteria to filter by
 *     responses:
 *       200:
 *         description: Successfully retrieved stores list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       store_id:
 *                         type: integer
 *                         example: 1
 *                       store_name:
 *                         type: string
 *                         example: "ABC Store"
 *                       external_store_id:
 *                         type: string
 *                         example: "EXT123"
 *                       products_purchased:
 *                         type: integer
 *                         example: 8
 *   post:
 *     summary: Get stores that purchased products from a specific manufacturer with complex criteria
 *     description: Retrieves stores based on complex purchase criteria for a specific manufacturer
 *     tags:
 *       - Store
 *     parameters:
 *       - in: path
 *         name: manufacturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the manufacturer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               distributor_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 example: [1, 2, 3]
 *               min_products_purchased:
 *                 type: integer
 *                 default: 1
 *                 example: 5
 *               criteria:
 *                 type: object
 *                 properties:
 *                   rules:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         category:
 *                           type: string
 *                           example: "All Categories"
 *                         operator:
 *                           type: string
 *                           enum: ["<=", ">=", "<", ">", "="]
 *                           example: "<="
 *                         value:
 *                           type: integer
 *                           example: 20
 *     responses:
 *       200:
 *         description: Successfully retrieved stores list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       store_id:
 *                         type: integer
 *                         example: 1
 *                       store_name:
 *                         type: string
 *                         example: "ABC Store"
 *                       external_store_id:
 *                         type: string
 *                         example: "EXT123"
 *                       products_purchased:
 *                         type: integer
 *                         example: 8
 */
router.get(
  "/manufacturer/:manufacturerId",
  asyncHandler(StoreController.getStoreByCriteria)
);

router.post(
  "/manufacturer/:manufacturerId",
  asyncHandler(StoreController.getStoreByCriteria)
);

router.get(
  "/manufacturer/:manufacturerId/product-tags",
  asyncHandler(ManufacturerController.getManufacturerProductTags)
);

/**
 * @swagger
 * /store/manual-enrollment:
 *   post:
 *     summary: Manually enroll or unenroll a store from programs
 *     description: |
 *       Allows manual enrollment or unenrollment of stores from manufacturer programs.
 *       - For enrollment: Requires programId to enroll store in specific program
 *       - For unenrollment: Removes store from all programs for the manufacturer
 *     tags:
 *       - Store
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - manufacturerId
 *               - storeId
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [enroll, unenroll]
 *                 description: The action to perform - enroll or unenroll the store
 *                 example: "enroll"
 *               manufacturerId:
 *                 type: integer
 *                 description: The ID of the manufacturer
 *                 example: 15
 *               storeId:
 *                 type: integer
 *                 description: The ID of the store
 *                 example: 1072
 *               programIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of program IDs to enroll store in (required only for enroll action)
 *                 example: [114, 119, 115, 118, 123]
 *           examples:
 *             enroll:
 *               summary: Enroll store in multiple programs
 *               value:
 *                 action: "enroll"
 *                 manufacturerId: 15
 *                 storeId: 1072
 *                 programIds: [114, 119, 115, 118, 123]
 *             unenroll:
 *               summary: Unenroll store from all programs
 *               value:
 *                 action: "unenroll"
 *                 manufacturerId: 15
 *                 storeId: 1072
 *     responses:
 *       200:
 *         description: Successfully processed enrollment/unenrollment
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Store successfully enrolled in program"
 *                 data:
 *                   type: object
 *                   properties:
 *                     action:
 *                       type: string
 *                       example: "enroll"
 *                     storeId:
 *                       type: integer
 *                       example: 1072
 *                     manufacturerId:
 *                       type: integer
 *                       example: 15
 *                     programIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       example: [114, 119, 115, 118, 123]
 *       400:
 *         description: Bad request - validation errors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Action is required and must be either 'enroll' or 'unenroll'"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/manual-enrollment",
  asyncHandler(StoreController.manualEnrollment)
);

/**
 * @swagger
 * /store/enroll-by-agreement:
 *   post:
 *     summary: Enroll or unenroll stores in programs via agreement IDs
 *     description: Bulk enrollment operation that queues a worker job to enroll/unenroll multiple stores in all programs associated with the specified agreements
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - agreementIds
 *               - storeIds
 *               - userId
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [enroll, unenroll]
 *                 description: Action to perform
 *               agreementIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of agreement IDs
 *               storeIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of store IDs to enroll/unenroll
 *               userId:
 *                 type: integer
 *                 description: User ID performing the action
 *               reason:
 *                 type: string
 *                 description: Optional reason for audit trail
 *     responses:
 *       200:
 *         description: Enrollment job successfully queued
 *       400:
 *         description: Invalid request parameters
 *       404:
 *         description: Agreement or store IDs not found
 *       500:
 *         description: Server error
 */
router.post(
  "/enroll-by-agreement",
  asyncHandler(StoreController.enrollByAgreement)
);

/**
 * @swagger
 * /store/{storeId}/agreements/{agreementId}/enrollment-statuses:
 *   get:
 *     summary: Get enrollment statuses for a store and agreement
 *     description: Retrieve recent enrollment status transitions for a store+agreement.
 *     tags: [Store]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: agreementId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Enrollment statuses retrieved successfully
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
router.get(
  "/:storeId/agreements/:agreementId/enrollment-statuses",
  asyncHandler(StoreEnrollmentStatusController.getByStoreAgreement)
);

/**
 * @swagger
 * /store/{storeId}/agreements:
 *   get:
 *     summary: Get agreement enrollments and available agreements for a specific store
 *     description: |
 *       Retrieves two sets of program agreements:
 *       1. Enrollments: Agreements where the store is currently enrolled and the program is active or in the future.
 *       2. Available Agreements: Agreements the store should be enrolled in but isn't (only returned when manufacturerId is provided).
 *       Optionally filter by manufacturer ID.
 *     tags:
 *       - Store
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the store
 *         example: 1072
 *       - in: query
 *         name: manufacturerId
 *         required: false
 *         schema:
 *           type: string
 *         description: Optional manufacturer ID(s) to filter agreements. Supports comma-separated list (e.g., "1,2,3"). Required to get available agreements.
 *         example: "1,2,3"
 *     responses:
 *       200:
 *         description: Successfully retrieved store agreement enrollments and available agreements
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     enrollments:
 *                       type: array
 *                       description: Agreements where the store is currently enrolled
 *                       items:
 *                         type: object
 *                         properties:
 *                           agreementId:
 *                             type: integer
 *                             example: 1
 *                           agreementName:
 *                             type: string
 *                             example: "Q1 2024 Rebate Agreement"
 *                           programIds:
 *                             type: array
 *                             items:
 *                               type: integer
 *                             example: [114, 115]
 *                           manufacturerId:
 *                             type: integer
 *                             example: 5
 *                           endDate:
 *                             type: string
 *                             format: date
 *                             example: "2024-12-31"
 *                     count:
 *                       type: integer
 *                       description: Number of enrollments
 *                       example: 5
 *                     availableAgreements:
 *                       type: array
 *                       description: Agreements the store should be enrolled in but isn't (only populated when manufacturerId is provided)
 *                       items:
 *                         type: object
 *                         properties:
 *                           agreementId:
 *                             type: integer
 *                             example: 2
 *                           agreementName:
 *                             type: string
 *                             example: "Q2 2024 Rebate Agreement"
 *                           programIds:
 *                             type: array
 *                             items:
 *                               type: integer
 *                             example: [115, 116]
 *                           manufacturerId:
 *                             type: integer
 *                             example: 5
 *                           endDate:
 *                             type: string
 *                             format: date
 *                             example: "2024-12-31"
 *                     availableCount:
 *                       type: integer
 *                       description: Number of available agreements
 *                       example: 3
 *                     storeId:
 *                       type: integer
 *                       example: 1072
 *                     manufacturerIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *                       nullable: true
 *                       description: Array of manufacturer IDs used to filter agreements
 *                       example: [1, 2, 3]
 *       400:
 *         description: Bad request - invalid storeId or manufacturerId
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 data:
 *                   type: string
 *                   example: "Invalid storeId format. Must be a positive integer."
 *       401:
 *         description: Unauthorized - missing or invalid authentication
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:storeId/agreements",
  asyncHandler(StoreController.getStoreAgreementEnrollments)
);

export default router;
