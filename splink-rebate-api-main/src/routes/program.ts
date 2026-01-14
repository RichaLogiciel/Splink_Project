import { Router } from "express";
import programController from "../controllers/ProgramController";
import CreateProgramController from "../controllers/Programs/CreateProgramController";
import ListProgramsController from "../controllers/Programs/ListProgramsController";
import asyncHandler from "../middleware/asyncHandler";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Program
 *     description: API endpoints related to Disributor Programs.
 * /programs:
 *   get:
 *     summary: Get distributor programs
 *     tags: [Program]
 *     description: Retrieves a list of distributor programs based on the provided user ID and type. Supports filtering between independent store programs and chain-specific programs.
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: The type of the user (e.g. DISTRIBUTOR, STORE).
 *       - in: query
 *         name: chainView
 *         required: false
 *         schema:
 *           type: boolean
 *         description: When true, returns only programs that have chain participants (entity_type = 'CHAIN' in program_participants). When false, returns programs that do NOT have chain participants. When not provided, returns all programs regardless of participant type.
 *       - in: query
 *         name: storeId
 *         required: false
 *         schema:
 *           type: integer
 *         description: The store ID to filter for.
 *       - in: query
 *         name: warehouseId
 *         required: false
 *         schema:
 *           type: integer
 *         description: The warehouse ID to filter for.
 *       - in: query
 *         name: programTimeline
 *         required: false
 *         schema:
 *           type: string
 *         description: Timeline filter for programs (e.g., Current, Past, Future).
 *       - in: query
 *         name: isInternal
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter for internal initiative programs.
 *     responses:
 *       200:
 *         description: A list of distributor programs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the response.
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ManufacturerProgram'
 *       400:
 *         description: Bad request.
 *       404:
 *         description: Not found.
 *       500:
 *         description: Internal server error.
 *
 * components:
 *   schemas:
 *     ManufacturerProgram:
 *       type: object
 *       properties:
 *         manufacturerName:
 *           type: string
 *           description: The name of the manufacturer.
 *         manufacturerId:
 *           type: integer
 *           description: The ID of the manufacturer.
 *         totalPurchasedVolume:
 *           type: string
 *           description: The total purchased volume.
 *         totalsaving:
 *           type: string
 *           description: The total saving.
 *         program_overview:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/ProgramOverview'
 *
 *     ProgramOverview:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: The name of the program.
 *         isQualify:
 *           type: boolean
 *           description: Whether the program is qualified.
 *         rebate:
 *           type: integer
 *           description: The rebate amount.
 *         programtype:
 *           type: string
 *           description: The type of the program.
 *         rebatetype:
 *           type: string
 *           description: The type of the rebate.
 */
router.get("/", asyncHandler(programController.listPrograms));

/**
 * @swagger
 * tags:
 *   - name: Program
 *     description: API endpoints related to SPIFF Programs v2.
 * /programs/v2:
 *   get:
 *     summary: Get SPIFF programs (v2 optimized)
 *     tags: [Program]
 *     description: Optimized endpoint for retrieving SPIFF programs for DISTRIBUTOR_ADMIN users with 93% performance improvement.
 *     parameters:
 *       - in: query
 *         name: programTimeline
 *         required: false
 *         schema:
 *           type: string
 *           enum: [Current, Upcoming, Historical]
 *         description: Timeline filter for programs.
 *       - in: query
 *         name: isInternal
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Filter for internal initiative programs.
 *       - in: query
 *         name: isExcludeChainStores
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Exclude chain stores from results.
 *       - in: query
 *         name: warehouseId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter results by warehouse ID (filters sales reps by primary_warehouse_id to show only earnings from that warehouse).
 *     responses:
 *       200:
 *         description: A list of SPIFF programs grouped by manufacturer.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the response.
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/ManufacturerProgram'
 *       403:
 *         description: Forbidden - requires DISTRIBUTOR_ADMIN role.
 *       500:
 *         description: Internal server error.
 */
router.get("/v2/", asyncHandler(programController.listProgramsV2));

