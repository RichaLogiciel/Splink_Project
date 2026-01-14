import { CART_ITEM_QUANTITY_TYPE } from "../config/appConstants";
import { ERROR_MESSAGES } from "../config/errorMessages";
import { ApiError } from "../lib/errors/APIError";
import CartItem from "../models/CartItem";
import Distributor from "../models/Distributor";
import Product from "../models/Product";
import ProductCodeMapping from "../models/ProductCodeMapping";
import CartRepository from "../repositories/CartRepository";

class CartService {
  /**
   * Add an item to the cart or update quantity if item exists
   * @param data Cart item data including entity information
   * @returns Created or updated cart item
   */
  public async addToCart(data: {
    creatorId: number;
    creatorType: string;
    entityId: number;
    entityType: string;
    productId: number;
    manufacturerId: number;
    quantity: number;
    quantityType: string;
    distributorId?: number;
    warehouseId?: number;
  }): Promise<CartItem[]> {
    const {
      creatorId,
      creatorType,
      entityId,
      entityType,
      productId,
      manufacturerId,
      quantity,
      quantityType,
      distributorId,
      warehouseId
    } = data;

    // Validate required fields
    if (
      !creatorId ||
      !creatorType ||
      !entityId ||
      !entityType ||
      !productId ||
      !manufacturerId ||
      !quantity ||
      !quantityType
    ) {
      throw ApiError.badRequest(ERROR_MESSAGES.MISSING_REQUIRED_FILEDS);
    }

    // Validate quantity
    if (quantity <= 0) {
      throw ApiError.badRequest("Quantity must be greater than 0");
    }

    // Look up the Product to get the actual Product.id (productId in CartItem is a SKU ID)
    // Convert productId to string since SKU IDs are stored as STRING in Product table
    const productIdString = String(productId);
    const productWhere: any = {
      manufacturerId
    };
    if (quantityType === CART_ITEM_QUANTITY_TYPE.UNIT) {
      productWhere.unitSkusId = productIdString;
    } else if (quantityType === CART_ITEM_QUANTITY_TYPE.BOX) {
      productWhere.boxSkusId = productIdString;
    } else if (quantityType === CART_ITEM_QUANTITY_TYPE.CASE) {
      productWhere.caseSkusId = productIdString;
    }

    const product = await Product.findOne({
      where: productWhere
    });

    // Get the actual Product ID for ProductCodeMapping lookup and splink_product_id
    const actualProductId: number | null = product ? product.id : null;

    // Resolve warehouse_id from Distributor's primary_warehouse_id if warehouseId not provided
    let resolvedWarehouseId: number | null = warehouseId || null;
    if (!resolvedWarehouseId && creatorId) {
      const distributor = await Distributor.findByPk(creatorId);
      if (distributor && distributor.primaryWarehouseId) {
        resolvedWarehouseId = distributor.primaryWarehouseId;
      }
    }

    // Resolve dist_product_id from ProductCodeMapping if creatorId and actualProductId are available
    let distProductId: string | null = null;
    if (distributorId && actualProductId) {
      const productCodeMapping = await ProductCodeMapping.findOne({
        where: {
          distributorId,
          productId: actualProductId,
          ...(resolvedWarehouseId ? { warehouseId: resolvedWarehouseId } : {})
        },
        order: [["created_at", "DESC"]]
      });
      if (productCodeMapping) {
        distProductId = productCodeMapping.code;
      }
    }

    // splink_product_id is the actual Product.id
    const splinkProductId: number | null = actualProductId;

    // Add to cart (will update quantity if item exists)
    await CartRepository.createCartItem({
      creatorId,
      creatorType,
      entityId,
      entityType,
      productId,
      manufacturerId,
      quantity,
      quantityType,
      distProductId,
      warehouseId: resolvedWarehouseId,
      splinkProductId
    });

    const cartItems = await CartRepository.getCartItemsByCreatorAndEntity(
      creatorId,
      creatorType,
      entityId,
      entityType
    );

    return cartItems ?? [];
  }

  /**
   * Remove an item from the cart
   * @param id Cart item ID
   * @returns True if item was removed
   */
  public async removeFromCart(
    id: number,
    creatorId: number,
    creatorType: string
  ): Promise<void> {
    const cartItem = await CartRepository.findCartItemById(id);
    if (!cartItem) {
      throw ApiError.notFound(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);
    }

    const ownCartIten = await CartRepository.getCartItem(
      creatorId,
      creatorType,
      id
    );
    if (!ownCartIten) {
      throw ApiError.notFound(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
    }

    const deletedCount = await CartRepository.deleteCartItem(id);
    if (deletedCount === 0) {
      throw ApiError.internal(ERROR_MESSAGES.CART.FAILED_TO_ROMOVE_ITEM);
    }
  }

  /**
   * Get all items in the cart for an creator
   * @param creatorId ID of the creator
   * @param creatorType Type of the creator
   * @returns Array of cart items
   */
  public async getCart(
    creatorId: number,
    creatorType: string,
    entityId?: number,
    entityType?: string,
    distributorId?: number
  ): Promise<CartItem[]> {
    return CartRepository.getAllCartItems(
      creatorId,
      creatorType,
      undefined,
      entityId,
      entityType,
      distributorId
    );
  }

  /**
   * Empty the cart for an creator
   * @param creatorId ID of the creator
   * @param creatorType Type of the creator
   * @returns True if cart was emptied
   */
  public async emptyCart(
    creatorId: number,
    creatorType: string
  ): Promise<void> {
    const deletedCount = await CartRepository.emptyCart(creatorId, creatorType);
    if (deletedCount === 0) {
      throw ApiError.notFound("No items found in cart");
    }
  }

  public async getCartByEntity(entityId: number, entityType: string) {
    return CartRepository.getCartItemsByEntity(entityId, entityType);
  }

  /**
   * Update a cart item by ID
   * @param id Cart item ID
   * @param updateData Data to update (quantity, quantityType, productId)
   * @param creatorId ID of the creator
   * @param creatorType Type of the creator
   * @returns Updated cart item
   */
  public async updateCartItem(
    id: number,
    updateData: {
      quantity?: number;
      quantityType?: string;
      productId?: number;
    },
    creatorId: number,
    creatorType: string
  ): Promise<CartItem> {
    // Verify cart item exists
    const cartItem = await CartRepository.findCartItemById(id);
    if (!cartItem) {
      throw ApiError.notFound(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);
    }

    // Verify ownership
    if (
      cartItem.creatorId !== creatorId ||
      cartItem.creatorType !== creatorType
    ) {
      throw ApiError.badRequest(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
    }

    // Validate quantity if provided
    if (updateData.quantity !== undefined && updateData.quantity <= 0) {
      throw ApiError.badRequest("Quantity must be greater than 0");
    }

    // Validate quantityType if provided - must be one of UNIT, BOX, or CASE
    if (updateData.quantityType !== undefined) {
      const validTypes = [
        CART_ITEM_QUANTITY_TYPE.UNIT,
        CART_ITEM_QUANTITY_TYPE.BOX,
        CART_ITEM_QUANTITY_TYPE.CASE
      ];
      if (!validTypes.includes(updateData.quantityType)) {
        throw ApiError.badRequest("Invalid quantity type");
      }
    }

    // Update the cart item
    await cartItem.update(updateData);

    // Refresh the cart item to get associated data
    const updatedCartItem = await CartRepository.findCartItemById(id);
    if (!updatedCartItem) {
      throw ApiError.badRequest("Failed to update cart item");
    }

    return updatedCartItem;
  }
}

export default new CartService();
