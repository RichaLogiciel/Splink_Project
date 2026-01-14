import WishlistRepository from "../repositories/WishlistRepository";
import { WishlistRes } from "../types/WishlistTypes";

class WishlistService {
  async addToWishlist(storeId: number, productId: number, toggle: boolean) {
    return await WishlistRepository.createWishlistItem(
      storeId,
      productId,
      toggle
    );
  }

  async getWishlistsByStoreId(
    storeId: number,
    distributorId: number
  ): Promise<WishlistRes[]> {
    return WishlistRepository.findAllByStoreId(storeId, distributorId);
  }

  async deleteWishlist(id: number, storeID: number): Promise<number> {
    return WishlistRepository.delete(id, storeID);
  }
}

export default new WishlistService();