/**
 * @swagger
 * tags:
 *   - name: Program
 *     description: API endpoints related to Distributor Programs.
 * /programs/details:
 *   get:
 *     summary: Get a list of programs
 *     description: Retrieves a list of programs for a distributor. When type=STORE and manufacturerId is provided, the response includes chainInformation organized by programs (similar to retailerProgramOverview structure) showing chain-level compliance and store-level enrollment details.
 *     tags: [Program]
 *     parameters:
 *       - in: query
 *         name: type
 *         description: The user type (when STORE, includes chain information)
 *         required: true
 *         type: string
 *       - in: query
 *         name: manufacturerId
 *         description: The manufacturer ID (required for chain information)
 *         required: true
 *       - in: query
 *         name: chainView
 *         description: |
 *           When true, returns chain-specific program details (only available for distributor admin/executive users).
 *           When false or not provided, returns regular program details.
 *         required: false
 *         type: boolean
 *       - in: query
 *         name: programId
 *         description: The program Id to filter the specific data of store
 *         required: false
 *         type: integer
 *       - in: query
 *         name: programDetailId
 *         description: The program Detail Id to filter the specific data of store
 *         required: false
 *         type: integer
 *       - in: query
 *         name: programTimeline
 *         description: Timeline filter for programs (e.g., Current, Past, Future)
 *         required: false
 *         type: string
 *       - in: query
 *         name: includeChainInfo
 *         description: |
 *           If true, includes enrolledChains, unenrolledChains, and chainProgramOverview (detailed program-organized chain compliance and enrollment details) in the response. Only available for STORE type with manufacturerId provided.
 *         required: false
 *         type: boolean
 *       - in: query
 *         name: includeProducts
 *         description: |
 *           If true, includes categorizedProducts in the response (products organized by program tags). Only available for STORE type with manufacturerId provided.
 *         required: false
 *         type: boolean
 *     responses:
 *       200:
 *         description: Successful response
 *         schema:
 *           type: object
 *           properties:
 *             status:
 *               type: string
 *             data:
 *               type: object
 *               properties:
 *                 totalPurchasedVolume:
 *                   type: string
 *                 totalsaving:
 *                   type: string
 *                 totalsavingsopp:
 *                   type: number
 *                 totalsalesrepsspiff:
 *                   type: number
 *                 categorizedProducts:
 *                   type: object
 *                   description: Products categorized by program tags
 *                 enrolledChains:
 *                   type: array
 *                   description: Chains that are enrolled in manufacturer programs (only included when includeChainInfo=true)
 *                   items:
 *                     type: object
 *                     properties:
 *                       chainId:
 *                         type: number
 *                         description: Chain ID
 *                       chainName:
 *                         type: string
 *                         description: Chain name
 *                       totalStores:
 *                         type: number
 *                         description: Total number of stores in the chain
 *                       enrolledStores:
 *                         type: number
 *                         description: Number of stores enrolled in programs
 *                       compliantStores:
 *                         type: number
 *                         description: Number of stores that are compliant
 *                       totalPurchaseVolume:
 *                         type: number
 *                         description: Total purchase volume for the chain
 *                       totalEarnedRebate:
 *                         type: number
 *                         description: Total earned rebate for the chain
 *                       compliancePercentage:
 *                         type: number
 *                         description: Compliance percentage for the chain
 *                 unenrolledChains:
 *                   type: array
 *                   description: Chains that are not enrolled in manufacturer programs (only included when includeChainInfo=true)
 *                   items:
 *                     type: object
 *                     properties:
 *                       chainId:
 *                         type: number
 *                         description: Chain ID
 *                       chainName:
 *                         type: string
 *                         description: Chain name
 *                       totalStores:
 *                         type: number
 *                         description: Total number of stores in the chain
 *                       potentialEarnings:
 *                         type: number
 *                         description: Potential earnings if chain enrolls
 *                 chainProgramOverview:
 *                   type: array
 *                   description: Program-organized chain information with metadata matching retailerProgramOverview structure (only included when includeChainInfo=true)
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                         description: Program ID
 *                       programType:
 *                         type: string
 *                         description: Type of program
 *                       name:
 *                         type: string
 *                         description: Program name
 *                       programHeader:
 *                         type: string
 *                         description: Program header
 *                       programEntityType:
 *                         type: string
 *                         description: Program participant type (e.g., STORE)
 *                       programTerms:
 *                         type: string
 *                         description: Program payment terms
 *                       programDetails:
 *                         type: array
 *                         description: Detailed program tier information
 *                       compliances:
 *                         type: array
 *                         description: Compliance records for this program (matching retailerProgramOverview structure)
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: number
 *                               description: Compliance ID
 *                             programId:
 *                               type: number
 *                               description: Program ID
 *                             entityId:
 *                               type: number
 *                               description: Entity ID (store ID)
 *                             entityType:
 *                               type: string
 *                               description: Entity type (STORE)
 *                             isQualified:
 *                               type: boolean
 *                               description: Whether the entity is qualified
 *                             totalPurchaseVolume:
 *                               type: number
 *                               description: Total purchase volume
 *                             earnedRebate:
 *                               type: number
 *                               description: Earned rebate
 *                             status:
 *                               type: string
 *                               description: Compliance status
 *                       progressDetails:
 *                         type: array
 *                         description: Progress details for this program (matching retailerProgramOverview structure)
 *                       totalEnrollments:
 *                         type: number
 *                         description: Total number of enrollments
 *                       startDate:
 *                         type: string
 *                         description: Program start date
 *                       endDate:
 *                         type: string
 *                         description: Program end date
 *                       totalChains:
 *                         type: number
 *                         description: Total number of chains for this program
 *                       enrolledChains:
 *                         type: number
 *                         description: Number of chains with at least one enrolled store
 *                       compliantChains:
 *                         type: number
 *                         description: Number of chains with at least one compliant store
 *                       totalStores:
 *                         type: number
 *                         description: Total stores across all chains for this program
 *                       enrolledStores:
 *                         type: number
 *                         description: Total enrolled stores for this program
 *                       compliantStores:
 *                         type: number
 *                         description: Total compliant stores for this program
 *                       totalPurchaseVolume:
 *                         type: number
 *                         description: Total purchase volume across all stores for this program
 *                       totalEarnedRebate:
 *                         type: number
 *                         description: Total earned rebate across all stores for this program
 *                       chains:
 *                         type: array
 *                         description: Chain-level details for this program
 *                         items:
 *                           type: object
 *                           properties:
 *                             chainId:
 *                               type: number
 *                               description: Chain ID (null for independent stores)
 *                             chainName:
 *                               type: string
 *                               description: Chain name
 *                             totalStores:
 *                               type: number
 *                               description: Total stores in this chain for this program
 *                             enrolledStores:
 *                               type: number
 *                               description: Enrolled stores in this chain for this program
 *                             compliantStores:
 *                               type: number
 *                               description: Compliant stores in this chain for this program
 *                             isChainCompliant:
 *                               type: boolean
 *                               description: Whether chain has at least one compliant store
 *                             isChainEnrolled:
 *                               type: boolean
 *                               description: Whether chain has at least one enrolled store
 *                             totalPurchaseVolume:
 *                               type: number
 *                               description: Total purchase volume for this chain and program
 *                             totalEarnedRebate:
 *                               type: number
 *                               description: Total earned rebate for this chain and program
 *                             stores:
 *                               type: array
 *                               description: Store-level details within this chain for this program
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   storeId:
 *                                     type: number
 *                                   storeName:
 *                                     type: string
 *                                   isEnrolled:
 *                                     type: boolean
 *                                     description: Whether store is enrolled in this program
 *                                   isCompliant:
 *                                     type: boolean
 *                                     description: Whether store is compliant with this program
 *                                   totalPurchaseVolume:
 *                                     type: number
 *                                     description: Store's purchase volume for this program
 *                                   earnedRebate:
 *                                     type: number
 *                                     description: Store's earned rebate for this program
 *                                   complianceStatus:
 *                                     type: string
 *                                     description: Store's compliance status for this program
 *                 salesRepProgramOverview:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       programDetails:
 *                         type: array
 *                         items:
 *                           type: object
 *                       compliances:
 *                         type: array
 *                         items:
 *                           type: object
 *                       id:
 *                         type: integer
 *                       programType:
 *                         type: string
 *                       name:
 *                         type: string
 *                 distributorProgramOverview:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       programDetails:
 *                         type: array
 *                         items:
 *                           type: object
 *                       compliances:
 *                         type: array
 *                         items:
 *                           type: object
 *                       id:
 *                         type: integer
 *                       programType:
 *                         type: string
 *                       name:
 *                         type: string
 */
