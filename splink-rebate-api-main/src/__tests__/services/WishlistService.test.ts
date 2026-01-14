/**
 * WishlistService Tests
 *
 * Tests for wishlist management operations
 * Focuses on adding, retrieving, and deleting wishlist items
 */

jest.mock("../../repositories/WishlistRepository");

import WishlistService from "../../services/WishlistService";
import WishlistRepository from "../../repositories/WishlistRepository";

describe("WishlistService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("addToWishlist", () => {
    it("should add product to wishlist successfully", async () => {
      // Arrange
      const storeId = 100;
      const productId = 200;
      const toggle = true;
      const mockResult = {
        id: 1,
        storeId,
        productId,
        createdAt: new Date()
      };
      (WishlistRepository.createWishlistItem as jest.Mock).mockResolvedValue(
        mockResult
      );

      // Act
      const result = await WishlistService.addToWishlist(
        storeId,
        productId,
        toggle
      );

      // Assert
      expect(WishlistRepository.createWishlistItem).toHaveBeenCalledWith(
        storeId,
        productId,
        toggle
      );
      expect(result).toEqual(mockResult);
    });

    it("should toggle off product from wishlist", async () => {
      // Arrange
      const storeId = 100;
      const productId = 200;
      const toggle = false;
      const mockResult = {
        message: "Removed from wishlist"
      };
      (WishlistRepository.createWishlistItem as jest.Mock).mockResolvedValue(
        mockResult
      );

      // Act
      const result = await WishlistService.addToWishlist(
        storeId,
        productId,
        toggle
      );

      // Assert
      expect(WishlistRepository.createWishlistItem).toHaveBeenCalledWith(
        storeId,
        productId,
        false
      );
      expect(result).toEqual(mockResult);
    });

    it("should handle repository errors", async () => {
      // Arrange
      const storeId = 100;
      const productId = 200;
      const toggle = true;
      const mockError = new Error("Database error");
      (WishlistRepository.createWishlistItem as jest.Mock).mockRejectedValue(
        mockError
      );

      // Act & Assert
      await expect(
        WishlistService.addToWishlist(storeId, productId, toggle)
      ).rejects.toThrow("Database error");
    });

    it("should handle different store and product IDs", async () => {
      // Arrange
      const storeId = 999;
      const productId = 888;
      const toggle = true;
      (WishlistRepository.createWishlistItem as jest.Mock).mockResolvedValue({
        id: 5
      });

      // Act
      await WishlistService.addToWishlist(storeId, productId, toggle);

      // Assert
      expect(WishlistRepository.createWishlistItem).toHaveBeenCalledWith(
        999,
        888,
        true
      );
    });
  });

  describe("getWishlistsByStoreId", () => {
    it("should retrieve wishlists for a store successfully", async () => {
      // Arrange
      const storeId = 100;
      const distributorId = 50;
      const mockWishlists = [
        {
          id: 1,
          storeId,
          productId: 200,
          productName: "Product A",
          createdAt: new Date()
        },
        {
          id: 2,
          storeId,
          productId: 201,
          productName: "Product B",
          createdAt: new Date()
        }
      ];
      (WishlistRepository.findAllByStoreId as jest.Mock).mockResolvedValue(
        mockWishlists
      );

      // Act
      const result = await WishlistService.getWishlistsByStoreId(
        storeId,
        distributorId
      );

      // Assert
      expect(WishlistRepository.findAllByStoreId).toHaveBeenCalledWith(
        storeId,
        distributorId
      );
      expect(result).toEqual(mockWishlists);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when store has no wishlists", async () => {
      // Arrange
      const storeId = 100;
      const distributorId = 50;
      (WishlistRepository.findAllByStoreId as jest.Mock).mockResolvedValue([]);

      // Act
      const result = await WishlistService.getWishlistsByStoreId(
        storeId,
        distributorId
      );

      // Assert
      expect(WishlistRepository.findAllByStoreId).toHaveBeenCalledWith(
        storeId,
        distributorId
      );
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it("should handle repository errors", async () => {
      // Arrange
      const storeId = 100;
      const distributorId = 50;
      const mockError = new Error("Database connection failed");
      (WishlistRepository.findAllByStoreId as jest.Mock).mockRejectedValue(
        mockError
      );

      // Act & Assert
      await expect(
        WishlistService.getWishlistsByStoreId(storeId, distributorId)
      ).rejects.toThrow("Database connection failed");
    });

    it("should pass correct parameters to repository", async () => {
      // Arrange
      const storeId = 777;
      const distributorId = 888;
      (WishlistRepository.findAllByStoreId as jest.Mock).mockResolvedValue([]);

      // Act
      await WishlistService.getWishlistsByStoreId(storeId, distributorId);

      // Assert
      expect(WishlistRepository.findAllByStoreId).toHaveBeenCalledWith(
        777,
        888
      );
      expect(WishlistRepository.findAllByStoreId).toHaveBeenCalledTimes(1);
    });
  });

  describe("deleteWishlist", () => {
    it("should delete wishlist item successfully", async () => {
      // Arrange
      const wishlistId = 10;
      const storeId = 100;
      (WishlistRepository.delete as jest.Mock).mockResolvedValue(1);

      // Act
      const result = await WishlistService.deleteWishlist(wishlistId, storeId);

      // Assert
      expect(WishlistRepository.delete).toHaveBeenCalledWith(
        wishlistId,
        storeId
      );
      expect(result).toBe(1);
    });

    it("should return 0 when wishlist item not found", async () => {
      // Arrange
      const wishlistId = 999;
      const storeId = 100;
      (WishlistRepository.delete as jest.Mock).mockResolvedValue(0);

      // Act
      const result = await WishlistService.deleteWishlist(wishlistId, storeId);

      // Assert
      expect(WishlistRepository.delete).toHaveBeenCalledWith(
        wishlistId,
        storeId
      );
      expect(result).toBe(0);
    });

    it("should handle repository errors during deletion", async () => {
      // Arrange
      const wishlistId = 10;
      const storeId = 100;
      const mockError = new Error("Failed to delete");
      (WishlistRepository.delete as jest.Mock).mockRejectedValue(mockError);

      // Act & Assert
      await expect(
        WishlistService.deleteWishlist(wishlistId, storeId)
      ).rejects.toThrow("Failed to delete");
    });

    it("should pass correct parameters to repository delete", async () => {
      // Arrange
      const wishlistId = 555;
      const storeId = 666;
      (WishlistRepository.delete as jest.Mock).mockResolvedValue(1);

      // Act
      await WishlistService.deleteWishlist(wishlistId, storeId);

      // Assert
      expect(WishlistRepository.delete).toHaveBeenCalledWith(555, 666);
      expect(WishlistRepository.delete).toHaveBeenCalledTimes(1);
    });

    it("should handle deletion of multiple items", async () => {
      // Arrange
      const wishlistIds = [1, 2, 3];
      const storeId = 100;
      (WishlistRepository.delete as jest.Mock).mockResolvedValue(1);

      // Act
      for (const id of wishlistIds) {
        await WishlistService.deleteWishlist(id, storeId);
      }

      // Assert
      expect(WishlistRepository.delete).toHaveBeenCalledTimes(3);
      expect(WishlistRepository.delete).toHaveBeenNthCalledWith(1, 1, 100);
      expect(WishlistRepository.delete).toHaveBeenNthCalledWith(2, 2, 100);
      expect(WishlistRepository.delete).toHaveBeenNthCalledWith(3, 3, 100);
    });
  });
});
