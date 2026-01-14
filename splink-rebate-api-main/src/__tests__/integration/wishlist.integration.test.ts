import { Request, Response } from "express";
import WishlistController from "../../controllers/WishlistController";
import WishlistService from "../../services/WishlistService";
import { createMockRequestResponse } from "../helpers/test-utils";

describe("Wishlist Integration Tests", () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.resetAllMocks();
    const { req, res } = createMockRequestResponse();
    mockReq = req as Partial<Request>;
    mockRes = res as Partial<Response>;
  });

  describe("addToWishlist", () => {
    it("should successfully add item to wishlist", async () => {
      mockReq.body = {
        storeId: 1,
        productId: 2,
        toggleStatus: true
      };

      const mockWishlistResponse = {
        id: 1,
        storeId: 1,
        productId: 2,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      jest
        .spyOn(WishlistService, "addToWishlist")
        .mockResolvedValue(mockWishlistResponse);

      await WishlistController.addToWishlist(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: mockWishlistResponse
      });
    });

    it("should handle missing required fields", async () => {
      mockReq.body = {
        storeId: 1
      };

      await WishlistController.addToWishlist(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Store ID and Product ID are required."
      });
    });

    it("should handle service error", async () => {
      mockReq.body = {
        storeId: 1,
        productId: 2
      };

      const error = new Error("Service error");
      (error as any).statusCode = 500;
      jest.spyOn(WishlistService, "addToWishlist").mockRejectedValue(error);

      await WishlistController.addToWishlist(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("getWishlistsByStoreId", () => {
    it("should successfully get wishlists by store ID", async () => {
      mockReq.params = {
        storeId: "1"
      };

      const mockWishlists = [
        {
          id: 1,
          productId: 2,
          Product: {
            name: "Test Product",
            manufacturer: {
              name: "Test Manufacturer",
              logo: "test-logo.png"
            }
          },
          updatedAt: new Date()
        }
      ];

      jest
        .spyOn(WishlistService, "getWishlistsByStoreId")
        .mockResolvedValue(mockWishlists as any);

      await WishlistController.getWishlistsByStoreId(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            product_name: "Test Product",
            manufacturer_name: "Test Manufacturer"
          })
        ])
      });
    });

    it("should handle service error", async () => {
      mockReq.params = {
        storeId: "1"
      };

      const error = new Error("Service error");
      (error as any).statusCode = 500;
      jest
        .spyOn(WishlistService, "getWishlistsByStoreId")
        .mockRejectedValue(error);

      await WishlistController.getWishlistsByStoreId(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });

  describe("deleteWishlists", () => {
    it("should successfully delete multiple wishlists", async () => {
      mockReq.body = {
        storeId: 1,
        id: [1, 2, 3]
      };

      jest.spyOn(WishlistService, "deleteWishlist").mockResolvedValue(1);

      await WishlistController.deleteWishlists(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "success",
        data: { message: "All wishlists deleted successfully" }
      });
    });

    it("should handle invalid wishlist IDs format", async () => {
      mockReq.body = {
        storeId: 1,
        id: "invalid"
      };

      await WishlistController.deleteWishlists(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Invalid wishlist IDs"
      });
    });

    it("should handle missing store ID", async () => {
      mockReq.body = {
        id: [1, 2, 3]
      };

      await WishlistController.deleteWishlists(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Store ID is required."
      });
    });

    it("should handle partial deletion failure", async () => {
      mockReq.body = {
        storeId: 1,
        id: [1, 2, 3]
      };

      jest
        .spyOn(WishlistService, "deleteWishlist")
        .mockResolvedValueOnce(1) // First deletion succeeds
        .mockResolvedValueOnce(0) // Second deletion fails
        .mockResolvedValueOnce(1); // Third deletion succeeds

      await WishlistController.deleteWishlists(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(207);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Some wishlists could not be deleted"
      });
    });

    it("should handle service error", async () => {
      mockReq.body = {
        storeId: 1,
        id: [1, 2, 3]
      };

      const error = new Error("Service error");
      (error as any).statusCode = 500;
      jest.spyOn(WishlistService, "deleteWishlist").mockRejectedValue(error);

      await WishlistController.deleteWishlists(
        mockReq as Request,
        mockRes as Response
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        status: "error",
        data: "Service error"
      });
    });
  });
});
