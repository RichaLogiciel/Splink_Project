import { ApiError } from "../lib/errors/APIError";
import StoreRebateAdjustment from "../models/StoreRebateAdjustment";

class StoreRebateAdjustmentRepository {
  async getAdjustmentFactor(
    storeId: number,
    distributorId: number
  ): Promise<number | null> {
    try {
      const adjustment = await StoreRebateAdjustment.findOne({
        where: {
          storeId,
          distributorId,
          isActive: true
        },
        attributes: ["adjustmentFactor"]
      });

      if (!adjustment) {
        return null;
      }

      // Convert DECIMAL to number
      return Number(adjustment.adjustmentFactor);
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(` ${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }
}

export default new StoreRebateAdjustmentRepository();
