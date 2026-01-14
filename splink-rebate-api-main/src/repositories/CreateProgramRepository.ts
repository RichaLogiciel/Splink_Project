import { Transaction } from "sequelize";
import { ENTITY_TYPE, VISIBILITY_SCOPE } from "../config/appConstants";
import ProgramParticipant from "../models/ProgramParticipant";
import StoreSalesRep from "../models/StoreSalesRep";
import UserRole from "../models/UserRole";
import ManufacturerService from "../services/ManufacturerService";
import { CreateProgramRequest } from "../services/Programs/CreateProgramService";

class CreateProgramRepository {
  /**
   * Automatically enrolls stores in a program based on the program's visibility scope.
   * - Determines store IDs to enroll depending on visibility (all stores under distributor, specific stores, or sales reps).
   * - Avoids duplicate enrollments by checking existing participants.
   * - Performs a bulk insert of new store enrollments into ProgramParticipant within the transaction.
   */
  public async autoEnrollStoresInProgram({
    data,
    programId,
    transaction
  }: {
    data: CreateProgramRequest;
    programId: number;
    transaction: Transaction;
  }) {
    let storeIds: number[] = [];
    const now = new Date();
    const ENTITY_TYPE_STORE = ENTITY_TYPE.STORE;
    const creatorType = data.creator_type;
    const visibilityScope = data.visibility_scope;

    // Helper to get all active stores for an array of distributor IDs
    const getStoresForDistributor = async ({
      distributorIds
    }: {
      distributorIds: number[];
    }) => {
      if (!distributorIds.length) return [];
      const userRoles = await UserRole.findAll({
        attributes: ["associatedUserId"],
        where: {
          parent_entity_id: distributorIds,
          parent_entity_type: ENTITY_TYPE.DISTRIBUTOR,
          role: ENTITY_TYPE.STORE,
          deleted_at: null
        },
        raw: true
      });
      return userRoles.map((ur: any) => ur.associatedUserId);
    };

    // Helper to get all active stores for an array of sales rep IDs
    const getStoresForSalesRep = async ({
      salesRepIds
    }: {
      salesRepIds: number[];
    }) => {
      if (!salesRepIds.length) return [];
      const storeSalesReps = await StoreSalesRep.findAll({
        attributes: ["store_id"],
        where: {
          sales_rep_id: salesRepIds,
          deleted_at: null
        },
        raw: true
      });
      return storeSalesReps.map((ssr: any) => ssr.store_id);
    };

    switch (visibilityScope) {
      case VISIBILITY_SCOPE.ALL_STORES_UNDER_DISTRIBUTOR: {
        let distributorIds: number[] = [];
        if (creatorType === ENTITY_TYPE.MANUFACTURER) {
          const distributors = await ManufacturerService.getDistributors(
            data.creator_id
          );
          distributorIds = distributors.map((d: any) => d.associatedUserId);
        } else if (creatorType === ENTITY_TYPE.DISTRIBUTOR) {
          distributorIds = [data.creator_id];
        }
        const stores = await getStoresForDistributor({ distributorIds });
        storeIds.push(...stores);
        break;
      }
      case VISIBILITY_SCOPE.SPECIFIC_STORES: {
        const ids = (data.visibility_entities || [])
          .filter((e) => e.entity_type === ENTITY_TYPE.STORE)
          .map((e) => e.entity_id);
        storeIds.push(...ids);
        break;
      }
      case VISIBILITY_SCOPE.SPECIFIC_SALES_REPS: {
        // If spiff_stores is provided and non-empty, use its store IDs; otherwise, fallback to getStoresForSalesRep
        if (Array.isArray(data.spiff_stores) && data.spiff_stores.length > 0) {
          const spiffStoreIds = data.spiff_stores
            .filter((s: any) => s.entity_type === ENTITY_TYPE.STORE)
            .map((s: any) => s.entity_id);
          storeIds.push(...spiffStoreIds);
        } else {
          const salesRepIds = (data.visibility_entities || [])
            .filter((e) => e.entity_type === ENTITY_TYPE.SALES_REP)
            .map((e) => e.entity_id);
          // Fallback: fetch stores for these sales reps
          const stores = await getStoresForSalesRep({ salesRepIds });
          storeIds.push(...stores);
        }
        break;
      }
      default:
        break;
    }

    // Remove duplicates
    storeIds = Array.from(new Set(storeIds));
    if (!storeIds.length) return;

    // Check for already enrolled stores (should not happen for new program, but for safety)
    const existing = await ProgramParticipant.findAll({
      attributes: ["entityId"],
      where: {
        programId: programId,
        entityType: ENTITY_TYPE_STORE,
        entityId: storeIds,
        deletedAt: null
      },
      raw: true,
      transaction
    });
    const alreadyEnrolled = new Set(existing.map((e: any) => e.entityId));
    const toEnroll = storeIds.filter((id) => !alreadyEnrolled.has(id));
    if (!toEnroll.length) return;

    // Bulk insert
    const enrollments = toEnroll.map((storeId) => ({
      programId: programId,
      entityId: storeId,
      entityType: ENTITY_TYPE_STORE,
      createdAt: now,
      updatedAt: now
    }));
    await ProgramParticipant.bulkCreate(enrollments, { transaction });
  }
}

export default new CreateProgramRepository();
