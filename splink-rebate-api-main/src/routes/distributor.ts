import { Router } from "express";
import DistributorController from "../controllers/DistributorController";
import asyncHandler from "../middleware/asyncHandler";
const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Distributor Sales Dashboard
 *     description: API endpoints related to distributor key metrics.
 *
 * /distributor/product-insights/key-metrics:
 *   get:
 *     summary: Retrieve key metrics for distributor.
 *     tags: [Distributor Dashboard]
 *     parameters:
 *       - name: distributorId
 *         in: query
 *         required: true
 *         description: The ID of the distributor.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved key metrics.
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
 *                     totalSales:
 *                       type: object
 *                       properties:
 *                         value:
 *                           type: number
 *                           example: 15000
 *                     activeStores:
 *                       type: object
 *                       properties:
 *                         value:
 *                           type: number
 *                           example: 120
 *                     units:
 *                       type: object
 *                       properties:
 *                         value:
 *                           type: number
 *                           example: 3500
 *                     relativeShare:
 *                       type: object
 *                       required: []
 *                       properties:
 *                         sales:
 *                           type: number
 *                           example: 0.35
 *                         stores:
 *                           type: number
 *                           example: 0.25
 *                         units:
 *                           type: number
 *                           example: 0.42
 *       400:
 *         description: Invalid request, distributorId is required.
 *       500:
 *         description: Internal server error.
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/product-insights/key-metrics",
  asyncHandler(DistributorController.getProductInsightKeyMetrics)
);

