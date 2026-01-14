import { col, fn, ProjectionAlias } from "sequelize";
import { ApiError } from "../lib/errors/APIError";
import Manufacturer from "../models/Manufacturer";
import Product from "../models/Product";
import Wishlist, { WishlistRes } from "../types/WishlistTypes";
import { getProductCodeMappingInclude } from "../utils/helpers";

class WishlistRepository {
  async createWishlistItem(
    storeId: number,
    productId: number,
    toggleStatus: boolean
  ) {
    // Check if the entry already exists
    const existingWishlistItem = await Wishlist.findOne({
      where: {
        storeId,
        productId
      }
    });

    if (existingWishlistItem) {
      if (toggleStatus) {
        // Remove the existing wishlist item
        const status = await existingWishlistItem.destroy();
        return status;
      }
      return existingWishlistItem;
    }

    // Create the new wishlist item
    const newWishlistItem = await Wishlist.create({ storeId, productId });

    // Customize the attributes to include in the response
    return {
      id: newWishlistItem.id,
      storeId: newWishlistItem.storeId,
      productId: newWishlistItem.productId
    };
  }

  async findAllByStoreId(
    storeId: number,
    distributorId?: number
  ): Promise<WishlistRes[]> {
    try {
      return Wishlist.findAll({
        where: { storeId },
        include: [
          {
            model: Product,
            attributes: [
              "name",
              "manufacturerId",
              ...(distributorId
                ? [
                    [
                      fn("MIN", col("Product->ProductCodeMapping.code")),
                      "internal_code"
                    ] as ProjectionAlias
                  ]
                : [])
            ],
            include: [
              {
                model: Manufacturer,
                as: "manufacturer",
                attributes: ["name", "logo"]
              },
              ...getProductCodeMappingInclude(distributorId)
            ]
          }
        ],
        group: ["Wishlist.id", "Product.id"],
        order: [["id", "ASC"]]
      });
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(` ${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  async update(
    id: number,
    storeId: number,
    data: Partial<Wishlist>
  ): Promise<[number, Wishlist[]]> {
    try {
      return Wishlist.update(data, {
        where: { id, storeId },
        returning: true
      });
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(` ${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  async delete(id: number, storeId: number): Promise<number> {
    return Wishlist.destroy({
      where: { id, storeId }
    });
  }
}

export default new WishlistRepository();
