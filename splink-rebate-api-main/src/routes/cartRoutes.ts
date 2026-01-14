import { Router } from "express";
import CartController from "../controllers/CartController";
import asyncHandler from "../middleware/asyncHandler";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Product ID
 *         name:
 *           type: string
 *           description: Product name
 *         description:
 *           type: string
 *           description: Product description
 *         unit_skus_id:
 *           type: integer
 *           description: Unit SKU ID
 *         box_skus_id:
 *           type: integer
 *           description: Box SKU ID
 *         case_skus_id:
 *           type: integer
 *           description: Case SKU ID
 *         created_at:
 *           type: string
 *           format: date-time
 *         updated_at:
 *           type: string
 *           format: date-time
 *
 *     CartItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Cart item ID
 *         creator_id:
 *           type: integer
 *           description: ID of the creator that owns the cart
 *         creator_type:
 *           type: string
 *           description: Type of creator (Sales Rep)
 *         product_id:
 *           type: integer
 *           description: ID of the product
 *         quantity:
 *           type: integer
 *           description: Quantity of the product
 *         quantity_type:
 *           type: string
 *           description: Type of quantity (UNIT, BOX, CASE)
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the item was added to cart
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the item was last updated
 *         deleted_at:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Timestamp when the item was deleted (if applicable)
 *         Product:
 *           $ref: '#/components/schemas/Product'
 *       required:
 *         - entity_id
 *         - entity_type
 *         - product_id
 *         - quantity
 *         - quantity_type
 *
 *     AddToCartRequest:
 *       type: object
 *       required:
 *         - product_id
 *         - quantity
 *         - quantity_type
 *       properties:
 *         product_id:
 *           type: integer
 *           description: ID of the product to add (must match the corresponding SKU ID based on quantity_type)
 *         quantity:
 *           type: integer
 *           description: Quantity of the product
 *         quantity_type:
 *           type: string
 *           enum: [UNIT, BOX, CASE]
 *           description: Type of quantity (UNIT, BOX, or CASE)
 *
 *     CartResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *
 *     CartItemResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         data:
 *           $ref: '#/components/schemas/CartItem'
 *
 *     MessageResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         data:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *               example: "Cart emptied successfully"
 */

/**
 * @swagger
 * tags:
 *   - name: Cart
 *     description: API endpoints for managing shopping cart items
 *
 * /cart/items:
 *   get:
 *     summary: Get all items in the cart
 *     description: Retrieves all items in the cart for the authenticated user
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved cart items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartResponse'
 *       401:
 *         description: Unauthorized - User not authenticated
 *       500:
 *         description: Internal server error
 *
 *   post:
 *     summary: Add an item to the cart
 *     description: |
 *       Adds a new item to the cart for the authenticated user.
 *       If an item with the same product ID and quantity type already exists,
 *       the quantity will be increased instead of creating a new entry.
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddToCartRequest'
 *     responses:
 *       200:
 *         description: Successfully added or updated item in cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartItemResponse'
 *       400:
 *         description: Bad request - Missing required fields or invalid quantity
 *       401:
 *         description: Unauthorized - User not authenticated
 *       500:
 *         description: Internal server error
 *
 *   delete:
 *     summary: Empty the cart
 *     description: Removes all items from the cart for the authenticated user
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully emptied cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Unauthorized - User not authenticated
 *       404:
 *         description: No items found in cart
 *       500:
 *         description: Internal server error
 *
 * /cart/items/{id}:
 *   delete:
 *     summary: Remove an item from the cart
 *     description: Removes a specific item from the cart by its ID
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID of the cart item to remove
 *     responses:
 *       200:
 *         description: Successfully removed item from cart
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       401:
 *         description: Unauthorized - User not authenticated
 *       404:
 *         description: Cart item not found
 *       500:
 *         description: Internal server error
 *
 * /cart/items/by-entity:
 *   get:
 *     summary: Get cart items by entity
 *     description: Retrieves all items in the cart for a specific entity
 *     tags: [Cart]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successfully retrieved cart items
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CartResponse'
 *       401:
 *         description: Unauthorized - User not authenticated
 *       500:
 *         description: Internal server error
 */

// Get all cart items
router.get("/items", asyncHandler(CartController.getCart));

// Add item to cart
router.post("/items", asyncHandler(CartController.addToCart));

// Remove item from cart
router.delete("/items/:id", asyncHandler(CartController.removeFromCart));

// Empty cart
router.delete("/items", asyncHandler(CartController.emptyCart));

// Get cart items by entity
router.get("/items/by-entity", asyncHandler(CartController.getCartByEntity));

// Update cart item
router.put("/items/:id", asyncHandler(CartController.updateCartItem));

export default router;