/**
 * @swagger
 * tags:
 *   - name: Distributor Sales Dashboard
 *     description: API endpoints related to distributor key metrics.
 *
 * /distributor/product-insights:
 *   get:
 *     summary: Retrieve key metrics for distributor.
 *     tags: [Distributor Dashboard]
 *     parameters:
 *       - name: distributorId
 *         in: query
 *         required: true
 *         description: The ID of the distributor for whom to retrieve key metrics.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successful retrieval of key metrics.
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
 *                   type: object
 *                   properties:
 *                     totalSales:
 *                       type: object
 *                       description: Sales data over different time periods.
 *                       properties:
 *                         1:
 *                           type: object
 *                           properties:
 *                             totalSale:
 *                               type: number
 *                               description: Total sales for the past 1 month.
 *                               example: 5000
 *                         3:
 *                           type: object
 *                           properties:
 *                             totalSale:
 *                               type: number
 *                               description: Total sales for the past 3 months.
 *                               example: 2000
 *                         6:
 *                           type: object
 *                           properties:
 *                             totalSale:
 *                               type: number
 *                               description: Total sales for the past 6 months.
 *                               example: 4000
 *                         12:
 *                           type: object
 *                           properties:
 *                             totalSale:
 *                               type: number
 *                               description: Total sales for the past 12 months.
 *                               example: 6000
 *                     totalDistributors:
 *                       type: integer
 *                       description: Total number of Distributors.
 *                       example: 1
 *                     storesCount:
 *                       type: integer
 *                       description: Total number of stores.
 *                       example: 10
 *                     activeProgramsCount:
 *                       type: integer
 *                       description: Count of active programs.
 *                       example: 5
 *       400:
 *         description: Invalid request, distributorId is required.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/product-insights",
  asyncHandler(DistributorController.getProductInsights)
);

/**
 * @swagger
 * tags:
 *   - name: Distributor Sales Dashboard
 *     description: API endpoints related to distributor key metrics.
 *
 * /distributor/stores/{storeId}/assign-sales-rep/{salesRepId}:
 *   get:
 *     summary: Assign a sales representative to a store.
 *     tags: [Distributor Dashboard]
 *     parameters:
 *       - name: storeId
 *         in: path
 *         required: true
 *         description: ID of the store to assign the sales rep to.
 *         schema:
 *           type: integer
 *       - name: salesRepId
 *         in: path
 *         required: true
 *         description: ID of the sales representative to assign.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Sales rep assigned to store successfully or no action needed.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Outcome of the assignment operation.
 *                   example: "assigned"
 *                 id:
 *                   type: integer
 *                   nullable: true
 *                   description: ID of the assigned sales rep, or null if no update was needed.
 *                   example: 123
 *       400:
 *         description: Invalid request, missing or incorrect parameters.
 *       500:
 *         description: Internal server error.
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/stores/:storeId/assign-sales-rep/:salesRepId",
  asyncHandler(DistributorController.updateStoreSalesRepRelation)
);

/**
 * @swagger
 * tags:
 *   - name: Distributor
 *     description: API endpoints related to distributor operations.
 *
 * /distributor/get-distributor-warehouses:
 *   get:
 *     summary: Retrieve a list of warehouses associated with a distributor.
 *     tags: [Distributor]
 *     parameters:
 *       - name: distributorId
 *         in: query
 *         required: true
 *         description: The ID of the distributor to fetch warehouses for.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved list of warehouses.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: success
 *                 data:
 *                   type: array
 *                   description: Array of warehouses.
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       name:
 *                         type: string
 *                         example: "Warehouse 1"
 *                       distributor_id:
 *                         type: integer
 *                         example: 10
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-01-01T10:00:00Z"
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-01-01T10:00:00Z"
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/get-distributor-warehouses",
  asyncHandler(DistributorController.getDistributorWarehouses)
);

router.get(
  "/get-manager-warehouses",
  asyncHandler(DistributorController.getDistributorManagerWarehouses)
);

router.post(
  "/managers/:managerId/assign-warehouse/:warehouseId",
  asyncHandler(
    DistributorController.updateDistributorManagerWarehouseAssignment
  )
);

/**
 * @swagger
 * tags:
 *   - name: Distributor Dashboard
 *     description: API endpoints for distributors.
 *
 * /distributor/spiff-summary:
 *   get:
 *     summary: Get a summary of spiff opportunities for all sales reps of a distributor.
 *     description: Returns a list of spiff opportunities, aggregated by manufacturer, for all sales reps linked to the logged-in distributor.
 *     tags: [Distributor Dashboard]
 *     responses:
 *       200:
 *         description: A summary of spiff opportunities.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   manufacturer:
 *                     type: string
 *                   logo:
 *                     type: string
 *                   id:
 *                     type: integer
 *                   total_earnings:
 *                     type: string
 *                   Start_Date:
 *                     type: string
 *                     format: date-time
 *                   End_Date:
 *                     type: string
 *                     format: date-time
 *                   eligibleStores:
 *                     type: integer
 *       403:
 *         description: Unauthorized. Only for distributors.
 *       500:
 *         description: Server error
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/spiff-summary",
  asyncHandler(DistributorController.getDistributorSpiffSummary)
);

/**
 * @swagger
 * /distributor/{distributorId}/bulk-enroll-stores:
 *   post:
 *     summary: Bulk enroll distributor stores in programs
 *     description: Enrolls all stores (or specified stores) belonging to a distributor in one or more programs
 *     tags:
 *       - Distributor
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: distributorId
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         description: Distributor ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - programIds
 *               - manufacturerId
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [enroll, unenroll]
 *                 description: Action to perform
 *               programIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Array of program IDs
 *               manufacturerId:
 *                 type: integer
 *                 description: Manufacturer ID
 *               storeIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: Optional array of specific store IDs
 *               warehouseId:
 *                 type: integer
 *                 description: Optional warehouse ID filter
 *     responses:
 *       200:
 *         description: Bulk enrollment processed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalStores:
 *                       type: integer
 *                     successful:
 *                       type: integer
 *                     failed:
 *                       type: integer
 *                     details:
 *                       type: object
 *                       properties:
 *                         enrolledCount:
 *                           type: integer
 *                         alreadyEnrolledCount:
 *                           type: integer
 *                         errorCount:
 *                           type: integer
 *                     distributorId:
 *                       type: integer
 *                     programIds:
 *                       type: array
 *                       items:
 *                         type: integer
 *                     action:
 *                       type: string
 *                     workerJobsQueued:
 *                       type: integer
 *       400:
 *         description: Invalid request parameters
 *       403:
 *         description: Unauthorized access to distributor
 *       500:
 *         description: Server error
 */
router.post(
  "/:distributorId/bulk-enroll-stores",
  asyncHandler(DistributorController.bulkEnrollStoresInPrograms)
);

export default router;
