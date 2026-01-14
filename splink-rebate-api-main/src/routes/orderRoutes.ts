import { Router } from "express";
import OrderController from "../controllers/OrderController";
import asyncHandler from "../middleware/asyncHandler";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Order:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Order ID
 *         creator_id:
 *           type: integer
 *           description: ID of the entity that created the order
 *         creator_type:
 *           type: string
 *           description: Type of the creator entity
 *         approver_id:
 *           type: integer
 *           nullable: true
 *           description: ID of the entity that approved the order
 *         approver_type:
 *           type: string
 *           nullable: true
 *           description: Type of the approver entity
 *         status:
 *           type: string
 *           enum: [APPROVAL_PENDING, APPROVED, REJECTED, COMPLETED]
 *           description: Current status of the order
 *         total_amount:
 *           type: number
 *           format: float
 *           description: Total amount of the order
 *         quantity:
 *           type: integer
 *           description: Total quantity of items in the order
 *         created_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the order was created
 *         updated_at:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the order was last updated
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/OrderItem'
 *
 *     OrderItem:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Order item ID
 *         order_id:
 *           type: integer
 *           description: ID of the order this item belongs to
 *         product_id:
 *           type: integer
 *           description: ID of the product
 *         price:
 *           type: number
 *           format: float
 *           description: Price of the item
 *         quantity:
 *           type: integer
 *           description: Quantity of the item
 *         quantity_type:
 *           type: string
 *           enum: [UNIT, BOX, CASE]
 *           description: Type of quantity
 *         Product:
 *           $ref: '#/components/schemas/Product'
 *
 *     OrdersResponse:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: "success"
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Order'
 */

/**
 * @swagger
 * tags:
 *   - name: Orders
 *     description: API endpoints for managing orders
 *
 * /orders:
 *   get:
 *     summary: Get orders
 *     description: |
 *       Retrieves orders for the authenticated user.
 *       If isReturnApprovalPending is true, returns approval pending orders for approver.
 *       Otherwise, returns orders created by the user.
 *     tags: [Orders]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [APPROVAL_PENDING, APPROVED, REJECTED, COMPLETED]
 *         description: Filter orders by status (only used when isReturnApprovalPending is false)
 *       - in: query
 *         name: isReturnApprovalPending
 *         schema:
 *           type: boolean
 *         description: If true, returns approval pending orders for approver. If false, returns created orders.
 *     responses:
 *       200:
 *         description: Successfully retrieved orders
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OrdersResponse'
 *       400:
 *         description: Bad request - Invalid status or unauthorized access
 *       401:
 *         description: Unauthorized - User not authenticated
 *       500:
 *         description: Internal server error
 */

// Get orders route
router.get("/", asyncHandler(OrderController.getOrders));

// Get order details route
router.get("/:orderId", asyncHandler(OrderController.getOrderDetails));

// Create order route - accessible by salesrep and distributor
router.post("/", asyncHandler(OrderController.createOrder));

router.patch(
  "/:orderId/status",
  asyncHandler(OrderController.updateOrderStatus)
);

// Delete order route - accessible by salesrep and distributor
router.delete("/:orderId", asyncHandler(OrderController.deleteOrder));

export default router;
