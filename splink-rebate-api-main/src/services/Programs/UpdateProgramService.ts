import { Transaction } from "sequelize";
import {
  ENTITY_TYPE,
  PROGRAM_APPROVAL_STATUS,
  TARGET_AUDIENCE,
  VISIBILITY_SCOPE
} from "../../config/appConstants";
import sequelize from "../../db";
import { ApiError } from "../../lib/errors/APIError";
import ProgramDetail from "../../models/ProgramDetail";
import UserRole from "../../models/UserRole";
import ProgramApprovalRepository from "../../repositories/ProgramApprovalRepository";
import ProgramDetailRepository from "../../repositories/ProgramDetailRepository";
import ProgramRepository from "../../repositories/ProgramRepository";
import ProgramVisibilityRepository from "../../repositories/ProgramVisibilityRepository";

interface ProgramDetails {
  id?: number; // Added for update scenarios
  tier: number;
  min_qty: number;
  max_qty?: number;
  rebate_amount: number;
  rebate_percentage?: number;
  rebate_type: string;
  rebate_calculation: string;
  rebate_calculation_type: string;
  required_essential_skus?: number;
  required_flex_skus?: number;
  required_core_skus?: number;
  days_criteria?: Date;
  program_line?: string;
  program_type?: string;
  description?: string;
  overview?: string;
  rebatable_products?: string;
  dependecy?: string;
  min_spend?: number;
  max_rebate?: number;
  products_tags?: string;
  products_tags_qty?: string;
  products_tags_qty_max?: string;
  criteria?: string;
  points?: number;
  quantity_type?: string;
  is_other?: boolean;
  points_per_sku?: string;
  percentage_per_point?: string;
  max_points?: string;
}

interface UpdateProgramRequest {
  program_id: number;
  name: string;
  start_date: Date;
  end_date: Date;
  target_audience: string;
  visibility_scope: string;
  participant_type: string;
  approval_status: string;
  description?: string;
  min_purchase_amount?: number;
  rebate_percentage?: number;
  creator_id: number;
  creator_type: string;
  program_details: ProgramDetails[];
  visibility_entities?: { entity_type: string; entity_id: number }[];
  program_type: string;
  program_header: string;
  payment_term: string;
}

interface VisibilityEntity {
  entity_type: string;
  entity_id: number;
}

interface ProgramApproval {
  program_id: number;
  program_detail_id: number;
  approver_type: string;
  approver_id: number;
  status: string;
}

export class UpdateProgramService {
  private async validateInput(data: UpdateProgramRequest) {
    // Check if program exists
    const program = await ProgramRepository.findById(data.program_id);
    if (!program) {
      throw ApiError.notFound("Program not found");
    }

    // Validate that the program belongs to the manufacturer
    if (program.manufacturerId !== data.creator_id) {
      throw ApiError.authorizationFailed(
        "You don't have permission to update this program"
      );
    }

    // Program validation
    if (
      (data.target_audience == TARGET_AUDIENCE.DISTRIBUTOR &&
        data.visibility_scope == VISIBILITY_SCOPE.SPECIFIC_STORES) ||
      (data.target_audience == TARGET_AUDIENCE.DISTRIBUTOR &&
        data.visibility_scope == VISIBILITY_SCOPE.ALL_STORES_UNDER_DISTRIBUTOR)
    ) {
      throw ApiError.badRequest("Cannot create distributor program for stores");
    }

    if (!data.program_details?.length) {
      throw ApiError.badRequest("At least one program detail is required");
    }

    if (
      data.visibility_scope === VISIBILITY_SCOPE.SPECIFIC_STORES &&
      !data.visibility_entities?.length
    ) {
      throw ApiError.badRequest(
        "Visibility entities are required for specific stores"
      );
    }

    if (
      data.visibility_scope === VISIBILITY_SCOPE.SPECIFIC_DISTRIBUTORS &&
      !data.visibility_entities?.length
    ) {
      throw ApiError.badRequest(
        "Visibility entities are required for specific distributors"
      );
    }
  }

  private async updateProgram(
    id: number,
    data: UpdateProgramRequest,
    transaction: Transaction
  ) {
    return await ProgramRepository.update(
      id,
      {
        name: data.name,
        startDate: data.start_date,
        endDate: data.end_date,
        targetAudience: data.target_audience,
        visibilityScope: data.visibility_scope,
        description: data.description,
        minPurchaseAmount: Number(data.min_purchase_amount) || null,
        rebatePercentage: Number(data.rebate_percentage) || null,
        creatorId: data.creator_id,
        creatorType: data.creator_type,
        approvalStatus: data.approval_status || PROGRAM_APPROVAL_STATUS.DRAFT,
        manufacturerId: data.creator_id,
        participantType: data.participant_type,
        programType: data.program_type,
        programHeader: data.program_header,
        paymentTerm: data.payment_term,
        updatedAt: new Date()
      },
      transaction
    );
  }

