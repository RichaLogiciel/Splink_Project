import Wishlist from "../models/Wishlists";

export interface WishlistRes extends Wishlist {
  id: number;
  Product?: {
    name?: string;
    manufacturer?: {
      name: string;
      logo: string;
    };
    dataValues?: {
      internal_code?: string;
    };
  };
}

export default Wishlist;
