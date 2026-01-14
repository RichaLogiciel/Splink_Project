import { Op, Transaction } from "sequelize";
import {
  ENTITY_TYPE,
  PROGRAM_APPROVAL_STATUS,
  PROGRAM_TYPE,
  TARGET_AUDIENCE,
  VISIBILITY_SCOPE
} from "../../config/appConstants";
import sequelize from "../../db";
import { ApiError } from "../../lib/errors/APIError";
import Program from "../../models/Program";
import ProgramDetail from "../../models/ProgramDetail";
import ProgramProduct from "../../models/ProgramProduct";
import SpiffProgramEligibleStore from "../../models/SpiffProgramEligibleStore";
import UserRole from "../../models/UserRole";
import CreateProgramRepository from "../../repositories/CreateProgramRepository";
import ProgramApprovalRepository from "../../repositories/ProgramApprovalRepository";
import ProgramDetailRepository from "../../repositories/ProgramDetailRepository";
import ProgramRepository from "../../repositories/ProgramRepository";
import ProgramVisibilityRepository from "../../repositories/ProgramVisibilityRepository";
import StoreRepository from "../../repositories/StoreRepository";
import StoreService from "../StoreService";

interface ProgramDetails {
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
  days_criteria?: number;
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
  products: string[];
}

export interface CreateProgramRequest {
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
  manufacturer_id?: number;
  internal_initiative?: boolean;
  spiff_stores: any[];
  // Enhanced store criteria support - matches frontend rule format
  store_criteria?: {
    rules: Array<{
      id?: string;
      type: string;
      category?: string | { label: string; value: string };
      operator: string;
      value1?: number;
      value2?: number;
      startDate?: Date | string | null;
      endDate?: Date | string | null;
      chains?: Array<{ label: string; value: string }> | string;
      products?:
        | Array<{ label: string; value: string; description?: string }>
        | string;
    }>;
  };
  distributor_ids?: number[];
  sales_rep_ids?: number[];
  min_products_purchased?: number;
  excluded_stores?: number[];
  selected_distributors?: number[]; // For backward compatibility
}

interface ProgramApproval {
  program_id: number;
  program_detail_id: number;
  approver_type: string;
  approver_id: number;
  status: string;
}

interface VisibilityEntity {
  entity_type: string;
  entity_id: number;
}

export class CreateProgramService {
  private selectedDistributors: number[] = [];