  private async updateProgramDetails(
    programId: number,
    details: ProgramDetails[],
    transaction: Transaction
  ) {
    // Get existing program details
    const existingDetails =
      await ProgramDetailRepository.findByProgramId(programId);
    const existingDetailsMap = new Map(
      existingDetails.map((detail) => [detail.id, detail])
    );

    // Track processed and new details
    const processedDetails: number[] = [];
    const newDetails: ProgramDetails[] = [];

    // Update existing and identify new details
    for (const detail of details) {
      if (detail.id && existingDetailsMap.has(detail.id)) {
        // Update existing detail
        await ProgramDetailRepository.update(
          detail.id,
          {
            programId,
            tier: detail.tier,
            minQty: detail.min_qty,
            maxQty: detail.max_qty,
            rebateAmount: detail.rebate_amount,
            rebatePercentage: detail.rebate_percentage,
            rebateType: detail.rebate_type,
            rebateCalculation: detail.rebate_calculation,
            rebateCalculationType: detail.rebate_calculation_type,
            requiredEssentialSkus: detail.required_essential_skus,
            requiredFlexSkus: detail.required_flex_skus,
            requiredCoreSkus: detail.required_core_skus,
            daysCriteria: detail.days_criteria,
            programType: detail.program_type,
            programLine: detail.program_line,
            description: detail.description,
            overview: detail.overview,
            rebatableProducts: detail.rebatable_products,
            dependency: detail.dependecy,
            minSpend: detail.min_spend,
            maxRebate: detail.max_rebate,
            productsTags: detail.products_tags,
            productsTagsQty: detail.products_tags_qty,
            productsTagsQtyMax: detail.products_tags_qty_max,
            criteria: detail.criteria,
            points: detail.points,
            quantityType: detail.quantity_type,
            isOther: detail.is_other,
            pointsPerSku: detail.points_per_sku,
            percentagePerPoint: detail.percentage_per_point,
            maxPoints: detail.max_points,
            updatedAt: new Date()
          },
          transaction
        );
        processedDetails.push(detail.id);
      } else {
        // New detail to be created
        newDetails.push(detail);
      }
    }

    // Create new details
    const createdDetails = await Promise.all(
      newDetails.map((detail) =>
        ProgramDetailRepository.create(
          {
            programId,
            tier: detail.tier,
            minQty: detail.min_qty,
            maxQty: detail.max_qty,
            rebateAmount: detail.rebate_amount,
            rebatePercentage: detail.rebate_percentage,
            rebateType: detail.rebate_type,
            rebateCalculation: detail.rebate_calculation,
            rebateCalculationType: detail.rebate_calculation_type,
            requiredEssentialSkus: detail.required_essential_skus,
            requiredFlexSkus: detail.required_flex_skus,
            requiredCoreSkus: detail.required_core_skus,
            daysCriteria: detail.days_criteria,
            programType: detail.program_type,
            programLine: detail.program_line,
            description: detail.description,
            overview: detail.overview,
            rebatableProducts: detail.rebatable_products,
            dependency: detail.dependecy,
            minSpend: detail.min_spend,
            maxRebate: detail.max_rebate,
            productsTags: detail.products_tags,
            productsTagsQty: detail.products_tags_qty,
            productsTagsQtyMax: detail.products_tags_qty_max,
            criteria: detail.criteria,
            points: detail.points,
            quantityType: detail.quantity_type,
            isOther: detail.is_other,
            pointsPerSku: detail.points_per_sku,
            percentagePerPoint: detail.percentage_per_point,
            maxPoints: detail.max_points,
            createdAt: new Date(),
            updatedAt: new Date()
          },
          transaction
        )
      )
    );

    // Combine existing and new details
    return [
      ...existingDetails.filter((detail) =>
        processedDetails.includes(detail.id)
      ),
      ...createdDetails
    ];
  }

  private async updateVisibilityAndApprovals(
    programId: number,
    programDetails: ProgramDetail[],
    visibilityScope: string,
    visibilityEntities: VisibilityEntity[],
    transaction: Transaction
  ) {
    // Clear existing visibility entries
    await this.clearExistingVisibility(programId, transaction);

    // Create new visibility entries based on scope
    switch (visibilityScope) {
      case VISIBILITY_SCOPE.SPECIFIC_STORES:
        await this.handleSpecificStores(
          programId,
          programDetails,
          visibilityEntities,
          transaction
        );
        break;
      case VISIBILITY_SCOPE.ALL_STORES_UNDER_DISTRIBUTOR:
      case VISIBILITY_SCOPE.ALL_DISTRIBUTORS:
        await this.handleAllDistributors(
          programId,
          programDetails,
          transaction
        );
        break;
      case VISIBILITY_SCOPE.SPECIFIC_DISTRIBUTORS:
        await this.handleSpecificDistributors(
          programId,
          programDetails,
          visibilityEntities,
          transaction
        );
        break;
    }
  }

