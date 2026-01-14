import { Op } from "sequelize";
import Product from "../models/Product";
import ProductCodeMapping from "../models/ProductCodeMapping";
import StoreVoidFillTarget from "../models/StoreVoidFillTarget";

export class StoreVoidFillTargetRepository {
  /**
   * Get void fill targets for a specific store and program
   */
  public async getVoidFillTargetsByStoreAndProgram(
    storeId: number,
    programId: number,
    programDetailId: number
  ): Promise<StoreVoidFillTarget | null> {
    try {
      const target = await StoreVoidFillTarget.findOne({
        where: {
          storeId,
          programId,
          programDetailId,
          isActive: true
        }
      });

      return target;
    } catch (error) {
      console.error("Error fetching void fill targets:", error);
      throw error;
    }
  }

  /**
   * Get products for eligible and purchased product IDs
   */
  public async getProductsByIds(productIds: string[]): Promise<Product[]> {
    try {
      if (!productIds || productIds.length === 0) {
        return [];
      }

      const products = await Product.findAll({
        where: {
          id: {
            [Op.in]: productIds.map((id) => parseInt(id))
          }
        },
        attributes: [
          "id",
          "name",
          "size",
          "caseSkusId",
          "unitSkusId",
          "boxSkusId"
        ]
      });

      return products;
    } catch (error) {
      console.error("Error fetching products by IDs:", error);
      throw error;
    }
  }

  /**
   * Get products with distributor-specific codes and last transaction date
   * @param productIds - Array of product IDs
   * @param distributorId - The distributor ID
   * @param warehouseId - Optional warehouse ID to filter codes by specific warehouse
   */
  public async getProductsWithCodes(
    productIds: string[],
    distributorId: number,
    warehouseId?: number
  ): Promise<
    Array<
      Product & {
        distributorCode: string;
        lastTransactionDate: Date | string | null;
        last_transaction_date: Date | string | null;
      }
    >
  > {
    try {
      if (!productIds || productIds.length === 0) {
        return [];
      }

      // Get products
      const products = await Product.findAll({
        where: {
          id: {
            [Op.in]: productIds.map((id) => parseInt(id))
          }
        },
        attributes: [
          "id",
          "name",
          "size",
          "caseSkusId",
          "unitSkusId",
          "boxSkusId"
        ]
      });

      // Build the where clause for code mappings
      const codeMappingWhere: any = {
        productId: {
          [Op.in]: productIds.map((id) => parseInt(id))
        },
        distributorId,
        deletedAt: null
      };

      // Add warehouse filter if provided
      if (warehouseId !== undefined) {
        codeMappingWhere.warehouseId = warehouseId;
      }

      // Get distributor-specific codes, last_transaction_date, and product_name
      // Use alias format to ensure proper mapping from database column to model property
      const codeMappings = await ProductCodeMapping.findAll({
        where: codeMappingWhere,
        attributes: [
          "productId",
          "code",
          "warehouseId",
          ["last_transaction_date", "lastTransactionDate"],
          ["product_name", "productName"]
        ]
      });

      // Create maps for quick lookup
      const codeMap = new Map<string, string>();
      const lastTransactionDateMap = new Map<string, Date | string | null>();
      const productNameMap = new Map<string, string | null>();

      if (warehouseId !== undefined) {
        // When warehouseId is specified, we should only have one mapping per product
        // (filtered by the where clause above)
        codeMappings.forEach((mapping) => {
          const productIdStr = mapping.productId.toString();
          const dateValue =
            mapping.lastTransactionDate ||
            (mapping as any).last_transaction_date ||
            null;
          const productName =
            (mapping as any).productName ||
            (mapping as any).product_name ||
            null;
          codeMap.set(productIdStr, mapping.code);
          lastTransactionDateMap.set(productIdStr, dateValue);
          productNameMap.set(productIdStr, productName);
        });
      } else {
        // When warehouseId is not specified, we might have multiple mappings per product
        // Group by productId and pick the first one
        const mappingsByProduct = new Map<
          string,
          Array<{
            code: string;
            lastTransactionDate: Date | string | null;
            productName: string | null;
          }>
        >();

        codeMappings.forEach((mapping) => {
          const productIdStr = mapping.productId.toString();
          const dateValue =
            mapping.lastTransactionDate ||
            (mapping as any).last_transaction_date ||
            null;
          const productName =
            (mapping as any).productName ||
            (mapping as any).product_name ||
            null;

          if (!mappingsByProduct.has(productIdStr)) {
            mappingsByProduct.set(productIdStr, []);
          }
          mappingsByProduct.get(productIdStr)!.push({
            code: mapping.code,
            lastTransactionDate: dateValue,
            productName: productName
          });
        });

        // For each product, just take the first mapping
        mappingsByProduct.forEach((mappings, productIdStr) => {
          const firstMapping = mappings[0];
          codeMap.set(productIdStr, firstMapping.code);
          lastTransactionDateMap.set(
            productIdStr,
            firstMapping.lastTransactionDate
          );
          productNameMap.set(productIdStr, firstMapping.productName);
        });
      }

      // Combine products with codes, last_transaction_date, and product_name - FIX: Convert product.id to string for lookup
      const productsWithCodes = products.map((product) => ({
        ...product.toJSON(),
        distributorCode: codeMap.get(product.id.toString()) || "NA",
        lastTransactionDate:
          lastTransactionDateMap.get(product.id.toString()) || null,
        last_transaction_date:
          lastTransactionDateMap.get(product.id.toString()) || null,
        product_name: productNameMap.get(product.id.toString()) || null,
        productName: productNameMap.get(product.id.toString()) || null
      }));

      return productsWithCodes;
    } catch (error) {
      console.error("Error fetching products with codes:", error);
      throw error;
    }
  }

