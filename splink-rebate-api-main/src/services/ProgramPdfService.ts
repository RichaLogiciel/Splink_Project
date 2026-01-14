import { getConstManufacturerName } from "../config/userConstants";
import AwsController from "../controllers/AwsController";
import ProgramPdfRepository from "../repositories/ProgramPdfRepository";

export class ProgramPdfService {
  /**
   * Get pre-signed S3 URL for program PDF
   * @param manufacturerId - Manufacturer ID
   * @param distributorId - Distributor ID
   * @param timeline - Timeline: "Current" or "Upcoming"
   * @param programType - Program type: "STORE" or "SPIFF"
   * @returns Pre-signed S3 URL or null if PDF doesn't exist
   */
  public async getProgramPdfUrl(
    manufacturerId: number,
    distributorId: number,
    timeline: "Current" | "Upcoming",
    programType: "DISTRIBUTOR" | "STORE" | "SPIFF" = "STORE"
  ): Promise<{ program_pdf: string | null }> {
    try {
      // Get PDF record from database
      const programPdf = await ProgramPdfRepository.getProgramPdf(
        manufacturerId,
        distributorId,
        timeline
      );

      // If no PDF record exists or filename is missing, return null
      if (!programPdf || !programPdf.filename) {
        return {
          program_pdf: null
        };
      }

      // Get manufacturer name from mapping
      const manufacturerName = getConstManufacturerName(manufacturerId);
      if (!manufacturerName) {
        console.error(
          `Manufacturer ID ${manufacturerId} not found in MANUFACTURER_NAMES mapping`
        );
        return {
          program_pdf: null
        };
      }

      // Get bucket name from environment variable
      const bucketName = process.env.AWS_FILE_BUCKET || "";

      if (!bucketName) {
        console.error("AWS_FILE_BUCKET environment variable is not set");
        return {
          program_pdf: null
        };
      }

      // Construct S3 key: splink_programs/{program_type}/{manufacturer_name}/{filename}
      // Convert program type to lowercase
      const programTypeLower = programType.toLowerCase();
      const s3Key = `splink_programs/${programTypeLower}s/${manufacturerName}/${programPdf.filename}`;

      // Check if object exists in S3 before generating signed URL
      const objectExists = await AwsController.checkS3ObjectExists(
        bucketName,
        s3Key
      );

      if (!objectExists) {
        console.log(
          `S3 object does not exist: ${s3Key}. Database has filename but file is missing in S3.`
        );
        return {
          program_pdf: null
        };
      }

      // Generate pre-signed URL only if object exists
      const signedUrl = await AwsController.getReadSignedUrlForS3Object(
        bucketName,
        s3Key
      );

      return {
        program_pdf: signedUrl
      };
    } catch (error) {
      console.error("Error getting program PDF URL:", error);
      // Return null on error instead of throwing to allow graceful handling
      return {
        program_pdf: null
      };
    }
  }
}

export default new ProgramPdfService();