router.get("/details", asyncHandler(programController.getProgramDetails));

/**
 * @swagger
 * /programs/details/v2:
 *   get:
 *     summary: Get SPIFF program details optimized for v2 API
 *     description: Optimized endpoint for fetching SPIFF program details with earnings for DISTRIBUTOR_ADMIN users
 *     tags: [Program]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [SPIFF]
 *         description: Program type (must be SPIFF)
 *       - in: query
 *         name: manufacturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Manufacturer ID
 *       - in: query
 *         name: programTimeline
 *         required: false
 *         schema:
 *           type: string
 *           default: Current
 *         description: Program timeline filter
 *       - in: query
 *         name: isInternal
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include internal initiatives
 *       - in: query
 *         name: isExcludeChainStores
 *         required: false
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Exclude chain stores
 *       - in: query
 *         name: warehouseId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter results by warehouse ID (filters sales reps by primary_warehouse_id to show only earnings from that warehouse)
 *     responses:
 *       200:
 *         description: SPIFF program details retrieved successfully
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
 *                   items:
 *                     type: object
 *                     properties:
 *                       manufacturerId:
 *                         type: integer
 *                       manufacturerName:
 *                         type: string
 *                       manufacturerLogo:
 *                         type: string
 *                       manufacturerAuthorized:
 *                         type: boolean
 *                       totalPurchaseVolume:
 *                         type: number
 *                       totalSaving:
 *                         type: number
 *                       programPaymentTerm:
 *                         type: string
 *                       program_overview:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                             name:
 *                               type: string
 *                             programType:
 *                               type: string
 *                             programTerms:
 *                               type: string
 *                             programHeader:
 *                               type: string
 *                             totalEarning:
 *                               type: number
 *                             totalPurchaseVolume:
 *                               type: number
 *                             enrolledStoresCount:
 *                               type: integer
 *                             compliances:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   entityId:
 *                                     type: integer
 *                             programEntityType:
 *                               type: string
 *                             programDetails:
 *                               type: array
 *                               items:
 *                                 type: object
 *                                 properties:
 *                                   id:
 *                                     type: integer
 *                                   tier:
 *                                     type: integer
 *                                   min_qty:
 *                                     type: string
 *                                   max_qty:
 *                                     type: string
 *                                   rebate_amount:
 *                                     type: string
 *                                   rebateAmount:
 *                                     type: string
 *                                   rebate_percentage:
 *                                     type: string
 *                                   rebate_type:
 *                                     type: string
 *                                   rebateType:
 *                                     type: string
 *                                   rebate_calculation:
 *                                     type: string
 *                                   rebateCalculationType:
 *                                     type: string
 *                                   program_id:
 *                                     type: integer
 *                                   rebateCalculation:
 *                                     type: string
 *                                   quantityType:
 *                                     type: string
 *                                   productsTags:
 *                                     type: string
 *                                   fixed_rebate_amount:
 *                                     type: string
 *                                   fixedRebateAmount:
 *                                     type: string
 *                                   fixed_rebate_category:
 *                                     type: string
 *                                   overview:
 *                                     type: string
 *                                   programLine:
 *                                     type: string
 *                                   criteria:
 *                                     type: string
 *                             startDate:
 *                               type: string
 *                             endDate:
 *                               type: string
 *                 totalRepEarnings:
 *                   type: number
 *                 metadata:
 *                   type: object
 *                   properties:
 *                     totalPrograms:
 *                       type: integer
 *                     totalManufacturers:
 *                       type: integer
 *                     timestamp:
 *                       type: string
 *       400:
 *         description: Bad request - Invalid parameters
 *       403:
 *         description: Forbidden - Invalid role (requires DISTRIBUTOR_ADMIN)
 *       500:
 *         description: Internal server error
 */
