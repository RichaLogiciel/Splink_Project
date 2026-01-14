import { Request, Response } from "express";
import WishlistService from "../services/WishlistService";
import {
  sendErrorResponse,
  sendSuccessResponse
} from "../utils/responseHandler";

class WishlistController {
  async addToWishlist(req: Request, res: Response): Promise<Response> {
    try {
      const { storeId, productId } = req.body;
      const toggleStatus = req?.body?.toggleStatus || false;

      if (!storeId || !productId) {
        return sendErrorResponse(
          res,
          "Store ID and Product ID are required.",
          400
        );
      }

      const newWishlistItem = await WishlistService.addToWishlist(
        storeId,
        productId,
        toggleStatus
      );

      return sendSuccessResponse(res, newWishlistItem, 200);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode || 500);
    }
  }

  async getWishlistsByStoreId(req: Request, res: Response): Promise<Response> {
    const { storeId } = req.params;
    const distributorId = req.user.parentEntityId;
    try {
      const wishlists = await WishlistService.getWishlistsByStoreId(
        Number(storeId),
        distributorId
      );

      const responseData = wishlists.map((wishlist) => ({
        id: wishlist.id,
        product_name: wishlist.Product?.name,
        product_id: wishlist.productId,
        manufacturer_name: wishlist?.Product?.manufacturer?.name,
        manufacturer_logo: wishlist?.Product?.manufacturer?.logo,
        internal_code: wishlist?.Product?.dataValues?.internal_code || "NA",
        updated_at: wishlist.updatedAt
      }));

      return sendSuccessResponse(res, responseData);
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode);
    }
  }

  async deleteWishlists(req: Request, res: Response): Promise<Response> {
    try {
      const { storeId, id } = req.body;

      if (!Array.isArray(id)) {
        return sendErrorResponse(res, "Invalid wishlist IDs", 400);
      }

      if (!Number(storeId)) {
        return sendErrorResponse(res, "Store ID is required.", 400);
      }

      const deletionResults = await Promise.all(
        id.map(async (singleID: number) => {
          const deletedRows = await WishlistService.deleteWishlist(
            Number(singleID),
            Number(storeId)
          );
          return deletedRows > 0;
        })
      );

      const allDeleted = deletionResults.every((result) => result);

      if (allDeleted) {
        return sendSuccessResponse(
          res,
          { message: "All wishlists deleted successfully" },
          200
        );
      } else {
        return sendErrorResponse(
          res,
          "Some wishlists could not be deleted",
          207
        );
      }
    } catch (error: any) {
      return sendErrorResponse(res, error.message, error.statusCode || 500);
    }
  }
}

export default new WishlistController();
