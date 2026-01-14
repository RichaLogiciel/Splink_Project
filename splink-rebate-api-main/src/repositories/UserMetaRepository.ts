import UserMeta from "../models/UserMeta";

class UserMetaRepository {
  /**
   * Get specific metadata value for a user
   * @param entityId - User ID or entity ID
   * @param type - Entity type (e.g., "DISTRIBUTOR_SALES_REP")
   * @param key - Metadata key (e.g., "ENABLE_ORDER_FEATURE")
   * @returns Metadata value as string, or null if not found
   */
  public async getUserMeta(
    entityId: number,
    type: string,
    key: string
  ): Promise<string | null> {
    const meta = await UserMeta.findOne({
      where: {
        entityId,
        type,
        key
      }
    });

    return meta?.value ?? null;
  }

  /**
   * Create or update metadata for a user
   * @param entityId - User ID or entity ID
   * @param type - Entity type (e.g., "DISTRIBUTOR_SALES_REP")
   * @param key - Metadata key (e.g., "ENABLE_ORDER_FEATURE")
   * @param value - Metadata value (stored as string)
   */
  public async setUserMeta(
    entityId: number,
    type: string,
    key: string,
    value: string
  ): Promise<void> {
    await UserMeta.upsert({
      entityId,
      type,
      key,
      value
    });
  }

  /**
   * Get metadata by key across all entity types
   * @param key - Metadata key to search for
   * @returns Array of metadata records
   */
  public async getMetaByKey(key: string): Promise<UserMeta[]> {
    return await UserMeta.findAll({
      where: {
        key
      }
    });
  }
}

export default new UserMetaRepository();