router.get("/details/v2", asyncHandler(programController.getProgramDetailsV2));

router.get(
  "/details/store-compliance",
  asyncHandler(programController.getProgramsStoreComplianceDetail)
);

/**
 * @swagger
 * /programs/categorized-products:
 *   get:
 *     summary: Get categorized products for manufacturer programs
 *     tags: [Program]
 *     description: |
 *       Retrieves products categorized by program tags for a specific manufacturer.
 *       When chainView=true for distributor admin/executive users, returns chain-specific categorized products.
 *       When chainView=false or not provided, returns regular categorized products.
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: The type of the user (e.g., DISTRIBUTOR, STORE)
 *       - in: query
 *         name: manufacturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The manufacturer ID to get products for
 *       - in: query
 *         name: chainView
 *         required: false
 *         schema:
 *           type: boolean
 *         description: |
 *           When true, returns chain-specific categorized products (only available for distributor admin/executive users).
 *           When false or not provided, returns regular categorized products.
 *       - in: query
 *         name: programTimeline
 *         required: false
 *         schema:
 *           type: string
 *         description: Timeline filter for programs (e.g., Current, Past, Future)
 *     responses:
 *       200:
 *         description: Categorized products for the manufacturer
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: Status of the response
 *                 data:
 *                   type: object
 *                   description: |
 *                     Products categorized by program tags. When chainView=true, includes chain-specific product organization.
 *                     When chainView=false, includes regular product categorization.
 *                   properties:
 *                     recommended:
 *                       type: array
 *                       description: Recommended products for the manufacturer
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                           name:
 *                             type: string
 *                           sku:
 *                             type: string
 *                           manufacturerId:
 *                             type: number
 *                           categoryId:
 *                             type: number
 *                           isRecommended:
 *                             type: boolean
 *                     purchased:
 *                       type: array
 *                       description: Previously purchased products
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                           name:
 *                             type: string
 *                           sku:
 *                             type: string
 *                           manufacturerId:
 *                             type: number
 *                           categoryId:
 *                             type: number
 *                           purchaseVolume:
 *                             type: number
 *                     core:
 *                       type: array
 *                       description: Core products for the manufacturer
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: number
 *                           name:
 *                             type: string
 *                           sku:
 *                             type: string
 *                           manufacturerId:
 *                             type: number
 *                           categoryId:
 *                             type: number
 *                           isCore:
 *                             type: boolean
 *       400:
 *         description: Bad request - missing required parameters
 *       401:
 *         description: Unauthorized - invalid or missing authentication
 *       403:
 *         description: Forbidden - insufficient permissions for chain view
 *       404:
 *         description: Not found - manufacturer not found
 *       500:
 *         description: Internal server error
 */