  /**
   * Get void fill targets for multiple stores
   */
  public async getVoidFillTargetsByStores(
    storeIds: number[],
    programId: number,
    programDetailId: number
  ): Promise<StoreVoidFillTarget[]> {
    try {
      const targets = await StoreVoidFillTarget.findAll({
        where: {
          storeId: {
            [Op.in]: storeIds
          },
          programId,
          programDetailId,
          isActive: true
        }
      });

      return targets;
    } catch (error) {
      console.error("Error fetching void fill targets by stores:", error);
      throw error;
    }
  }

  /**
   * Get SPIFF earning opportunities from store_void_fill_targets for a specific store
   * @param storeId The ID of the store
   * @param programIds Optional array of program IDs to filter by
   * @param programDetailIds Optional array of program detail IDs to filter by
   * @returns Promise<Array<{program_id: number, program_detail_id: number, earning_opportunity: number}>>
   */
  public async getVoidFillEarningOpportunitiesByStore(
    storeId: number,
    programIds?: number[],
    programDetailIds?: number[]
  ): Promise<
    Array<{
      program_id: number;
      program_detail_id: number;
      earning_opportunity: number;
    }>
  > {
    try {
      const whereConditions: any = {
        storeId,
        isActive: true
      };

      if (programIds && programIds.length > 0) {
        whereConditions.programId = {
          [Op.in]: programIds
        };
      }

      if (programDetailIds && programDetailIds.length > 0) {
        whereConditions.programDetailId = {
          [Op.in]: programDetailIds
        };
      }

      const targets = await StoreVoidFillTarget.findAll({
        where: whereConditions,
        attributes: ["programId", "programDetailId", "earningOpportunity"],
        raw: true
      });

      return targets.map((target: any) => ({
        program_id: Number(target.program_id || target.programId),
        program_detail_id: Number(
          target.program_detail_id || target.programDetailId
        ),
        earning_opportunity: parseFloat(
          target.earning_opportunity || target.earningOpportunity || 0
        )
      }));
    } catch (error) {
      console.error("Error in getSpiffEarningOpportunitiesByStore:", error);
      throw error;
    }
  }
}

export default new StoreVoidFillTargetRepository();
