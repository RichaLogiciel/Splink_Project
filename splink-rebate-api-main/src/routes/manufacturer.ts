import { Router } from "express";
import ManufacturerDashboardController from "../controllers/ManufacturerController";
import CreateProgramController from "../controllers/Programs/CreateProgramController";
import asyncHandler from "../middleware/asyncHandler";

const router = Router();
/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer key metrics.
 *
 * /manufacturer/key-metrics:
 *   get:
 *     summary: Retrieve key metrics for manufacturer.
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - name: manufacturerId
 *         in: query
 *         required: true
 *         description: The ID of the manufacturer for whom to retrieve key metrics.
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
 *                     totalManufacturers:
 *                       type: integer
 *                       description: Total number of Manufacturers.
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
 *         description: Invalid request, manufacturerId is required.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/key-metrics",
  asyncHandler(ManufacturerDashboardController.getKeyMetrics)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer key metrics.
 *
 * /manufacturer/get-compliances-details:
 *   get:
 *     summary: Retrieve detailed compliance metrics for manufacturers, optionally filtered by distributor, including sales and rebate data for various programs.
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - name: manufacturerId
 *         in: query
 *         required: true
 *         description: The ID of the manufacturer for whom to retrieve compliance detaile.
 *         schema:
 *           type: integer
 *       - name: distributorId
 *         in: query
 *         required: false
 *         description: Optional distributor ID for filtering specific distributor details.
 *         schema:
 *           type: string
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
 *                     distributorList:
 *                       type: array
 *                       description: List of distributors with their details.
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: The ID of the distributor.
 *                             example: 1
 *                           name:
 *                             type: string
 *                             description: Name of the distributor.
 *                             example: "David"
 *                           totalStores:
 *                             type: integer
 *                             description: Total number of stores managed by the distributor.
 *                             example: 10
 *                           totalSales:
 *                             type: number
 *                             description: Total sales made by the distributor.
 *                             example: 220
 *                           location:
 *                             type: string
 *                             description: Location of the distributor.
 *                             example: "Boise, ID"
 *                           details:
 *                             type: array
 *                             description: A list of program details for the distributor.
 *                             items:
 *                               type: object
 *                               properties:
 *                                 tierName:
 *                                   type: string
 *                                   description: Name of the tier.
 *                                   example: "Tier 1"
 *                                 programName:
 *                                   type: string
 *                                   description: Name of the program.
 *                                   example: "Tier 1 - Core 2"
 *                                 programId:
 *                                   type: integer
 *                                   description: The ID of the program.
 *                                   example: 123
 *                                 compliancePercentage:
 *                                   type: number
 *                                   description: Compliance percentage for the program.
 *                                   example: 70
 *                                 totalRebate:
 *                                   type: number
 *                                   description: Total rebate earned for the program.
 *                                   example: 220
 *                     allComplianceDetails:
 *                       type: array
 *                       description: List of all compliance details for the manufacturer.
 *                       items:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             tierName:
 *                               type: string
 *                               description: Name of the tier.
 *                               example: "Tier 1"
 *                             programName:
 *                               type: string
 *                               description: Name of the program.
 *                               example: "Tier 1 - Core 2"
 *                             programId:
 *                               type: integer
 *                               description: The ID of the program.
 *                               example: 123
 *                             compliancePercentage:
 *                               type: number
 *                               description: Compliance percentage for the program.
 *                               example: 70
 *                             totalRebate:
 *                               type: number
 *                               description: Total rebate earned for the program.
 *                               example: 0
 *       400:
 *         description: Invalid request, manufacturerId is required.
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
 *                   example: "manufacturerId is required."
 *       500:
 *         description: Internal server error.
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
 *                   example: "Internal server error."
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/get-compliances-details",
  asyncHandler(ManufacturerDashboardController.getManufactureProgramCompliance)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer dashboard metrics.
 *
 * /manufacturer/get-distributors:
 *   get:
 *     summary: Retrieve a list of distributors associated with the manufacturer.
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - name: manufacturerId
 *         in: query
 *         required: true
 *         description: The ID of the manufacturer for whom to retrieve key metrics.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved list of distributors.
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
 *                   description: Array of distributors associated with the manufacturer.
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
router.get(
  "/get-distributors",
  asyncHandler(ManufacturerDashboardController.getDistributors)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer dashboard metrics.
 *
 * /manufacturer/get-products:
 *   get:
 *     summary: Retrieve a list of products associated with the manufacturer.
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - name: manufacturerId
 *         in: query
 *         required: true
 *         description: The ID of the manufacturer for whom to retrieve key metrics.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successfully retrieved list of products.
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
 *                   description: Array of products associated with the manufacturer.
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Full name of the product.
 *                         example: "David"
 *                       userId:
 *                         type: integer
 *                         description: Unique identifier for the user.
 *                         example: 2
 *                       associatedUserId:
 *                         type: integer
 *                         description: Unique identifier for the associated product.
 *                         example: 1
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/get-products",
  asyncHandler(ManufacturerDashboardController.getProducts)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer key metrics.
 *
 * /manufacturer/my-sales?manufacturerId={manufacturerId}:
 *   get:
 *     summary: Retrieve sales data for a Manufacturer grouped by months and dates.
 *     tags: [Manufacturer Dashboard ]
 *     parameters:
 *       - name: manufacturerId
 *         in: query
 *         required: true
 *         description: The ID of the Manufacturer for whom to retrieve sales data.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful retrieval of sales data for the Manufacturer.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 properties:
 *                   totalSale:
 *                     type: number
 *                     description: The total sales amount for the Manufacturer.
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
 *         description: Manufacturer not found.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get("/my-sales", asyncHandler(ManufacturerDashboardController.getSales));

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer store listings and their sales volumes.
 *
 * /manufacturer/{id}/store/listing:
 *   get:
 *     summary: Retrieve a list of stores and their sales volumes for a manufacturer.
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the manufacturer to fetch related stores list.
 *         schema:
 *           type: integer
 *       - name: searchQuery
 *         in: query
 *         required: false
 *         schema:
 *           type: string
 *         description: Search query to filter stores by name or other criteria.
 *       - name: distributorId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter stores based on the selected distributor's ID.
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
router.get(
  "/:id/store/listing",
  asyncHandler(ManufacturerDashboardController.getStoresListing)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer store purchases data.
 *
 * /manufacturer/{id}/store/{storeId}:
 *   get:
 *     summary: Retrieve a list of stores and their sales volumes for a manufacturer.
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: The ID of the manufacturer to fetch related store purchases Data.
 *         schema:
 *           type: integer
 *       - in: path
 *         name: storeId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the store to fetch purchases Data.
 *       - name: distributorId
 *         in: query
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the distributor to fetch related store purchases Data.
 *       - name: categoryId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter stores purchases Data based on the selected Category.
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
 *                   type: object
 *                   properties:
 *                     chartData:
 *                       type: array
 *                       description: Data representing sales figures for each month.
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             description: The month of the sale.
 *                             example: "Jan"
 *                           sale:
 *                             type: integer
 *                             description: The sales volume for the given month.
 *                             example: 2000
 *                     categories:
 *                       type: array
 *                       description: List of product categories.
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             description: The unique ID of the category.
 *                             example: 1
 *                           name:
 *                             type: string
 *                             description: The name of the category.
 *                             example: "Snack"
 *       400:
 *         description: Invalid query parameters.
 *       500:
 *         description: Internal server error.
 */
router.get(
  "/:id/store/:storeId",
  asyncHandler(ManufacturerDashboardController.getStorePurchasesDetails)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer key metrics.
 *
 * /manufacturer/distributor-program-overview?manufacturerId={manufacturerId}:
 *   get:
 *     summary: Retrieve month-wise total sales for a Manufacturer's distributor program.
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - name: manufacturerId
 *         in: query
 *         required: true
 *         description: The ID of the Manufacturer for whom to retrieve month-wise distributor sales data.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful retrieval of month-wise total sales data for the Manufacturer's distributor program.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalSales:
 *                   type: number
 *                   description: The total sales amount for the Manufacturer's distributor program.
 *                 monthWiseSales:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       sale_month:
 *                         type: string
 *                         description: The month of the sale (represented as a number, e.g., "3" for March).
 *                       total_sales:
 *                         type: string
 *                         description: Total sales amount for that specific month.
 *             example:
 *               totalSales: 4600.00
 *               monthWiseSales:
 *                 - sale_month: "3"
 *                   total_sales: "1000.00"
 *                 - sale_month: "5"
 *                   total_sales: "100.00"
 *                 - sale_month: "6"
 *                   total_sales: "200.00"
 *                 - sale_month: "8"
 *                   total_sales: "200.00"
 *                 - sale_month: "9"
 *                   total_sales: "400.00"
 *                 - sale_month: "10"
 *                   total_sales: "1100.00"
 *                 - sale_month: "11"
 *                   total_sales: "540.00"
 *       404:
 *         description: Manufacturer not found.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/distributor-program-overview",
  asyncHandler(ManufacturerDashboardController.getDistributorSalesOverview)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer key metrics.
 *
 * /manufacturer/skus-per-store?manufacturerId={manufacturerId}:
 *   get:
 *     summary: Retrieve SKUs per store for a manufacturer.
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - name: manufacturerId
 *         in: query
 *         required: true
 *         description: The ID of the Manufacturer for whom to retrieve SKU data per store.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful retrieval of SKU data per store.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Status of the request.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       skuCount:
 *                         type: integer
 *                         description: Number of SKUs available in the stores.
 *                       storeCount:
 *                         type: integer
 *                         description: Number of stores with the specified SKU count.
 *             example:
 *               status: "success"
 *               data:
 *                 - skuCount: 1
 *                   storeCount: 8
 *                 - skuCount: 2
 *                   storeCount: 1
 *       404:
 *         description: Manufacturer not found.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/skus-per-store",
  asyncHandler(ManufacturerDashboardController.getSkusPerStore)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer key metrics.
 *
 * /manufacturer/skus-per-store-optimized?manufacturerId={manufacturerId}:
 *   get:
 *     summary: Retrieve SKUs per store for a manufacturer (optimized version).
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - name: manufacturerId
 *         in: query
 *         required: true
 *         description: The ID of the Manufacturer for whom to retrieve SKU data per store.
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Successful retrieval of SKU data per store.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Status of the request.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       skuCount:
 *                         type: integer
 *                         description: Number of SKUs available in the stores.
 *                       storeCount:
 *                         type: integer
 *                         description: Number of stores with the specified SKU count.
 *             example:
 *               status: "success"
 *               data:
 *                 - skuCount: 1
 *                   storeCount: 8
 *                 - skuCount: 2
 *                   storeCount: 1
 *       404:
 *         description: Manufacturer not found.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/skus-per-store-optimized",
  asyncHandler(ManufacturerDashboardController.getSkusPerStoreOptimized)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Programs
 *     description: API endpoints related to manufacturer key metrics.
 *
 * /manufacturer/programs:
 *   get:
 *     summary: Retrieve programs overview for a manufacturer.
 *     tags: [Manufacturer Programs]
 *     parameters:
 *       - name: manufacturerId
 *         in: query
 *         required: true
 *         description: The ID of the Manufacturer for whom to retrieve program data.
 *         schema:
 *           type: integer
 *       - name: distributorId
 *         in: query
 *         required: false
 *         schema:
 *           type: integer
 *         description: The ID of the distributor to fetch related Programs Data.
 *     responses:
 *       200:
 *         description: Successful retrieval of the programs overview.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Status of the request.
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       programName:
 *                         type: string
 *                         description: Name of the program.
 *                       completedCompliances:
 *                         type: integer
 *                         description: Number of compliances completed in the program.
 *                       totalCompliances:
 *                         type: integer
 *                         description: Total number of compliances in the program.
 *                       rebate:
 *                         type: string
 *                         description: Rebate amount for the program.
 *                       programStartDate:
 *                         type: string
 *                         format: date-time
 *                         description: Start date of the program.
 *                       programEndDate:
 *                         type: string
 *                         format: date-time
 *                         description: End date of the program.
 *             example:
 *               status: "success"
 *               data:
 *                 - programName: "Base Purchase Volume (dist)"
 *                   completedCompliances: 0
 *                   totalCompliances: 1
 *                   rebate: "550.00"
 *                   programStartDate: "2024-01-01T00:00:00.000Z"
 *                   programEndDate: "2024-12-31T00:00:00.000Z"
 *                 - programName: "Base Purchase Volume (dist)"
 *                   completedCompliances: 1
 *                   totalCompliances: 1
 *                   rebate: "1100.00"
 *                   programStartDate: "2024-01-01T00:00:00.000Z"
 *                   programEndDate: "2024-12-31T00:00:00.000Z"
 *       404:
 *         description: Manufacturer not found.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/programs",
  asyncHandler(ManufacturerDashboardController.getProgramsOverview)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Sales Dashboard
 *     description: API endpoints related to manufacturer key metrics.
 *
 * /manufacturer/product-insights:
 *   get:
 *     summary: Retrieve key metrics for manufacturer.
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - name: manufacturerId
 *         in: query
 *         required: true
 *         description: The ID of the manufacturer for whom to retrieve key metrics.
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
 *                     totalManufacturers:
 *                       type: integer
 *                       description: Total number of Manufacturers.
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
 *         description: Invalid request, manufacturerId is required.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.post(
  "/product-insights",
  asyncHandler(ManufacturerDashboardController.getProductInsights)
);

router.post(
  "/product-insights-optimized",
  asyncHandler(ManufacturerDashboardController.getProductInsightsOptimized)
);

router.get(
  "/authorized",
  asyncHandler(ManufacturerDashboardController.getAuthorized)
);

router.get(
  "/categories-products",
  asyncHandler(ManufacturerDashboardController.getCategoriesProducts)
);

router.get(
  "/get-manager-distributors",
  asyncHandler(ManufacturerDashboardController.getManagerDistributors)
);

router.post(
  "/managers/:managerId/assign-distributor/:distributorId",
  asyncHandler(ManufacturerDashboardController.updateManagerDistributorRelation)
);

router.get(
  "/get-manager-distributors",
  asyncHandler(ManufacturerDashboardController.getManagerDistributors)
);

router.post(
  "/managers/:managerId/assign-distributor/:distributorId",
  asyncHandler(ManufacturerDashboardController.updateManagerDistributorRelation)
);

router.post(
  "/update-program",
  asyncHandler(CreateProgramController.updateProgram)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer key metrics.
 *
 * /manufacturer/key-metrics-optimized:
 *   get:
 *     summary: Retrieve optimized key metrics for manufacturers with filtering capabilities.
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - name: distributorId
 *         in: query
 *         required: true
 *         description: Comma-separated list of distributor IDs to filter metrics.
 *         schema:
 *           type: string
 *           example: "1,2,3"
 *       - name: monthRange
 *         in: query
 *         required: false
 *         description: Month range for filtering data (e.g., "2024-01,2024-12").
 *         schema:
 *           type: string
 *           example: "2024-01,2024-12"
 *       - name: selectedProducts
 *         in: query
 *         required: false
 *         description: Comma-separated list of product IDs to filter metrics.
 *         schema:
 *           type: string
 *           example: "101,102,103"
 *     responses:
 *       200:
 *         description: Successful retrieval of optimized key metrics.
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
 *                     totalSavings:
 *                       type: number
 *                       description: Total savings amount.
 *                       example: 15000.50
 *                     totalPurchaseVolume:
 *                       type: number
 *                       description: Total purchase volume.
 *                       example: 250000.75
 *                     relevantPurchaseVolume:
 *                       type: number
 *                       description: Relevant purchase volume for the filtered criteria.
 *                       example: 180000.25
 *                     storesCount:
 *                       type: number
 *                       description: Total number of stores.
 *                       example: 150
 *                     activeStoresCount:
 *                       type: number
 *                       description: Number of active stores.
 *                       example: 120
 *                     manufacturersCount:
 *                       type: number
 *                       description: Number of manufacturers.
 *                       example: 5
 *                     enrolledStoreCount:
 *                       type: number
 *                       description: Total number of stores enrolled in at least one program.
 *                       example: 100
 *                     activeStoresProgramsEnrolled:
 *                       type: number
 *                       description: Number of active stores enrolled in programs.
 *                       example: 80
 *                     salesRepTotalEarnings:
 *                       type: number
 *                       description: Total earnings for all sales representatives.
 *                       example: 5000.00
 *                     salesRepManagerTotalEarnings:
 *                       type: number
 *                       description: Total earnings for sales rep managers.
 *                       example: 2000.00
 *       400:
 *         description: Bad request - missing required parameters.
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
 *                   example: "Distributor ID is required"
 *       401:
 *         description: Unauthorized - invalid or missing authentication.
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
 *                   example: "Unauthorized access"
 *       500:
 *         description: Internal server error.
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
 */
router.get(
  "/key-metrics-optimized",
  asyncHandler(ManufacturerDashboardController.getKeyMetricsOptimized)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer top products data.
 *
 * /manufacturer/top-products-optimized:
 *   get:
 *     summary: Retrieve optimized top selling products for manufacturers with filtering capabilities.
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - name: distributorId
 *         in: query
 *         required: true
 *         description: Comma-separated list of distributor IDs to filter products.
 *         schema:
 *           type: string
 *           example: "1,2,3"
 *       - name: monthRange
 *         in: query
 *         required: false
 *         description: Month range for filtering data (e.g., "1", "3", "6", "12").
 *         schema:
 *           type: string
 *           example: "3"
 *       - name: selectedProducts
 *         in: query
 *         required: false
 *         description: Comma-separated list of product IDs to filter results.
 *         schema:
 *           type: string
 *           example: "101,102,103"
 *     responses:
 *       200:
 *         description: Successful retrieval of top products data.
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
 *                     topProducts:
 *                       type: array
 *                       description: List of top selling products with performance metrics.
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                             description: Product ID.
 *                             example: 101
 *                           color:
 *                             type: string
 *                             description: Color code for chart visualization.
 *                             example: "#FF5733"
 *                           units:
 *                             type: number
 *                             description: Number of units sold in current period.
 *                             example: 1500
 *                           unitsYoy:
 *                             type: number
 *                             description: Year-over-year change in units sold.
 *                             example: 0.15
 *                           sales:
 *                             type: number
 *                             description: Total sales amount in current period.
 *                             example: 25000.50
 *                           salesYoy:
 *                             type: number
 *                             description: Year-over-year change in sales.
 *                             example: 0.12
 *                           storePenetration:
 *                             type: string
 *                             description: Percentage of stores selling this product.
 *                             example: "75.5%"
 *                           storePenetrationYoy:
 *                             type: string
 *                             description: Year-over-year change in store penetration.
 *                             example: "5.2%"
 *       400:
 *         description: Bad request - missing required parameters.
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
 *                   example: "Distributor ID is required"
 *       401:
 *         description: Unauthorized - invalid or missing authentication.
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
 *                   example: "Unauthorized access"
 *       500:
 *         description: Internal server error.
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
 */
router.get(
  "/top-products-optimized",
  asyncHandler(ManufacturerDashboardController.getTopProductsOptimized)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer distributor sales data.
 *
 * /manufacturer/get-distributor-sales:
 *   get:
 *     summary: Retrieve distributor sales data for manufacturers with filtering capabilities.
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - name: distributorId
 *         in: query
 *         required: true
 *         description: Comma-separated list of distributor IDs to filter sales data.
 *         schema:
 *           type: string
 *           example: "1,2,3"
 *       - name: monthRange
 *         in: query
 *         required: false
 *         description: Month range for filtering data (e.g., "1", "3", "6", "12").
 *         schema:
 *           type: string
 *           example: "3"
 *       - name: selectedProducts
 *         in: query
 *         required: false
 *         description: Comma-separated list of product IDs to filter sales data.
 *         schema:
 *           type: string
 *           example: "101,102,103"
 *     responses:
 *       200:
 *         description: Successful retrieval of distributor sales data.
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
 *                     chartData:
 *                       type: array
 *                       description: Chart data for sales visualization.
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             description: Date for the data point.
 *                             example: "2024-01-15"
 *                           value:
 *                             type: number
 *                             description: Sales value for the date.
 *                             example: 15000.50
 *                           label:
 *                             type: string
 *                             description: Label for the data point.
 *                             example: "Jan 15"
 *                     growth:
 *                       type: object
 *                       description: Growth data for year-over-year comparison.
 *                       properties:
 *                         chartData:
 *                           type: array
 *                           description: Growth chart data.
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 description: Date for the growth data point.
 *                                 example: "2024-01-15"
 *                               currentYear:
 *                                 type: number
 *                                 description: Current year value.
 *                                 example: 15000.50
 *                               previousYear:
 *                                 type: number
 *                                 description: Previous year value.
 *                                 example: 12000.25
 *                               growthPercentage:
 *                                 type: number
 *                                 description: Growth percentage.
 *                                 example: 25.0
 *       400:
 *         description: Bad request - missing required parameters.
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
 *                   example: "Distributor ID is required"
 *       401:
 *         description: Unauthorized - invalid or missing authentication.
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
 *                   example: "Unauthorized access"
 *       500:
 *         description: Internal server error.
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
 */
router.get(
  "/get-distributor-sales",
  asyncHandler(ManufacturerDashboardController.getDistributorSales)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer store penetration data.
 *
 * /manufacturer/get-store-penetration:
 *   get:
 *     summary: Retrieve store penetration data for manufacturers with filtering capabilities.
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - name: distributorId
 *         in: query
 *         required: true
 *         description: Comma-separated list of distributor IDs to filter store penetration data.
 *         schema:
 *           type: string
 *           example: "1,2,3"
 *       - name: monthRange
 *         in: query
 *         required: false
 *         description: Month range for filtering data (e.g., "1", "3", "6", "12").
 *         schema:
 *           type: string
 *           example: "3"
 *       - name: selectedProducts
 *         in: query
 *         required: false
 *         description: Comma-separated list of product IDs to filter store penetration data.
 *         schema:
 *           type: string
 *           example: "101,102,103"
 *     responses:
 *       200:
 *         description: Successful retrieval of store penetration data.
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
 *                     storePenetrationChartData:
 *                       type: array
 *                       description: Store penetration chart data showing percentage of stores selling products over time.
 *                       items:
 *                         type: object
 *                         properties:
 *                           date:
 *                             type: string
 *                             description: Date label for the data point.
 *                             example: "Jan 15"
 *                           storesCount:
 *                             type: number
 *                             description: Number of stores selling the product(s) on this date.
 *                             example: 45
 *                           value:
 *                             type: number
 *                             description: Percentage of stores selling the product(s) on this date.
 *                             example: 75.5
 *                           productId:
 *                             type: number
 *                             description: Product ID (when filtering by specific products).
 *                             example: 101
 *                           color:
 *                             type: string
 *                             description: Color code for chart visualization (when filtering by specific products).
 *                             example: "#FF5733"
 *                     growth:
 *                       type: object
 *                       description: Growth data for year-over-year store penetration comparison.
 *                       properties:
 *                         storePenetrationChartData:
 *                           type: array
 *                           description: Growth chart data for store penetration.
 *                           items:
 *                             type: object
 *                             properties:
 *                               date:
 *                                 type: string
 *                                 description: Date for the growth data point.
 *                                 example: "Jan 15"
 *                               currentYear:
 *                                 type: number
 *                                 description: Current year store penetration percentage.
 *                                 example: 75.5
 *                               previousYear:
 *                                 type: number
 *                                 description: Previous year store penetration percentage.
 *                                 example: 68.2
 *                               growthPercentage:
 *                                 type: number
 *                                 description: Growth percentage in store penetration.
 *                                 example: 10.7
 *       400:
 *         description: Bad request - missing required parameters.
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
 *                   example: "Distributor ID is required"
 *       401:
 *         description: Unauthorized - invalid or missing authentication.
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
 *                   example: "Unauthorized access"
 *       500:
 *         description: Internal server error.
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
 */
router.get(
  "/get-store-penetration",
  asyncHandler(ManufacturerDashboardController.getStorePenetration)
);

/**
 * @swagger
 * tags:
 *   - name: Manufacturer Dashboard
 *     description: API endpoints related to manufacturer ROI metrics.
 *
 * /manufacturer/roi:
 *   get:
 *     summary: Retrieve ROI metrics for a manufacturer program with optional distributor filtering.
 *     tags: [Manufacturer Dashboard]
 *     parameters:
 *       - name: programId
 *         in: query
 *         required: true
 *         description: The ID of the program to retrieve ROI metrics for.
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: distributorId
 *         in: query
 *         required: false
 *         description: Optional distributor ID to filter ROI metrics.
 *         schema:
 *           type: integer
 *           example: 5
 *     responses:
 *       200:
 *         description: Successful retrieval of ROI metrics.
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
 *                   description: Array of ROI metrics grouped by rebate type.
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: ROI record ID.
 *                         example: 1
 *                       manufacturerId:
 *                         type: integer
 *                         description: Manufacturer ID.
 *                         example: 3
 *                       programId:
 *                         type: integer
 *                         description: Program ID.
 *                         example: 1
 *                       distributorId:
 *                         type: integer
 *                         nullable: true
 *                         description: Distributor ID (if filtered).
 *                         example: 5
 *                       rebateType:
 *                         type: string
 *                         description: Type of rebate (STORE or SALES_REP).
 *                         example: "STORE"
 *                       costOfProgram:
 *                         type: string
 *                         description: Total cost of the program.
 *                         example: "10000.00"
 *                       currentYearProgramProductSales:
 *                         type: string
 *                         description: Current year sales of program products.
 *                         example: "50000.00"
 *                       previousYearProgramProductSales:
 *                         type: string
 *                         description: Previous year sales of program products.
 *                         example: "40000.00"
 *                       salesToCostRatio:
 *                         type: number
 *                         description: Calculated ratio of current year program product sales to cost.
 *                         example: 5.0
 *                       incrementalSalesLift:
 *                         type: number
 *                         description: Calculated incremental sales lift percentage (current vs previous year).
 *                         example: 25.0
 *                       newDoorsCount:
 *                         type: integer
 *                         description: Number of new doors.
 *                         example: 15
 *                       lastYearsDoorsCount:
 *                         type: integer
 *                         description: Number of doors from last year.
 *                         example: 100
 *                       newDoorsPercentage:
 *                         type: number
 *                         description: Percentage of new doors.
 *                         example: 15.0
 *                       newPodCount:
 *                         type: integer
 *                         description: Number of new points of distribution.
 *                         example: 8
 *                       totalPodCount:
 *                         type: integer
 *                         description: Total points of distribution.
 *                         example: 50
 *                       newPodPercentage:
 *                         type: number
 *                         description: Percentage of new POD.
 *                         example: 16.0
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Record creation timestamp.
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Record last update timestamp.
 *       400:
 *         description: Bad request - missing required programId parameter.
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
 *                   example: "programId is required"
 *       404:
 *         description: No ROI data found for the specified program.
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
 *                   example: "No ROI data found for this program"
 *       500:
 *         description: Internal server error.
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
router.get("/roi", asyncHandler(ManufacturerDashboardController.getROI));

export default router;