router.get(
  "/categorized-products",
  asyncHandler(programController.getCategorizedProducts)
);

router.get(
  "/details/:programDetailId/analytics",
  asyncHandler(programController.getProgramDetailAnalytics)
);

router.get("/spiff-products", asyncHandler(programController.getSpiffProducts));

router.get(
  "/get-stores-listing",
  asyncHandler(programController.getStoresListing)
);

/**
 * @swagger
 * /programs/{manufacturerId}/pdf:
 *   get:
 *     summary: Get program PDF URL
 *     tags: [Program]
 *     description: Retrieves a pre-signed S3 URL for the program PDF
 *     parameters:
 *       - in: path
 *         name: manufacturerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The manufacturer ID
 *       - in: query
 *         name: distributorId
 *         required: false
 *         schema:
 *           type: integer
 *         description: The distributor ID (optional, will use user context if not provided)
 *       - in: query
 *         name: timeline
 *         required: true
 *         schema:
 *           type: string
 *           enum: [Current, Upcoming]
 *         description: Timeline filter (Current or Upcoming)
 *       - in: query
 *         name: programType
 *         required: false
 *         schema:
 *           type: string
 *           enum: [STORE, SPIFF]
 *         description: Program type (defaults to STORE)
 *     responses:
 *       200:
 *         description: Program PDF URL
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     program_pdf:
 *                       type: string
 *                       nullable: true
 *                       description: Pre-signed S3 URL for the PDF (null if not found)
 *                     filename:
 *                       type: string
 *                       nullable: true
 *                       description: PDF filename (null if not found)
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.get(
  "/:manufacturerId/pdf",
  asyncHandler(programController.getProgramPdf)
);

router.get(
  "/list-stores-programs",
  asyncHandler(ListProgramsController.listStorePrograms)
);

router.post("/create-program", asyncHandler(CreateProgramController.handle));

/**
 * @swagger
 * tags:
 *   - name: Program
 *     description: API endpoints related to Distributor Programs.
 * /programs/get-program:
 *   post:
 *     summary: Get a program
 *     description: Retrieves a program based on the provided program ID and program detail ID.
 *     tags: [Program]
 *     requestBody:
 *       required: true
 */
router.get("/get-program", asyncHandler(ListProgramsController.getProgram));

/**
 * @swagger
 * tags:
 *   - name: Program
 *     description: API endpoints related to Distributor Programs.
 * /programs/get-void-fill-programs-summary:
 *   get:
 *     summary: Get void fill programs summary
 *     description: Retrieves a summary of void fill programs for distributors.
 *     tags: [Program]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *         description: The type of the user (e.g. DISTRIBUTOR, STORE).
 *       - in: query
 *         name: manufacturerId
 *         required: false
 *         schema:
 *           type: integer
 *         description: The manufacturer ID to filter programs.
 *       - in: query
 *         name: programTimeline
 *         required: false
 *         schema:
 *           type: string
 *         description: Timeline filter for programs (e.g., Current, Past, Future).
 *     responses:
 *       200:
 *         description: A summary of void fill programs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the response.
 *                 data:
 *                   type: object
 *                   description: Void fill programs summary data.
 *       400:
 *         description: Bad request.
 *       404:
 *         description: Not found.
 *       500:
 *         description: Internal server error.
 */
router.post(
  "/get-void-fill-programs-summary",
  asyncHandler(programController.GetVoidFillProgramsSummary)
);

export default router;
