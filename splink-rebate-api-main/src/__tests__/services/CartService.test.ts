/**
 * CartService Tests
 *
 * Tests for shopping cart management operations
 * Focuses on adding, updating, removing, and retrieving cart items
 */

jest.mock("../../repositories/CartRepository");
jest.mock("../../models/Product");
jest.mock("../../models/Distributor");
jest.mock("../../models/ProductCodeMapping");

import { CART_ITEM_QUANTITY_TYPE } from "../../config/appConstants";
import { ERROR_MESSAGES } from "../../config/errorMessages";
import Distributor from "../../models/Distributor";
import Product from "../../models/Product";
import ProductCodeMapping from "../../models/ProductCodeMapping";
import CartRepository from "../../repositories/CartRepository";
import CartService from "../../services/CartService";

describe("CartService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Set default mocks for models (return null by default to avoid DB calls)
    (Product.findOne as jest.Mock).mockResolvedValue(null);
    (Distributor.findByPk as jest.Mock).mockResolvedValue(null);
    (ProductCodeMapping.findOne as jest.Mock).mockResolvedValue(null);
  });

  describe("addToCart", () => {
    const validCartData = {
      creatorId: 100,
      creatorType: "DISTRIBUTOR",
      entityId: 200,
      entityType: "STORE",
      productId: 300,
      manufacturerId: 400,
      quantity: 5,
      quantityType: CART_ITEM_QUANTITY_TYPE.UNIT
    };

    it("should add item to cart successfully", async () => {
      // Arrange
      const mockCartItems = [
        {
          id: 1,
          ...validCartData,
          createdAt: new Date()
        }
      ];
      const mockProduct = {
        id: 500,
        unitSkusId: "300",
        boxSkusId: null,
        caseSkusId: null
      };
      const mockDistributor = {
        id: 100,
        primaryWarehouseId: 600
      };
      (Product.findOne as jest.Mock).mockResolvedValue(mockProduct);
      (Distributor.findByPk as jest.Mock).mockResolvedValue(mockDistributor);
      (ProductCodeMapping.findOne as jest.Mock).mockResolvedValue({
        code: "DIST_CODE_123"
      });
      (CartRepository.createCartItem as jest.Mock).mockResolvedValue(undefined);
      (
        CartRepository.getCartItemsByCreatorAndEntity as jest.Mock
      ).mockResolvedValue(mockCartItems);

      // Act
      const result = await CartService.addToCart({
        ...validCartData,
        distributorId: 100
      });

      // Assert
      expect(CartRepository.createCartItem).toHaveBeenCalledWith(
        expect.objectContaining({
          ...validCartData,
          distProductId: "DIST_CODE_123",
          warehouseId: 600,
          splinkProductId: 500
        })
      );
      expect(
        CartRepository.getCartItemsByCreatorAndEntity
      ).toHaveBeenCalledWith(100, "DISTRIBUTOR", 200, "STORE");
      expect(result).toEqual(mockCartItems);
    });

    it("should return empty array when no cart items found", async () => {
      // Arrange
      const mockProduct = {
        id: 500,
        unitSkusId: "300",
        boxSkusId: null,
        caseSkusId: null
      };
      (Product.findOne as jest.Mock).mockResolvedValue(mockProduct);
      (Distributor.findByPk as jest.Mock).mockResolvedValue(null);
      (ProductCodeMapping.findOne as jest.Mock).mockResolvedValue(null);
      (CartRepository.createCartItem as jest.Mock).mockResolvedValue(undefined);
      (
        CartRepository.getCartItemsByCreatorAndEntity as jest.Mock
      ).mockResolvedValue(null);

      // Act
      const result = await CartService.addToCart(validCartData);

      // Assert
      expect(result).toEqual([]);
    });

    it("should throw error when creatorId is missing", async () => {
      // Arrange
      const invalidData = { ...validCartData, creatorId: 0 };

      // Act & Assert
      await expect(CartService.addToCart(invalidData)).rejects.toThrow(
        ERROR_MESSAGES.MISSING_REQUIRED_FILEDS
      );
      expect(CartRepository.createCartItem).not.toHaveBeenCalled();
    });

    it("should throw error when quantity is zero", async () => {
      // Arrange
      const invalidData = { ...validCartData, quantity: 0 };

      // Act & Assert
      // Note: quantity:0 is falsy, so it triggers missing required fields first
      await expect(CartService.addToCart(invalidData)).rejects.toThrow(
        ERROR_MESSAGES.MISSING_REQUIRED_FILEDS
      );
      expect(CartRepository.createCartItem).not.toHaveBeenCalled();
    });

    it("should throw error when quantity is negative", async () => {
      // Arrange
      const invalidData = { ...validCartData, quantity: -5 };

      // Act & Assert
      await expect(CartService.addToCart(invalidData)).rejects.toThrow(
        "Quantity must be greater than 0"
      );
    });

    it("should throw error when productId is missing", async () => {
      // Arrange
      const invalidData = { ...validCartData, productId: 0 };

      // Act & Assert
      await expect(CartService.addToCart(invalidData)).rejects.toThrow(
        ERROR_MESSAGES.MISSING_REQUIRED_FILEDS
      );
    });

    it("should throw error when manufacturerId is missing", async () => {
      // Arrange
      const invalidData = { ...validCartData, manufacturerId: 0 };

      // Act & Assert
      await expect(CartService.addToCart(invalidData)).rejects.toThrow(
        ERROR_MESSAGES.MISSING_REQUIRED_FILEDS
      );
    });

    it("should handle different quantity types", async () => {
      // Arrange
      const quantityTypes = [
        CART_ITEM_QUANTITY_TYPE.UNIT,
        CART_ITEM_QUANTITY_TYPE.BOX,
        CART_ITEM_QUANTITY_TYPE.CASE
      ];
      const mockProduct = {
        id: 500,
        unitSkusId: "300",
        boxSkusId: "301",
        caseSkusId: "302"
      };
      (Product.findOne as jest.Mock).mockResolvedValue(mockProduct);
      (Distributor.findByPk as jest.Mock).mockResolvedValue(null);
      (ProductCodeMapping.findOne as jest.Mock).mockResolvedValue(null);
      (CartRepository.createCartItem as jest.Mock).mockResolvedValue(undefined);
      (
        CartRepository.getCartItemsByCreatorAndEntity as jest.Mock
      ).mockResolvedValue([]);

      // Act & Assert
      for (const quantityType of quantityTypes) {
        await CartService.addToCart({ ...validCartData, quantityType });
        expect(CartRepository.createCartItem).toHaveBeenCalledWith(
          expect.objectContaining({ quantityType })
        );
      }
    });
  });

  describe("removeFromCart", () => {
    it("should remove cart item successfully", async () => {
      // Arrange
      const cartItemId = 10;
      const creatorId = 100;
      const creatorType = "DISTRIBUTOR";
      const mockCartItem = {
        id: cartItemId,
        creatorId,
        creatorType,
        productId: 200
      };
      (CartRepository.findCartItemById as jest.Mock).mockResolvedValue(
        mockCartItem
      );
      (CartRepository.getCartItem as jest.Mock).mockResolvedValue(mockCartItem);
      (CartRepository.deleteCartItem as jest.Mock).mockResolvedValue(1);

      // Act
      await CartService.removeFromCart(cartItemId, creatorId, creatorType);

      // Assert
      expect(CartRepository.findCartItemById).toHaveBeenCalledWith(cartItemId);
      expect(CartRepository.getCartItem).toHaveBeenCalledWith(
        creatorId,
        creatorType,
        cartItemId
      );
      expect(CartRepository.deleteCartItem).toHaveBeenCalledWith(cartItemId);
    });

    it("should throw error when cart item not found", async () => {
      // Arrange
      const cartItemId = 999;
      (CartRepository.findCartItemById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        CartService.removeFromCart(cartItemId, 100, "DISTRIBUTOR")
      ).rejects.toThrow(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);
      expect(CartRepository.deleteCartItem).not.toHaveBeenCalled();
    });

    it("should throw error when user does not own cart item", async () => {
      // Arrange
      const cartItemId = 10;
      const mockCartItem = { id: cartItemId, creatorId: 100 };
      (CartRepository.findCartItemById as jest.Mock).mockResolvedValue(
        mockCartItem
      );
      (CartRepository.getCartItem as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        CartService.removeFromCart(cartItemId, 999, "DISTRIBUTOR")
      ).rejects.toThrow(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
    });

    it("should throw error when deletion fails", async () => {
      // Arrange
      const cartItemId = 10;
      const mockCartItem = { id: cartItemId, creatorId: 100 };
      (CartRepository.findCartItemById as jest.Mock).mockResolvedValue(
        mockCartItem
      );
      (CartRepository.getCartItem as jest.Mock).mockResolvedValue(mockCartItem);
      (CartRepository.deleteCartItem as jest.Mock).mockResolvedValue(0);

      // Act & Assert
      await expect(
        CartService.removeFromCart(cartItemId, 100, "DISTRIBUTOR")
      ).rejects.toThrow(ERROR_MESSAGES.CART.FAILED_TO_ROMOVE_ITEM);
    });
  });

  describe("getCart", () => {
    it("should retrieve cart items for creator", async () => {
      // Arrange
      const creatorId = 100;
      const creatorType = "DISTRIBUTOR";
      const mockCartItems = [
        { id: 1, productId: 200, quantity: 5 },
        { id: 2, productId: 201, quantity: 3 }
      ];
      (CartRepository.getAllCartItems as jest.Mock).mockResolvedValue(
        mockCartItems
      );

      // Act
      const result = await CartService.getCart(creatorId, creatorType);

      // Assert
      expect(CartRepository.getAllCartItems).toHaveBeenCalledWith(
        creatorId,
        creatorType,
        undefined,
        undefined,
        undefined,
        undefined
      );
      expect(result).toEqual(mockCartItems);
    });

    it("should retrieve cart items with entity filter", async () => {
      // Arrange
      const creatorId = 100;
      const creatorType = "DISTRIBUTOR";
      const entityId = 200;
      const entityType = "STORE";
      const mockCartItems = [{ id: 1, productId: 300 }];
      (CartRepository.getAllCartItems as jest.Mock).mockResolvedValue(
        mockCartItems
      );

      // Act
      const result = await CartService.getCart(
        creatorId,
        creatorType,
        entityId,
        entityType
      );

      // Assert
      expect(CartRepository.getAllCartItems).toHaveBeenCalledWith(
        creatorId,
        creatorType,
        undefined,
        entityId,
        entityType,
        undefined
      );
      expect(result).toEqual(mockCartItems);
    });

    it("should retrieve cart items with distributor filter", async () => {
      // Arrange
      const creatorId = 100;
      const creatorType = "DISTRIBUTOR";
      const distributorId = 500;
      const mockCartItems = [{ id: 1, productId: 300 }];
      (CartRepository.getAllCartItems as jest.Mock).mockResolvedValue(
        mockCartItems
      );

      // Act
      const result = await CartService.getCart(
        creatorId,
        creatorType,
        undefined,
        undefined,
        distributorId
      );

      // Assert
      expect(CartRepository.getAllCartItems).toHaveBeenCalledWith(
        creatorId,
        creatorType,
        undefined,
        undefined,
        undefined,
        distributorId
      );
      expect(result).toEqual(mockCartItems);
    });

    it("should return empty array when no cart items", async () => {
      // Arrange
      (CartRepository.getAllCartItems as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await CartService.getCart(100, "DISTRIBUTOR");

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe("emptyCart", () => {
    it("should empty cart successfully", async () => {
      // Arrange
      const creatorId = 100;
      const creatorType = "DISTRIBUTOR";
      (CartRepository.emptyCart as jest.Mock).mockResolvedValue(5);

      // Act
      await CartService.emptyCart(creatorId, creatorType);

      // Assert
      expect(CartRepository.emptyCart).toHaveBeenCalledWith(
        creatorId,
        creatorType
      );
    });

    it("should throw error when cart is already empty", async () => {
      // Arrange
      const creatorId = 100;
      const creatorType = "DISTRIBUTOR";
      (CartRepository.emptyCart as jest.Mock).mockResolvedValue(0);

      // Act & Assert
      await expect(
        CartService.emptyCart(creatorId, creatorType)
      ).rejects.toThrow("No items found in cart");
    });
  });

  describe("getCartByEntity", () => {
    it("should retrieve cart items by entity", async () => {
      // Arrange
      const entityId = 200;
      const entityType = "STORE";
      const mockCartItems = [{ id: 1, entityId, entityType, productId: 300 }];
      (CartRepository.getCartItemsByEntity as jest.Mock).mockResolvedValue(
        mockCartItems
      );

      // Act
      const result = await CartService.getCartByEntity(entityId, entityType);

      // Assert
      expect(CartRepository.getCartItemsByEntity).toHaveBeenCalledWith(
        entityId,
        entityType
      );
      expect(result).toEqual(mockCartItems);
    });
  });

  describe("updateCartItem", () => {
    const mockCartItem = {
      id: 10,
      creatorId: 100,
      creatorType: "DISTRIBUTOR",
      productId: 200,
      quantity: 5,
      quantityType: CART_ITEM_QUANTITY_TYPE.UNIT,
      update: jest.fn()
    };

    beforeEach(() => {
      mockCartItem.update.mockClear();
    });

    it("should update cart item quantity successfully", async () => {
      // Arrange
      const updateData = { quantity: 10 };
      const updatedItem = { ...mockCartItem, quantity: 10 };
      (CartRepository.findCartItemById as jest.Mock)
        .mockResolvedValueOnce(mockCartItem)
        .mockResolvedValueOnce(updatedItem);
      mockCartItem.update.mockResolvedValue(undefined);

      // Act
      const result = await CartService.updateCartItem(
        10,
        updateData,
        100,
        "DISTRIBUTOR"
      );

      // Assert
      expect(CartRepository.findCartItemById).toHaveBeenCalledWith(10);
      expect(mockCartItem.update).toHaveBeenCalledWith(updateData);
      expect(result).toEqual(updatedItem);
    });

    it("should update cart item quantityType successfully", async () => {
      // Arrange
      const updateData = { quantityType: CART_ITEM_QUANTITY_TYPE.BOX };
      const updatedItem = {
        ...mockCartItem,
        quantityType: CART_ITEM_QUANTITY_TYPE.BOX
      };
      (CartRepository.findCartItemById as jest.Mock)
        .mockResolvedValueOnce(mockCartItem)
        .mockResolvedValueOnce(updatedItem);
      mockCartItem.update.mockResolvedValue(undefined);

      // Act
      const result = await CartService.updateCartItem(
        10,
        updateData,
        100,
        "DISTRIBUTOR"
      );

      // Assert
      expect(mockCartItem.update).toHaveBeenCalledWith(updateData);
      expect(result.quantityType).toBe(CART_ITEM_QUANTITY_TYPE.BOX);
    });

    it("should throw error when cart item not found", async () => {
      // Arrange
      (CartRepository.findCartItemById as jest.Mock).mockResolvedValue(null);

      // Act & Assert
      await expect(
        CartService.updateCartItem(999, { quantity: 10 }, 100, "DISTRIBUTOR")
      ).rejects.toThrow(ERROR_MESSAGES.CART.ITEM_NOT_FOUND);
      expect(mockCartItem.update).not.toHaveBeenCalled();
    });

    it("should throw error when user does not own cart item", async () => {
      // Arrange
      (CartRepository.findCartItemById as jest.Mock).mockResolvedValue(
        mockCartItem
      );

      // Act & Assert
      await expect(
        CartService.updateCartItem(10, { quantity: 10 }, 999, "DISTRIBUTOR")
      ).rejects.toThrow(ERROR_MESSAGES.AUTH.UNAUTHORIZED);
      expect(mockCartItem.update).not.toHaveBeenCalled();
    });

    it("should throw error when quantity is zero", async () => {
      // Arrange
      (CartRepository.findCartItemById as jest.Mock).mockResolvedValue(
        mockCartItem
      );

      // Act & Assert
      await expect(
        CartService.updateCartItem(10, { quantity: 0 }, 100, "DISTRIBUTOR")
      ).rejects.toThrow("Quantity must be greater than 0");
    });

    it("should throw error when quantity is negative", async () => {
      // Arrange
      (CartRepository.findCartItemById as jest.Mock).mockResolvedValue(
        mockCartItem
      );

      // Act & Assert
      await expect(
        CartService.updateCartItem(10, { quantity: -5 }, 100, "DISTRIBUTOR")
      ).rejects.toThrow("Quantity must be greater than 0");
    });

    it("should throw error when quantityType is invalid", async () => {
      // Arrange
      (CartRepository.findCartItemById as jest.Mock).mockResolvedValue(
        mockCartItem
      );

      // Act & Assert
      await expect(
        CartService.updateCartItem(
          10,
          { quantityType: "INVALID_TYPE" },
          100,
          "DISTRIBUTOR"
        )
      ).rejects.toThrow("Invalid quantity type");
    });

    it("should accept all valid quantity types", async () => {
      // Arrange
      const validTypes = [
        CART_ITEM_QUANTITY_TYPE.UNIT,
        CART_ITEM_QUANTITY_TYPE.BOX,
        CART_ITEM_QUANTITY_TYPE.CASE
      ];
      (CartRepository.findCartItemById as jest.Mock).mockResolvedValue(
        mockCartItem
      );
      mockCartItem.update.mockResolvedValue(undefined);

      // Act & Assert
      for (const quantityType of validTypes) {
        (CartRepository.findCartItemById as jest.Mock)
          .mockResolvedValueOnce(mockCartItem)
          .mockResolvedValueOnce({ ...mockCartItem, quantityType });

        await CartService.updateCartItem(
          10,
          { quantityType },
          100,
          "DISTRIBUTOR"
        );

        expect(mockCartItem.update).toHaveBeenCalledWith(
          expect.objectContaining({ quantityType })
        );
      }
    });

    it("should throw error when update fails to refresh item", async () => {
      // Arrange
      (CartRepository.findCartItemById as jest.Mock)
        .mockResolvedValueOnce(mockCartItem)
        .mockResolvedValueOnce(null);
      mockCartItem.update.mockResolvedValue(undefined);

      // Act & Assert
      await expect(
        CartService.updateCartItem(10, { quantity: 10 }, 100, "DISTRIBUTOR")
      ).rejects.toThrow("Failed to update cart item");
    });

    it("should update multiple fields at once", async () => {
      // Arrange
      const updateData = {
        quantity: 15,
        quantityType: CART_ITEM_QUANTITY_TYPE.CASE
      };
      const updatedItem = { ...mockCartItem, ...updateData };
      (CartRepository.findCartItemById as jest.Mock)
        .mockResolvedValueOnce(mockCartItem)
        .mockResolvedValueOnce(updatedItem);
      mockCartItem.update.mockResolvedValue(undefined);

      // Act
      const result = await CartService.updateCartItem(
        10,
        updateData,
        100,
        "DISTRIBUTOR"
      );

      // Assert
      expect(mockCartItem.update).toHaveBeenCalledWith(updateData);
      expect(result.quantity).toBe(15);
      expect(result.quantityType).toBe(CART_ITEM_QUANTITY_TYPE.CASE);
    });
  });
});
