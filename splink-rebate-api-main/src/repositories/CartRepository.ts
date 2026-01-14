import { col, fn } from "sequelize";
import { CART_ITEM_QUANTITY_TYPE, ENTITY_TYPE } from "../config/appConstants";
import sequelize from "../db";
import CartItem from "../models/CartItem";
import Manufacturer from "../models/Manufacturer";
import Product from "../models/Product";
import Store from "../models/Store";
import { getProductCodeMappingInclude } from "../utils/helpers";

class CartRepository {
  /**
   * Find an existing cart item with the same product, quantity type, and entity
   * @param data Cart item data
   * @returns Found cart item or null
   */
  public async findExistingCartItem(data: {
    creatorId: number;
    creatorType: string;
    entityId: number;
    entityType: string;
    productId: number;
    manufacturerId: number;
    quantityType: string;
  }): Promise<CartItem | null> {
    return CartItem.findOne({
      where: {
        creatorId: data.creatorId,
        creatorType: data.creatorType,
        entityId: data.entityId,
        entityType: data.entityType,
        productId: data.productId,
        manufacturerId: data.manufacturerId,
        quantityType: data.quantityType
      }
    });
  }

  /**
   * Create a new cart item or update quantity if item exists
   * @param data Cart item data
   * @returns Created or updated cart item
   */
  public async createCartItem(data: {
    creatorId: number;
    creatorType: string;
    entityId: number;
    entityType: string;
    productId: number;
    manufacturerId: number;
    quantity: number;
    quantityType: string;
    distProductId?: string | null;
    warehouseId?: number | null;
    splinkProductId?: number | null;
  }): Promise<CartItem> {
    // Find existing cart item
    const existingItem = await this.findExistingCartItem({
      creatorId: data.creatorId,
      creatorType: data.creatorType,
      entityId: data.entityId,
      entityType: data.entityType,
      productId: data.productId,
      manufacturerId: data.manufacturerId,
      quantityType: data.quantityType
    });

    if (existingItem) {
      // Update quantity if item exists
      existingItem.quantity += data.quantity;
      return await existingItem.save();
    }
    // Create new item if it doesn't exist
    return CartItem.create(data);
  }

  /**
   * Find a cart item by ID
   * @param id Cart item ID
   * @returns Found cart item or null
   */
  public async findCartItemById(id: number): Promise<CartItem | null> {
    return CartItem.findByPk(id);
  }

  /**
   * Delete a cart item by ID
   * @param id Cart item ID
   * @returns Number of deleted items
   */
  public async deleteCartItem(id: number): Promise<number> {
    return CartItem.destroy({
      where: { id }
    });
  }

  /**
   * Get cart item for an creator
   * @param creatorId ID of the creator
   * @param creatorType Type of the creator
   * @param id id of the cart item
   * @returns cart item
   */
  public async getCartItem(
    creatorId: number,
    creatorType: string,
    id: number
  ): Promise<CartItem | null> {
    return await CartItem.findOne({
      where: {
        creatorId,
        creatorType,
        id
      }
    });
  }

  /**
   * Get cart item for an creator
   * @param creatorId ID of the creator
   * @param creatorType Type of the creator
   * @param entityId ID of the entity
   * @param entityType Type of the entity
   * @returns cart item
   */
  public async getCartItemsByCreatorAndEntity(
    creatorId: number,
    creatorType: string,
    entityId?: number,
    entityType?: string
  ): Promise<CartItem[] | null> {
    return CartItem.findAll({
      attributes: [
        "id",
        "creatorId",
        "creatorType",
        "entityId",
        "entityType",
        "productId",
        "quantity",
        "quantityType"
      ],
      where: {
        creatorId,
        creatorType,
        ...(entityId ? { entityId } : {}),
        ...(entityType ? { entityType } : {})
      }
    });
  }

  /**
   * Get all cart items for an creator with product information
   * @param creatorId ID of the creator
   * @param creatorType Type of the creator
   * @param id Optional cart item ID
   * @returns Array of cart items with product information
   */
  public async getAllCartItems(
    creatorId: number,
    creatorType: string,
    id?: number,
    entityId?: number,
    entityType?: string,
    distributorId?: number
  ): Promise<CartItem[]> {
    const whereClause = {
      creatorId,
      creatorType,
      ...(id ? { id } : {}),
      ...(entityId ? { entityId } : {}),
      ...(entityType ? { entityType } : {})
    };

    const attributes: (string | [any, string])[] = [
      "id",
      "name",
      "brand",
      "price",
      "size",
      "unit_skus_id",
      "box_skus_id",
      "case_skus_id",
      "unit_price",
      "box_price",
      "case_price"
    ];

    if (distributorId) {
      // Create CASE statement dynamically based on configuration
      const internalCodeCase: [any, string] = [
        fn("MIN", col("Product->ProductCodeMapping.code")),
        "internal_code"
      ];
      attributes.push(internalCodeCase);

      // Get product name from ProductCodeMapping table
      const productCodeMapName: [any, string] = [
        fn("MIN", col("Product->ProductCodeMapping.product_name")),
        "product_name"
      ];
      attributes.push(productCodeMapName);
    }

    // Get warehouse id from store if entity type is store and entity id is provided
    // then get the warehouse id from the store
    let warehouseId: any;
    if (entityType === ENTITY_TYPE.STORE && entityId) {
      const store = await Store.findByPk(entityId);
      if (store?.warehouseId) {
        warehouseId = store?.warehouseId;
      }
    }

    return CartItem.findAll({
      where: whereClause,
      include: [
        {
          model: Product,
          as: "Product",
          attributes,
          required: true,
          on: sequelize.literal(`(
            (("Product".unit_skus_id = "CartItem".product_id AND "CartItem".quantity_type = '${CART_ITEM_QUANTITY_TYPE.UNIT}') OR
            ("Product".box_skus_id = "CartItem".product_id AND "CartItem".quantity_type = '${CART_ITEM_QUANTITY_TYPE.BOX}') OR
            ("Product".case_skus_id = "CartItem".product_id AND "CartItem".quantity_type = '${CART_ITEM_QUANTITY_TYPE.CASE}')) AND "Product".primary_variant = true
          ) AND "CartItem".manufacturer_id = "Product".manufacturer_id`),
          include: getProductCodeMappingInclude(distributorId, warehouseId)
        },
        {
          model: Store,
          as: "Store",
          attributes: ["name"],
          required: true
        },
        {
          model: Manufacturer,
          as: "Manufacturer",
          attributes: ["name"],
          required: true
        }
      ],
      group: ["CartItem.id", "Store.id", "Product.id", "Manufacturer.id"],
      order: [["created_at", "DESC"]]
    });
  }

  /**
   * Empty the cart for an creator
   * @param creatorId ID of the creator
   * @param creatorType Type of the creator
   * @returns Number of deleted items
   */
  public async emptyCart(
    creatorId: number,
    creatorType: string
  ): Promise<number> {
    return CartItem.destroy({
      where: {
        creatorId,
        creatorType
      },
      force: true // Hard delete
    });
  }

  public async getCartItemsByEntity(
    entityId: number,
    entityType: string
  ): Promise<CartItem[]> {
    return CartItem.findAll({
      attributes: [
        "id",
        "creatorId",
        "creatorType",
        "entityId",
        "entityType",
        "productId",
        "quantity",
        "quantityType"
      ],
      where: { entityId, entityType }
    });
  }
}

export default new CartRepository();
