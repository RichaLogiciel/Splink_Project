import { Router } from "express";
import DistributorDashboardController from "../controllers/DistributorController";
import asyncHandler from "../middleware/asyncHandler";
const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Distributor Dashboard Metrics
 *     description: API endpoints related to distributor key metrics.
 *
 * /dashboard/key-metrics?distributorId={distributorId}:
 *   get:
 *     summary: Retrieve key metrics for distributor participation.
 *     tags: [Distributor Dashboard Metrics]
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
 *                 data:
 *                   type: object
 *                   properties:
 *                     rebate:
 *                       type: number
 *                       description: Total rebate for the distributor.
 *                       example: 1500
 *                     purchase:
 *                       type: number
 *                       description: Total purchase volume for the distributor.
 *                       example: 75000
 *                     savingsDesc:
 *                       type: array
 *                       description: List of manufacturers sorted by savings in descending order.
 *                       items:
 *                         type: object
 *                         properties:
 *                           total_savings:
 *                             type: string
 *                             description: Total savings for the manufacturer.
 *                             example: "1000.00"
 *                           Program.Manufacturer.manufacturerId:
 *                             type: integer
 *                             description: ID of the manufacturer.
 *                             example: 2
 *                           Program.Manufacturer.name:
 *                             type: string
 *                             description: Name of the manufacturer.
 *                             example: "Highline Warren"
 *                     savingsAsc:
 *                       type: array
 *                       description: List of manufacturers sorted by savings in ascending order.
 *                       items:
 *                         type: object
 *                         properties:
 *                           total_savings:
 *                             type: string
 *                             description: Total savings for the manufacturer.
 *                             example: "500.00"
 *                           Program.Manufacturer.manufacturerId:
 *                             type: integer
 *                             description: ID of the manufacturer.
 *                             example: 1
 *                           Program.Manufacturer.name:
 *                             type: string
 *                             description: Name of the manufacturer.
 *                             example: "Wonderful Pistachios"
 *                     enrolledStoreCount:
 *                       type: integer
 *                       description: Total number of stores enrolled in at least one program.
 *                       example: 7
 *                     salesRepTotalEarnings:
 *                       type: number
 *                       description: Total earnings for all sales representatives under the distributor.
 *                       example: 2500
 *                     salesRepManagerTotalEarnings:
 *                       type: number
 *                       description: Total earnings for sales rep managers under the distributor (hardcoded to 0 for now).
 *                       example: 0
 *       400:
 *         description: Invalid request, distributorId is required.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/key-metrics",
  asyncHandler(DistributorDashboardController.getKeyMetrics)
);

