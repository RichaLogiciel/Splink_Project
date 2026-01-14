import { Router } from "express";
import StoreController from "../controllers/StoreController";
import asyncHandler from "../middleware/asyncHandler";

const router = Router();

/**
 * @swagger
 * /api/v2/store/details/{id}:
 *   get:
 *     summary: Get Store Details by Store ID (v2)
 *     description: Retrieves the details of a store by its unique ID (v2 API).
 *     tags:
 *       - Store
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the store to retrieve details for.
 *       - in: query
 *         name: programTimeline
 *         required: false
 *         schema:
 *           type: string
 *         description: Timeline filter for programs (e.g., Current, Past, Future).
 *       - in: query
 *         name: isChainStore
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Whether the store is a chain store.
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
 *                 data:
 *                   type: object
 *                   description: Store details data
 *       404:
 *         description: Store not found.
 *       500:
 *         description: Server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get("/details/:id", asyncHandler(StoreController.getStoreDetailsV2));

/**
 * @swagger
 * /api/v2/store/listing:
 *   get:
 *     summary: Get Store Listings (v2)
 *     description: Retrieves a list of stores with their sales volumes and program data (v2 API).
 *     tags:
 *       - Store
 *     parameters:
 *       - in: query
 *         name: distributorId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the distributor.
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *         description: Page number for pagination.
 *       - in: query
 *         name: sort
 *         required: false
 *         schema:
 *           type: string
 *         description: Sort order (ASC or DESC).
 *       - in: query
 *         name: searchQuery
 *         required: false
 *         schema:
 *           type: string
 *         description: Search query to filter stores.
 *       - in: query
 *         name: selectedSalesRepId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter by sales representative ID.
 *       - in: query
 *         name: chainId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter by chain ID.
 *       - in: query
 *         name: sortKey
 *         required: false
 *         schema:
 *           type: string
 *         description: Key to sort by.
 *       - in: query
 *         name: warehouseId
 *         required: false
 *         schema:
 *           type: integer
 *         description: Filter by warehouse ID.
 *       - in: query
 *         name: returnSpiffEarning
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Whether to return SPIFF earning data.
 *       - in: query
 *         name: programTimeline
 *         required: false
 *         schema:
 *           type: string
 *         description: Timeline filter for programs.
 *       - in: query
 *         name: isInternal
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Whether to filter by internal initiatives.
 *       - in: query
 *         name: isExcludeChainStores
 *         required: false
 *         schema:
 *           type: boolean
 *         description: Whether to exclude chain stores.
 *     responses:
 *       200:
 *         description: Successfully retrieved store listings.
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
 *                   description: Store listings data
 *       400:
 *         description: Bad request (e.g., missing distributorId).
 *       500:
 *         description: Server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get("/listing", asyncHandler(StoreController.getListingV2));

export default router;
