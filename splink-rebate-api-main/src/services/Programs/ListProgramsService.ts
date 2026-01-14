import { literal, Op } from "sequelize";
import {
  ENTITY_TYPE,
  PROGRAM_APPROVAL_STATUS,
  VISIBILITY_SCOPE
} from "../../config/appConstants";
import { ApiError } from "../../lib/errors/APIError";
import Manufacturer from "../../models/Manufacturer";
import Program from "../../models/Program";
import ProgramApproval from "../../models/ProgramApproval";
import ProgramDetail from "../../models/ProgramDetail";
import ProgramVisibility from "../../models/ProgramVisibility";

class ListProgramsServices {
  /**
   * Get all approved programs for a store
   * @param distributorId - The ID of the distributor
   * @param storeId - The ID of the store
   * @param page - The page number
   * @param limit - The number of programs per page
   * @returns A list of programs approved
   */
  public async getStorePrograms({
    distributorId,
    storeId,
    page = 1,
    limit = 10
  }: {
    distributorId: number;
    storeId: number;
    page?: number;
    limit?: number;
  }) {
    try {
      const offset = (page - 1) * limit;

      const programsQuery = await Program.unscoped().findAndCountAll({
        attributes: [
          "id",
          "name",
          "participantType",
          "programType",
          "visibilityScope",
          "paymentTerm",
          "startDate",
          "endDate",
          "targetAudience",
          "approval_status",
          "created_at",
          "updated_at"
        ],
        include: [
          {
            model: Manufacturer,
            as: "ProgramCreator",
            required: true,
            attributes: ["logo", "name", "authorized", "organizationName"]
          },
          {
            model: ProgramApproval,
            attributes: ["status", "program_detail_id"],
            as: "ProgramApproval",
            required: true,
            where: {
              status: PROGRAM_APPROVAL_STATUS.APPROVED,
              approver_type: ENTITY_TYPE.DISTRIBUTOR,
              approver_id: distributorId,
              deleted_at: null
            }
          },
          {
            model: ProgramDetail,
            attributes: ["id", "overview"],
            as: "ProgramDetails",
            required: true
          },
          {
            model: ProgramVisibility,
            attributes: ["program_id", "entity_id", "entity_type"],
            as: "ProgramVisibility",
            required: false,
            where: {
              entity_id: storeId,
              entity_type: ENTITY_TYPE.STORE,
              deleted_at: null
            }
          }
        ],
        where: {
          [Op.and]: [
            {
              visibility_scope: {
                [Op.in]: [
                  VISIBILITY_SCOPE.SPECIFIC_STORES,
                  VISIBILITY_SCOPE.ALL_STORES_UNDER_DISTRIBUTOR
                ]
              }
            },
            {
              [Op.or]: [
                // Programs for all stores under distributor
                {
                  visibility_scope:
                    VISIBILITY_SCOPE.ALL_STORES_UNDER_DISTRIBUTOR
                },
                // OR must have ProgramVisibility entry for specific store
                literal(`
                  "Program"."visibility_scope" != 'ALL_STORES_UNDER_DISTRIBUTOR'
                  AND EXISTS (
                    SELECT 1 FROM "program_visibility" AS pv
                    WHERE pv.program_id = "Program"."id"
                    AND pv.entity_id = ${storeId}
                    AND pv.entity_type = '${ENTITY_TYPE.STORE}'
                  )
                `)
              ]
            },
            {
              participant_type: ENTITY_TYPE.STORE,
              deleted_at: null
            }
          ]
        },
        limit,
        offset,
        order: [["created_at", "DESC"]]
      });

      return {
        programs: programsQuery.rows,
        limit,
        page,
        totalCount: programsQuery.count
      };
    } catch (error: any) {
      throw new ApiError(
        500,
        error.message || "Error fetching pending approval programs"
      );
    }
  }

  /**
   * Get Single approved program for a store
   * @param distributorId - The ID of the distributor
   * @param storeId - The ID of the store
   * @param programId - The ID of the program
   * @returns A single program approved
   */
  public async getSingleStoreProgram({
    distributorId,
    storeId,
    programId
  }: {
    distributorId: number;
    storeId: number;
    programId: number;
  }) {
    try {
      return await Program.unscoped().findOne({
        attributes: [
          "id",
          "name",
          "participantType",
          "programType",
          "visibilityScope",
          "paymentTerm",
          "startDate",
          "endDate",
          "targetAudience",
          "approval_status",
          "created_at",
          "updated_at"
        ],
        include: [
          {
            model: Manufacturer,
            as: "ProgramCreator",
            required: true,
            attributes: ["logo", "name", "authorized", "organizationName"]
          },
          {
            model: ProgramApproval,
            attributes: ["status", "program_detail_id"],
            as: "ProgramApproval",
            required: true,
            where: {
              status: PROGRAM_APPROVAL_STATUS.APPROVED,
              approver_type: ENTITY_TYPE.DISTRIBUTOR,
              approver_id: distributorId,
              deleted_at: null
            }
          },
          {
            model: ProgramDetail,
            attributes: ["id", "overview"],
            as: "ProgramDetails",
            required: true
          },
          {
            model: ProgramVisibility,
            attributes: ["program_id", "entity_id", "entity_type"],
            as: "ProgramVisibility",
            required: false,
            where: {
              entity_id: storeId,
              entity_type: ENTITY_TYPE.STORE,
              deleted_at: null
            }
          }
        ],
        where: {
          [Op.and]: [
            {
              visibility_scope: {
                [Op.in]: [
                  VISIBILITY_SCOPE.SPECIFIC_STORES,
                  VISIBILITY_SCOPE.ALL_STORES_UNDER_DISTRIBUTOR
                ]
              }
            },
            {
              [Op.or]: [
                // Programs for all stores under distributor
                {
                  visibility_scope:
                    VISIBILITY_SCOPE.ALL_STORES_UNDER_DISTRIBUTOR
                },
                // OR must have ProgramVisibility entry for specific store
                literal(`
                  "Program"."visibility_scope" != 'ALL_STORES_UNDER_DISTRIBUTOR'
                  AND EXISTS (
                    SELECT 1 FROM "program_visibility" AS pv
                    WHERE pv.program_id = "Program"."id"
                    AND pv.entity_id = ${storeId}
                    AND pv.entity_type = '${ENTITY_TYPE.STORE}'
                  )
                `)
              ]
            },
            {
              id: programId,
              participant_type: ENTITY_TYPE.STORE,
              deleted_at: null
            }
          ]
        },
        order: [["created_at", "DESC"]]
      });
    } catch (error: any) {
      throw ApiError.internal(
        error.message || "Error fetching pending approval programs"
      );
    }
  }

  /**
   * Get a single program
   * @param programId - The ID of the program
   * @param programDetailId - The ID of the program detail
   * @returns A single program
   */
  public async getProgram(programId: number, programDetailId?: number) {
    try {
      return await Program.unscoped().findOne({
        where: {
          id: programId
        },
        include: [
          {
            model: Manufacturer,
            required: true,
            attributes: ["id", "name", "organizationName"]
          },
          {
            model: ProgramDetail,
            as: "ProgramDetails",
            required: false,
            where: programDetailId
              ? {
                  id: programDetailId
                }
              : {}
          }
        ]
      });
    } catch (error: any) {
      throw ApiError.internal(
        error.message || "Error fetching pending approval programs"
      );
    }
  }
}

export default new ListProgramsServices();