/**
 * @swagger
 * tags:
 *   - name: Distributor Dashboard Metrics
 *     description: API endpoints related to distributor key metrics.
 *
 * /dashboard/store-program-overview?distributorId={distributorId}:
 *   get:
 *     summary: Retrieve top performing and bottom performing programs for a distributor grouped by manufacturers.
 *     tags: [Distributor Dashboard Metrics]
 *     parameters:
 *       - name: distributorId
 *         in: query
 *         required: true
 *         description: The ID of the distributor for whom to retrieve savings.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful retrieval of savings grouped by manufacturers.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     description: The name of the manufacturer.
 *                   total_savings:
 *                     type: number
 *                     description: The total savings (earned rebate) for the distributor from the manufacturer.
 *             example:
 *               - name: "Manufacturer A"
 *                 total_savings: 5000.50
 *               - name: "Manufacturer B"
 *                 total_savings: 2000.75
 *       404:
 *         description: Distributor not found.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/store-program-overview",
  asyncHandler(DistributorDashboardController.getStoreProgramOverview)
);

/**
 * @swagger
 * tags:
 *   - name: Distributor Dashboard Metrics
 *     description: API endpoints related to distributor key metrics.
 *
 * /dashboard/sales-rep-earnings:
 *   get:
 *     summary: Retrieve earnings for all sales representatives associated with a distributor.
 *     tags: [Distributor Dashboard Metrics]
 *     parameters:
 *       - name: distributorId
 *         in: query
 *         required: true
 *         description: The ID of the distributor for whom to retrieve sales rep earnings.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful retrieval of earnings for sales representatives.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSalesReps:
 *                   type: integer
 *                   description: The total number of sales representatives.
 *                 totalEarnings:
 *                   type: number
 *                   description: The total earnings from all sales representatives.
 *                 salesRepData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       user_id:
 *                         type: integer
 *                         description: The ID of the sales representative.
 *                       name:
 *                         type: string
 *                         description: The name of the sales representative.
 *                       earned_rebate:
 *                         type: string
 *                         description: The earned rebate amount for the sales representative.
 *             example:
 *               totalSalesReps: 4
 *               totalEarnings: 1421.17
 *               salesRepData:
 *                 - user_id: 7
 *                   name: "Alex Thompson"
 *                   earned_rebate: "248.39"
 *                 - user_id: 8
 *                   name: "Morgan Reeves"
 *                   earned_rebate: "300.60"
 *                 - user_id: 11
 *                   name: "Taylor Nguyen"
 *                   earned_rebate: "332.72"
 *                 - user_id: 12
 *                   name: "Sam Baker"
 *                   earned_rebate: "539.46"
 *       404:
 *         description: Distributor not found.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/sales-rep-earnings",
  asyncHandler(DistributorDashboardController.getSalesRepEarnings)
);

/**
 * @swagger
 * tags:
 *   - name: Distributor Dashboard Metrics
 *     description: API endpoints related to distributor key metrics.
 *
 * /dashboard/my-sales?distributorId={distributorId}:
 *   get:
 *     summary: Retrieve sales data for a distributor grouped by months and dates.
 *     tags: [Distributor Dashboard Metrics]
 *     parameters:
 *       - name: distributorId
 *         in: query
 *         required: true
 *         description: The ID of the distributor for whom to retrieve sales data.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful retrieval of sales data for the distributor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 properties:
 *                   totalSale:
 *                     type: number
 *                     description: The total sales amount for the distributor.
 *                   barChartData:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         date:
 *                           type: string
 *                           description: The date for the sales data point.
 *                         sales:
 *                           type: number
 *                           description: Sales amount for that specific date.
 *             example:
 *               1:
 *                 totalSale: 40000
 *                 barChartData:
 *                   - date: "Oct 14"
 *                     sales: 25000
 *                   - date: "Oct 16"
 *                     sales: 15000
 *               3:
 *                 totalSale: 20000
 *                 barChartData:
 *                   - date: "August"
 *                     sales: 20000
 *       404:
 *         description: Distributor not found.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get("/my-sales", asyncHandler(DistributorDashboardController.getSales));

/**
 * @swagger
 * tags:
 *   - name: Distributor Dashboard store programs enrollment
 *     description: API endpoints related to Distributor store programs enrollment.
 *
 * /dashboard/store-program-enrollment:
 *   get:
 *     summary: Retrieve programs enrollment details for a sales representative.
 *     tags: [Distributor Dashboard Metrics]
 *     responses:
 *       200:
 *         description: Successful retrieval of programs enrollment details.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   ManufacturerId:
 *                     type: integer
 *                     description: The ID of the manufacturer.
 *                     example: 1
 *                   ManufacturerName:
 *                     type: string
 *                     description: The name of the manufacturer.
 *                     example: "Wonderful Pistachios"
 *                   ManufacturerLogo:
 *                     type: string
 *                     description: The logo URL of the manufacturer.
 *                     example: "/img/avatar-wonderful-pistachios.png"
 *                   ProgramEnrollment:
 *                     type: integer
 *                     description: Number of stores enrolled in manufacturer's programs.
 *                     example: 2
 *       400:
 *         description: Invalid request, distributorId or salesRepId is required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Distributor ID is required"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/store-program-enrollment",
  asyncHandler(DistributorDashboardController.getProgramsEnrollment)
);

/**
 * @swagger
 * tags:
 *   - name: Distributor Dashboard Store Earnings
 *     description: API endpoints related to distributor store earnings metrics.
 *
 * /dashboard/distributor-store-earnings:
 *   get:
 *     summary: Retrieve total earnings and top 10 earning stores for a distributor.
 *     tags: [Distributor Dashboard Store Earnings]
 *     responses:
 *       200:
 *         description: Successfully retrieved total store earnings and top 10 store details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalEarnings:
 *                   type: number
 *                   format: float
 *                   description: The total earnings from all stores.
 *                   example: 123456.78
 *                 topStores:
 *                   type: array
 *                   description: List of top 10 earning stores.
 *                   items:
 *                     type: object
 *                     properties:
 *                       storeId:
 *                         type: integer
 *                         description: Unique identifier of the store.
 *                         example: 101
 *                       storeName:
 *                         type: string
 *                         description: Name of the store.
 *                         example: "Main Street Market"
 *                       earnings:
 *                         type: number
 *                         format: float
 *                         description: Total earnings of the store.
 *                         example: 15432.50
 *       400:
 *         description: Invalid request, distributorId is required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Distributor ID is required"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Internal server error"
 *     security:
 *       - bearerAuth: []
 */

router.get(
  "/distributor-store-earnings",
  asyncHandler(DistributorDashboardController.getDistributorStoreEarnings)
);

/**
 * @swagger
 * /dashboard/export-store-earnings-csv:
 *   get:
 *     summary: Export store earnings data as CSV for distributor admin
 *     description: Generates and downloads a CSV file containing store earnings data for all programs within the current year. Can filter by manufacturer if manufacturerId is provided and by program timeline if programTimeline is provided.
 *     tags:
 *       - Distributor Dashboard Store Earnings
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: manufacturerId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Optional manufacturer ID to filter programs by specific manufacturer
 *       - in: query
 *         name: programTimeline
 *         required: false
 *         schema:
 *           type: string
 *           enum: [current, upcoming, historical]
 *         description: Optional program timeline filter - current (active programs), upcoming (future programs), or historical (past programs)
 *     responses:
 *       200:
 *         description: CSV file download successful
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Bad request - missing distributor ID
 *       403:
 *         description: Forbidden - insufficient permissions
 *       404:
 *         description: Not found - no programs or stores found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/export-store-earnings-csv",
  asyncHandler(DistributorDashboardController.exportStoreEarningsCSV)
);

export default router;
