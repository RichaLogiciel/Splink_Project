import { Router } from "express";
import WishlistController from "../controllers/WishlistController";
import asyncHandler from "../middleware/asyncHandler";

const router = Router();
/**
 * @swagger
 * tags:
 *   - name: Wishlist
 *     description: API endpoints related to wishlist management.
 *
 * /wishlist/add:
 *   post:
 *     summary: Add a product to the wishlist or remove it if it already exists.
 *     tags: [Wishlist]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               storeId:
 *                 type: integer
 *                 description: The ID of the store.
 *               productId:
 *                 type: integer
 *                 description: The ID of the product.
 *               toggleStatus:
 *                 type: boolean
 *                 description: Whether to toggle the status of the wishlist item (remove if it already exists).
 *                 default: false
 *             required:
 *               - storeId
 *               - productId
 *             example:
 *               storeId: 1
 *               productId: 123
 *               toggleStatus: false
 *     responses:
 *       200:
 *         description: Product added to wishlist successfully or removed if it already exists.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the response.
 *                 data:
 *                   oneOf:
 *                     - type: object
 *                       properties:
 *                         id:
 *                           type: integer
 *                           description: The ID of the new wishlist item.
 *                         storeId:
 *                           type: integer
 *                           description: The ID of the store.
 *                         productId:
 *                           type: integer
 *                           description: The ID of the product.
 *                         createdAt:
 *                           type: string
 *                           format: date-time
 *                           description: The creation timestamp.
 *                         updatedAt:
 *                           type: string
 *                           format: date-time
 *                           description: The last update timestamp.
 *                     - type: object
 *                       properties:
 *                         message:
 *                           type: string
 *                           description: The message indicating the wishlist item was removed.
 *             examples:
 *               added:
 *                 value:
 *                   status: "success"
 *                   data:
 *                     id: 1
 *                     storeId: 1
 *                     productId: 123
 *                     createdAt: "2023-10-01T12:34:56Z"
 *                     updatedAt: "2023-10-01T12:34:56Z"
 *               removed:
 *                 value:
 *                   status: "success"
 *                   data:
 *                     message: "Wishlist item removed successfully."
 *       400:
 *         description: Store ID and Product ID are required.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the response.
 *                 data:
 *                   type: string
 *                   description: The error message.
 *             example:
 *               status: "error"
 *               data: "Store ID and Product ID are required."
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the response.
 *                 data:
 *                   type: string
 *                   description: The error message.
 *             example:
 *               status: "error"
 *               data: "Internal server error"
 *
 *     security:
 *       - bearerAuth: []
 */
router.post("/add", asyncHandler(WishlistController.addToWishlist));

/**
 * @swagger
 * tags:
 *   - name: Wishlist
 *     description: API endpoints related to wishlist management.
 *
 * /wishlist/store/{storeId}:
 *   get:
 *     summary: Retrieve all wishlist products for a store.
 *     tags: [Wishlist]
 *     parameters:
 *       - name: storeId
 *         in: path
 *         required: true
 *         description: The ID of the store for which to retrieve wishlist products.
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Successful retrieval of wishlist products.
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
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         description: The ID of the wishlist product.
 *                       product_name:
 *                         type: string
 *                         description: The name of the product.
 *                       product_id:
 *                         type: integer
 *                         description: The ID of the product.
 *             example:
 *               status: "success"
 *               data:
 *                 - id: 11
 *                   product_name: "Salted Shell"
 *                   product_id: 1
 *                 - id: 28
 *                   product_name: "Mentos Gum Pure Fresh"
 *                   product_id: 8
 *                 - id: 31
 *                   product_name: "No Shell Pistachios"
 *                   product_id: 4
 *                 - id: 32
 *                   product_name: "Lemonade"
 *                   product_id: 11
 *       404:
 *         description: Store not found.
 *       500:
 *         description: Internal server error.
 *
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/store/:storeId",
  asyncHandler(WishlistController.getWishlistsByStoreId)
);

/**
 * @swagger
 * tags:
 *   - name: Wishlist
 *     description: API endpoints related to wishlist management.
 *
 * /wishlist/delete:
 *   delete:
 *     summary: Delete wishlists by IDs.
 *     tags: [Wishlist]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               distributorId:
 *                 type: integer
 *                 description: The ID of the distributor.
 *               id:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 description: The IDs of the wishlists to delete.
 *             example:
 *               distributorId: 1212
 *               id: [1, 2, 3]
 *     responses:
 *       200:
 *         description: All wishlists deleted successfully.
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
 *                   properties:
 *                     message:
 *                       type: string
 *                       description: The success message.
 *             example:
 *               status: "success"
 *               data:
 *                 message: "All wishlists deleted successfully"
 *       400:
 *         description: Invalid wishlist IDs.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the response.
 *                 data:
 *                   type: string
 *                   description: The error message.
 *             example:
 *               status: "error"
 *               data: "Invalid wishlist IDs"
 *       207:
 *         description: Some wishlists could not be deleted.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the response.
 *                 data:
 *                   type: string
 *                   description: The error message.
 *             example:
 *               status: "error"
 *               data: "Some wishlists could not be deleted"
 *       500:
 *         description: Internal server error.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   description: The status of the response.
 *                 data:
 *                   type: string
 *                   description: The error message.
 *             example:
 *               status: "error"
 *               data: "Internal server error"
 *
 *     security:
 *       - bearerAuth: []
 */
router.delete("/delete", asyncHandler(WishlistController.deleteWishlists));

export default router;
