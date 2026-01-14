import { literal, Op, Transaction } from "sequelize";
import {
  ENTITY_TYPE,
  PROGRAM_APPROVAL_STATUS,
  VISIBILITY_SCOPE
} from "../../config/appConstants";
import { ERROR_MESSAGES } from "../../config/errorMessages";
import sequelize from "../../db";
import { ApiError } from "../../lib/errors/APIError";
import Manufacturer from "../../models/Manufacturer";
import Program from "../../models/Program";
import ProgramApproval from "../../models/ProgramApproval";
import ProgramDetail from "../../models/ProgramDetail";
import ProgramParticipant from "../../models/ProgramParticipant";
import ProgramVisibility from "../../models/ProgramVisibility";
import { getParentDistributorId } from "../../utils/roles";
import ListProgramsService from "../Programs/ListProgramsService";

class ProgramApprovalService {
  /**
   * Get all programs pending approval for a distributor
   * @param distributorId - The ID of the distributor
   * @returns A list of programs pending approval
   */
  public async getPendingApprovalPrograms({
    distributorId,
    page = 1,
    limit = 10
  }: {
    distributorId: number;
    page?: number;
    limit?: number;
  }) {
    try {
      const offset = (page - 1) * limit;

      const programsQuery = await Program.findAndCountAll({
        attributes: [
          "id",
          "name",
          "participantType",
          "programType",
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
            attributes: ["status"],
            as: "ProgramApproval",
            required: true,
            where: {
              status: {
                [Op.ne]: PROGRAM_APPROVAL_STATUS.APPROVED
              },
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
          }
        ],
        where: {
          [Op.and]: [
            {
              visibility_scope: {
                [Op.in]: [
                  VISIBILITY_SCOPE.ALL_DISTRIBUTORS,
                  VISIBILITY_SCOPE.SPECIFIC_DISTRIBUTORS,
                  VISIBILITY_SCOPE.SPECIFIC_STORES,
                  VISIBILITY_SCOPE.ALL_STORES_UNDER_DISTRIBUTOR,
                  VISIBILITY_SCOPE.ALL_SALES_REPS,
                  VISIBILITY_SCOPE.SPECIFIC_SALES_REPS
                ]
              }
            },
            {
              [Op.or]: [
                { visibility_scope: VISIBILITY_SCOPE.ALL_DISTRIBUTORS },
                {
                  visibility_scope:
                    VISIBILITY_SCOPE.ALL_STORES_UNDER_DISTRIBUTOR
                },
                { visibility_scope: VISIBILITY_SCOPE.SPECIFIC_STORES },
                literal(`
                  EXISTS (
                    SELECT 1 FROM "program_approvals" AS pa
                    WHERE pa.program_id = "Program"."id"
                    AND pa.approver_id = ${distributorId}
                    AND pa.approver_type = '${ENTITY_TYPE.DISTRIBUTOR}'
                    AND pa.deleted_at IS NULL
                  )
                `)
              ]
            },
            {
              approval_status: PROGRAM_APPROVAL_STATUS.PENDING,
              creator_type: ENTITY_TYPE.MANUFACTURER,
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
   * Approve a program for a distributor
   * @param distributorId - The ID of the distributor
   * @param programId - The ID of the program to approve
   * @param programDetailId - The ID of the program detail to approve
   * @param notes - Optional notes for the approval
   * @returns The updated program approval
   */
  public async approveProgram({
    distributorId,
    programId,
    programDetailId,
    notes
  }: {
    distributorId: number;
    programId: number;
    programDetailId?: number;
    notes?: string;
  }) {
    try {
      return await sequelize.transaction(async (t: Transaction) => {
        // Build the where clause based on whether programDetailId is provided
        const whereClause = {
          program_id: programId,
          approver_id: distributorId,
          status: {
            [Op.in]: [
              PROGRAM_APPROVAL_STATUS.PENDING,
              PROGRAM_APPROVAL_STATUS.REJECTED
            ]
          },
          deleted_at: null,
          ...(programDetailId && { program_detail_id: programDetailId })
        };

        // console.log(
        //   "whereClause",
        //   whereClause,
        //   await ProgramApproval.findAll({
        //     where: whereClause,
        //     raw: true
        //   })
        // );

        // Update approval status
        const [updatedCount] = await ProgramApproval.update(
          {
            status: PROGRAM_APPROVAL_STATUS.APPROVED,
            notes: notes || null
          },
          {
            where: whereClause,
            transaction: t
          }
        );

        if (updatedCount === 0) {
          throw ApiError.notFound(
            programDetailId
              ? "Program detail not found or already approved"
              : "No pending approvals found for this program"
          );
        }

        // Get the program details that were just approved
        const approvedDetails = await ProgramApproval.findAll({
          attributes: ["program_detail_id", "approver_type"],
          where: {
            program_id: programId,
            approver_id: distributorId,
            status: PROGRAM_APPROVAL_STATUS.APPROVED,
            deleted_at: null,
            ...(programDetailId && { program_detail_id: programDetailId })
          },
          raw: true,
          transaction: t
        });

        // Create visibility entries for each approved detail
        await Promise.all(
          approvedDetails.map((detail) => {
            return ProgramVisibility.upsert(
              {
                program_id: programId,
                program_detail_id: detail.program_detail_id,
                entity_type: detail.approver_type,
                entity_id: distributorId,
                deleted_at: null
              },
              { transaction: t }
            );
          })
        );

        return "Program approved successfully";
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal(error.message || "Error approving program");
    }
  }

  /**
   * Reject a program for a distributor
   * @param distributorId - The ID of the distributor
   * @param programId - The ID of the program to reject
   * @param notes - Optional notes for the rejection
   * @returns The updated program approval
   */
  public async rejectProgram({
    distributorId,
    programId,
    programDetailId,
    notes
  }: {
    distributorId: number;
    programId: number;
    programDetailId?: number;
    notes?: string;
  }) {
    try {
      return await sequelize.transaction(async (t: Transaction) => {
        // Build the where clause based on whether programDetailId is provided
        const whereClause = {
          program_id: programId,
          approver_id: distributorId,
          status: {
            [Op.in]: [
              PROGRAM_APPROVAL_STATUS.PENDING,
              PROGRAM_APPROVAL_STATUS.APPROVED
            ]
          },
          deleted_at: null,
          ...(programDetailId && { program_detail_id: programDetailId })
        };

        // Update to REJECTED status
        const [updatedCount] = await ProgramApproval.update(
          {
            status: PROGRAM_APPROVAL_STATUS.REJECTED,
            notes: notes || null
          },
          {
            where: whereClause,
            transaction: t
          }
        );

        if (updatedCount === 0) {
          throw ApiError.notFound(
            programDetailId
              ? "Program detail not found or already processed"
              : "No pending approvals found for this program"
          );
        }

        // Check if there was a previous visibility entry and soft delete it
        await ProgramVisibility.update(
          { deleted_at: new Date() },
          {
            where: {
              program_id: programId,
              entity_id: distributorId,
              deleted_at: null,
              ...(programDetailId && { program_detail_id: programDetailId })
            },
            transaction: t
          }
        );

        return "Program rejected successfully";
      });
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal(error.message || "Error rejecting program");
    }
  }

  /**
   * Get program details for approval
   * @param distributorId - The ID of the distributor
   * @param programId - The ID of the program
   * @returns The program details
   */
  public async getProgramDetailsForApproval({
    distributorId,
    programId
  }: {
    distributorId: number;
    programId: number;
  }) {
    try {
      // Check if the program exists and is visible to the distributor
      const program = await Program.findOne({
        include: [
          {
            model: Manufacturer,
            as: "ProgramCreator",
            required: true,
            attributes: ["id", "logo", "name", "authorized", "organizationName"]
          },
          {
            model: ProgramApproval,
            as: "ProgramApproval",
            required: true,
            where: {
              approver_type: ENTITY_TYPE.DISTRIBUTOR,
              deleted_at: null,
              approver_id: distributorId
            }
          },
          {
            model: ProgramDetail,
            as: "ProgramDetails",
            required: true
          }
        ],
        where: {
          id: programId,
          approval_status: PROGRAM_APPROVAL_STATUS.PENDING,
          creator_type: ENTITY_TYPE.MANUFACTURER,
          deleted_at: null
        }
      });

      if (!program) {
        throw new ApiError(
          404,
          "Program not found or not eligible for approval"
        );
      }

      // Get approval status for this program
      const approval = await ProgramApproval.findOne({
        where: {
          program_id: programId,
          approver_type: "DISTRIBUTOR",
          approver_id: distributorId,
          deleted_at: null
        }
      });

      return {
        ...program.toJSON(),
        approval_status: approval ? approval.status : "PENDING"
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Error fetching program details");
    }
  }

  /**
   * Handle program action (approve or enroll) based on the user role
   * @param userId - The ID of the user
   * @param role - The role of the user
   * @param programId - The ID of the program
   * @param programDetailId - The ID of the program detail (for distributor approval)
   * @param notes - Optional notes
   * @returns Success message
   */
  public async handleProgramAction({
    user,
    role,
    programId,
    programDetailId,
    notes
  }: {
    user: any;
    role: string;
    programId: number;
    programDetailId?: number;
    notes?: string;
  }) {
    try {
      const distributorId = getParentDistributorId(user, user.role);
      if (!distributorId) {
        throw ApiError.authenticationFailed(
          ERROR_MESSAGES.REQUIRED.DISTRIBUTOR_ID
        );
      }

      switch (role) {
        case ENTITY_TYPE.STORE: {
          const storeId = user.associatedUserId;
          if (!storeId) {
            throw ApiError.authenticationFailed(
              ERROR_MESSAGES.REQUIRED.STORE_ID
            );
          }
          return await this.enrollStoreInProgram({
            distributorId,
            storeId,
            programId
          });
        }

        case ENTITY_TYPE.DISTRIBUTOR:
        case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
        case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
        case ENTITY_TYPE.DISTRIBUTOR_GENERAL_MANAGER:
          return await this.approveProgram({
            distributorId,
            programId,
            programDetailId,
            notes
          });

        default:
          throw ApiError.badRequest(`Role ${role} cannot perform this action`);
      }
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal(error.message || "Error handling program action");
    }
  }

  /**
   * Enroll a store in a program
   * @param storeId - The ID of the store
   * @param programId - The ID of the program to enroll in
   * @returns Success message
   */
  private async enrollStoreInProgram({
    distributorId,
    storeId,
    programId
  }: {
    distributorId: number;
    storeId: number;
    programId: number;
  }) {
    try {
      const ifStoreProgramExists =
        await ListProgramsService.getSingleStoreProgram({
          distributorId,
          storeId,
          programId
        });
      if (!ifStoreProgramExists) {
        throw ApiError.alreadyExists(
          "Program not found or not eligible for enrollment"
        );
      }

      // Check if the store is already enrolled
      const existingEnrollment = await ProgramParticipant.findOne({
        where: {
          program_id: programId,
          entity_id: storeId,
          entity_type: ENTITY_TYPE.STORE,
          deleted_at: null
        }
      });

      if (existingEnrollment) {
        return "Store is already enrolled in this program";
      }

      // Create a new program participant entry for the store
      await ProgramParticipant.create({
        programId: programId,
        entityId: storeId,
        entityType: ENTITY_TYPE.STORE
      });

      return "Store enrolled in program successfully";
    } catch (error: any) {
      throw ApiError.internal(
        error.message || "Error enrolling store in program"
      );
    }
  }

  /**
   * Opt out a store from a program
   * @param storeId - The ID of the store
   * @param programId - The ID of the program to opt out from
   * @param notes - Optional notes for opting out
   * @returns Success details including effectiveDate
   */
  public async optOutProgram({
    storeId,
    programId,
    notes
  }: {
    storeId: number;
    programId: number;
    notes?: string;
  }) {
    try {
      // Find the program enrollment
      const programParticipant = await ProgramParticipant.findOne({
        where: {
          programId: programId,
          entityId: storeId,
          entityType: ENTITY_TYPE.STORE,
          deletedAt: null
        }
      });

      if (!programParticipant) {
        throw ApiError.notFound(ERROR_MESSAGES.NO_PROGRAMS_FOUND);
      }

      // Soft delete the program participant record (opt out)
      await programParticipant.destroy();

      return {
        message: "Successfully opted out of program",
        effectiveDate: new Date(),
        notes: notes || "User opted out of program"
      };
    } catch (error: any) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.internal(error.message || "Error opting out of program");
    }
  }
}

export default new ProgramApprovalService();