  private async clearExistingVisibility(
    programId: number,
    transaction: Transaction
  ) {
    // Get existing visibility entries
    const visibilityEntries =
      await ProgramVisibilityRepository.findByProgramId(programId);

    // Delete each entry
    for (const entry of visibilityEntries) {
      await ProgramVisibilityRepository.delete(
        programId,
        entry.entity_type,
        entry.entity_id,
        transaction
      );
    }
  }

  private async handleSpecificStores(
    programId: number,
    programDetails: ProgramDetail[],
    visibilityEntities: VisibilityEntity[],
    transaction: Transaction
  ) {
    if (!visibilityEntities?.length) {
      throw ApiError.badRequest("No stores found");
    }

    // Create approvals
    const approvals: ProgramApproval[] = [];
    for (const entity of visibilityEntities) {
      const distId = await this.getDistributorIdFromStoreId(entity.entity_id);
      if (distId) {
        approvals.push(
          ...programDetails.map((detail) => ({
            program_id: programId,
            program_detail_id: detail.id,
            approver_type: ENTITY_TYPE.DISTRIBUTOR,
            approver_id: distId,
            status: PROGRAM_APPROVAL_STATUS.PENDING
          }))
        );
      }
    }

    // Create visibility entries
    await Promise.all(
      programDetails.flatMap((detail) =>
        visibilityEntities.map((entity) =>
          ProgramVisibilityRepository.create(
            {
              program_id: programId,
              program_detail_id: detail.id,
              entity_type: ENTITY_TYPE.STORE,
              entity_id: entity.entity_id
            },
            transaction
          )
        )
      )
    );

    await Promise.all(
      approvals.map((approval) =>
        ProgramApprovalRepository.create(approval, transaction)
      )
    );
  }

  private async handleAllDistributors(
    programId: number,
    programDetails: ProgramDetail[],
    transaction: Transaction
  ) {
    const allDistributors = await UserRole.findAll({
      attributes: ["associatedUserId"],
      where: {
        role: ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        associatedEntityType: ENTITY_TYPE.DISTRIBUTOR
      },
      raw: true
    });

    const approvals: ProgramApproval[] = allDistributors.flatMap(
      (distributor) =>
        programDetails.map((detail) => ({
          program_id: programId,
          program_detail_id: detail.id,
          approver_type: ENTITY_TYPE.DISTRIBUTOR,
          approver_id: distributor.associatedUserId,
          status: PROGRAM_APPROVAL_STATUS.PENDING
        }))
    );

    await Promise.all(
      approvals.map((approval) =>
        ProgramApprovalRepository.create(approval, transaction)
      )
    );
  }

  private async handleSpecificDistributors(
    programId: number,
    programDetails: ProgramDetail[],
    visibilityEntities: VisibilityEntity[],
    transaction: Transaction
  ) {
    if (!visibilityEntities?.length) {
      throw ApiError.badRequest("No distributors found");
    }

    const approvals: ProgramApproval[] = visibilityEntities.flatMap((entity) =>
      programDetails.map((detail) => ({
        program_id: programId,
        program_detail_id: detail.id,
        approver_type: ENTITY_TYPE.DISTRIBUTOR,
        approver_id: entity.entity_id,
        status: PROGRAM_APPROVAL_STATUS.PENDING
      }))
    );

    await Promise.all(
      approvals.map((approval) =>
        ProgramApprovalRepository.create(approval, transaction)
      )
    );
  }

  public async execute(data: UpdateProgramRequest) {
    const transaction = await sequelize.transaction();

    try {
      // Validate input
      await this.validateInput(data);

      // Update program
      const program = await this.updateProgram(
        data.program_id,
        data,
        transaction
      );

      // Update program details
      const programDetails = await this.updateProgramDetails(
        data.program_id,
        data.program_details,
        transaction
      );

      // Update visibility and approvals
      await this.updateVisibilityAndApprovals(
        data.program_id,
        programDetails,
        data.visibility_scope,
        data.visibility_entities || [],
        transaction
      );

      await transaction.commit();

      return {
        program,
        program_details: programDetails
      };
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  public async getDistributorIdFromStoreId(storeId: number): Promise<number> {
    try {
      const record: any = await UserRole.findOne({
        attributes: ["parent_entity_id"],
        where: {
          role: ENTITY_TYPE.STORE,
          associated_user_id: storeId
        },
        raw: true
      });

      return record?.parent_entity_id ?? 0;
    } catch (error: any) {
      throw ApiError.internal(error?.message || "An unknown error occurred");
    }
  }
}

export default new UpdateProgramService();
