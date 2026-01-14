import { Op, Sequelize } from "sequelize";
import Manufacturer from "../models/Manufacturer"; // Assuming you have this model
import Product from "../models/Product";
import Program from "../models/Program";
import ProgramDetail from "../models/ProgramDetail";

// Define interface for product format in response
interface FormattedProduct {
  id: number;
  name: string;
  sku: string;
  upc: string;
  image: string;
  price: number;
  description: string;
  category: string;
  manufacturer: {
    id: number;
    name: string;
    logo: string;
  };
  isPurchased?: boolean;
}

// Define interface for category in response
interface ProductCategory {
  note: string;
  requiredProducts: FormattedProduct[];
  purchasedProducts: FormattedProduct[];
}

// Define interface for response format
interface CategorizedProductsResponse {
  categorizedProducts: {
    [key: string]: ProductCategory;
  };
}

class ProductsRepository {
  /**
   * Retrieves products associated with a specific program.
   * @param {number} manufacturerId - The ID of the manufacturer for whom to retrieve products.
   * @param {number} [programId] - The ID of the program for which to retrieve products.
   * @returns {Promise<CategorizedProductsResponse>} - A promise that resolves with the categorized products.
   */
  public async getCategoriesProducts(
    manufacturerId: number,
    programId?: number
  ): Promise<CategorizedProductsResponse> {
    try {
      // Step 1: Get product tags from program_details
      const programQuery: any = {
        manufacturer_id: manufacturerId,
        participant_type: "STORE"
      };

      // If programId is provided, use it to filter
      if (programId) {
        programQuery.id = programId;
      }

      // Find programs for this manufacturer
      const programs = await Program.findAll({
        where: programQuery,
        attributes: ["id", "name"]
      });

      if (!programs.length) {
        return { categorizedProducts: {} };
      }

      const programIds = programs.map((program) => program.id);

      // Get product tags from program details
      const programDetails = await ProgramDetail.findAll({
        where: {
          program_id: {
            [Op.in]: programIds
          }
        },
        attributes: ["products_tags"]
      });

      // Extract unique product tags from program details
      // Extract unique product tags from program details
      const allProductTags = new Set<string>();
      programDetails.forEach((detail) => {
        const productTags = detail.dataValues.products_tags;

        if (productTags) {
          if (Array.isArray(productTags)) {
            productTags.forEach((tag) => allProductTags.add(tag));
          } else if (typeof productTags === "string") {
            // Split the string by comma and trim each tag
            productTags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0)
              .forEach((tag) => allProductTags.add(tag));
          }
        }
      });

      if (!allProductTags.size) {
        return { categorizedProducts: {} };
      }

      // Get manufacturer details
      const manufacturer = await Manufacturer.findByPk(manufacturerId, {
        attributes: ["id", "name", "logo"]
      });

      if (!manufacturer) {
        throw new Error("Manufacturer not found");
      }

      // Step 2: Query products and format the response
      const categorizedProducts: { [key: string]: ProductCategory } = {};

      // Process each tag category separately
      for (const tag of allProductTags) {
        // Construct the JSONB query condition
        const jsonbCondition = JSON.stringify([tag]);

        // Query products with this tag
        const products = await Product.findAll({
          where: {
            manufacturer_id: manufacturerId,
            primary_variant: true,
            [Op.and]: [
              Sequelize.literal(
                `category_tags_json @> '${jsonbCondition}'::jsonb`
              )
            ]
          },
          attributes: ["id", "name", "size", "brand", "price", "skus_id"]
        });

        // Format products for this category
        if (products.length) {
          // Check if products are purchased for this program
          const purchasedProductIds = await this.getPurchasedProductIds(
            programIds,
            products.map((p) => p.id)
          );

          const requiredProducts: FormattedProduct[] = [];
          const purchasedProducts: FormattedProduct[] = [];

          // Separate products into required and purchased
          products.forEach((product) => {
            // Cast product to any temporarily to avoid property access errors
            const p = product as any;

            const formattedProduct: FormattedProduct = {
              id: p.id,
              name: p.name || "",
              sku: p.skus_id?.toString() || "",
              upc: "", // Add UPC if available in your database
              image: "", // Add image URL if available
              price: p.price || 0,
              description: "", // Add description if available
              category: tag,
              manufacturer: {
                id: manufacturer.id,
                name: manufacturer.name || "",
                logo: manufacturer.logo || ""
              }
            };

            if (purchasedProductIds.includes(p.id)) {
              purchasedProducts.push({
                ...formattedProduct,
                isPurchased: true
              });
            } else {
              requiredProducts.push(formattedProduct);
            }
          });

          categorizedProducts[tag] = {
            note: `Select at least 1 product from this category`,
            requiredProducts,
            purchasedProducts
          };
        } else {
          categorizedProducts[tag] = {
            note: "",
            requiredProducts: [],
            purchasedProducts: []
          };
        }
      }

      return { categorizedProducts };
    } catch (error) {
      console.error("Error in getCategoriesProducts repository:", error);
      throw error;
    }
  }

  // Helper method to get purchased product IDs
  private async getPurchasedProductIds(
    programIds: number[],
    productIds: number[]
  ): Promise<number[]> {
    try {
      // This is to supprt the FE component to show the purchased products. To be refactored

      // This is a placeholder - implement your logic here to find which products
      // have been purchased in the given programs

      // Example implementation (modify according to your schema):
      // const purchasedProducts = await ProgramProduct.findAll({
      //   where: {
      //     program_id: { [Op.in]: programIds },
      //     product_id: { [Op.in]: productIds },
      //     is_purchased: true
      //   },
      //   attributes: ['product_id']
      // });
      //
      // return purchasedProducts.map(pp => pp.product_id);

      // For now return empty array
      return [];
    } catch (error) {
      console.error("Error getting purchased product IDs:", error);
      return [];
    }
  }
}

export default new ProductsRepository();
