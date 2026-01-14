import { Request, Response } from "express";
import CartService from "../services/CartService";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";

class CartController {
  /**
   * Add an item to the cart
   * @param req Express request object
   * @param res Express response object
   */
  public async addToCart(req: Request, res: Response) {
    try {
      const {
        productId,
        quantity,
        entityId,
        entityType,
        quantityType,
        manufacturerId,
        warehouseId
      } = req.body;
      const {
        associatedUserId: creatorId,
        role: creatorType,
        parentEntityId
      } = req.user;

      const cartItem = await CartService.addToCart({
        creatorId,
        creatorType,
        entityId,
        entityType,
        productId,
        manufacturerId,
        quantity,
        quantityType,
        distributorId: parentEntityId,
        warehouseId
      });
      return sendSuccessResponse(res, cartItem);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Remove an item from the cart
   * @param req Express request object
   * @param res Express response object
   */
  public async removeFromCart(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { associatedUserId: creatorId, role: creatorType } = req.user;

      await CartService.removeFromCart(Number(id), creatorId, creatorType);
      return sendSuccessResponse(res, {
        message: "Item removed from cart successfully"
      });
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Get all items in the cart
   * @param req Express request object
   * @param res Express response object
   */
  public async getCart(req: Request, res: Response) {
    try {
      const { entityId, entityType } = req.query;
      const {
        associatedUserId: creatorId,
        role: creatorType,
        parentEntityId
      } = req.user;

      const cartItems = await CartService.getCart(
        creatorId,
        creatorType,
        entityId ? Number(entityId) : undefined,
        entityType ? String(entityType) : undefined,
        parentEntityId
      );
      return sendSuccessResponse(res, cartItems);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Empty the cart
   * @param req Express request object
   * @param res Express response object
   */
  public async emptyCart(req: Request, res: Response) {
    try {
      const { associatedUserId: creatorId, role: creatorType } = req.user;
      await CartService.emptyCart(creatorId, creatorType);
      return sendSuccessResponse(res, { message: "Cart emptied successfully" });
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Get all items in the cart for a specific entity
   * @param req Express request object
   * @param res Express response object
   */
  public async getCartByEntity(req: Request, res: Response) {
    try {
      const { entityId, entityType } = req.query;
      if (!entityId || !entityType) {
        return sendErrorResponse(
          res,
          "entityId and entityType are required",
          400
        );
      }
      const cartItems = await CartService.getCartByEntity(
        Number(entityId),
        String(entityType)
      );
      return sendSuccessResponse(res, cartItems);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  /**
   * Update a cart item
   * @param req Express request object
   * @param res Express response object
   */
  public async updateCartItem(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { quantity, quantityType, productId } = req.body;
      const { associatedUserId: creatorId, role: creatorType } = req.user;

      const updatedCartItem = await CartService.updateCartItem(
        Number(id),
        { quantity, quantityType, productId },
        creatorId,
        creatorType
      );
      return sendSuccessResponse(res, updatedCartItem);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }
}

export default new CartController();
