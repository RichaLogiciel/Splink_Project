import { Op } from "sequelize";
import ProgramPdf from "../models/ProgramPdf";

export class ProgramPdfRepository {
  /**
   * Get program PDF for a specific manufacturer, distributor, and timeline
   * Returns the most recent PDF record matching the criteria
   */
  public async getProgramPdf(
    manufacturerId: number,
    distributorId: number | null,
    timeline: "Current" | "Upcoming"
  ): Promise<ProgramPdf | null> {
    try {
      const whereConditions: any = {
        manufacturerId,
        timeline,
        deletedAt: null
      };

      // Include distributorId in filter if provided
      if (distributorId !== null && distributorId !== undefined) {
        whereConditions.distributorId = distributorId;
      } else {
        // If distributorId is null, match records where distributorId is null
        whereConditions.distributorId = { [Op.is]: null };
      }

      const programPdf = await ProgramPdf.findOne({
        where: whereConditions,
        order: [["createdAt", "DESC"]], // Get most recent
        limit: 1,
        raw: true
      });

      return programPdf;
    } catch (error) {
      console.error("Error fetching program PDF:", error);
      throw error;
    }
  }
}

export default new ProgramPdfRepository();