  private async validateInput(data: CreateProgramRequest) {
    if (
      (data.participant_type == TARGET_AUDIENCE.DISTRIBUTOR &&
        data.visibility_scope == VISIBILITY_SCOPE.SPECIFIC_STORES) ||
      (data.participant_type == TARGET_AUDIENCE.DISTRIBUTOR &&
        data.visibility_scope == VISIBILITY_SCOPE.ALL_STORES_UNDER_DISTRIBUTOR)
    ) {
      throw ApiError.badRequest("Cannot create distributor program for stores");
    }

    if (!data.program_details?.length) {
      throw ApiError.badRequest("At least one program detail is required");
    }

    // Validate visibility entities for SPECIFIC_STORES
    // Can be provided directly OR via store_criteria (resolved later)
    if (
      data.visibility_scope === VISIBILITY_SCOPE.SPECIFIC_STORES &&
      !data.visibility_entities?.length &&
      !data.store_criteria
    ) {
      throw ApiError.badRequest(
        "Either visibility_entities or store_criteria is required for specific stores"
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

    if (data.creator_type === ENTITY_TYPE.DISTRIBUTOR) {
      if (data.participant_type === TARGET_AUDIENCE.DISTRIBUTOR) {
        throw ApiError.badRequest(
          "Distributors cannot create programs for distributors"
        );
      }
      if (data.visibility_scope === VISIBILITY_SCOPE.ALL_DISTRIBUTORS) {
        throw ApiError.badRequest(
          "Distributors cannot create programs for all distributors"
        );
      }
      if (data.visibility_scope === VISIBILITY_SCOPE.SPECIFIC_DISTRIBUTORS) {
        throw ApiError.badRequest(
          "Distributors cannot create programs for specific distributors"
        );
      }
    }

    // Check for duplicate visibility entities ONLY if they're already provided
    // (skip if they'll be resolved from store_criteria later)
    if (
      data.visibility_entities &&
      data.visibility_entities.length > 0 &&
      (data.visibility_scope === VISIBILITY_SCOPE.SPECIFIC_DISTRIBUTORS ||
        data.visibility_scope === VISIBILITY_SCOPE.SPECIFIC_STORES)
    ) {
      const uniqueEntities = new Set(
        data.visibility_entities.map(
          (entity) => `${entity.entity_id}-${entity.entity_type}`
        )
      );
      if (uniqueEntities.size !== data.visibility_entities.length) {
        throw ApiError.badRequest(
          "Duplicate visibility entities are not allowed"
        );
      }
    }
  }

  private async createProgram(
    data: CreateProgramRequest,
    transaction: Transaction
  ) {
    return await ProgramRepository.create(
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
        manufacturerId:
          data.creator_type == ENTITY_TYPE.DISTRIBUTOR
            ? data.manufacturer_id
            : data.creator_id,
        participantType: data.participant_type,
        programType: data.program_type,
        programHeader: data.program_header,
        paymentTerm: data.payment_term,
        internalInitiative: data.internal_initiative || false
      },
      transaction
    );
  }

  private async createProgramDetails(
    programId: number,
    details: ProgramDetails[],
    transaction: Transaction
  ) {
    return await Promise.all(
      details.map((detail) =>
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
  }

  /**
   * Transforms frontend rule format to backend store criteria format
   * Handles category objects, product arrays, and normalizes data
   */
  private transformRulesToBackendFormat(rules: any[]): any[] {
    return rules.map((rule) => {
      const transformed: any = {
        type: rule.type,
        operator: rule.operator,
        value2: rule.value2,
        startDate: rule.startDate,
        endDate: rule.endDate
      };

      // For category rules, map value1 -> value (StoreRepository expects 'value')
      // For other rules (specific_product), keep value1
      if (rule.type === "category") {
        transformed.value = rule.value1;
      } else {
        transformed.value1 = rule.value1;
      }

      // Handle category (can be object or string)
      if (rule.category) {
        transformed.category =
          typeof rule.category === "object"
            ? rule.category.value
            : rule.category;
      }

      // Handle chains (for customer_chain type)
      if (rule.chains) {
        if (Array.isArray(rule.chains)) {
          // Convert array of objects to comma-separated string of IDs
          transformed.chains = rule.chains
            .map((c: any) => (typeof c === "object" ? c.value : c))
            .join(",");
        } else {
          transformed.chains = rule.chains;
        }
      }

      // Handle products (can be array of objects or comma-separated string)
      if (rule.products) {
        if (Array.isArray(rule.products)) {
          // Convert array of objects to comma-separated string of IDs
          transformed.products = rule.products
            .map((p: any) => (typeof p === "object" ? p.value : p))
            .join(",");
        } else {
          transformed.products = rule.products;
        }
      }

      return transformed;
    });
  }

  /**
   * Resolves visibility entities from store criteria if provided
   * Otherwise uses the provided visibility_entities array
   */
  private async resolveVisibilityEntities(
    data: CreateProgramRequest
  ): Promise<VisibilityEntity[]> {
    // If visibility_entities already provided, use them (legacy support)
    if (
      data.visibility_entities &&
      data.visibility_entities.length > 0 &&
      !data.store_criteria
    ) {
      return data.visibility_entities;
    }

    // If store_criteria provided, resolve stores using backend filtering
    if (data.store_criteria) {
      // Validate required fields
      if (!data.distributor_ids || data.distributor_ids.length === 0) {
        throw ApiError.badRequest(
          "distributor_ids is required when using store_criteria"
        );
      }

      if (!data.manufacturer_id) {
        throw ApiError.badRequest(
          "manufacturer_id is required when using store_criteria"
        );
      }

      // Transform frontend rules to backend format
      const transformedCriteria = {
        rules: this.transformRulesToBackendFormat(data.store_criteria.rules)
      };

      // Normalize store_criteria: ensure rules array exists
      // Empty object {} or {rules: []} both mean "all stores"
      // Also transform frontend format to backend format
      const normalizedCriteria = {
        rules: (data.store_criteria.rules || []).map((rule: any) => {
          const normalizedRule: any = { ...rule };

          // Transform category from object to string
          if (rule.category && typeof rule.category === "object") {
            normalizedRule.category =
              rule.category.value || rule.category.label;
          }

          // Transform products from array of objects to comma-separated string
          if (rule.products && Array.isArray(rule.products)) {
            normalizedRule.products = rule.products
              .map((p: any) => p.value || p.id)
              .filter(Boolean)
              .join(",");
          }

          // Transform chains from array of objects to comma-separated string
          if (rule.chains && Array.isArray(rule.chains)) {
            normalizedRule.chains = rule.chains
              .map((c: any) => c.value || c.id)
              .filter(Boolean)
              .join(",");
          }

          // Map value1 to value (backend uses 'value')
          if (rule.value1 !== undefined && rule.value === undefined) {
            normalizedRule.value = rule.value1;
          }

          return normalizedRule;
        })
      };

      // Call the store criteria function (same as /store/manufacturer/:id endpoint)
      const stores = await StoreService.getStoresByCriteria(
        data.manufacturer_id,
        data.distributor_ids,
        data.min_products_purchased || 1,
        transformedCriteria,
        data.sales_rep_ids || []
      );

      // Convert stores to visibility_entities format
      let visibilityEntities = stores.map((store) => ({
        entity_type: "STORE" as const,
        entity_id: store.id
      }));

      // Apply exclusions if provided
      if (data.excluded_stores && data.excluded_stores.length > 0) {
        const excludeSet = new Set(data.excluded_stores);
        visibilityEntities = visibilityEntities.filter(
          (entity) => !excludeSet.has(entity.entity_id)
        );

        console.log(
          `Filtered ${stores.length} stores, excluded ${data.excluded_stores.length}, final count: ${visibilityEntities.length}`
        );
      }

      if (visibilityEntities.length === 0) {
        throw ApiError.badRequest(
          "No stores found matching the criteria after exclusions"
        );
      }

      return visibilityEntities;
    }

    // No stores provided
    return [];
  }

  private async createVisibilityAndApprovals({
    programId,
    programDetails,
    visibilityScope,
    visibilityEntities,
    creatorId,
    creatorType,
    transaction
  }: {
    programId: number;
    programDetails: ProgramDetail[];
    visibilityScope: string;
    visibilityEntities: VisibilityEntity[];
    creatorId: number;
    creatorType: string;
    transaction: Transaction;
  }) {
    switch (visibilityScope) {
      case VISIBILITY_SCOPE.SPECIFIC_STORES:
        await this.handleSpecificStores({
          programId,
          programDetails,
          visibilityEntities,
          creatorId,
          creatorType,
          transaction
        });
        break;
      case VISIBILITY_SCOPE.ALL_STORES_UNDER_DISTRIBUTOR:
      case VISIBILITY_SCOPE.ALL_DISTRIBUTORS:
        await this.handleAllDistributors({
          programId,
          programDetails,
          creatorId,
          creatorType,
          transaction
        });
        break;
      case VISIBILITY_SCOPE.SPECIFIC_DISTRIBUTORS:
        await this.handleSpecificDistributors(
          programId,
          programDetails,
          visibilityEntities,
          transaction
        );
        break;
      case VISIBILITY_SCOPE.SPECIFIC_SALES_REPS:
      case VISIBILITY_SCOPE.ALL_SALES_REPS:
        await this.handleSpecificSalesReps({
          programId,
          programDetails,
          visibilityEntities,
          creatorId,
          creatorType,
          transaction
        });
        break;
    }
  }

  private async handleSpecificStores({
    programId,
    programDetails,
    visibilityEntities,
    creatorId,
    creatorType,
    transaction
  }: {
    programId: number;
    programDetails: ProgramDetail[];
    visibilityEntities: VisibilityEntity[];
    creatorId: number;
    creatorType: string;
    transaction: Transaction;
  }) {
    if (!visibilityEntities?.length) {
      throw ApiError.badRequest("No stores found");
    }

    const allStores =
      creatorType === ENTITY_TYPE.DISTRIBUTOR
        ? await StoreRepository.getAllStoresByDistributorId(creatorId)
        : null;

    const filteredEntities = visibilityEntities.filter((entity) =>
      creatorType === ENTITY_TYPE.DISTRIBUTOR
        ? allStores?.some((store) => store.id === entity.entity_id)
        : entity.entity_type === ENTITY_TYPE.STORE
    );

    if (!filteredEntities?.length) {
      throw ApiError.badRequest("No valid stores found");
    }

    // Create approvals
    const approvals: ProgramApproval[] = [];
    const uniqueApprovals = new Set<string>();

    for (const entity of filteredEntities) {
      const distId =
        creatorType === ENTITY_TYPE.DISTRIBUTOR
          ? await this.getDistributorIdFromEntityId(entity.entity_id)
          : creatorId;
      if (distId) {
        for (const detail of programDetails) {
          const approvalKey = `${programId}-${detail.id}-${distId}`;
          if (!uniqueApprovals.has(approvalKey)) {
            uniqueApprovals.add(approvalKey);
            approvals.push({
              program_id: programId,
              program_detail_id: detail.id,
              approver_type: ENTITY_TYPE.DISTRIBUTOR,
              approver_id: distId,
              status:
                creatorType === ENTITY_TYPE.MANUFACTURER
                  ? PROGRAM_APPROVAL_STATUS.PENDING
                  : PROGRAM_APPROVAL_STATUS.APPROVED
            });
          }
        }
      }
    }

    // Create visibility entries
    await Promise.all(
      programDetails.flatMap((detail) =>
        filteredEntities.map((entity) =>
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

  private async handleSpecificSalesReps({
    programId,
    programDetails,
    visibilityEntities,
    creatorId,
    creatorType,
    transaction
  }: {
    programId: number;
    programDetails: ProgramDetail[];
    visibilityEntities: VisibilityEntity[];
    creatorId: number;
    creatorType: string;
    transaction: Transaction;
  }) {
    if (!visibilityEntities?.length) {
      throw ApiError.badRequest("No sales reps found");
    }

    const filteredEntities = visibilityEntities.filter(
      (entity) => entity.entity_type === ENTITY_TYPE.SALES_REP
    );

    if (!filteredEntities?.length) {
      throw ApiError.badRequest("No valid sales reps found");
    }

    // Create approvals
    const approvals: ProgramApproval[] = [];
    const uniqueApprovals = new Set<string>();

    const isManufacturer = creatorType === ENTITY_TYPE.MANUFACTURER;
    const approvalStatus = isManufacturer
      ? PROGRAM_APPROVAL_STATUS.PENDING
      : PROGRAM_APPROVAL_STATUS.APPROVED;

    for (const entity of filteredEntities) {
      const distributorIds = isManufacturer
        ? this.selectedDistributors.filter(Boolean)
        : [
            await this.getDistributorIdFromEntityId(
              entity.entity_id,
              ENTITY_TYPE.DISTRIBUTOR_SALES_REP
            )
          ].filter(Boolean);

      for (const distId of distributorIds) {
        for (const detail of programDetails) {
          const approvalKey = `${programId}-${detail.id}-${distId}`;

          if (!uniqueApprovals.has(approvalKey)) {
            uniqueApprovals.add(approvalKey);
            approvals.push({
              program_id: programId,
              program_detail_id: detail.id,
              approver_type: ENTITY_TYPE.DISTRIBUTOR,
              approver_id: distId,
              status: approvalStatus
            });
          }
        }
      }
    }

    // Create visibility entries
    await Promise.all(
      programDetails.flatMap((detail) =>
        filteredEntities.map((entity) =>
          ProgramVisibilityRepository.create(
            {
              program_id: programId,
              program_detail_id: detail.id,
              entity_type: ENTITY_TYPE.SALES_REP,
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

  private async handleAllDistributors({
    programId,
    programDetails,
    creatorId,
    creatorType,
    transaction
  }: {
    programId: number;
    programDetails: ProgramDetail[];
    creatorId: number;
    creatorType: string;
    transaction: Transaction;
  }) {
    if (creatorType === ENTITY_TYPE.DISTRIBUTOR) {
      // For DISTRIBUTOR type, we only need one approval for the creator
      // Distributors self-approve their programs immediately
      const approvals: ProgramApproval[] = programDetails.map((detail) => ({
        program_id: programId,
        program_detail_id: detail.id,
        approver_type: ENTITY_TYPE.DISTRIBUTOR,
        approver_id: creatorId,
        status: PROGRAM_APPROVAL_STATUS.APPROVED
      }));

      await Promise.all(
        approvals.map((approval) =>
          ProgramApprovalRepository.create(approval, transaction)
        )
      );

      return;
    }

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
          status:
            creatorType === ENTITY_TYPE.MANUFACTURER
              ? PROGRAM_APPROVAL_STATUS.PENDING
              : PROGRAM_APPROVAL_STATUS.APPROVED
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

    const filteredEntities = visibilityEntities.filter(
      (entity) => entity.entity_type === ENTITY_TYPE.DISTRIBUTOR
    );

    if (!filteredEntities.length) {
      throw ApiError.badRequest("No valid distributors found");
    }

    const approvals: ProgramApproval[] = filteredEntities.flatMap((entity) =>
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

    // Create visibility entries
    await Promise.all(
      programDetails.flatMap((detail) =>
        filteredEntities.map((entity) =>
          ProgramVisibilityRepository.create(
            {
              program_id: programId,
              program_detail_id: detail.id,
              entity_type: ENTITY_TYPE.DISTRIBUTOR,
              entity_id: entity.entity_id
            },
            transaction
          )
        )
      )
    );
  }

  public async execute(data: CreateProgramRequest) {
    const transaction = await sequelize.transaction();

    try {
      // Validate input
      await this.validateInput(data);

      // Get selected distributors for MANUFACTURER type
      if (data.creator_type === ENTITY_TYPE.MANUFACTURER) {
        // Get selected distributors
        this.selectedDistributors = data.distributor_ids || [];
      }

      // Resolve visibility entities from criteria for SPECIFIC_STORES
      if (
        data.visibility_scope === VISIBILITY_SCOPE.SPECIFIC_STORES &&
        data.store_criteria
      ) {
        data.visibility_entities = await this.resolveVisibilityEntities(data);
      }

      // Resolve spiff_stores from criteria for SPIFF/NA programs
      if (
        (data.program_type === PROGRAM_TYPE.SPIFF ||
          data.program_type === PROGRAM_TYPE.NA) &&
        data.store_criteria
      ) {
        const visibilityEntities = await this.resolveVisibilityEntities(data);
        data.spiff_stores = visibilityEntities.map((entity) => ({
          entity_type: entity.entity_type,
          entity_id: entity.entity_id
        }));
      }

      // Resolve spiff_stores from criteria for SALES_REP participant programs when store_criteria is provided
      if (
        data.participant_type === ENTITY_TYPE.SALES_REP &&
        data.store_criteria &&
        !data.spiff_stores
      ) {
        const visibilityEntities = await this.resolveVisibilityEntities(data);
        data.spiff_stores = visibilityEntities.map((entity) => ({
          entity_type: entity.entity_type,
          entity_id: entity.entity_id
        }));
      }

      // Check if program exists
      const existingProgram = await this.isProgramExists(data);
      if (existingProgram) {
        throw ApiError.alreadyExists(
          "A program with the same details already exists for this " +
            data.creator_type
        );
      }

      // Create program
      const program = await this.createProgram(data, transaction);

      // Create program details
      const programDetails = await this.createProgramDetails(
        program.id,
        data.program_details,
        transaction
      );

      // Handle visibility and approvals
      await this.createVisibilityAndApprovals({
        programId: program.id,
        programDetails,
        visibilityScope: data.visibility_scope,
        visibilityEntities: data.visibility_entities || [],
        creatorId: data.creator_id,
        creatorType: data.creator_type,
        transaction
      });

      // Auto-enroll stores into program_participants
      await this.autoEnrollStoresInProgram({
        data,
        programId: program.id,
        transaction
      });

      if (
        data.program_type === PROGRAM_TYPE.SPIFF ||
        data.program_type === PROGRAM_TYPE.NA
      ) {
        // Save SPIFF stores
        await Promise.all(
          data.spiff_stores.map((store) =>
            SpiffProgramEligibleStore.create(
              {
                programId: program.dataValues.id,
                storeId: store.entity_id,
                createdAt: new Date(),
                updatedAt: new Date()
              },
              { transaction }
            )
          )
        );

        // Save program products
        await Promise.all(
          data.program_details.map((detail, index) =>
            Promise.all(
              (data.program_details[index].products || []).map((product) =>
                ProgramProduct.create(
                  {
                    programId: program.dataValues.id,
                    programDetailId: programDetails[index].dataValues.id,
                    productId: product,
                    createdAt: new Date(),
                    updatedAt: new Date()
                  },
                  { transaction }
                )
              )
            )
          )
        );
      }

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

  public async isProgramExists(data: CreateProgramRequest) {
    const existingProgram = await Program.unscoped().findOne({
      where: {
        [Op.and]: [
          { name: { [Op.iLike]: data.name } },
          { programHeader: { [Op.iLike]: data.program_header } },
          {
            manufacturerId:
              data.creator_type === ENTITY_TYPE.DISTRIBUTOR
                ? data.manufacturer_id
                : data.creator_id
          },
          { visibilityScope: data.visibility_scope },
          { creatorId: data.creator_id },
          { creatorType: { [Op.iLike]: data.creator_type } },
          { participantType: data.participant_type },
          { deletedAt: null }
        ]
      },
      include: [
        {
          model: ProgramDetail,
          as: "ProgramDetails",
          attributes: [
            "id",
            "program_id",
            "tier",
            "minQty",
            "maxQty",
            "rebateAmount",
            "rebatePercentage",
            "rebateType",
            "rebateCalculation",
            "rebateCalculationType",
            "requiredEssentialSkus",
            "requiredFlexSkus",
            "requiredCoreSkus",
            "daysCriteria",
            "programLine",
            "programType",
            "description",
            "overview",
            "rebatableProducts",
            "dependency",
            "minSpend",
            "maxRebate",
            "productsTags",
            "productsTagsQty",
            "productsTagsQtyMax",
            "criteria",
            "points",
            "quantityType",
            "isOther",
            "pointsPerSku",
            "percentagePerPoint",
            "maxPoints"
          ]
        }
      ]
    });

    if (existingProgram) {
      // Log each field comparison
      const comparison = {
        name: {
          existing: String(existingProgram.name || "").toLowerCase(),
          incoming: String(data.name || "").toLowerCase(),
          matches:
            String(existingProgram.name || "").toLowerCase() ===
            String(data.name || "").toLowerCase()
        },
        programHeader: {
          existing: String(existingProgram.programHeader || "").toLowerCase(),
          incoming: String(data.program_header || "").toLowerCase(),
          matches:
            String(existingProgram.programHeader || "").toLowerCase() ===
            String(data.program_header || "").toLowerCase()
        },
        programType: {
          existing: String(existingProgram.programType || ""),
          incoming: String(data.program_type || ""),
          matches:
            String(existingProgram.programType || "") ===
            String(data.program_type || "")
        },
        paymentTerm: {
          existing: String(existingProgram.paymentTerm || ""),
          incoming: String(data.payment_term || ""),
          matches:
            String(existingProgram.paymentTerm || "") ===
            String(data.payment_term || "")
        },
        targetAudience: {
          existing: String(existingProgram.targetAudience || ""),
          incoming: String(data.target_audience || ""),
          matches:
            String(existingProgram.targetAudience || "") ===
            String(data.target_audience || "")
        },
        visibilityScope: {
          existing: String(existingProgram.visibilityScope || ""),
          incoming: String(data.visibility_scope || ""),
          matches:
            String(existingProgram.visibilityScope || "") ===
            String(data.visibility_scope || "")
        },
        creatorId: {
          existing: Number(existingProgram.creatorId || 0),
          incoming: Number(data.creator_id || 0),
          matches:
            Number(existingProgram.creatorId || 0) ===
            Number(data.creator_id || 0)
        },
        creatorType: {
          existing: String(existingProgram.creatorType || ""),
          incoming: String(data.creator_type || ""),
          matches:
            String(existingProgram.creatorType || "") ===
            String(data.creator_type || "")
        },
        participantType: {
          existing: String(existingProgram.participantType || ""),
          incoming: String(data.target_audience || ""),
          matches:
            String(existingProgram.participantType || "") ===
            String(data.target_audience || "")
        },
        description: {
          existing: String(existingProgram.description || ""),
          incoming: String(data.description || ""),
          matches:
            String(existingProgram.description || "") ===
            String(data.description || "")
        },
        minPurchaseAmount: {
          existing: Number(existingProgram.minPurchaseAmount || 0),
          incoming: Number(data.min_purchase_amount || 0),
          matches:
            Number(existingProgram.minPurchaseAmount || 0) ===
            Number(data.min_purchase_amount || 0)
        },
        rebatePercentage: {
          existing: Number(existingProgram.rebatePercentage || 0),
          incoming: Number(data.rebate_percentage || 0),
          matches:
            Number(existingProgram.rebatePercentage || 0) ===
            Number(data.rebate_percentage || 0)
        }
      };

      const isProgramEqual = Object.values(comparison).every(
        (field) => field.matches
      );

      const areDetailsMatching = this.areProgramDetailsEqual(
        data.program_details,
        existingProgram.ProgramDetails || []
      );

      return isProgramEqual && areDetailsMatching;
    }
    return false;
  }

  private areProgramDetailsEqual(
    incoming: ProgramDetails[],
    existing: ProgramDetail[]
  ): boolean {
    if (incoming.length !== existing.length) {
      return false;
    }

    // Sort both arrays by tier for consistent comparison
    const sortedIncoming = [...incoming].sort((a, b) => a.tier - b.tier);
    const sortedExisting = [...existing].sort((a, b) => a.tier - b.tier);

    return sortedIncoming.every((incomingDetail, index) => {
      const existingDetail = sortedExisting[index];

      const comparison = {
        tier: {
          existing: existingDetail.tier,
          incoming: incomingDetail.tier,
          matches: incomingDetail.tier === existingDetail.tier
        },
        minQty: {
          existing: Number(existingDetail.minQty),
          incoming: Number(incomingDetail.min_qty),
          matches:
            Number(incomingDetail.min_qty) === Number(existingDetail.minQty)
        },
        maxQty: {
          existing: Number(existingDetail.maxQty || null),
          incoming: Number(incomingDetail.max_qty || null),
          matches:
            Number(incomingDetail.max_qty || null) ===
            Number(existingDetail.maxQty || null)
        },
        rebateAmount: {
          existing: Number(existingDetail.rebateAmount),
          incoming: Number(incomingDetail.rebate_amount),
          matches:
            Number(incomingDetail.rebate_amount) ===
            Number(existingDetail.rebateAmount)
        },
        rebatePercentage: {
          existing: Number(existingDetail.rebatePercentage || null),
          incoming: Number(incomingDetail.rebate_percentage || null),
          matches:
            Number(incomingDetail.rebate_percentage || null) ===
            Number(existingDetail.rebatePercentage || null)
        },
        rebateType: {
          existing: existingDetail.rebateType.toLowerCase(),
          incoming: incomingDetail.rebate_type.toLowerCase(),
          matches:
            incomingDetail.rebate_type.toLowerCase() ===
            existingDetail.rebateType.toLowerCase()
        },
        rebateCalculation: {
          existing: existingDetail.rebateCalculation.toLowerCase(),
          incoming: incomingDetail.rebate_calculation.toLowerCase(),
          matches:
            incomingDetail.rebate_calculation.toLowerCase() ===
            existingDetail.rebateCalculation.toLowerCase()
        },
        rebateCalculationType: {
          existing: existingDetail.rebateCalculationType.toLowerCase(),
          incoming: incomingDetail.rebate_calculation_type.toLowerCase(),
          matches:
            incomingDetail.rebate_calculation_type.toLowerCase() ===
            existingDetail.rebateCalculationType.toLowerCase()
        },
        requiredEssentialSkus: {
          existing: Number(existingDetail.requiredEssentialSkus || null),
          incoming: Number(incomingDetail.required_essential_skus || null),
          matches:
            Number(incomingDetail.required_essential_skus || null) ===
            Number(existingDetail.requiredEssentialSkus || null)
        },
        requiredFlexSkus: {
          existing: Number(existingDetail.requiredFlexSkus || null),
          incoming: Number(incomingDetail.required_flex_skus || null),
          matches:
            Number(incomingDetail.required_flex_skus || null) ===
            Number(existingDetail.requiredFlexSkus || null)
        },
        requiredCoreSkus: {
          existing: Number(existingDetail.requiredCoreSkus || null),
          incoming: Number(incomingDetail.required_core_skus || null),
          matches:
            Number(incomingDetail.required_core_skus || null) ===
            Number(existingDetail.requiredCoreSkus || null)
        },
        daysCriteria: {
          existing: existingDetail.daysCriteria || null,
          incoming: incomingDetail.days_criteria || null,
          matches:
            (incomingDetail.days_criteria || null) ===
            (existingDetail.daysCriteria || null)
        },
        programLine: {
          existing: (existingDetail.programLine || "").toLowerCase(),
          incoming: (incomingDetail.program_line || "").toLowerCase(),
          matches:
            (incomingDetail.program_line || "").toLowerCase() ===
            (existingDetail.programLine || "").toLowerCase()
        },
        programType: {
          existing: (existingDetail.programType || "").toLowerCase(),
          incoming: (incomingDetail.program_type || "").toLowerCase(),
          matches:
            (incomingDetail.program_type || "").toLowerCase() ===
            (existingDetail.programType || "").toLowerCase()
        },
        description: {
          existing: (existingDetail.description || "").toLowerCase(),
          incoming: (incomingDetail.description || "").toLowerCase(),
          matches:
            (incomingDetail.description || "").toLowerCase() ===
            (existingDetail.description || "").toLowerCase()
        },
        overview: {
          existing: (existingDetail.overview || "").toLowerCase(),
          incoming: (incomingDetail.overview || "").toLowerCase(),
          matches:
            (incomingDetail.overview || "").toLowerCase() ===
            (existingDetail.overview || "").toLowerCase()
        },
        rebatableProducts: {
          existing: (existingDetail.rebatableProducts || "").toLowerCase(),
          incoming: (incomingDetail.rebatable_products || "").toLowerCase(),
          matches:
            (incomingDetail.rebatable_products || "").toLowerCase() ===
            (existingDetail.rebatableProducts || "").toLowerCase()
        },
        dependency: {
          existing: (existingDetail.dependency || "").toLowerCase(),
          incoming: (incomingDetail.dependecy || "").toLowerCase(),
          matches:
            (incomingDetail.dependecy || "").toLowerCase() ===
            (existingDetail.dependency || "").toLowerCase()
        },
        minSpend: {
          existing: Number(existingDetail.minSpend || 0),
          incoming: Number(incomingDetail.min_spend || 0),
          matches:
            Number(incomingDetail.min_spend || 0) ===
            Number(existingDetail.minSpend || 0)
        },
        maxRebate: {
          existing: Number(existingDetail.maxRebate || 0),
          incoming: Number(incomingDetail.max_rebate || 0),
          matches:
            Number(incomingDetail.max_rebate || 0) ===
            Number(existingDetail.maxRebate || 0)
        },
        productsTags: {
          existing: (existingDetail.productsTags || "").toLowerCase(),
          incoming: (incomingDetail.products_tags || "").toLowerCase(),
          matches:
            (incomingDetail.products_tags || "").toLowerCase() ===
            (existingDetail.productsTags || "").toLowerCase()
        },
        productsTagsQty: {
          existing: (existingDetail.productsTagsQty || "").toLowerCase(),
          incoming: (incomingDetail.products_tags_qty || "").toLowerCase(),
          matches:
            (incomingDetail.products_tags_qty || "").toLowerCase() ===
            (existingDetail.productsTagsQty || "").toLowerCase()
        },
        productsTagsQtyMax: {
          existing: (existingDetail.productsTagsQtyMax || "").toLowerCase(),
          incoming: (incomingDetail.products_tags_qty_max || "").toLowerCase(),
          matches:
            (incomingDetail.products_tags_qty_max || "").toLowerCase() ===
            (existingDetail.productsTagsQtyMax || "").toLowerCase()
        },
        criteria: {
          existing: (existingDetail.criteria || "").toLowerCase(),
          incoming: (incomingDetail.criteria || "").toLowerCase(),
          matches:
            (incomingDetail.criteria || "").toLowerCase() ===
            (existingDetail.criteria || "").toLowerCase()
        },
        points: {
          existing: Number(existingDetail.points || null),
          incoming: Number(incomingDetail.points || null),
          matches:
            Number(incomingDetail.points || null) ===
            Number(existingDetail.points || null)
        },
        quantityType: {
          existing: (existingDetail.quantityType || "").toLowerCase(),
          incoming: (incomingDetail.quantity_type || "").toLowerCase(),
          matches:
            (incomingDetail.quantity_type || "").toLowerCase() ===
            (existingDetail.quantityType || "").toLowerCase()
        },
        isOther: {
          existing: Boolean(existingDetail.isOther),
          incoming: Boolean(incomingDetail.is_other),
          matches:
            Boolean(incomingDetail.is_other) === Boolean(existingDetail.isOther)
        },
        pointsPerSku: {
          existing: (existingDetail.pointsPerSku || "").toLowerCase(),
          incoming: (incomingDetail.points_per_sku || "").toLowerCase(),
          matches:
            (incomingDetail.points_per_sku || "").toLowerCase() ===
            (existingDetail.pointsPerSku || "").toLowerCase()
        },
        percentagePerPoint: {
          existing: (existingDetail.percentagePerPoint || "").toLowerCase(),
          incoming: (incomingDetail.percentage_per_point || "").toLowerCase(),
          matches:
            (incomingDetail.percentage_per_point || "").toLowerCase() ===
            (existingDetail.percentagePerPoint || "").toLowerCase()
        },
        maxPoints: {
          existing: (existingDetail.maxPoints || "").toLowerCase(),
          incoming: (incomingDetail.max_points || "").toLowerCase(),
          matches:
            (incomingDetail.max_points || "").toLowerCase() ===
            (existingDetail.maxPoints || "").toLowerCase()
        }
      };

      return Object.values(comparison).every((field) => field.matches);
    });
  }

  public async getDistributorIdFromEntityId(
    entityId: number,
    role: string = ENTITY_TYPE.STORE
  ): Promise<number> {
    try {
      const record: any = await UserRole.findOne({
        attributes: ["parent_entity_id"],
        where: {
          role: role,
          associated_user_id: entityId
        },
        raw: true
      });

      return record?.parent_entity_id ?? 0;
    } catch (error: any) {
      throw ApiError.internal(error?.message || "An unknown error occurred");
    }
  }

  /**
   * Automatically enrolls eligible stores as program participants based on the program's visibility scope.
   * - Determines store IDs to enroll depending on visibility (all stores under distributor, specific stores, or sales reps).
   * - Avoids duplicate enrollments by checking existing participants.
   * - Performs a bulk insert of new store enrollments into ProgramParticipant within the transaction.
   */
  private async autoEnrollStoresInProgram({
    data,
    programId,
    transaction
  }: {
    data: CreateProgramRequest;
    programId: number;
    transaction: Transaction;
  }) {
    await CreateProgramRepository.autoEnrollStoresInProgram({
      data,
      programId,
      transaction
    });
  }
}

export default new CreateProgramService();
