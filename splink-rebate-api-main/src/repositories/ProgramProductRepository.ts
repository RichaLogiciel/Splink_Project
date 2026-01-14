import { Op } from "sequelize";
import ProgramProduct from "../models/ProgramProduct";

export class ProgramProductRepository {
  /**
   * Get product IDs for a specific program detail
   */
  public async getProductIdsByProgramDetail(
    programDetailId: number
  ): Promise<number[]> {
    try {
      const programProducts = await ProgramProduct.findAll({
        where: {
          programDetailId,
          deletedAt: null
        },
        attributes: ["productId"]
      });

      return programProducts.map((pp) => pp.productId);
    } catch (error) {
      console.error("Error fetching program products:", error);
      throw error;
    }
  }

  /**
   * Get all program products for a program detail
   */
  public async getProgramProductsByProgramDetail(
    programDetailId: number
  ): Promise<ProgramProduct[]> {
    try {
      const programProducts = await ProgramProduct.findAll({
        where: {
          programDetailId,
          deletedAt: null
        }
      });

      return programProducts;
    } catch (error) {
      console.error("Error fetching program products:", error);
      throw error;
    }
  }

  /**
   * Get product IDs for multiple programs
   */
  public async getProductIdsByProgramIds(
    programIds: number[]
  ): Promise<number[]> {
    try {
      if (!programIds || programIds.length === 0) {
        return [];
      }

      const programProducts = await ProgramProduct.findAll({
        where: {
          programId: { [Op.in]: programIds },
          deletedAt: null
        },
        attributes: ["productId"]
      });

      // Return unique product IDs
      const productIds = programProducts.map((pp) => pp.productId);
      return [...new Set(productIds)];
    } catch (error) {
      console.error("Error fetching program products by program IDs:", error);
      throw error;
    }
  }
}

export default new ProgramProductRepository();
