import { Router } from "express";

import ManufacturerController from "../controllers/ManufacturerController";
import SalesRepDashboardController from "../controllers/SalesRepController";
import asyncHandler from "../middleware/asyncHandler";
const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Sales Rep Dashboard Metrics
 *     description: API endpoints related to salesRep key metrics.
 *
 * /sales-rep/key-metrics:
 *   get:
 *     summary: Retrieve key metrics for salesRepId participation.
 *     tags: [Sales Rep Dashboard Metrics]
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
 *                       description: Total rebate for the salesRep.
 *                       example: 1500
 *                     purchase:
 *                       type: number
 *                       description: Total purchase volume for the salesRep.
 *                       example: 75000
 *                     savingsDesc:
 *                       type: array
 *                       description: List of salesRep sorted by savings in descending order.
 *                       items:
 *                         type: object
 *                         properties:
 *                           total_savings:
 *                             type: string
 *                             description: Total savings for the salesRep.
 *                             example: "1000.00"
 *                           Program.salesRep.salesRepId:
 *                             type: integer
 *                             description: ID of the salesRep.
 *                             example: 2
 *                           Program.salesRep.name:
 *                             type: string
 *                             description: Name of the salesRep.
 *                             example: "Highline Warren"
 *                     savingsAsc:
 *                       type: array
 *                       description: List of salesRep sorted by savings in ascending order.
 *                       items:
 *                         type: object
 *                         properties:
 *                           total_savings:
 *                             type: string
 *                             description: Total savings for the salesRep.
 *                             example: "500.00"
 *                           Program.salesRep.salesRep:
 *                             type: integer
 *                             description: ID of the salesRep.
 *                             example: 1
 *                           Program.salesRep.name:
 *                             type: string
 *                             description: Name of the salesRep.
 *                             example: "Wonderful Pistachios"
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
  asyncHandler(SalesRepDashboardController.getKeyMetrics)
);

