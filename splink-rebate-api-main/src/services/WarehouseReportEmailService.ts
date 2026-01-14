import WarehouseReportEmailRecipient from "../models/WarehouseReportEmailRecipient";

class WarehouseReportEmailService {
  /**
   * Get email recipients for a specific warehouse
   * @param warehouseId The warehouse ID to fetch recipients for
   * @returns Array of email addresses (strings)
   * @throws Error if warehouseId is invalid or no recipients found
   */
  public async getWarehouseEmailRecipients(
    warehouseId: number
  ): Promise<string[]> {
    // Validate warehouseId
    if (!warehouseId || warehouseId <= 0) {
      throw new Error("Invalid warehouse ID");
    }

    // Query email recipients for the specified warehouse
    // Paranoid: true ensures soft-deleted records are excluded
    const recipients = await WarehouseReportEmailRecipient.findAll({
      where: {
        warehouseId
      },
      attributes: ["email"],
      paranoid: true
    });

    // Extract email addresses from the results
    const emails = recipients.map((recipient) => recipient.email);

    return emails;
  }

  /**
   * Get email recipients for a specific warehouse and distributor
   * @param warehouseId The warehouse ID to fetch recipients for
   * @param distributorId The distributor ID to filter by
   * @returns Array of email addresses (strings)
   * @throws Error if warehouseId or distributorId is invalid
   */
  public async getWarehouseEmailRecipientsByDistributor(
    warehouseId: number,
    distributorId: number
  ): Promise<string[]> {
    // Validate parameters
    if (!warehouseId || warehouseId <= 0) {
      throw new Error("Invalid warehouse ID");
    }
    if (!distributorId || distributorId <= 0) {
      throw new Error("Invalid distributor ID");
    }

    // Query email recipients for the specified warehouse and distributor
    const recipients = await WarehouseReportEmailRecipient.findAll({
      where: {
        warehouseId,
        distributorId
      },
      attributes: ["email"],
      paranoid: true
    });

    // Extract email addresses from the results
    const emails = recipients.map((recipient) => recipient.email);

    return emails;
  }
}

export default new WarehouseReportEmailService();