/**
 * @swagger
 * tags:
 *   - name: Sales Rep Dashboard Metrics
 *     description: API endpoints related to sales rep earnings.
 *
 * /sales-rep/earning-overview:
 *   get:
 *     summary: Retrieve sales rep earnings grouped by manufacturers.
 *     tags: [Sales Rep Dashboard Metrics]
 *     responses:
 *       200:
 *         description: Successful retrieval of earnings grouped by manufacturers.
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
 *                   total_earnings:
 *                     type: number
 *                     description: The total earnings (earned rebate) for the distributor from the manufacturer.
 *             example:
 *               - name: "Manufacturer A"
 *                 total_earnings: 5000.50
 *               - name: "Manufacturer B"
 *                 total_earnings: 2000.75
 *       404:
 *         description: Distributor not found.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/earning-overview",
  asyncHandler(SalesRepDashboardController.getSalesRepEarnings)
);

/**
 * @swagger
 * tags:
 *   - name: Sales Rep Dashboard Metrics
 *     description: API endpoints related to Sales Rep Stores Programs Overview.
 *
 * /sales-rep/store-program-overview:
 *   get:
 *     summary: Retrieve top performing and bottom performing programs for a Sales Rep Stores grouped by manufacturers.
 *     tags: [Sales Rep Dashboard Metrics]
 *     responses:
 *       200:
 *         description: Successful retrieval of top and bottom performing programs grouped by manufacturers.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     topPerformingPrograms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           manufacturerid:
 *                             type: integer
 *                             description: The ID of the manufacturer.
 *                           logo:
 *                             type: string
 *                             description: The logo URL of the manufacturer.
 *                           manufacturername:
 *                             type: string
 *                             description: The name of the manufacturer.
 *                           salesvolume:
 *                             type: number
 *                             description: The total sales volume for the manufacturer.
 *                           totalsavings:
 *                             type: number
 *                             description: The total savings (earned rebate) for the manufacturer.
 *                     bottomPerformingPrograms:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           manufacturerid:
 *                             type: integer
 *                             description: The ID of the manufacturer.
 *                           logo:
 *                             type: string
 *                             description: The logo URL of the manufacturer.
 *                           manufacturername:
 *                             type: string
 *                             description: The name of the manufacturer.
 *                           salesvolume:
 *                             type: number
 *                             description: The total sales volume for the manufacturer.
 *                           totalsavings:
 *                             type: number
 *                             description: The total savings (earned rebate) for the manufacturer.
 *             example:
 *               data:
 *                 topPerformingPrograms:
 *                   - manufacturerid: 1
 *                     logo: "https://example.com/logo1.png"
 *                     manufacturername: "Manufacturer A"
 *                     salesvolume: 10000.0
 *                     totalsavings: 5000.5
 *                   - manufacturerid: 2
 *                     logo: "https://example.com/logo2.png"
 *                     manufacturername: "Manufacturer B"
 *                     salesvolume: 8000.0
 *                     totalsavings: 3000.75
 *                 bottomPerformingPrograms:
 *                   - manufacturerid: 3
 *                     logo: "https://example.com/logo3.png"
 *                     manufacturername: "Manufacturer C"
 *                     salesvolume: 5000.0
 *                     totalsavings: 1500.25
 *                   - manufacturerid: 4
 *                     logo: "https://example.com/logo4.png"
 *                     manufacturername: "Manufacturer D"
 *                     salesvolume: 4000.0
 *                     totalsavings: 1000.5
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
  asyncHandler(SalesRepDashboardController.getStoreProgramOverview)
);

/**
 * @swagger
 * tags:
 *   - name: Sales Rep Dashboard Metrics
 *     description: API endpoints related to salesRep key metrics.
 *
 * /sales-rep/wishlist:
 *   get:
 *     summary: Retrieve store wishlist product for salesRepId.
 *     tags: [Sales Rep Dashboard Metrics]
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
 *                       description: Total rebate for the salesRep.
 *                       example: 1500
 *                     purchase:
 *                       type: number
 *                       description: Total purchase volume for the salesRep.
 *                       example: 75000
 *                     savingsDesc:
 *                       type: array
 *                       description: List of salesRep sorted by savings in descending order.
 *                       items:
 *                         type: object
 *                         properties:
 *                           total_savings:
 *                             type: string
 *                             description: Total savings for the salesRep.
 *                             example: "1000.00"
 *                           Program.salesRep.salesRepId:
 *                             type: integer
 *                             description: ID of the salesRep.
 *                             example: 2
 *                           Program.salesRep.name:
 *                             type: string
 *                             description: Name of the salesRep.
 *                             example: "Highline Warren"
 *                     savingsAsc:
 *                       type: array
 *                       description: List of salesRep sorted by savings in ascending order.
 *                       items:
 *                         type: object
 *                         properties:
 *                           total_savings:
 *                             type: string
 *                             description: Total savings for the salesRep.
 *                             example: "500.00"
 *                           Program.salesRep.salesRep:
 *                             type: integer
 *                             description: ID of the salesRep.
 *                             example: 1
 *                           Program.salesRep.name:
 *                             type: string
 *                             description: Name of the salesRep.
 *                             example: "Wonderful Pistachios"
 *       400:
 *         description: Invalid request, distributorId is required.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get("/wishlist", asyncHandler(SalesRepDashboardController.getWishlist));

router.get(
  "/:id/manufacture/:manufacturerId",
  asyncHandler(
    SalesRepDashboardController.getSalesRepManufactureProgramsDetails
  )
);

/**
 * @swagger
 * /sales-rep/{id}/stores-compliance:
 *   get:
 *     summary: Get near-compliance store data for a sales representative
 *     description: Returns a list of stores associated with a sales rep that are close to meeting compliance for certain programs. If no ID is provided and the user is a sales rep, their own ID will be used.
 *     tags:
 *       - [Sales Rep Stores compliance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: false
 *         schema:
 *           type: integer
 *         description: Sales Representative ID
 *       - in: query
 *         name: minPercentage
 *         schema:
 *           type: number
 *           default: 50
 *         required: false
 *         description: Minimum compliance percentage filter
 *       - in: query
 *         name: maxPercentage
 *         schema:
 *           type: number
 *           default: 100
 *         required: false
 *         description: Maximum compliance percentage filter
 *     responses:
 *       200:
 *         description: List of stores near compliance
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 salesRepId:
 *                   type: integer
 *                   example: 123
 *                 stores:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       store_id:
 *                         type: integer
 *                         example: 456
 *                       store_name:
 *                         type: string
 *                         example: "ABC Store"
 *                       programs:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             manufacturer_id:
 *                               type: integer
 *                               example: 789
 *                             manufacturer_name:
 *                               type: string
 *                               example: "Perfetti Van Melle"
 *                             program_id:
 *                               type: integer
 *                               example: 1011
 *                             program_name:
 *                               type: string
 *                               example: "Demo"
 *                             compliance_percentage:
 *                               type: number
 *                               format: float
 *                               example: 75.5
 *                             missing_products:
 *                               type: array
 *                               items:
 *                                 type: object
 *                               example: []
 *       400:
 *         description: Sales rep ID is required
 *       403:
 *         description: Unauthorized access
 *       500:
 *         description: Server error while retrieving compliance data
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/:id/stores-compliance",
  asyncHandler(SalesRepDashboardController.getSalesRepStoresDetails)
);

/**
 * @swagger
 * /sales-rep/store-details/{id}:
 *   get:
 *     summary: Get near-compliance program data for a specific store
 *     description: Returns a list of near-compliance programs for a given store based on store ID.
 *     tags:
 *       - [Sales Rep Stores compliance]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Store ID
 *       - in: query
 *         name: minPercentage
 *         schema:
 *           type: number
 *           default: 50
 *         required: false
 *         description: Minimum compliance percentage filter
 *       - in: query
 *         name: maxPercentage
 *         schema:
 *           type: number
 *           default: 100
 *         required: false
 *         description: Maximum compliance percentage filter
 *     responses:
 *       200:
 *         description: List of near-compliance programs for the store
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 storeId:
 *                   type: integer
 *                   example: 456
 *                 programs:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       manufacturer_id:
 *                         type: integer
 *                         example: 789
 *                       manufacturer_name:
 *                         type: string
 *                         example: "Perfetti Van Melle"
 *                       program_id:
 *                         type: integer
 *                         example: 1011
 *                       program_name:
 *                         type: string
 *                         example: "Demo"
 *                       compliance_percentage:
 *                         type: number
 *                         format: float
 *                         example: 82.0
 *                       missing_products:
 *                         type: array
 *                         items:
 *                           type: object
 *                         example: []
 *       400:
 *         description: Store ID is required
 *       500:
 *         description: Server error while retrieving store compliance data
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/store-details/:id?",
  asyncHandler(SalesRepDashboardController.getStoreComplianceDetails)
);

/**
 * @swagger
 * tags:
 *   - name: Sales Rep Test Endpoints
 *     description: API endpoints for testing functionality.
 *
 * /sales-rep/test-compliance/{storeId}/{programDetailId}:
 *   get:
 *     summary: Test endpoint to calculate compliance percentage for a specific store and program.
 *     tags: [Sales Rep Test Endpoints]
 *     parameters:
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the store to check compliance for
 *       - in: path
 *         name: programDetailId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the program detail to check compliance against
 *     responses:
 *       200:
 *         description: Successfully calculated compliance percentage
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 storeId:
 *                   type: integer
 *                 programDetailId:
 *                   type: integer
 *                 programName:
 *                   type: string
 *                 manufacturerName:
 *                   type: string
 *                 criteria:
 *                   type: string
 *                 productTags:
 *                   type: string
 *                 productTagsQty:
 *                   type: string
 *                 purchasedProductCount:
 *                   type: integer
 *                 lineItemCount:
 *                   type: integer
 *                 compliancePercentage:
 *                   type: integer
 *       404:
 *         description: Store or program detail not found
 *       500:
 *         description: Internal server error
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/test-compliance/:storeId/:programDetailId",
  asyncHandler(SalesRepDashboardController.testComplianceCalculation)
);

router.get(
  "/get-manufacturers",
  asyncHandler(ManufacturerController.getAuthorized)
);

router.get(
  "/all-spiff-opportunities",
  asyncHandler(SalesRepDashboardController.getAllSpiffOpportunities)
);

router.get(
  "/manufacturer/:manufacturerId/store/:id",
  asyncHandler(
    SalesRepDashboardController.getSpiffEarningStoreByManufacturerPrograms
  )
);

router.get(
  "/store/:id",
  asyncHandler(SalesRepDashboardController.getSpiffEarningStoreDetail)
);

export default router;
