import newrelic from "newrelic";
import {
  col,
  fn,
  Includeable,
  literal,
  Op,
  QueryTypes,
  Sequelize,
  Transaction
} from "sequelize";
import {
  CACHE_TTL_TIME,
  ENTITY_TYPE,
  PROGRAM_APPROVAL_STATUS,
  ProgramsComplianceStatus,
  ProgramsDetailCriteria,
  useApiCaching,
  VISIBILITY_SCOPE
} from "../config/appConstants";
import sequelize from "../db";
import { ApiError } from "../lib/errors/APIError";
import AuthorizedManufacturerDistributor from "../models/AuthorizedManufacturerDistributor";
import DistributorProgramAggregation from "../models/DistributorProgramAggregation";
import ExcludedDistributorPrograms from "../models/ExcludedDistributorPrograms";
import Manufacturer from "../models/Manufacturer";
import Product from "../models/Product";
import Program from "../models/Program";
import ProgramApproval from "../models/ProgramApproval";
import ProgramCompliance from "../models/ProgramCompliance";
import ProgramDetail from "../models/ProgramDetail";
import ProgramParticipant from "../models/ProgramParticipant";
import ProgramStoreIneligibility from "../models/ProgramStoreIneligibility";
import ProgramVisibility from "../models/ProgramVisibility";
import SpiffProgramEligibleStore from "../models/SpiffProgramEligibleStore";
import Store from "../models/Store";
import StoreSalesRep from "../models/StoreSalesRep";
import StoreVoidFillTarget from "../models/StoreVoidFillTarget";
import UserRole from "../models/UserRole";
import { overrideProgramDetailOverviewText } from "../utils/programHelper";
import { getCacheKey, redisClient } from "../utils/redis";
import { getCurrentUser } from "../utils/requestContext";
import { getProgramComplianceEarningColumn } from "../utils/roles";
import DistributorRepository from "./DistributorRepository";

export class ProgramRepository {
  /**
   * Get all programs with manufacturers
   *
   * This method retrieves a list of all programs along with their corresponding manufacturers.
   *
   * @param userId The ID of the user
   * @param type The type of the user (e.g., "DISTRIBUTOR", "STORE", "SALES_REP")
   * @param manufacturerId The ID of the manufacturer
   * @returns A promise that resolves to an object containing the programs and their manufacturers
   */
  public async getDistributorPrograms(
    programIds: number[],
    excludedProgramDetailIds: number[] = [],
    programTimeline?: string
  ): Promise<Program[]> {
    return await newrelic.startSegment(
      "getDistributorPrograms",
      true,
      async () => {
        const cacheKey = getCacheKey(
          "distributor",
          "programs",
          programIds.sort().join(","),
          programTimeline?.toString() || "all"
        );

        if (useApiCaching) {
          try {
            const cached = await redisClient.get(cacheKey);
            if (cached) {
              return JSON.parse(cached);
            }
          } catch (error) {
            console.error("Cache error:", error);
          }
        }

        try {
          const programDetailWhere =
            excludedProgramDetailIds?.length > 0
              ? {
                  id: {
                    [Op.notIn]: excludedProgramDetailIds
                  }
                }
              : {};

          const programs = await Program.findAll({
            where: { id: programIds },
            include: [
              {
                model: Manufacturer,
                attributes: ["id", "name", "logo"]
              },
              {
                model: ProgramDetail,
                attributes: [
                  "id",
                  "tier",
                  "min_qty",
                  "max_qty",
                  "rebate_amount",
                  "rebate_percentage",
                  "rebate_type",
                  "rebate_calculation",
                  "fixed_rebate_category",
                  "fixed_rebate_amount",
                  "program_id"
                ],
                where: {
                  ...programDetailWhere,
                  ...Program.getProgramTimelineFilter(programTimeline)
                },
                required: true
              }
            ],
            order: [["id", "ASC"]]
          });

          if (useApiCaching && programs.length > 0) {
            await redisClient.setEx(
              cacheKey,
              CACHE_TTL_TIME,
              JSON.stringify(programs)
            );
          }

          return programs;
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(` ${error.message}`);
          } else {
            throw ApiError.internal("An unknown error occurred");
          }
        }
      }
    );
  }

  /**
   * Fetch all programs and details by manufacturerId and programIds
   *
   * This method retrieves a list of programs and their corresponding details
   * based on the provided manufacturerId and programIds.
   *
   * @param manufacturerId The ID of the manufacturer
   * @returns A promise that resolves to an object containing the programs and their details
   */
  public async getAllProgramAndDetails(
    manufacturerId: number = 0,
    participantType: string = "",
    excludedProgramDetailIds: any[] = [],
    programIds?: number[],
    programTimeline?: string,
    isInternalInitiative?: boolean,
    storeIds?: number[]
  ): Promise<Program[]> {
    return newrelic.startSegment(
      "ProgramRepository.getAllProgramAndDetails",
      true,
      async () => {
        try {
          const whereCondition: {
            manufacturerId?: number;
            participantType?: string;
            internalInitiative?: boolean;
          } = {};
          const includes = [];

          if (manufacturerId) {
            whereCondition.manufacturerId = manufacturerId;
            includes.push({
              model: Manufacturer,
              attributes: ["id", "name", "logo"]
            });
          }

          if (participantType) {
            whereCondition.participantType = participantType;
          }

          const programDetailWhere =
            excludedProgramDetailIds && excludedProgramDetailIds?.length > 0
              ? {
                  id: {
                    [Op.notIn]: excludedProgramDetailIds
                  }
                }
              : {};

          // STEP 1: Fetch base programs with ProgramDetails (required JOIN only)
          const include: Includeable[] = [
            {
              model: ProgramDetail,
              attributes: [
                "id",
                "tier",
                "min_qty",
                "max_qty",
                "rebate_amount",
                "rebate_percentage",
                "rebate_type",
                "rebate_calculation",
                "program_id",
                "overview",
                "description",
                "products_tags",
                "products_tags_qty",
                "fixed_rebate_amount",
                "fixed_rebate_category",
                "criteria",
                "program_line"
              ],
              required: true,
              where: {
                ...programDetailWhere
              }
            }
          ];

          const programs = await Program.findAll({
            where: {
              ...whereCondition,
              ...(programIds?.length ? { id: { [Op.in]: programIds } } : {}),
              ...Program.getProgramTimelineFilter(programTimeline),
              // Special handling for non-internal programs to include null/undefined
              ...(isInternalInitiative === false
                ? {
                    [Op.or]: [
                      { internal_initiative: false },
                      { internal_initiative: { [Op.is]: null } }
                    ]
                  }
                : isInternalInitiative === true
                  ? {
                      internal_initiative: true
                    }
                  : {})
            },
            include: include,
            order: [["id", "ASC"]]
          });

          if (programs.length === 0) {
            return programs;
          }

          const programIdsList = programs.map((p) => p.id);

          // STEP 2: Fetch supporting data separately
          const visibilityData = await ProgramVisibility.findAll({
            where: {
              program_id: { [Op.in]: programIdsList },
              deleted_at: null
            },
            attributes: ["program_id", "entity_type", "entity_id"],
            raw: true
          });

          // STEP 3: Fetch ProgramParticipants if storeIds provided
          let participantData: any[] = [];
          if (storeIds && storeIds.length > 0) {
            // Handle large storeIds arrays with batch processing to avoid parameter limits
            const BATCH_SIZE = 1000;
            const participantPromises = [];

            for (let i = 0; i < storeIds.length; i += BATCH_SIZE) {
              const batchStoreIds = storeIds.slice(i, i + BATCH_SIZE);
              participantPromises.push(
                ProgramParticipant.findAll({
                  where: {
                    program_id: { [Op.in]: programIdsList },
                    entity_id: { [Op.in]: batchStoreIds },
                    entity_type: ENTITY_TYPE.STORE,
                    deleted_at: null
                  },
                  attributes: ["program_id", "entity_id"],
                  raw: true
                })
              );
            }

            const participantBatches = await Promise.all(participantPromises);
            participantData = participantBatches.flat();
          }

          // STEP 4: Merge data in memory

          // Group visibility data by program_id
          const visibilityByProgram = visibilityData.reduce(
            (acc, item) => {
              if (!acc[item.program_id]) {
                acc[item.program_id] = [];
              }
              acc[item.program_id].push({
                entity_type: item.entity_type,
                entity_id: item.entity_id
              });
              return acc;
            },
            {} as Record<number, any[]>
          );

          // Group participant data by program_id
          const participantsByProgram = participantData.reduce(
            (acc, item) => {
              if (!acc[item.program_id]) {
                acc[item.program_id] = [];
              }
              acc[item.program_id].push({
                entity_id: item.entity_id
              });
              return acc;
            },
            {} as Record<number, any[]>
          );

          // Attach data to programs
          programs.forEach((program) => {
            program.ProgramVisibility = visibilityByProgram[program.id] || [];
            if (storeIds && storeIds.length > 0) {
              program.ProgramParticipants =
                participantsByProgram[program.id] || [];
            }
          });

          newrelic.addCustomAttribute(
            "getAllProgramAndDetails.manufacturer_id",
            manufacturerId
          );
          newrelic.addCustomAttribute(
            "getAllProgramAndDetails.result_count",
            programs.length
          );

          return programs;
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(` ${error.message}`);
          } else {
            throw ApiError.internal("An unknown error occurred");
          }
        }
      }
    );
  }

  /**
   * Fetch all programs and details by participantType
   *
   * This method retrieves a list of programs and their corresponding details
   * based on the provided participantType.
   *
   * @param participantType The participant type to filter the programs by
   * @returns A promise that resolves to an object containing the programs and their details
   */
  public async getProgramsByParticipantType({
    participantType,
    authorizedManufacturerIds = [],
    excludedProgramDetailIds = [],
    programIds,
    programDetailIds,
    programTimeline,
    isInternalInitiative,
    distributorId,
    role
  }: {
    participantType: string;
    authorizedManufacturerIds: number[];
    excludedProgramDetailIds: number[];
    programIds?: number[];
    programDetailIds?: number[];
    programTimeline?: string;
    isInternalInitiative?: boolean;
    distributorId?: number;
    role?: string;
  }): Promise<Program[]> {
    return newrelic.startSegment(
      "ProgramRepository.getProgramsByParticipantType",
      true,
      async () => {
        const startTime = process.hrtime();
        const logContext = {
          method: "getProgramsByParticipantType",
          participantType,
          authorizedManufacturerIds,
          timestamp: new Date().toISOString()
        };

        if (useApiCaching) {
          try {
            // Single cache check for all manufacturer programs
            const cachedPrograms = await Promise.all(
              authorizedManufacturerIds.map(async (id) => {
                const key = getCacheKey(
                  "programs",
                  "manufacturer",
                  `${programIds?.sort().join(",") || "all"}`,
                  `${programDetailIds?.sort().join(",") || "all"}`,
                  participantType ?? "all",
                  `${excludedProgramDetailIds?.sort().join(",") || "all"}`,
                  id.toString(),
                  programTimeline?.toString() || "all",
                  isInternalInitiative?.toString() || "all",
                  distributorId?.toString() || "null"
                );
                const cached = await redisClient.get(key);
                if (cached) {
                  return JSON.parse(cached);
                }
                return null;
              })
            );

            // If we have all programs cached, return them
            if (cachedPrograms.every((p) => p !== null)) {
              const allPrograms = cachedPrograms.flat();
              console.log(
                JSON.stringify({
                  level: "info",
                  message: "Cache hit - all programs",
                  count: allPrograms.length,
                  ...logContext
                })
              );
              return allPrograms;
            }
          } catch (error) {
            console.error(
              JSON.stringify({
                level: "error",
                message: "Cache error",
                error: error instanceof Error ? error.message : "Unknown error",
                ...logContext
              })
            );
          }
        }

        try {
          const authorizedPrograms =
            authorizedManufacturerIds.length > 0
              ? {
                  manufacturerId: {
                    [Op.in]: authorizedManufacturerIds
                  }
                }
              : {};

          const programWhere = {
            ...(programIds ? { id: { [Op.in]: programIds } } : {})
          };

          const programDetailWhere =
            excludedProgramDetailIds?.length > 0
              ? {
                  id: {
                    [Op.notIn]: excludedProgramDetailIds
                  }
                }
              : {};
          const programs = await Program.findAll({
            include: [
              ...(distributorId
                ? [
                    {
                      model: ProgramApproval,
                      as: "ProgramApproval",
                      required: true,
                      attributes: [],
                      where: {
                        approver_id: distributorId,
                        approver_type: ENTITY_TYPE.DISTRIBUTOR,
                        status: PROGRAM_APPROVAL_STATUS.APPROVED,
                        deleted_at: null
                      }
                    }
                  ]
                : []),
              {
                model: Manufacturer,
                attributes: ["id", "name", "logo", "authorized"]
              },
              {
                model: ProgramDetail,
                attributes: [
                  "id",
                  "tier",
                  "min_qty",
                  "max_qty",
                  "rebate_amount",
                  ["rebate_amount", "rebateAmount"],
                  "rebate_percentage",
                  "rebate_type",
                  ["rebate_type", "rebateType"],
                  "rebate_calculation",
                  ["rebate_calculation_type", "rebateCalculationType"],
                  "program_id",
                  ["rebate_calculation", "rebateCalculation"],
                  ["quantity_type", "quantityType"],
                  ["products_tags", "productsTags"],
                  "fixed_rebate_amount",
                  ["fixed_rebate_amount", "fixedRebateAmount"],
                  "fixed_rebate_category",
                  "overview",
                  ["program_line", "programLine"],
                  "criteria"
                ],
                where: {
                  ...programDetailWhere,
                  ...(programDetailIds
                    ? { id: { [Op.in]: programDetailIds } }
                    : {})
                },
                required: true
              },
              {
                model: ProgramVisibility,
                attributes: ["entity_type", "entity_id"],
                as: "ProgramVisibility",
                required: false,
                where: {
                  deleted_at: null
                }
              }
            ],
            where: {
              participant_type: participantType,
              ...authorizedPrograms,
              ...programWhere,
              ...Program.getProgramTimelineFilter(programTimeline),
              // Special handling for non-internal programs to include null/undefined
              ...(isInternalInitiative === false
                ? {
                    [Op.or]: [
                      { internal_initiative: false },
                      { internal_initiative: { [Op.is]: null } }
                    ]
                  }
                : isInternalInitiative === true
                  ? {
                      internal_initiative: true
                    }
                  : {})
            },
            order: [["id", "ASC"]]
          });

          // Cache the results by manufacturer
          if (useApiCaching && programs.length > 0) {
            const cacheOperations = authorizedManufacturerIds
              .map((mId) => {
                const manufacturerPrograms = programs.filter(
                  (p) => p.manufacturerId === mId
                );
                if (manufacturerPrograms.length > 0) {
                  const key = getCacheKey(
                    "programs",
                    "manufacturer",
                    `${programIds?.sort().join(",") || "all"}`,
                    `${programDetailIds?.sort().join(",") || "all"}`,
                    participantType ?? "all",
                    `${excludedProgramDetailIds?.sort().join(",") || "all"}`,
                    mId.toString(),
                    programTimeline?.toString() || "all",
                    isInternalInitiative?.toString() || "all",
                    distributorId?.toString() || "null"
                  );
                  return redisClient.setEx(
                    key,
                    CACHE_TTL_TIME,
                    JSON.stringify(manufacturerPrograms)
                  );
                }
              })
              .filter(Boolean);

            await Promise.all(cacheOperations);
          }
          const [s, ns] = process.hrtime(startTime);
          newrelic.addCustomAttribute(
            "getProgramsByParticipantType.duration_ms",
            s * 1000 + ns / 1000000
          );
          return programs;
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(`${error.message}`);
          } else {
            throw ApiError.internal("An unknown error occurred");
          }
        }
      }
    );
  }

  public async getProgramsIdsByCreatorAndVisibilityEntity({
    participantType,
    creatorIds,
    creatorType,
    secondaryCreatorIds,
    secondaryCreatorType,
    visibilityEntitieIds,
    programTimeline,
    getInternalInitiative,
    storeIds,
    distributorId
  }: {
    participantType: string;
    creatorIds?: number[];
    creatorType?: string;
    secondaryCreatorIds?: number[];
    secondaryCreatorType?: string;
    visibilityEntitieIds?: number[];
    programTimeline?: string;
    getInternalInitiative?: boolean;
    storeIds?: number[];
    distributorId?: number | number[];
  }): Promise<number[]> {
    const SPECIFIC_VISIBILITY_SCOPES = [
      VISIBILITY_SCOPE.SPECIFIC_DISTRIBUTORS,
      VISIBILITY_SCOPE.SPECIFIC_STORES,
      VISIBILITY_SCOPE.SPECIFIC_SALES_REPS
    ];

    let visibilityEntityIds = visibilityEntitieIds ?? [];
    const user = getCurrentUser();
    if (
      (user?.role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP &&
        participantType === ENTITY_TYPE.SALES_REP) ||
      (user?.role === ENTITY_TYPE.STORE &&
        participantType === ENTITY_TYPE.STORE)
    ) {
      visibilityEntityIds = [user.associatedUserId];
    }

    // Handle DISTRIBUTOR_ADMIN role for SALES_REP programs
    let effectiveDistributorId = distributorId;
    if (
      user?.role === ENTITY_TYPE.DISTRIBUTOR_ADMIN &&
      participantType === ENTITY_TYPE.SALES_REP
    ) {
      // For distributor admin viewing sales rep programs, use their associatedUserId as distributorId
      effectiveDistributorId = user.associatedUserId;
    }
    let programWhere: any = {
      ...(creatorIds ? { creator_id: { [Op.in]: creatorIds } } : {}),
      ...(creatorType ? { creator_type: creatorType } : {})
    };

    if (secondaryCreatorIds && secondaryCreatorType) {
      programWhere = {
        manufacturerId: { [Op.in]: creatorIds },
        [Op.or]: [
          {
            creator_id: { [Op.in]: creatorIds },
            ...(creatorType ? { creator_type: creatorType } : {})
          },
          {
            creator_id: { [Op.in]: secondaryCreatorIds },
            creator_type: secondaryCreatorType
          }
        ]
      };
    }

    // Handle internal initiative filtering - include null/undefined for non-internal
    let internalInitiativeFilter = {};
    if (getInternalInitiative === false) {
      internalInitiativeFilter = {
        [Op.or]: [
          { internal_initiative: false },
          { internal_initiative: { [Op.is]: null } }
        ]
      };
    } else if (getInternalInitiative === true) {
      internalInitiativeFilter = {
        internal_initiative: true
      };
    }

    // First query: required: true for specific visibility scopes
    const specificPrograms = await Program.findAll({
      include: [
        // Only require ProgramVisibility for non-distributor-admin users
        ...(user?.role !== ENTITY_TYPE.DISTRIBUTOR_ADMIN
          ? [
              {
                model: ProgramVisibility,
                as: "ProgramVisibility",
                required: true,
                attributes: [],
                where: {
                  deleted_at: null,
                  ...(visibilityEntityIds?.length
                    ? { entity_id: { [Op.in]: visibilityEntityIds } }
                    : {})
                }
              }
            ]
          : [
              {
                model: ProgramVisibility,
                as: "ProgramVisibility",
                required: false,
                attributes: [],
                where: {
                  deleted_at: null
                }
              }
            ]),
        ...(effectiveDistributorId ||
        (Array.isArray(effectiveDistributorId) &&
          effectiveDistributorId.length > 0)
          ? [
              {
                model: ProgramApproval,
                as: "ProgramApproval",
                required: true,
                attributes: [],
                where: {
                  approver_id: Array.isArray(effectiveDistributorId)
                    ? { [Op.in]: effectiveDistributorId }
                    : effectiveDistributorId,
                  status: PROGRAM_APPROVAL_STATUS.APPROVED,
                  deleted_at: null
                }
              }
            ]
          : []),
        ...(storeIds && storeIds.length > 0
          ? [
              {
                model: SpiffProgramEligibleStore,
                required: true,
                attributes: [],
                where: { store_id: { [Op.in]: storeIds } }
              }
            ]
          : [])
      ],
      where: {
        participant_type: participantType,
        visibility_scope: { [Op.in]: SPECIFIC_VISIBILITY_SCOPES },
        ...programWhere,
        ...Program.getProgramTimelineFilter(programTimeline),
        ...internalInitiativeFilter
      },
      order: [["id", "ASC"]],
      raw: true
    });

    // Second query: required: false for non-specific scopes
    const generalPrograms = await Program.findAll({
      include: [
        ...(effectiveDistributorId ||
        (Array.isArray(effectiveDistributorId) &&
          effectiveDistributorId.length > 0)
          ? [
              {
                model: ProgramApproval,
                as: "ProgramApproval",
                required: true,
                attributes: [],
                where: {
                  approver_id: Array.isArray(effectiveDistributorId)
                    ? { [Op.in]: effectiveDistributorId }
                    : effectiveDistributorId,
                  status: PROGRAM_APPROVAL_STATUS.APPROVED,
                  deleted_at: null
                }
              }
            ]
          : []),
        {
          model: ProgramVisibility,
          as: "ProgramVisibility",
          required: false,
          attributes: [],
          where: {
            deleted_at: null
          }
        }
      ],
      where: {
        participant_type: participantType,
        visibility_scope: { [Op.notIn]: SPECIFIC_VISIBILITY_SCOPES },
        ...programWhere,
        ...internalInitiativeFilter
      },
      order: [["id", "ASC"]],
      raw: true
    });

    // For debugging purposes
    // console.log(
    //   "specificPrograms",
    //   specificPrograms?.map((p) => ({
    //     id: p.id,
    //     name: p.name,
    //     header: p.programHeader
    //   }))
    // );

    const allProgramIds = [...specificPrograms, ...generalPrograms].map(
      (p) => p.id
    );
    return [...new Set(allProgramIds)].sort((a, b) => a - b);
  }

  /**
   * Get user IDs by distributor and retailer
   *
   * This method retrieves a list of user IDs based on the provided distributor ID and retailer ID.
   *
   * @param distributorId The ID of the distributor
   * @param retailerId The ID of the retailer
   * @returns A promise that resolves to an array of user IDs
   */
  public async getRetailersIdByDistributorIdAndRole(
    distributorId: number,
    roles: string[]
  ): Promise<number[]> {
    try {
      const userRoles = await UserRole.findAll({
        where: {
          role: {
            [Op.or]: roles // Use Op.or to match any role in the array
          },
          parentEntityId: distributorId,
          parentEntityType: ENTITY_TYPE.DISTRIBUTOR
        },
        attributes: ["associatedUserId"] // Only retrieve the associated user ID
      });

      return userRoles.map((role) => role.associatedUserId);
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  public async getRetailersIdBySalesRepIdAndRole(
    salesRepId: number
  ): Promise<number[]> {
    try {
      const userRoles = await StoreSalesRep.findAll({
        where: {
          sales_rep_id: salesRepId
        },
        attributes: [["store_id", "storeId"]]
      });

      return userRoles.map((role) => role.storeId);
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  async getProgramsByEntityIdAndType(entityIds: number[], entityType: string) {
    try {
      const programParticipants = await ProgramParticipant.findAll({
        where: {
          entityId: {
            [Op.in]: entityIds
          },
          entityType: entityType
        },
        include: [
          {
            model: Program // Assuming a 'Program' model is associated with 'ProgramParticipant'
          }
        ]
      });
      return programParticipants;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  async getProgramsByIdsOrDetailIds(
    ids?: number[],
    programDetailIds?: number[]
  ): Promise<Program[]> {
    const programs = await Program.findAll({
      where: {
        ...(ids ? { id: { [Op.in]: ids } } : {})
      },
      include: [
        {
          model: Manufacturer,
          attributes: ["id", "name", "logo"]
        },
        {
          model: ProgramDetail,
          where: {
            ...(programDetailIds ? { id: { [Op.in]: programDetailIds } } : {})
          }
        }
      ]
    });

    return programs;
  }

  async getProgramsByProgramIdEntityIdAndType(
    programIds: number[],
    entityIds: number[],
    entityType: string
  ) {
    try {
      const programParticipants = await ProgramCompliance.findAll({
        where: {
          entityId: {
            [Op.in]: entityIds
          },
          programId: {
            [Op.in]: programIds
          },
          entityType: entityType
        },
        include: [
          {
            model: Program // Assuming a 'Program' model is associated with 'ProgramParticipant'
          }
        ]
      });

      return programParticipants;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  public async getProgramsByManufacturerId({
    manufacturerId,
    programTimeline,
    isInternalInitiative,
    distributorId
  }: {
    manufacturerId: number;
    programTimeline?: string;
    isInternalInitiative?: boolean;
    distributorId?: number;
  }) {
    return newrelic.startSegment(
      "ProgramRepository.getProgramsByManufacturerId",
      true,
      async () => {
        const startTime = process.hrtime();
        const logContext = {
          method: "getProgramsByManufacturerId",
          manufacturerId,
          timestamp: new Date().toISOString()
        };

        if (useApiCaching) {
          const cacheKey = getCacheKey(
            "programs",
            "byManufacturerId",
            manufacturerId,
            programTimeline || "none"
          );

          try {
            const cachedPrograms = await redisClient.get(cacheKey);
            if (cachedPrograms) {
              console.log(
                JSON.stringify({
                  level: "info",
                  message: "Cache hit for programs by manufacturer id",
                  ...logContext
                })
              );
              return JSON.parse(cachedPrograms);
            }

            console.log(
              JSON.stringify({
                level: "info",
                message: "Cache miss, fetching from database",
                ...logContext
              })
            );
          } catch (error) {
            if (error instanceof Error) {
              throw ApiError.internal(`${error.message}`);
            } else {
              throw ApiError.internal("An unknown error occurred");
            }
          }
        }
        try {
          const programs = await Program.findAll({
            where: {
              manufacturerId,
              ...Program.getProgramTimelineFilter(programTimeline),
              // Special handling for non-internal programs to include null/undefined
              ...(isInternalInitiative === false
                ? {
                    [Op.or]: [
                      { internal_initiative: false },
                      { internal_initiative: { [Op.is]: null } }
                    ]
                  }
                : isInternalInitiative === true
                  ? {
                      internal_initiative: true
                    }
                  : {})
            },
            include: [
              {
                model: ProgramApproval,
                as: "ProgramApproval",
                attributes: [],
                required: true,
                where: {
                  approver_id: distributorId,
                  status: PROGRAM_APPROVAL_STATUS.APPROVED,
                  deleted_at: null
                }
              },
              {
                model: ProgramDetail,
                as: "ProgramDetails" // Ensure this alias matches the association
              },
              {
                model: Manufacturer,
                as: "Manufacturer" // Ensure this alias matches the association
              }
            ]
          });
          if (useApiCaching) {
            const cacheKey = getCacheKey(
              "programs",
              "byManufacturerId",
              manufacturerId,
              programTimeline || "none"
            );
            await redisClient.set(cacheKey, JSON.stringify(programs), {
              EX: CACHE_TTL_TIME
            });
          }
          const [s, ns] = process.hrtime(startTime);
          newrelic.addCustomAttribute(
            "getProgramsByManufacturerId.duration_ms",
            s * 1000 + ns / 1000000
          );
          return programs;
        } catch (error) {
          if (error instanceof Error) {
            throw ApiError.internal(`${error.message}`);
          } else {
            throw ApiError.internal("An unknown error occurred");
          }
        }
      }
    );
  }

  public async getStoresByIdsWithEnrolledProgramIds(
    ids: number[],
    programIds: number[],
    searchQuery: string | null = null
  ): Promise<Store[]> {
    try {
      const stores = await Store.findAll({
        attributes: [
          ["id", "storeId"],
          "name",
          [
            sequelize.fn(
              "ARRAY_AGG",
              sequelize.col("ProgramParticipants.program_id")
            ),
            "enrolledProgramsIds"
          ]
        ],
        include: [
          {
            model: ProgramParticipant,
            as: "ProgramParticipants",
            required: false,
            attributes: [],
            where: {
              entity_type: ENTITY_TYPE.STORE,
              program_id: {
                [Op.in]: programIds
              }
            }
          }
        ],
        where: {
          id: {
            [Op.in]: ids
          },
          ...(searchQuery
            ? {
                name: {
                  [Op.iLike]: `%${searchQuery}%`
                }
              }
            : {})
        },
        group: ["Store.id"],
        raw: true
      });

      return stores;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  public async getManufacturerById(id: number): Promise<Manufacturer> {
    try {
      const manufacturer = await Manufacturer.findByPk(id);

      if (!manufacturer) {
        throw new Error(`Manufacturer with id ${id} not found`);
      }

      return manufacturer;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  async getProductsByManufacturerAndCore(
    manufacturerId: number,
    isCoreProduct: boolean
  ) {
    try {
      const products = await Product.findAll({
        where: {
          manufacturerId: manufacturerId,
          isCoreProduct: isCoreProduct
        }
      });

      return products;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  async getProgramDetailsCountByProgramId(programIds: number[]) {
    try {
      const programDetails = await ProgramDetail.count({
        where: {
          programId: {
            [Op.in]: programIds
          }
        }
      });

      return programDetails;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  /**
   * Retrieves an overview of programs for a given manufacturer and distributor
   * pair.
   *
   * This method fetches the programs for a given manufacturer and distributor
   * pair, along with the number of completed programs, total rebate, and other
   * relevant information. The results are grouped by program and program detail
   * IDs.
   *
   * @param manufacturerId The ID of the manufacturer
   * @param distributorId The ID of the distributor (optional)
   * @param participantType The type of participant (either DISTRIBUTOR or STORE)
   * @param managerDistributorIds The IDs of the distributors related to manufacturer account manager
   * @returns A promise that resolves to an array of objects containing the
   * program overview information.
   */
  public async getProgramsOverview(
    manufacturerId: number,
    distributorIds?: number[],
    participantType: string = ENTITY_TYPE.DISTRIBUTOR,
    managerDistributorIds?: number[],
    creatorIds?: number[],
    creatorTypes?: string[],
    programIds?: number[],
    programTimeline?: string,
    requestParticipantType: string = ENTITY_TYPE.SALES_REP
  ) {
    if (useApiCaching) {
      const cacheKey = getCacheKey(
        "programs",
        "overview",
        manufacturerId.toString(),
        distributorIds?.sort().join(",") || "all",
        managerDistributorIds?.toString() || "all",
        participantType,
        creatorIds?.sort().join(",") || "all",
        creatorTypes?.toString() || "all",
        programIds?.sort().join(",") || "all",
        programTimeline?.toString() || "all"
      );

      try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
          return JSON.parse(cached);
        }
      } catch (error) {
        console.error("Cache error:", error);
      }
    }

    // Get user role
    const user = getCurrentUser();
    // Get the program compliance earning column based on the role
    const earningColumn = getProgramComplianceEarningColumn(user?.role);

    const distributorFilter = !managerDistributorIds?.length
      ? {
          ...(distributorIds ? { entity_id: { [Op.in]: distributorIds } } : {})
        }
      : {
          entity_id: { [Op.in]: managerDistributorIds }
        };

    const programWhere = {
      ...(programIds ? { id: { [Op.in]: programIds } } : {}),
      ...(creatorIds ? { creator_id: { [Op.in]: creatorIds } } : {}),
      ...(creatorTypes ? { creator_type: { [Op.in]: creatorTypes } } : {})
    };

    return newrelic.startSegment("getProgramsOverview", true, async () => {
      // Single query approach using subqueries to avoid Cartesian product
      const results = await Program.findAll({
        attributes: [
          "id",
          ["name", "program_name"],
          "payment_term",
          "visibility_scope",
          [
            fn(
              "SUM",
              literal(
                `CASE WHEN "ProgramDetails->ProgramCompliances".is_qualified
                AND (
                  "Program".visibility_scope NOT IN ('${VISIBILITY_SCOPE.SPECIFIC_STORES}', '${VISIBILITY_SCOPE.SPECIFIC_DISTRIBUTORS}', '${VISIBILITY_SCOPE.SPECIFIC_SALES_REPS}')
                  OR EXISTS (
                    SELECT 1 FROM program_visibility pv 
                    WHERE pv.program_id = "Program".id 
                    AND pv.entity_id = "ProgramDetails->ProgramCompliances".entity_id 
                    AND pv.deleted_at IS NULL
                  )
                )
                AND NOT EXISTS (
                  SELECT 1 FROM excluded_distributor_programs edp
                  WHERE edp.program_detail_id = "ProgramDetails".id
                  AND edp.distributor_id = "ProgramDetails->ProgramCompliances".entity_id
                  AND edp.deleted_at IS NULL
                )
                THEN 1 ELSE 0 END`
              )
            ),
            "completed"
          ],
          [
            fn(
              "SUM",
              literal(
                `CASE WHEN "ProgramDetails->ProgramCompliances".status = '${ProgramsComplianceStatus.Active}'
                  AND (
                    "Program".visibility_scope NOT IN ('${VISIBILITY_SCOPE.SPECIFIC_STORES}', '${VISIBILITY_SCOPE.SPECIFIC_DISTRIBUTORS}', '${VISIBILITY_SCOPE.SPECIFIC_SALES_REPS}')
                    OR EXISTS (
                      SELECT 1 FROM program_visibility pv 
                      WHERE pv.program_id = "Program".id 
                      AND pv.entity_id = "ProgramDetails->ProgramCompliances".entity_id 
                      AND pv.deleted_at IS NULL
                    )
                  )
                  AND "ProgramDetails->ProgramCompliances".is_qualified
                  AND NOT EXISTS (
                    SELECT 1 FROM excluded_distributor_programs edp
                    WHERE edp.program_detail_id = "ProgramDetails".id
                    AND edp.distributor_id = "ProgramDetails->ProgramCompliances".entity_id
                    AND edp.deleted_at IS NULL
                  )
                THEN "ProgramDetails->ProgramCompliances".${earningColumn} ELSE 0 END`
              )
            ),
            "total_rebate"
          ],
          [Sequelize.col("ProgramDetails.id"), "program_detail_id"],
          [Sequelize.col("ProgramDetails.tier"), "tier"],
          [Sequelize.col("ProgramDetails.overview"), "overview"],
          [Sequelize.col("ProgramDetails.rebate_amount"), "rebate_amount"],
          [
            Sequelize.col("ProgramDetails.rebate_percentage"),
            "rebate_percentage"
          ],
          [Sequelize.col("ProgramDetails.rebate_type"), "rebate_type"],
          // Use subqueries for visibility data to avoid Cartesian product
          [
            literal(`(
              SELECT ARRAY_AGG(pv.entity_id) 
              FROM program_visibility pv 
              WHERE pv.program_id = "Program".id 
              AND pv.deleted_at IS NULL
            )`),
            "visible_entity_ids"
          ],
          [
            literal(`(
              SELECT MAX(pv.entity_type) 
              FROM program_visibility pv 
              WHERE pv.program_id = "Program".id 
              AND pv.deleted_at IS NULL
            )`),
            "visibility_entity_type"
          ],
          "program_header",
          "start_date",
          "end_date"
        ],
        include: [
          {
            model: ProgramDetail,
            attributes: [],
            required: true,
            include: [
              {
                model: ProgramCompliance,
                attributes: [],
                required: false,
                where: {
                  ...distributorFilter
                }
              }
            ]
          }
        ],
        where: {
          manufacturer_id: manufacturerId,
          participant_type: participantType,
          ...programWhere,
          ...Program.getProgramTimelineFilter(programTimeline)
        },
        group: ["Program.id", "ProgramDetails.id"],
        order: [[col("name"), "ASC"]],
        raw: true
      });

      if (useApiCaching && results.length > 0) {
        const cacheKey = getCacheKey(
          "programs",
          "overview",
          manufacturerId.toString(),
          distributorIds?.sort().join(",") || "all",
          managerDistributorIds?.toString() || "all",
          participantType,
          creatorIds?.sort().join(",") || "all",
          creatorTypes?.toString() || "all",
          programIds?.sort().join(",") || "all",
          programTimeline?.toString() || "all"
        );
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(results)
        );
      }

      return results;
    });
  }

  /**
   * Retrieves a list of excluded distributors for each program detail ID
   * associated with a given manufacturer.
   *
   * This function queries the `ExcludedDistributorPrograms` table to fetch all
   * distributor IDs that are excluded from specific program details for a given manufacturer.
   * The result is then grouped by `program_detail_id`, mapping each ID to an array of
   * excluded `distributor_id`s.
   *
   * @param {number} manufacturerId - The ID of the manufacturer for which excluded distributors are retrieved.
   * @param distributorId The ID of the distributor (optional)
   * @param managerDistributorIds The IDs of the distributors related to manufacturer account manager
   * @returns {Promise<{ program_detail_id: number; distributor_ids: number[] }[]>}
   *          A promise that resolves to an array of objects,
   *          each containing a `program_detail_id` and an array of excluded `distributor_ids`.
   */
  public async getExcludedDistributorsByProgramId(
    manufacturerId: number,
    distributorId?: number,
    managerDistributorIds?: number[]
  ) {
    const whereObj = distributorId ? { distributor_id: distributorId } : {};

    const whereDistributorIdsObj = managerDistributorIds?.length
      ? { distributor_id: { [Op.in]: managerDistributorIds } }
      : {};

    const result = await ExcludedDistributorPrograms.findAll({
      attributes: ["program_detail_id", "distributor_id"],
      where: {
        manufacturer_id: manufacturerId,
        ...whereObj,
        ...whereDistributorIdsObj
      },
      raw: true
    });

    // Grouping result by `program_detail_id`
    const groupedData = result.reduce((acc: any, row: any) => {
      if (!acc[row.program_detail_id]) {
        acc[row.program_detail_id] = [];
      }
      acc[row.program_detail_id].push(row["distributor_id"]);
      return acc;
    }, {});

    // Transform grouped data into the expected format
    return Object.entries(groupedData).map(
      ([program_detail_id, distributor_ids]) => ({
        program_detail_id: parseInt(program_detail_id),
        distributor_ids
      })
    );
  }

  /**
   * Retrieves an array of excluded program detail IDs for a given distributor.
   *
   * This function queries the `ExcludedDistributorPrograms` table to find all
   * `program_detail_id`s associated with the specified `distributor_id`.
   * It returns an array of `program_detail_id`s that are excluded for the distributor.
   *
   * @param {number} distributorIds - The IDs of the distributors.
   * @returns {Promise<number[]>} A promise that resolves to an array of excluded program detail IDs.
   */
  public async getExcludedProgramDetailIds(distributorIds: number[]) {
    const result = await ExcludedDistributorPrograms.findAll({
      attributes: ["program_detail_id"],
      where: {
        distributor_id: { [Op.in]: distributorIds }
      },
      raw: true
    });

    // Transform grouped data into the expected format
    return result.map((row: any) => row.program_detail_id);
  }

  /**
   * Retrieves an array of ineligible program detail IDs for a given store.
   *
   * This function queries the `ProgramStoreIneligibility` table to find all
   * `program_detail_id`s associated with the specified `store_id`.
   * It returns an array of `program_detail_id`s that are ineligible for the store.
   *
   * @param {number} storeId - The ID of the store.
   * @returns {Promise<number[]>} A promise that resolves to an array of ineligible program detail IDs.
   */
  public async getIneligibleProgramDetailIds(storeId: number) {
    const result = await ProgramStoreIneligibility.findAll({
      attributes: [
        [
          Sequelize.col("StoreIneligibilityProgramDetail.id"),
          "program_detail_id"
        ]
      ],
      include: [
        {
          model: ProgramDetail,
          as: "StoreIneligibilityProgramDetail",
          attributes: []
        }
      ],
      where: {
        store_id: storeId
      },
      raw: true
    });

    // Transform grouped data into the expected format
    return result.map((row: any) => row.program_detail_id);
  }

  /**
   * Retrieves an array of program IDs that are ineligible for the given store.
   *
   * This function queries the `ProgramStoreIneligibility` table to find all
   * `program_id`s associated with the specified `store_id`.
   * It returns an array of `program_id`s that are ineligible for the store.
   *
   * @param {number} storeId - The ID of the store.
   * @returns {Promise<number[]>} A promise that resolves to an array of ineligible program IDs.
   */
  public async getIneligibleProgramIds(storeId: number) {
    const result = await ProgramStoreIneligibility.findAll({
      attributes: ["program_id"],
      where: {
        store_id: storeId
      },
      raw: true
    });

    // Transform grouped data into the expected format
    return result.map((row: any) => row.program_id);
  }

  /**
   * Retrieves an array of store IDs ineligible for each program ID in the given list.
   *
   * This function queries the `ProgramStoreIneligibility` table to fetch all
   * `store_id`s associated with the specified `program_id`s.
   * It returns an array of objects, each containing a `program_id` and an array of
   * `store_ids` that are ineligible for the program.
   *
   * @param {number[]} programIds - The IDs of the programs to filter the results.
   * @param {number[]} storeIds - Optional The IDs of the stores to filter the results.
   * @returns {Promise<{ program_id: number; store_ids: number[] }[]>} A promise that resolves to
   *          an array of objects, each containing a `program_id` and an array of `store_ids` that are ineligible for the program.
   */
  public async getIneligibleStoreIdsGroupByProgramId(
    programIds: number[],
    storeIds?: number[]
  ) {
    const result = await ProgramStoreIneligibility.findAll({
      attributes: [
        "program_id",
        [fn("ARRAY_AGG", col("store_id")), "store_ids"]
      ],
      where: {
        program_id: { [Op.in]: programIds },
        ...(storeIds ? { store_id: { [Op.in]: storeIds } } : {})
      },
      group: ["program_id"],
      raw: true
    });

    return result;
  }

  /**
   * Retrieves a mapping of store IDs to manufacturer IDs for which all programs are ineligible.
   *
   * This method queries the `ProgramStoreIneligibility` table to find manufacturers
   * with all specified programs marked as ineligible for each store. It returns an
   * object where each key is a store ID and the corresponding value is an array of
   * manufacturer IDs for which all programs are ineligible.
   *
   * @param {number[]} manufacturerIds - The IDs of the manufacturers to filter the results.
   * @param {number[]} programIds - The IDs of the programs to check for ineligibility.
   * @param {number[]} [storeIds] - Optional. The IDs of the stores to filter the results.
   * @returns {Promise<Record<number, number[]>>} A promise that resolves to a mapping
   * of store IDs to arrays of manufacturer IDs with all programs ineligible.
   */
  public async findManufacturersWithAllProgramsIneligibleByStore(
    manufacturerIds: number[],
    programIds: number[],
    storeIds?: number[]
  ) {
    try {
      const result: any[] = await ProgramStoreIneligibility.findAll({
        attributes: [
          "storeId",
          [col("StoreIneligibilityProgram.manufacturer_id"), "manufacturer_id"],
          [
            fn("COUNT", col("ProgramStoreIneligibility.program_id")),
            "ineligible_count"
          ]
        ],
        include: [
          {
            model: Program,
            as: "StoreIneligibilityProgram",
            attributes: [],
            where: {
              manufacturer_id: { [Op.in]: manufacturerIds },
              id: { [Op.in]: programIds }
            }
          }
        ],
        where: {
          ...(storeIds ? { storeId: { [Op.in]: storeIds } } : {})
        },
        group: ["storeId", "StoreIneligibilityProgram.manufacturer_id"],
        having: literal(`
          COUNT("ProgramStoreIneligibility"."program_id") = (
            SELECT COUNT(*)
            FROM "programs" p
            WHERE p.manufacturer_id = "StoreIneligibilityProgram"."manufacturer_id"
             ${programIds?.length ? `AND p.id IN (${programIds.join(",")})` : ""}
            AND p.deleted_at IS NULL
          )
        `),
        raw: true
      });

      // Transform to { storeId: [manufacturer_ids...] }
      const grouped: Record<number, number[]> = {};
      for (const row of result) {
        if (!grouped[row.storeId]) grouped[row.storeId] = [];
        grouped[row.storeId].push(Number(row.manufacturer_id));
      }

      return grouped;
    } catch (error: any) {
      console.log(
        "Error in getValidProgramsManufacturerIdsGroupByStoreIds:",
        error
      );
      return {};
    }
  }

  /**
   * Retrieves an array of store IDs that have all programs ineligible for the given
   * manufacturer IDs.
   *
   * This function queries the `ProgramStoreIneligibility` table to find all store IDs
   * associated with the specified manufacturer IDs and program IDs. It groups the results
   * by store ID and manufacturer ID. The results include only store IDs that have all
   * programs ineligible for the given manufacturer IDs.
   *
   * @param {number[]} manufacturerIds - The IDs of the manufacturers to filter the results.
   * @param {number[]} programIds - The IDs of the programs to check for ineligibility.
   * @param {number[]} [storeIds] - Optional. The IDs of the stores to filter the results.
   * @returns {Promise<number[]>} A promise that resolves to an array of store IDs that have all programs ineligible for the given manufacturer IDs.
   */
  public async findStoreIdsWithAllProgramsIneligibleManufacturers(
    manufacturerIds: number[],
    programIds?: number[],
    storeIds?: number[],
    distributorId?: number,
    excludedProgramIds?: number[]
  ) {
    try {
      const result: any[] = await ProgramStoreIneligibility.findAll({
        attributes: [
          "storeId",
          [col("StoreIneligibilityProgram.manufacturer_id"), "manufacturer_id"],
          [
            fn("COUNT", col("ProgramStoreIneligibility.program_id")),
            "ineligible_count"
          ]
        ],
        include: [
          {
            model: Program,
            as: "StoreIneligibilityProgram",
            attributes: [],
            where: {
              manufacturer_id: { [Op.in]: manufacturerIds },
              ...(programIds ? { id: { [Op.in]: programIds } } : {}),
              ...(excludedProgramIds
                ? { id: { [Op.notIn]: excludedProgramIds } }
                : {})
            }
          }
        ],
        where: {
          ...(storeIds ? { storeId: { [Op.in]: storeIds } } : {}),
          ...(distributorId ? { distributor_id: distributorId } : {})
        },
        group: ["storeId", "StoreIneligibilityProgram.manufacturer_id"],
        having: literal(`
        COUNT("ProgramStoreIneligibility"."program_id") = (
          SELECT COUNT(*)
          FROM "programs" p
          WHERE p.manufacturer_id = "StoreIneligibilityProgram"."manufacturer_id"
          AND p.participant_type = 'STORE'
          ${programIds?.length ? `AND p.id IN (${programIds.join(",")})` : ""}
          ${excludedProgramIds?.length ? `AND p.id NOT IN (${excludedProgramIds.join(",")})` : ""}
          AND p.deleted_at IS NULL
        )
      `),
        raw: true
      });

      // Deduplicate storeIds
      const uniqueStoreIds = [
        ...new Set(result.map((row) => Number(row.storeId)))
      ];

      return uniqueStoreIds;
    } catch (error: any) {
      console.error(
        "Error in findStoreIdsWithAllProgramsIneligibleManufacturers:",
        error
      );
      return [];
    }
  }

  /**
   * Retrieves an array of excluded program IDs for a given distributor.
   *
   * This function queries the `ExcludedDistributorPrograms` table to find all
   * `program_id`s associated with the specified `distributor_id`.
   * It returns an array of `program_id`s that are excluded for the distributor.
   *
   * @param {number} distributorId - The ID of the distributor.
   * @returns {Promise<number[]>} A promise that resolves to an array of excluded program IDs.
   */
  public async getExcludedProgramIds(distributorId: number) {
    const result = await ExcludedDistributorPrograms.findAll({
      attributes: ["program_id"],
      where: {
        distributor_id: distributorId
      },
      raw: true
    });

    // Transform grouped data into the expected format
    return result.map((row: any) => row.program_id);
  }

  public async getStoresNearComplianceData(
    storeIds: number[],
    manufacturerId?: number,
    searchQuery?: string,
    distributorId?: number,
    excludedProgramIds?: number[]
  ) {
    return newrelic.startSegment(
      "ProgramRepository.getStoresNearComplianceData",
      true,
      async () => {
        try {
          // Log the storeIds for debugging
          // console.log(`Checking compliance for stores: ${storeIds.join(", ")}`);
          const transactionYear = new Date().getFullYear().toString();
          // Current date in YYYY-MM-DD format
          const currentDate = new Date().toISOString().slice(0, 10);

          // Move the filtering to SQL instead of doing it in TypeScript
          const query = `
        SELECT
          pc.entity_id as store_id,
          s.name as store_name,
          p.manufacturer_id,
          m.name as manufacturer_name,
          m.logo as manufacturer_logo,
          m.authorized as manufacturer_authorized,
          pd.program_id,
          p.name as program_name,
          p.program_type,
          p.manufacturer_id,
          p.payment_term,
          pd.tier as tier,
          pd.quantity_type as quantity_type,
          pd.id as program_detail_id,
          pd.overview as overview,
          pd.criteria as criteria,
          pd.min_spend as min_spend,
          pd.min_qty as min_qty,
          pd.max_qty as max_qty,
          pd.products_tags as products_tags,
          pd.products_tags_qty as products_tags_qty,
          pd.rebate_amount as rebate_amount,
          pd.rebate_percentage as rebate_percentage,
          pd.rebate_type as rebate_type,
          pd.rebate_calculation as rebate_calculation,
          pd.required_core_skus as required_core_skus,
          pd.points as points,
          p.program_header,
          seos.rebate_opportunity as earning_opportunity,
          p.start_date,
          p.end_date
        FROM
          public.program_compliances pc
        JOIN
          stores s ON pc.entity_id = s.id
        JOIN
          program_details pd ON pd.id = pc.program_detail_id
        JOIN
          programs p ON p.id = pd.program_id AND p.start_date <= Date('${currentDate}') AND p.end_date >= Date('${currentDate}')
          ${excludedProgramIds && excludedProgramIds.length > 0 ? `AND p.id NOT IN (:excludedProgramIds)` : ""}
          ${
            distributorId
              ? `AND EXISTS (
            SELECT 1
            FROM program_approvals pa
            WHERE pa.program_id = p.id
              AND pa.approver_id = :distributorId
              AND pa.approver_type = 'DISTRIBUTOR'
              AND pa.status = 'APPROVED'
              AND pa.deleted_at IS NULL
          )`
              : ""
          }
        JOIN
          manufacturers m ON p.manufacturer_id = m.id
        JOIN
          store_earning_opportunity_summary seos ON seos.store_id = s.id and seos.manufacturer_id = m.id and seos.program_detail_id = pd.id and seos.transaction_year = ${transactionYear}
          ${
            !manufacturerId && distributorId
              ? `
          JOIN
            public.authorized_distributor_manufacturers adm ON adm.manufacturer_id = m.id AND adm.distributor_id = ${distributorId}
          `
              : ""
          }
        WHERE
          pc.entity_id IN (:storeIds)
          AND pc.entity_type = 'STORE'
          AND pc.is_qualified != true
          AND p.participant_type = 'STORE'
          ${manufacturerId && !isNaN(manufacturerId) ? "AND m.id = " + manufacturerId : ""}
          ${searchQuery ? `AND (s.name ILIKE :searchPattern OR m.name ILIKE :searchPattern)` : ""}
        ORDER BY
          pc.entity_id, pd.program_id, pd.id, seos.total_purchase DESC, seos.rebate_opportunity DESC
      `;

          try {
            const replacements: any = { storeIds };
            if (excludedProgramIds && excludedProgramIds.length > 0) {
              replacements.excludedProgramIds = excludedProgramIds;
            }
            if (typeof distributorId === "number") {
              replacements.distributorId = distributorId;
            }
            if (searchQuery) {
              replacements.searchPattern = `%${searchQuery}%`;
            }

            const complianceData: any[] = await sequelize.query(query, {
              replacements,
              type: QueryTypes.SELECT
            });

            newrelic.addCustomAttribute(
              "getStoresNearComplianceData.store_count",
              storeIds.length
            );
            newrelic.addCustomAttribute(
              "getStoresNearComplianceData.result_count",
              complianceData.length
            );
            newrelic.addCustomAttribute(
              "getStoresNearComplianceData.manufacturer_id",
              manufacturerId || 0
            );

            return complianceData;
          } catch (sqlError) {
            console.error(
              "ProgramRepository.getStoresNearComplianceData SQL ERROR:",
              sqlError
            );
            return [];
          }
        } catch (error) {
          console.error(
            "ProgramRepository.getStoresNearComplianceData ERROR:",
            error
          );
          return [];
        }
      }
    );
  }

  // Helper method to run a diagnostic query to find any records close to the compliance range
  private async runDiagnosticQuery(storeIds: number[]) {
    try {
      const diagnosticQuery = `
        SELECT
          CASE
            WHEN pd.min_qty > 0 THEN
              LEAST((seos.total_purchase / pd.min_qty) * 100, 99)
            ELSE 0
          END AS compliance_percentage,
          COUNT(*) as record_count
        FROM
          public.store_earning_opportunity_summary seos
        JOIN
          program_details pd ON pd.id = seos.program_detail_id
        WHERE
          seos.store_id IN (:storeIds)
          AND seos.highest_tier = false
        GROUP BY
          CASE
            WHEN pd.min_qty > 0 THEN
              LEAST((seos.total_purchase / pd.min_qty) * 100, 99)
            ELSE 0
          END
        ORDER BY
          compliance_percentage
      `;

      const results = await sequelize.query(diagnosticQuery, {
        replacements: {
          storeIds: storeIds
        },
        type: QueryTypes.SELECT
      });

      console.log("Diagnostic results - Compliance percentages distribution:");
      console.log(JSON.stringify(results));
    } catch (error) {
      console.error("Error in diagnostic query:", error);
    }
  }

  private getDefaultFlatResponse(storeIds: number[]) {
    // Simple fallback response when no data is found - flat format matching StoreComplianceData
    return [
      {
        store_id: storeIds[0],
        store_name: "Store " + storeIds[0],
        manufacturer_id: 1,
        manufacturer_name: "Default Manufacturer",
        program_id: 1,
        program_name: "Program Near Compliance - Tier 1",
        compliance_percentage: 80,
        missing_products: []
      }
    ];
  }

  // Keep the original default response for backwards compatibility
  private getDefaultResponse(storeIds: number[]) {
    // Simple fallback response when no data is found
    return [
      {
        store_id: storeIds[0],
        store_name: "Store " + storeIds[0],
        programs: [
          {
            manufacturer_id: 1,
            manufacturer_name: "Default Manufacturer",
            program_id: 1,
            program_name: "Program Near Compliance - Tier 1",
            compliance_percentage: 80,
            missing_products: []
          }
        ]
      }
    ];
  }

  public async getAllManufacturerIds() {
    return Manufacturer.findAll({
      attributes: ["id"],
      where: {
        deleted_at: null
      }
    });
  }

  public async getParticipatedEntityWithManufacturerIds(
    entityId: number,
    entityType: string,
    manufacturerIds: number[]
  ) {
    try {
      const programParticipants = await ProgramParticipant.findAll({
        attributes: [
          "entityId",
          [Sequelize.col("Program.manufacturer_id"), "manufacturerId"]
        ],
        where: {
          entityId: entityId,
          entityType: entityType
        },
        include: [
          {
            model: Program,
            attributes: ["manufacturerId"],
            where: {
              manufacturer_id: {
                [Op.in]: manufacturerIds
              }
            }
          }
        ],
        raw: true
      });
      return programParticipants;
    } catch (error) {
      if (error instanceof Error) {
        throw ApiError.internal(`${error.message}`);
      } else {
        throw ApiError.internal("An unknown error occurred");
      }
    }
  }

  public async create(data: any, transaction?: Transaction) {
    return Program.create(data, { transaction });
  }

  public async findById(id: number) {
    return Program.findByPk(id);
  }

  public async update(id: number, data: any, transaction?: Transaction) {
    const program = await Program.findByPk(id);
    if (!program) {
      throw new Error("Program not found");
    }
    return program.update(data, { transaction });
  }

  /**
   * Fetch all unique product tags from program_details for given program IDs
   * @param programIds Array of program IDs
   * @param includeFixedRebateCategory Optional flag to include fixedRebateCategory column (default: false)
   * @returns Promise<string[]> Array of unique product tags
   */
  public async getUniqueProductTagsByProgramIds(
    programIds: number[],
    includeFixedRebateCategory: boolean = false
  ): Promise<string[]> {
    return this.getUniqueProductTags({
      programIds,
      includeFixedRebateCategory
    });
  }

  /**
   * Fetch all unique product tags from program_details for given program IDs or manufacturerId
   * @param programIds Optional array of program IDs
   * @param manufacturerId Optional manufacturer ID
   * @param includeFixedRebateCategory Optional flag to include fixedRebateCategory column (default: false)
   * @returns Promise<string[]> Array of unique product tags
   */
  public async getUniqueProductTags({
    programIds,
    manufacturerId,
    includeFixedRebateCategory = false
  }: {
    programIds?: number[];
    manufacturerId?: number;
    includeFixedRebateCategory?: boolean;
  }): Promise<string[]> {
    const allTags = new Set<string>();

    // Build attributes array conditionally
    const attributes = ["productsTags"];
    if (includeFixedRebateCategory) {
      attributes.push("fixedRebateCategory");
    }

    // By programIds
    if (programIds && programIds.length > 0) {
      const programDetails = await ProgramDetail.findAll({
        where: { programId: programIds },
        attributes,
        raw: true
      });
      for (const detail of programDetails) {
        const tagsString = (detail as { productsTags?: string }).productsTags;
        const tagSources = [tagsString];

        if (includeFixedRebateCategory) {
          const fixedRebateCategory = (
            detail as { fixedRebateCategory?: string }
          ).fixedRebateCategory;
          if (fixedRebateCategory) {
            tagSources.push(fixedRebateCategory);
          }
        }

        // Merge tags; add only unique, non-empty values
        for (const source of tagSources) {
          if (source) {
            for (const tag of source.split(",").map((t) => t.trim())) {
              if (tag) allTags.add(tag);
            }
          }
        }
      }
    }

    // By manufacturerId
    if (manufacturerId) {
      const programs = await Program.findAll({
        where: { manufacturerId },
        attributes: ["id"],
        raw: true
      });
      const ids = programs.map((p: any) => p.id);
      if (ids.length > 0) {
        const programDetails = await ProgramDetail.findAll({
          where: { programId: ids },
          attributes,
          raw: true
        });
        for (const detail of programDetails) {
          const tagsString = (detail as { productsTags?: string }).productsTags;
          const tagSources = [tagsString];

          if (includeFixedRebateCategory) {
            const fixedRebateCategory = (
              detail as { fixedRebateCategory?: string }
            ).fixedRebateCategory;
            if (fixedRebateCategory) {
              tagSources.push(fixedRebateCategory);
            }
          }

          // Merge tags; add only unique, non-empty values
          for (const source of tagSources) {
            if (source) {
              for (const tag of source.split(",").map((t) => t.trim())) {
                if (tag) allTags.add(tag);
              }
            }
          }
        }
      }
    }
    return Array.from(allTags);
  }
  /**
   * Counts SALES_REP programs per store using the spiff_program_eligible_store table.
   * This method provides accurate per-store program counts for SALES_REP participant type programs.
   *
   * @param {number[]} storeIds - Array of store IDs to count programs for
   * @param {number[]} authorizedManufacturerIds - Filter by authorized manufacturers
   * @param {number[]} excludedProgramDetailIds - Exclude certain program details
   * @param {string} [programTimeline] - Filter by program timeline
   * @param {boolean} [isInternalInitiative] - Filter by internal initiative
   * @returns {Promise<{storeId: number, programCount: number}[]>} - Array of store IDs and their program counts
   */
  public async getSpiffProgramCountByStoreIds({
    storeIds,
    authorizedManufacturerIds = [],
    excludedProgramDetailIds = [],
    programTimeline,
    isInternalInitiative
  }: {
    storeIds: number[];
    authorizedManufacturerIds?: number[];
    excludedProgramDetailIds?: number[];
    programTimeline?: string;
    isInternalInitiative?: boolean;
  }): Promise<{ storeId: number; programCount: number }[]> {
    return newrelic.startSegment(
      "ProgramRepository.getSpiffProgramCountByStoreIds",
      true,
      async () => {
        try {
          if (!storeIds.length) {
            return [];
          }

          const programTimelineFilter =
            Program.getProgramTimelineFilter(programTimeline);

          const authorizedPrograms =
            authorizedManufacturerIds.length > 0
              ? { manufacturerId: { [Op.in]: authorizedManufacturerIds } }
              : {};

          const programWhere: any = {};

          // Handle internal initiative filtering
          let internalInitiativeFilter = {};
          if (isInternalInitiative === false) {
            internalInitiativeFilter = {
              [Op.or]: [
                { internal_initiative: false },
                { internal_initiative: { [Op.is]: null } }
              ]
            };
          } else if (isInternalInitiative === true) {
            internalInitiativeFilter = {
              internal_initiative: true
            };
          }

          const results = await SpiffProgramEligibleStore.findAll({
            attributes: [
              [col("store_id"), "storeId"],
              [fn("COUNT", fn("DISTINCT", col("Program.id"))), "programCount"]
            ],
            include: [
              {
                model: Program,
                attributes: [],
                required: true,
                where: {
                  participant_type: ENTITY_TYPE.SALES_REP,
                  ...authorizedPrograms,
                  ...programWhere,
                  ...programTimelineFilter,
                  ...internalInitiativeFilter
                },
                include: [
                  {
                    model: ProgramDetail,
                    attributes: [],
                    required: true,
                    where: {
                      ...(excludedProgramDetailIds.length > 0
                        ? { id: { [Op.notIn]: excludedProgramDetailIds } }
                        : {})
                    }
                  }
                ]
              }
            ],
            where: {
              storeId: { [Op.in]: storeIds }
            },
            group: [col("store_id")],
            raw: true
          });

          return (results as any[]).map((result) => ({
            storeId: result.storeId,
            programCount: parseInt(result.programCount as string)
          }));
        } catch (error) {
          newrelic.noticeError(error as Error);
          console.error("Error in getSpiffProgramCountByStoreIds:", error);
          return [];
        }
      }
    );
  }

  /**
   * Optimized method to get stores near compliance data using materialized view
   *
   * This method provides a high-performance alternative to the complex getStoresNearComplianceData
   * by leveraging a pre-aggregated materialized view (sales_rep_compliance_optimized_mv) that
   * contains pre-calculated compliance metrics and store-program relationships.
   *
   * Key Benefits:
   * - Eliminates complex joins and aggregations at query time
   * - Pre-calculated compliance percentages and earning opportunities
   * - Optimized for sales rep specific data access patterns
   * - Significantly faster response times compared to real-time calculations
   *
   * @param salesRepId - The ID of the sales representative
   * @param manufacturerId - Optional manufacturer filter to limit results to specific manufacturer
   * @param searchQuery - Optional search term to filter by store name or manufacturer name
   * @param distributorId - Optional distributor filter for access control
   * @param excludedProgramIds - Array of program IDs to exclude from results
   * @returns Promise<any[]> - Array of compliance data objects with store, manufacturer, and program details
   *
   * @example
   * const complianceData = await getStoresNearComplianceOptimized(
   *   338,           // salesRepId
   *   46,            // manufacturerId (optional)
   *   "store",       // searchQuery (optional)
   *   298,           // distributorId (optional)
   *   [123, 456]     // excludedProgramIds (optional)
   * );
   */
  public async getStoresNearComplianceOptimized(
    salesRepId: number,
    manufacturerId?: number,
    searchQuery?: string,
    distributorId?: number,
    excludedProgramIds?: number[]
  ): Promise<any[]> {
    return newrelic.startSegment(
      "ProgramRepository.getStoresNearComplianceOptimized",
      true,
      async () => {
        try {
          // Build optimized query using aggregated view
          const query = `
            SELECT 
              store_id,
              store_name,
              manufacturer_id,
              manufacturer_name,
              manufacturer_logo,
              manufacturer_authorized,
              program_id,
              program_name,
              program_type,
              payment_term,
              tier,
              quantity_type,
              program_detail_id,
              overview,
              criteria,
              min_spend,
              min_qty,
              max_qty,
              products_tags,
              products_tags_qty,
              rebate_amount,
              rebate_percentage,
              rebate_type,
              rebate_calculation,
              required_core_skus,
              points,
              program_header,
              rebate_opportunity as earning_opportunity,
              start_date,
              end_date,
              total_purchase,
              is_qualified,
              entity_type,
              transaction_year,
              purchased_product_ids
            FROM sales_rep_compliance_optimized_mv
            WHERE sales_rep_id = :salesRepId
              ${manufacturerId && !isNaN(manufacturerId) ? "AND manufacturer_id = :manufacturerId" : ""}
              ${excludedProgramIds && excludedProgramIds.length > 0 ? "AND program_id NOT IN (:excludedProgramIds)" : ""}
              ${searchQuery ? "AND (store_name ILIKE :searchQuery OR manufacturer_name ILIKE :searchQuery)" : ""}
              ${distributorId ? "AND distributor_id = :distributorId" : ""}
            ORDER BY store_id, manufacturer_id, program_id, total_purchase DESC, rebate_opportunity DESC
          `;

          const complianceData: any[] = await sequelize.query(query, {
            replacements: {
              salesRepId,
              manufacturerId,
              excludedProgramIds,
              searchQuery: searchQuery ? `%${searchQuery}%` : undefined,
              distributorId
            },
            type: QueryTypes.SELECT
          });

          newrelic.addCustomAttribute(
            "getStoresNearComplianceOptimized.result_count",
            complianceData.length
          );

          return complianceData;
        } catch (error) {
          console.error("Error in getStoresNearComplianceOptimized:", error);
          throw error;
        }
      }
    );
  }

  /**
   * Get non-approved program IDs by distributor
   * @param manufacturerId - Manufacturer ID
   * @param distributorIds - Distributor IDs
   * @returns Promise<number[]> - Array of program IDs
   */
  public async getNonApprovedProgramIdsByDistributor({
    manufacturerId,
    distributorIds
  }: {
    manufacturerId: number;
    distributorIds: number[];
  }) {
    const programs = await Program.findAll({
      attributes: ["id"],
      where: {
        manufacturerId
      },
      include: [
        {
          model: ProgramApproval,
          as: "ProgramApproval",
          attributes: [],
          required: true,
          where: {
            approver_id: { [Op.in]: distributorIds },
            approver_type: ENTITY_TYPE.DISTRIBUTOR,
            status: { [Op.notIn]: [PROGRAM_APPROVAL_STATUS.APPROVED] },
            deleted_at: null
          }
        }
      ],
      raw: true
    });

    return programs.map((p) => p.id);
  }

  /**
   * Get programs for multiple manufacturers with approval filter in a single optimized query
   * This is an optimized version that avoids N+1 query problems
   *
   * Performance optimizations:
   * - Single query with IN clause instead of N+1 queries
   * - New Relic performance monitoring
   * - Optimized query structure with proper indexing hints
   * - Memory-efficient result processing
   * - Input validation and error handling
   *
   * Note: Caching is handled at the controller layer, not here
   *
   * @param manufacturerIds - Array of manufacturer IDs
   * @param distributorId - Distributor ID for approval filter
   * @param programTimeline - Optional program timeline filter
   * @param isInternalInitiative - Optional internal initiative filter
   * @returns Promise<number[]> - Array of program IDs
   */
  public async getProgramsByManufacturerIds({
    manufacturerIds,
    distributorId,
    programTimeline,
    isInternalInitiative
  }: {
    manufacturerIds: number[];
    distributorId: number;
    programTimeline?: string;
    isInternalInitiative?: boolean;
  }): Promise<number[]> {
    return newrelic.startSegment(
      "ProgramRepository.getProgramsByManufacturerIds",
      true,
      async () => {
        const startTime = process.hrtime();
        if (!Array.isArray(manufacturerIds) || manufacturerIds.length === 0)
          return [];
        if (!Number.isFinite(distributorId) || distributorId <= 0) return [];
        try {
          // Build base where
          const whereClause: any = {
            manufacturer_id: { [Op.in]: manufacturerIds },
            deleted_at: null,
            participant_type: ENTITY_TYPE.STORE, // Add filter for store programs only
            ...Program.getProgramTimelineFilter(programTimeline)
          };

          if (isInternalInitiative === true) {
            whereClause.internal_initiative = true;
          } else if (isInternalInitiative === false) {
            // Treat NULL as not-internal; keep OR to match current semantics
            whereClause[Op.or] = [
              { internal_initiative: false },
              { internal_initiative: { [Op.is]: null } }
            ];
          }
          // Use EXISTS via a literal condition to avoid duplicates and speed up
          const existsApproved = Sequelize.literal(`
              EXISTS (
                SELECT 1
                FROM program_approvals pa
                WHERE pa.program_id = "Program"."id"
                  AND pa.approver_id = ${sequelize.escape(distributorId)}
                  AND pa.approver_type = '${ENTITY_TYPE.DISTRIBUTOR}'
                  AND pa.status = ${sequelize.escape(PROGRAM_APPROVAL_STATUS.APPROVED)}
                  AND pa.deleted_at IS NULL
              )
            `);
          const programs = await Program.findAll({
            attributes: [
              [Sequelize.fn("DISTINCT", Sequelize.col("Program.id")), "id"]
            ],
            where: { ...whereClause, [Op.and]: existsApproved },
            // No include needed; EXISTS handles the approval requirement
            raw: true,
            logging: false, // keep prod quiet; add your own slow-query logger if needed
            benchmark: false // turn on only during tuning
            // order: [['id', 'ASC']], // add only if callers need deterministic order
          });
          const result = programs.map((p: any) => p.id);
          const [s, ns] = process.hrtime(startTime);
          newrelic.addCustomAttribute(
            "getProgramsByManufacturerIds.duration_ms",
            s * 1000 + ns / 1e6
          );
          newrelic.addCustomAttribute(
            "getProgramsByManufacturerIds.manufacturer_count",
            manufacturerIds.length
          );
          newrelic.addCustomAttribute(
            "getProgramsByManufacturerIds.result_count",
            result.length
          );
          return result;
        } catch (error) {
          console.error(
            "Error fetching programs for multiple manufacturers:",
            error
          );
          newrelic.addCustomAttribute(
            "getProgramsByManufacturerIds.error",
            true
          );
          return [];
        }
      }
    );
  }

  /**
   * Get visibility scope conditions for program filtering
   * @param salesRepId - Sales rep ID for visibility check
   * @param role - User role (DISTRIBUTOR_SALES_MANAGER or regular sales rep)
   * @param participantType - Participant type for the query
   * @returns Promise<{visibilityScopeConditions: any, programVisibilityInclude: Includeable[]}>
   */
  private async getVisibilityScopeConditions(
    salesRepId: number | undefined,
    role: string,
    participantType: string | undefined
  ): Promise<{
    visibilityScopeConditions: any;
    programVisibilityInclude: Includeable[];
  }> {
    let visibilityScopeConditions: any = {};
    let programVisibilityInclude: Includeable[] = [];

    // Apply visibility scope filtering only when salesRepId is provided
    console.log(
      `[DEBUG] Repository: getVisibilityScopeConditions called with salesRepId: ${salesRepId}, role: ${role}, participantType: ${participantType}`
    );

    if (!salesRepId) {
      console.log(
        `[DEBUG] Repository: No salesRepId provided, returning empty visibility conditions`
      );
      return { visibilityScopeConditions, programVisibilityInclude };
    }

    // Determine the entity IDs to check for visibility
    let entityIds: number[];
    if (role === ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER) {
      // For DISTRIBUTOR_SALES_MANAGER, get their assigned sales reps
      const managerSalesRepIds =
        await DistributorRepository.getSalesRepIdsBySalesRepManagerId({
          salesRepManagerId: salesRepId
        });
      entityIds = managerSalesRepIds;
    } else {
      // For regular sales reps, use the sales rep ID directly
      entityIds = [salesRepId];
    }

    // Build the common visibility scope conditions
    let entityIdCondition =
      entityIds.length === 1
        ? `pv.entity_id = ${entityIds[0]}`
        : `pv.entity_id = ANY(ARRAY[${entityIds.join(",")}])`;

    let speicificVisibilityScope = VISIBILITY_SCOPE.SPECIFIC_SALES_REPS;
    let allVisibilityScope = VISIBILITY_SCOPE.ALL_SALES_REPS;
    let visibilityParticipantType = participantType || ENTITY_TYPE.SALES_REP;

    // Switch case to determine the visibility scope based on the role
    switch (participantType) {
      case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER:
        speicificVisibilityScope =
          VISIBILITY_SCOPE.SPECIFIC_DISTRIBUTOR_SALES_MANAGER;
        allVisibilityScope = VISIBILITY_SCOPE.ALL_DISTRIBUTOR_SALES_MANAGER;
        visibilityParticipantType = ENTITY_TYPE.SALES_MANAGER;
        entityIdCondition = `pv.entity_id = ${salesRepId}`;
        break;
      default:
        speicificVisibilityScope = VISIBILITY_SCOPE.SPECIFIC_SALES_REPS;
        allVisibilityScope = VISIBILITY_SCOPE.ALL_SALES_REPS;
        break;
    }

    visibilityScopeConditions = {
      [Op.and]: [
        {
          [Op.or]: [
            // ALL_SALES_REPS scope - no additional visibility check needed
            { visibility_scope: allVisibilityScope },
            // SPECIFIC_SALES_REPS scope - requires ProgramVisibility entry
            {
              [Op.and]: [
                {
                  visibility_scope: speicificVisibilityScope
                },
                // Use EXISTS subquery to check visibility
                literal(`EXISTS (
                  SELECT 1 FROM program_visibility pv 
                  WHERE pv.program_id = "Program"."id" 
                  AND pv.entity_type = '${visibilityParticipantType}' 
                  AND ${entityIdCondition}
                  AND pv.deleted_at IS NULL
                )`)
              ]
            }
          ]
        }
      ]
    };

    // No need for ProgramVisibility join since we handle it in WHERE clause
    programVisibilityInclude = [];

    return { visibilityScopeConditions, programVisibilityInclude };
  }

  /**
   * Get SPIFF programs with earnings optimized for v2 API
   * Single query approach replacing 6-7 separate queries
   * @param params - Parameters for SPIFF program retrieval
   * @returns Promise<any[]> - Optimized SPIFF programs data
   */
  public async getSpiffProgramsWithEarningsOptimized({
    distributorId,
    salesRepId,
    programTimeline,
    getInternalInitiative,
    excludeChainStores,
    participantType,
    role,
    warehouseId
  }: {
    distributorId: number;
    salesRepId?: number;
    programTimeline?: string;
    getInternalInitiative?: boolean;
    excludeChainStores?: boolean;
    participantType?: string;
    role?: string;
    warehouseId?: number;
  }): Promise<any[]> {
    return newrelic.startSegment(
      "ProgramRepository.getSpiffProgramsWithEarningsOptimized",
      true,
      async () => {
        try {
          // Get user role
          const user = getCurrentUser();
          // Get the program compliance earning column based on the role
          const earningColumn = getProgramComplianceEarningColumn(user?.role);

          // Build internal initiative filter for Sequelize
          let internalInitiativeConditions: any = {};
          if (getInternalInitiative !== undefined) {
            if (getInternalInitiative) {
              internalInitiativeConditions = {
                internal_initiative: true
              };
            } else {
              internalInitiativeConditions = {
                [Op.or]: [
                  { internal_initiative: false },
                  { internal_initiative: { [Op.is]: null } }
                ]
              };
            }
          }

          // Step 1: Get authorized manufacturers for the distributor
          const authorizedManufacturers =
            await AuthorizedManufacturerDistributor.findAll({
              attributes: ["manufacturerId"],
              where: {
                distributorId,
                deletedAt: null
              },
              raw: true
            });

          const manufacturerIds = authorizedManufacturers.map(
            (am) => am.manufacturerId
          );

          if (manufacturerIds.length === 0) {
            return [];
          }

          // Step 2: Get visibility scope conditions using the extracted method
          const { visibilityScopeConditions, programVisibilityInclude } =
            await this.getVisibilityScopeConditions(
              salesRepId,
              role || ENTITY_TYPE.DISTRIBUTOR_ADMIN,
              participantType
            );

          // Step 3: Build complete where clause
          const completeWhereClause = {
            participantType: participantType || ENTITY_TYPE.SALES_REP,
            manufacturerId: { [Op.in]: manufacturerIds },
            deletedAt: null,
            ...Program.getProgramTimelineFilter(programTimeline),
            ...internalInitiativeConditions,
            ...visibilityScopeConditions
          };

          const programs = await Program.findAll({
            attributes: [
              "id",
              "name",
              "programType",
              "programHeader",
              "paymentTerm",
              "startDate",
              "endDate",
              "manufacturerId",
              "visibility_scope",
              "internal_initiative"
            ],
            include: [
              {
                model: Manufacturer,
                attributes: ["name", "logo", "authorized"]
              },
              {
                model: ProgramDetail,
                as: "ProgramDetails",
                attributes: [
                  "id",
                  "tier",
                  "minQty",
                  "maxQty",
                  "rebateAmount",
                  "rebatePercentage",
                  "rebateType",
                  "rebateCalculation",
                  "overview",
                  "programLine",
                  "criteria",
                  "productsTags"
                ],
                where: {
                  deletedAt: null
                },
                required: true
              },
              {
                model: ProgramApproval,
                as: "ProgramApproval",
                attributes: [],
                where: {
                  approver_id: distributorId,
                  approver_type: ENTITY_TYPE.DISTRIBUTOR,
                  status: PROGRAM_APPROVAL_STATUS.APPROVED,
                  deleted_at: null
                },
                required: true
              },
              ...programVisibilityInclude
            ],
            where: completeWhereClause,
            order: [
              ["manufacturerId", "ASC"],
              ["id", "ASC"]
            ]
          });

          // Step 4: Get earnings data using program_compliances table
          const programIds = programs.map((p) => p.id);

          // Get Sales Rep Entity IDs based on role
          let entityIds = [];

          // Switch case to determine which sales reps to include based on role
          switch (role) {
            case ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER: {
              // For DISTRIBUTOR_SALES_MANAGER, get only their assigned sales reps
              // Note: salesRepId parameter contains the manager's associatedUserId
              const managerSalesRepIds =
                await DistributorRepository.getSalesRepIdsBySalesRepManagerId({
                  salesRepManagerId: salesRepId // This is the manager's associatedUserId
                });
              entityIds = managerSalesRepIds;
              break;
            }
            case ENTITY_TYPE.DISTRIBUTOR_SALES_REP: {
              // For regular sales reps, only include their own earnings
              entityIds = [salesRepId];
              break;
            }
            case ENTITY_TYPE.DISTRIBUTOR_ADMIN:
            case ENTITY_TYPE.DISTRIBUTOR_EXECUTIVE:
            default: {
              // For DISTRIBUTOR_ADMIN/EXECUTIVE, get all sales reps under the distributor
              // If warehouseId is provided, filter by warehouse
              if (warehouseId) {
                // Filter sales reps by warehouse using existing method
                const salesRepsByWarehouse =
                  await DistributorRepository.getSalesRepsByWarehouseId(
                    distributorId,
                    warehouseId
                  );
                entityIds = salesRepsByWarehouse;
              } else {
                // Get all sales reps (current behavior)
                const salesRepEntityIds = await UserRole.findAll({
                  attributes: ["associatedUserId"],
                  where: {
                    parentEntityId: distributorId,
                    parentEntityType: ENTITY_TYPE.DISTRIBUTOR,
                    role: "DISTRIBUTOR_SALES_REP"
                  },
                  raw: true
                });
                entityIds = salesRepEntityIds.map(
                  (ur: any) => ur.associatedUserId
                );
              }
              break;
            }
          }

          // Get earnings data
          const earnings = await ProgramCompliance.findAll({
            attributes: [
              [col("ProgramCompliance.program_id"), "program_id"],
              [col("Program.manufacturer_id"), "manufacturer_id"],
              [
                // fn(
                //   "SUM",
                //   literal(`CASE
                //     WHEN '${role}' = '${ENTITY_TYPE.DISTRIBUTOR_SALES_REP}'
                //     THEN "ProgramCompliance"."earned_rebate"
                //     ELSE "ProgramCompliance"."unadjusted_earned_rebate"
                //     END`)
                // ),
                fn("SUM", col(`ProgramCompliance.${earningColumn}`)),
                "total_earning"
              ],
              [
                fn("SUM", col("ProgramCompliance.earned_rebate")),
                "total_purchase_volume"
              ],
              [
                fn("COUNT", fn("DISTINCT", col("ProgramCompliance.entity_id"))),
                "enrolled_stores_count"
              ]
            ],
            include: [
              {
                model: Program,
                attributes: [],
                where: {
                  manufacturerId: { [Op.in]: manufacturerIds },
                  participantType: participantType || ENTITY_TYPE.SALES_REP,
                  id: { [Op.in]: programIds },
                  deletedAt: null
                }
              }
            ],
            where: {
              entityId: { [Op.in]: entityIds },
              entityType: ENTITY_TYPE.SALES_REP, // Always use SALES_REP for earnings calculation
              status: ProgramsComplianceStatus.Active,
              isQualified: true,
              deletedAt: null
            },
            group: [
              col("ProgramCompliance.program_id"),
              col("Program.manufacturer_id")
            ],
            raw: true
          });

          // Debug: Let's check the total earnings calculation
          const totalEarnings = earnings.reduce(
            (sum, e: any) => sum + parseFloat(e.total_earning || 0),
            0
          );

          // Debug: Let's see what programs are being found
          const earningsProgramIds = earnings.map((e: any) => e.program_id);

          // Step 5: Transform to flat structure for compatibility
          const results: any[] = [];
          // Safety check: ensure programs is an array before iterating
          if (!Array.isArray(programs)) {
            return results;
          }

          for (const program of programs) {
            // Safety check: ensure ProgramDetails exists and is an array
            if (
              program.ProgramDetails &&
              Array.isArray(program.ProgramDetails)
            ) {
              // Get earnings data once per program (not per detail)
              const earning = earnings.find(
                (e: any) =>
                  e.program_id === program.id &&
                  e.manufacturer_id === program.manufacturerId
              );

              for (const detail of program.ProgramDetails) {
                let newDetailOverview = "";

                // If the participant type is a sales rep, override the detail overview
                if (participantType === ENTITY_TYPE.SALES_REP) {
                  try {
                    const adjustedDetail =
                      (await overrideProgramDetailOverviewText({
                        rebateType: detail.rebateType,
                        criteria: detail.criteria,
                        rebateAmount: Number(detail.rebateAmount),
                        rebatePercentage: Number(detail.rebatePercentage),
                        distributorId: distributorId,
                        overview: detail.overview
                      })) || detail.overview;
                    newDetailOverview =
                      adjustedDetail?.newOverview || detail.overview;
                    detail.rebateAmount = Number(
                      Number(adjustedDetail?.newAmount).toFixed(2) ||
                        detail.rebateAmount
                    );
                  } catch (error) {
                    newDetailOverview = detail.overview;
                  }
                }

                results.push({
                  program_id: program.id,
                  program_name: program.name,
                  program_type: program.programType,
                  program_header: program.programHeader,
                  payment_term: program.paymentTerm,
                  start_date: program.startDate,
                  end_date: program.endDate,
                  manufacturer_id: program.manufacturerId,
                  manufacturer_name: (program as any).Manufacturer?.name,
                  manufacturer_logo: (program as any).Manufacturer?.logo,
                  manufacturer_authorized: (program as any).Manufacturer
                    ?.authorized,
                  program_detail_id: detail.id,
                  tier: detail.tier,
                  min_qty: detail.minQty,
                  max_qty: detail.maxQty,
                  rebate_amount: detail.rebateAmount,
                  rebate_percentage: detail.rebatePercentage,
                  rebate_type: detail.rebateType,
                  rebate_calculation: detail.rebateCalculation,
                  overview: newDetailOverview || detail.overview,
                  program_line: detail.programLine,
                  criteria: detail.criteria,
                  products_tags: detail.productsTags,
                  // Only include earnings data for the first detail of each program
                  // to avoid duplication in the service layer
                  total_earning:
                    detail === program.ProgramDetails?.[0] && earning
                      ? parseFloat((earning as any).total_earning as string)
                      : 0,
                  total_purchase_volume:
                    detail === program.ProgramDetails?.[0] && earning
                      ? parseFloat(
                          (earning as any).total_purchase_volume as string
                        )
                      : 0
                });
              }
            }
          }

          newrelic.addCustomAttribute(
            "getSpiffProgramsWithEarningsOptimized.result_count",
            results.length
          );

          return results;
        } catch (error) {
          console.error(
            "Error in getSpiffProgramsWithEarningsOptimized:",
            error
          );
          throw error;
        }
      }
    );
  }

  /**
   * Get SPIFF program details with earnings using optimized database-level JSON aggregation
   * This method uses a single SQL query with JSON aggregation to group data at the database level
   * @param params - Parameters for fetching SPIFF program details
   * @returns Promise<any[]> - Array of SPIFF program details with earnings grouped by manufacturer
   */
  public async getSpiffProgramDetailsWithEarnings({
    distributorId,
    salesRepId,
    manufacturerId,
    programTimeline,
    getInternalInitiative,
    excludeChainStores,
    role,
    warehouseId
  }: {
    distributorId: number;
    salesRepId?: number;
    manufacturerId: number;
    programTimeline?: string;
    getInternalInitiative?: boolean;
    excludeChainStores?: boolean;
    role?: string;
    warehouseId?: number;
  }): Promise<any[]> {
    return newrelic.startSegment(
      "ProgramRepository.getSpiffProgramDetailsWithEarnings",
      true,
      async () => {
        try {
          console.log("programTimeline =>", programTimeline);
          console.log(
            `[DEBUG] Starting optimized SPIFF program details query for distributor: ${distributorId}, manufacturer: ${manufacturerId}`
          );

          // Single optimized query with database-level JSON aggregation
          // Build timeline filter - match exact conditions from Program.getProgramTimelineFilter
          let timelineFilter = "";
          if (programTimeline) {
            const now = new Date().toISOString().split("T")[0];
            console.log(
              "[DEBUG] Repository: Building timeline filter for:",
              programTimeline,
              "current date:",
              now
            );
            switch (programTimeline.toLowerCase()) {
              case "current":
                // Working: endDate >= nowDate AND startDate <= nowDate (date-only comparison)
                timelineFilter = `AND DATE(p.end_date) >= DATE('${now}') AND DATE(p.start_date) <= DATE('${now}')`;
                break;
              case "upcoming":
                // Working: startDate >= nowDate AND startDate <= nowDate + 30 days (date-only comparison)
                // PostgreSQL syntax: DATE('${now}') + INTERVAL '30 days'
                timelineFilter = `AND DATE(p.start_date) >= DATE('${now}') AND DATE(p.start_date) <= DATE('${now}') + INTERVAL '30 days'`;
                break;
              case "historical":
                // Working: endDate < nowDate (date-only comparison)
                timelineFilter = `AND DATE(p.end_date) < DATE('${now}')`;
                break;
            }
          }

          // Build internal initiative filter
          let internalInitiativeFilter = "";
          if (getInternalInitiative !== undefined) {
            if (getInternalInitiative) {
              internalInitiativeFilter = "AND p.internal_initiative = true";
            } else {
              internalInitiativeFilter =
                "AND (p.internal_initiative = false OR p.internal_initiative IS NULL)";
            }
          }

          // Build visibility scope filter and join - use same logic as listings API
          let visibilityScopeFilter = "";
          if (salesRepId) {
            console.log(
              `[DEBUG] Repository: Applying visibility scope filtering for salesRepId: ${salesRepId}`
            );

            // Use the same visibility scope logic as listings API
            const { visibilityScopeConditions } =
              await this.getVisibilityScopeConditions(
                salesRepId,
                role || ENTITY_TYPE.DISTRIBUTOR_ADMIN,
                ENTITY_TYPE.SALES_REP
              );

            if (
              visibilityScopeConditions &&
              Object.keys(visibilityScopeConditions).length > 0
            ) {
              // Convert Sequelize conditions to SQL string
              if (visibilityScopeConditions.visibility_scope) {
                const scope = visibilityScopeConditions.visibility_scope;
                if (scope[Op.or]) {
                  const conditions = scope[Op.or]
                    .map((condition: any) => {
                      if (
                        condition.visibility_scope ===
                        VISIBILITY_SCOPE.ALL_SALES_REPS
                      ) {
                        return `p.visibility_scope = '${VISIBILITY_SCOPE.ALL_SALES_REPS}'`;
                      } else if (
                        condition.visibility_scope ===
                          VISIBILITY_SCOPE.SPECIFIC_SALES_REPS &&
                        condition["$ProgramVisibility.entity_id$"]
                      ) {
                        const entityIds =
                          condition["$ProgramVisibility.entity_id$"][Op.in];
                        const entityIdCondition =
                          entityIds.length === 1
                            ? `pv.entity_id = ${entityIds[0]}`
                            : `pv.entity_id = ANY(ARRAY[${entityIds.join(",")}])`;
                        return `(p.visibility_scope = '${VISIBILITY_SCOPE.SPECIFIC_SALES_REPS}' AND EXISTS (SELECT 1 FROM program_visibility pv WHERE pv.program_id = p.id AND pv.entity_type = '${ENTITY_TYPE.SALES_REP}' AND ${entityIdCondition} AND pv.deleted_at IS NULL))`;
                      }
                      return "";
                    })
                    .filter(Boolean);

                  if (conditions.length > 0) {
                    visibilityScopeFilter = `AND (${conditions.join(" OR ")})`;
                  }
                }
              }
            }
          } else {
            console.log(
              "[DEBUG] Repository: No salesRepId provided, skipping visibility scope filtering"
            );
          }

          // Build entity ID filter for program_earnings subquery - use role-based logic
          let entityIdFilter = "";
          console.log(
            `[DEBUG] Repository: Building entityIdFilter for role: ${role}, salesRepId: ${salesRepId}`
          );

          if (role === ENTITY_TYPE.DISTRIBUTOR_SALES_REP) {
            // For regular sales reps, only include their own earnings
            console.log(
              `[DEBUG] Repository: Using specific salesRepId for DISTRIBUTOR_SALES_REP: ${salesRepId}`
            );
            entityIdFilter = `pc.entity_id = :salesRepId`;
          } else if (role === ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER) {
            // For DISTRIBUTOR_SALES_MANAGER, get only their assigned sales reps
            console.log(
              `[DEBUG] Repository: Using assigned sales reps for DISTRIBUTOR_SALES_MANAGER: ${salesRepId}`
            );
            entityIdFilter = `pc.entity_id IN (
              SELECT msrm.sales_rep_id 
              FROM manager_sales_rep_mapping msrm 
              WHERE msrm.sales_manager_id = :salesRepId              
			        AND msrm.deleted_at IS NULL
              AND (msrm.assignment_type = 'PRIMARY' OR msrm.assignment_type = 'SECONDARY' OR msrm.assignment_type IS NULL)
            )`;
          } else {
            // For DISTRIBUTOR_ADMIN/EXECUTIVE, get all sales reps under the distributor
            // If warehouseId is provided, filter by warehouse
            if (warehouseId) {
              console.log(
                `[DEBUG] Repository: Using sales reps from warehouse ${warehouseId} for ${role}`
              );
              entityIdFilter = `pc.entity_id IN (
                SELECT ur.associated_user_id
                FROM user_roles ur
                JOIN distributors d ON ur.associated_user_id = d.id
                WHERE ur.parent_entity_id = :distributorId
                AND ur.role = '${ENTITY_TYPE.DISTRIBUTOR_SALES_REP}'
                AND d.primary_warehouse_id = :warehouseId
              )`;
            } else {
              console.log(
                `[DEBUG] Repository: Using all sales reps under distributor for ${role}`
              );
              entityIdFilter = `pc.entity_id IN (
                SELECT ur.associated_user_id
                FROM user_roles ur
                WHERE ur.parent_entity_id = :distributorId
                AND ur.role = '${ENTITY_TYPE.DISTRIBUTOR_SALES_REP}'
              )`;
            }
          }

          // Get user role
          const user = getCurrentUser();
          // Get the program compliance earning column based on the role
          const earningColumn = getProgramComplianceEarningColumn(user?.role);

          const query = `
          SELECT 
            manufacturer_id,
            manufacturer_name,
            manufacturer_logo,
            manufacturer_authorized,
            SUM(total_purchase_volume) as total_purchase_volume,
            SUM(total_earning) as total_saving,
            MAX(program_payment_term) as program_payment_term,
            JSON_AGG(
              JSON_BUILD_OBJECT(
                'id', program_id,
                'name', program_name,
                'programType', program_type,
                'programTerms', program_payment_term,
                'programHeader', program_header,
                'totalEarning', total_earning,
                'totalPurchaseVolume', total_purchase_volume,
                'enrolledStoresCount', enrolled_stores_count,
                'compliances', JSON_BUILD_ARRAY(JSON_BUILD_OBJECT('entityId', 1)),
                'programEntityType', '${ENTITY_TYPE.SALES_REP}',
                'programDetails', program_details_agg,
                'startDate', start_date,
                'endDate', end_date
              )
            ) as program_overview
          FROM (
            SELECT DISTINCT ON (p.id)
              p.id as program_id,
              p.name as program_name,
              p.program_type,
              p.program_header,
              p.payment_term as program_payment_term,
              p.start_date,
              p.end_date,
              p.manufacturer_id,
              m.name as manufacturer_name,
              m.logo as manufacturer_logo,
              m.authorized as manufacturer_authorized,
              COALESCE(program_earnings.total_earning, 0) as total_earning,
              COALESCE(program_earnings.total_purchase_volume, 0) as total_purchase_volume,
              COALESCE(program_earnings.enrolled_stores_count, 0) as enrolled_stores_count,
              COALESCE(
                JSON_AGG(
                  JSON_BUILD_OBJECT(
                    'id', pd.id,
                    'tier', pd.tier,
                    'min_qty', pd.min_qty,
                    'max_qty', pd.max_qty,
                    'rebate_amount', pd.rebate_amount,
                    'rebateAmount', pd.rebate_amount,
                    'rebate_percentage', pd.rebate_percentage,
                    'rebate_type', pd.rebate_type,
                    'rebateType', pd.rebate_type,
                    'rebate_calculation', pd.rebate_calculation,
                    'rebateCalculationType', null,
                    'program_id', p.id,
                    'rebateCalculation', pd.rebate_calculation,
                    'quantityType', null,
                    'productsTags', pd.products_tags,
                    'fixed_rebate_amount', null,
                    'fixedRebateAmount', null,
                    'fixed_rebate_category', null,
                    'overview', pd.overview,
                    'programLine', pd.program_line,
                    'criteria', pd.criteria
                  )
                ) FILTER (WHERE pd.id IS NOT NULL),
                '[]'::json
              ) as program_details_agg
            FROM programs p
            JOIN manufacturers m ON p.manufacturer_id = m.id
            JOIN program_approvals pa ON p.id = pa.program_id
            JOIN authorized_distributor_manufacturers adm ON p.manufacturer_id = adm.manufacturer_id
            LEFT JOIN (
              SELECT 
                pc.program_id,
                SUM(pc.${earningColumn}) as total_earning,
                SUM(pc.earned_rebate) as total_purchase_volume,
                COUNT(DISTINCT pc.entity_id) as enrolled_stores_count
              FROM program_compliances pc
              JOIN programs prog ON pc.program_id = prog.id
              WHERE ${entityIdFilter}
                AND pc.entity_type = '${ENTITY_TYPE.SALES_REP}'
                AND pc.status = '${ProgramsComplianceStatus.Active}'
                AND prog.manufacturer_id = :manufacturerId
                AND prog.participant_type = '${ENTITY_TYPE.SALES_REP}'
                ${timelineFilter.replace(/p\./g, "prog.")}
                ${internalInitiativeFilter.replace(/p\./g, "prog.")}
                ${visibilityScopeFilter.replace(/p\./g, "prog.")}
              GROUP BY pc.program_id
            ) program_earnings ON p.id = program_earnings.program_id
            LEFT JOIN program_details pd ON p.id = pd.program_id AND pd.deleted_at IS NULL
            WHERE p.participant_type = '${ENTITY_TYPE.SALES_REP}'
              AND p.manufacturer_id = :manufacturerId
              AND pa.approver_id = :distributorId
              AND pa.approver_type = '${ENTITY_TYPE.DISTRIBUTOR}'
              AND pa.status = '${PROGRAM_APPROVAL_STATUS.APPROVED}'
              AND pa.deleted_at IS NULL
              AND p.deleted_at IS NULL
              AND adm.distributor_id = :distributorId
              AND adm.deleted_at IS NULL
              ${timelineFilter}
              ${internalInitiativeFilter}
              ${visibilityScopeFilter}
            GROUP BY p.id, p.name, p.program_type, p.program_header, p.payment_term, 
                    p.start_date, p.end_date, p.manufacturer_id, m.name, m.logo, m.authorized,
                    program_earnings.total_earning, program_earnings.total_purchase_volume, 
                    program_earnings.enrolled_stores_count
            ORDER BY p.id
          ) unique_programs
          GROUP BY manufacturer_id, manufacturer_name, manufacturer_logo, manufacturer_authorized
          ORDER BY manufacturer_id
        `;

          const result = await sequelize.query(query, {
            replacements: {
              distributorId,
              manufacturerId,
              salesRepId,
              role,
              warehouseId
            },
            type: QueryTypes.SELECT
          });

          console.log(
            `[DEBUG] Database aggregation returned ${result.length} manufacturer records`
          );

          // Debug: Log the actual earnings data
          if (result.length > 0) {
            const firstResult = result[0] as any;
            console.log(
              `[DEBUG] Earnings data for manufacturer ${firstResult.manufacturer_id}:`,
              {
                total_saving: firstResult.total_saving,
                program_overview: firstResult.program_overview?.map(
                  (p: any) => ({
                    id: p.id,
                    name: p.name,
                    totalEarning: p.totalEarning
                  })
                )
              }
            );
          }

          return result;
        } catch (error: any) {
          console.error("Error in getSpiffProgramDetailsWithEarnings:", error);

          // Add error attributes for monitoring
          newrelic.addCustomAttribute("spiff_v2_repo_error", error.message);
          newrelic.addCustomAttribute("spiff_v2_distributorId", distributorId);
          newrelic.addCustomAttribute(
            "spiff_v2_manufacturerId",
            manufacturerId
          );
          newrelic.noticeError(error);

          throw error;
        }
      }
    );
  }

  /**
   * Get distributor program aggregations for faster performance
   *
   * This method retrieves pre-aggregated data from the distributor_program_aggregations table
   * including total sales volume and store earnings for each program.
   *
   * @param distributorId - The ID of the distributor
   * @param programIds - Array of program IDs to filter by
   * @param participantType - The participant type (e.g., 'chain', 'store', 'distributor')
   * @param excludeChainStores - If true, only include regular stores; if false, include both stores and chain stores (default: false)
   * @param warehouseIds - Optional array of warehouse IDs to filter by. When provided, filters by matching warehouse_id. When undefined/empty, filters by NULL warehouse_id (all warehouses)
   * @returns A Map with programId as key and aggregation data as value
   */
  public async getDistributorProgramAggregations(
    distributorId: number,
    programIds: number[],
    participantType: string,
    excludeChainStores: boolean = false,
    warehouseIds?: number[]
  ): Promise<Map<number, any>> {
    return await newrelic.startSegment(
      "getDistributorProgramAggregations",
      true,
      async () => {
        try {
          if (!programIds || programIds.length === 0) {
            return new Map();
          }

          // Build attribute expressions based on excludeChainStores parameter
          const salesVolumeExpr = excludeChainStores
            ? col("stores_sales_volume")
            : literal("stores_sales_volume + chains_stores_sales_volume");

          const earningsExpr = excludeChainStores
            ? col("stores_earnings")
            : literal("stores_earnings + chains_stores_earnings");

          const enrolledExpr = excludeChainStores
            ? col("stores_enrolled")
            : literal("stores_enrolled + chains_stores_enrolled");

          const totalStoresExpr = excludeChainStores
            ? col("total_stores")
            : literal("total_stores + total_chain_stores");

          const compliantExpr = excludeChainStores
            ? col("stores_compliant")
            : literal("stores_compliant + chains_stores_compliant");

          // Build warehouse filter condition and enrolled expression
          const warehouseFilter: any = {};
          let enrolledExprFinal: any;
          let salesVolumeExprFinal: any;

          // Build sales volume column expression
          const salesVolumeColumn = excludeChainStores
            ? "stores_sales_volume"
            : "(stores_sales_volume + chains_stores_sales_volume)";

          if (warehouseIds && warehouseIds.length > 0) {
            // Filter by specific warehouse IDs
            warehouseFilter.warehouseId = {
              [Op.in]: warehouseIds
            };
            // When filtering by specific warehouses, use MAX for enrolled (to get max per warehouse)
            enrolledExprFinal = fn("MAX", enrolledExpr);
            // For sales volume: SUM(MAX(sales_volume) per warehouse) for selected warehouses
            // Ensure warehouseIds are numbers and join safely
            const warehouseIdsStr = warehouseIds
              .map((id) => Number(id))
              .join(", ");
            salesVolumeExprFinal = literal(`(
              SELECT COALESCE(SUM(max_sales_volume), 0)
              FROM (
                SELECT warehouse_id, MAX(${salesVolumeColumn}) as max_sales_volume
                FROM distributor_program_aggregations dpa_inner
                WHERE dpa_inner.distributor_id = ${distributorId}
                  AND dpa_inner.program_id = "DistributorProgramAggregation"."program_id"
                  AND dpa_inner.participant_type = '${participantType}'
                  AND dpa_inner.warehouse_id IN (${warehouseIdsStr})
                  AND dpa_inner.deleted_at IS NULL
                GROUP BY dpa_inner.warehouse_id
              ) warehouse_maxes
            )`);
          } else {
            // When no warehouse filter: query non-NULL warehouse_id rows
            // For storesEnrolled, we need: SUM(MAX(stores_enrolled) per warehouse)
            warehouseFilter.warehouseId = {
              [Op.ne]: null
            };
            // Use a correlated subquery to calculate: SUM(MAX(stores_enrolled) per warehouse)
            // This ensures we get the max enrolled stores per warehouse, then sum those max values
            const enrolledColumn = excludeChainStores
              ? "stores_enrolled"
              : "(stores_enrolled + chains_stores_enrolled)";
            // Use a correlated subquery that references the outer query's program_id
            // Sequelize generates the outer query with alias "DistributorProgramAggregation", so we reference it directly
            enrolledExprFinal = literal(`(
              SELECT COALESCE(SUM(max_enrolled), 0)
              FROM (
                SELECT warehouse_id, MAX(${enrolledColumn}) as max_enrolled
                FROM distributor_program_aggregations dpa_inner
                WHERE dpa_inner.distributor_id = ${distributorId}
                  AND dpa_inner.program_id = "DistributorProgramAggregation"."program_id"
                  AND dpa_inner.participant_type = '${participantType}'
                  AND dpa_inner.warehouse_id IS NOT NULL
                  AND dpa_inner.deleted_at IS NULL
                GROUP BY dpa_inner.warehouse_id
              ) warehouse_maxes
            )`);
            // For sales volume: SUM(MAX(sales_volume) per warehouse) for all warehouses
            salesVolumeExprFinal = literal(`(
              SELECT COALESCE(SUM(max_sales_volume), 0)
              FROM (
                SELECT warehouse_id, MAX(${salesVolumeColumn}) as max_sales_volume
                FROM distributor_program_aggregations dpa_inner
                WHERE dpa_inner.distributor_id = ${distributorId}
                  AND dpa_inner.program_id = "DistributorProgramAggregation"."program_id"
                  AND dpa_inner.participant_type = '${participantType}'
                  AND dpa_inner.warehouse_id IS NOT NULL
                  AND dpa_inner.deleted_at IS NULL
                GROUP BY dpa_inner.warehouse_id
              ) warehouse_maxes
            )`);
          }

          const aggregations = await DistributorProgramAggregation.findAll({
            where: {
              distributorId,
              programId: {
                [Op.in]: programIds
              },
              participantType,
              ...warehouseFilter
            },
            attributes: [
              "programId",
              [salesVolumeExprFinal, "totalSalesVolume"],
              [fn("SUM", earningsExpr), "totalStoreEarnings"],
              [enrolledExprFinal, "storesEnrolled"],
              [fn("SUM", totalStoresExpr), "totalStores"],
              [fn("SUM", compliantExpr), "compliantStores"]
            ],
            group: ["program_id"],
            raw: true
          });

          // Convert to Map for fast lookup by programId
          const aggregationsMap = new Map<number, any>();
          aggregations.forEach((agg: any) => {
            aggregationsMap.set(Number(agg.programId), {
              totalSalesVolume: parseFloat(agg.totalSalesVolume || 0),
              totalStoreEarnings: parseFloat(agg.totalStoreEarnings || 0),
              storesEnrolled: parseInt(agg.storesEnrolled || 0),
              totalStores: parseInt(agg.totalStores || 0),
              compliantStores: parseInt(agg.compliantStores || 0)
            });
          });

          newrelic.addCustomAttribute(
            "aggregationsCount",
            aggregationsMap.size
          );

          return aggregationsMap;
        } catch (error: any) {
          console.error("Error in getDistributorProgramAggregations:", error);
          newrelic.noticeError(error);
          // Return empty map on error to fallback to old logic
          return new Map();
        }
      }
    );
  }

  /**
   * Gets distributor program aggregations by program detail IDs
   * Similar to getDistributorProgramAggregations but queries at the program_detail level
   * Used for fetching aggregated purchase volume and earnings for specific program details
   *
   * @param distributorId - The ID of the distributor
   * @param programDetailIds - Array of program detail IDs to filter by
   * @param participantType - The participant type (e.g., 'chain', 'store', 'distributor')
   * @param excludeChainStores - If true, only include regular stores; if false, include both stores and chain stores (default: false)
   * @param warehouseIds - Optional array of warehouse IDs to filter by. When provided, filters by matching warehouse_id. When undefined/empty, filters by NULL warehouse_id (all warehouses)
   * @returns A Map with programDetailId as key and aggregation data as value
   */
  public async getDistributorProgramDetailAggregations(
    distributorId: number,
    programDetailIds: number[],
    participantType: string,
    excludeChainStores: boolean = false,
    warehouseIds?: number[]
  ): Promise<Map<number, any>> {
    return await newrelic.startSegment(
      "getDistributorProgramDetailAggregations",
      true,
      async () => {
        try {
          if (!programDetailIds || programDetailIds.length === 0) {
            return new Map();
          }

          // Build attribute expressions based on excludeChainStores parameter
          const salesVolumeExpr = excludeChainStores
            ? col("stores_sales_volume")
            : literal("stores_sales_volume + chains_stores_sales_volume");

          const earningsExpr = excludeChainStores
            ? col("stores_earnings")
            : literal("stores_earnings + chains_stores_earnings");

          const enrolledExpr = excludeChainStores
            ? col("stores_enrolled")
            : literal("stores_enrolled + chains_stores_enrolled");

          const totalStoresExpr = excludeChainStores
            ? col("total_stores")
            : literal("total_stores + total_chain_stores");

          const compliantExpr = excludeChainStores
            ? col("stores_compliant")
            : literal("stores_compliant + chains_stores_compliant");

          // Build warehouse filter condition and enrolled expression
          const warehouseFilter: any = {};
          let enrolledExprFinal: any;

          if (warehouseIds && warehouseIds.length > 0) {
            // Filter by specific warehouse IDs
            warehouseFilter.warehouseId = {
              [Op.in]: warehouseIds
            };
            // When filtering by specific warehouses, use MAX to aggregate across warehouse rows
            // Since we're grouping by program_detail_id, we need an aggregate function
            enrolledExprFinal = fn("MAX", enrolledExpr);
          } else {
            // When no warehouse filter: query non-NULL warehouse_id rows
            // For storesEnrolled, we need: SUM(MAX(stores_enrolled) per warehouse)
            warehouseFilter.warehouseId = {
              [Op.ne]: null
            };
            // Use a correlated subquery to calculate: SUM(MAX(stores_enrolled) per warehouse)
            const enrolledColumn = excludeChainStores
              ? "stores_enrolled"
              : "(stores_enrolled + chains_stores_enrolled)";
            // Sequelize generates the outer query with alias "DistributorProgramAggregation", so we reference it directly
            enrolledExprFinal = literal(`(
              SELECT COALESCE(SUM(max_enrolled), 0)
              FROM (
                SELECT warehouse_id, MAX(${enrolledColumn}) as max_enrolled
                FROM distributor_program_aggregations dpa_inner
                WHERE dpa_inner.distributor_id = ${distributorId}
                  AND dpa_inner.program_detail_id = "DistributorProgramAggregation"."program_detail_id"
                  AND dpa_inner.participant_type = '${participantType}'
                  AND dpa_inner.warehouse_id IS NOT NULL
                  AND dpa_inner.deleted_at IS NULL
                GROUP BY dpa_inner.warehouse_id
              ) warehouse_maxes
            )`);
          }

          const aggregations = await DistributorProgramAggregation.findAll({
            where: {
              distributorId,
              programDetailId: {
                [Op.in]: programDetailIds
              },
              participantType,
              ...warehouseFilter
            },
            attributes: [
              "programDetailId",
              [fn("SUM", salesVolumeExpr), "totalSalesVolume"],
              [fn("SUM", earningsExpr), "totalEarnings"],
              [enrolledExprFinal, "storesEnrolled"],
              [fn("SUM", totalStoresExpr), "totalStores"],
              [fn("SUM", compliantExpr), "compliantStores"]
            ],
            group: ["program_detail_id"],
            raw: true
          });

          // Convert to Map for fast lookup by programDetailId
          const aggregationsMap = new Map<number, any>();
          aggregations.forEach((agg: any) => {
            aggregationsMap.set(Number(agg.programDetailId), {
              purchaseVolume: parseFloat(agg.totalSalesVolume || 0),
              estimatedEarnings: parseFloat(agg.totalEarnings || 0),
              storesEnrolled: parseInt(agg.storesEnrolled || 0),
              totalStores: parseInt(agg.totalStores || 0),
              compliantStores: parseInt(agg.compliantStores || 0)
            });
          });

          newrelic.addCustomAttribute(
            "detailAggregationsCount",
            aggregationsMap.size
          );

          return aggregationsMap;
        } catch (error: any) {
          console.error(
            "Error in getDistributorProgramDetailAggregations:",
            error
          );
          newrelic.noticeError(error);
          // Return empty map on error to fallback to old logic
          return new Map();
        }
      }
    );
  }

  public async getDistributorSalesManagerProgram({
    salesManagerIds,
    distributorId,
    authorizedManufacturerIds = [],
    excludedProgramIds,
    isInternal,
    programTimeline
  }: {
    salesManagerIds: number[];
    distributorId: number;
    authorizedManufacturerIds?: number[];
    excludedProgramIds?: number[];
    isInternal?: boolean;
    programTimeline?: string;
  }) {
    const programWhere: any = {};
    if (excludedProgramIds && excludedProgramIds.length > 0) {
      programWhere.id = {
        [Op.notIn]: excludedProgramIds
      };
    }

    // Handle internal initiative filtering - include null/undefined for non-internal
    if (!isInternal) {
      programWhere[Op.or] = [
        { internal_initiative: false },
        { internal_initiative: { [Op.is]: null } }
      ];
    } else if (isInternal === true) {
      programWhere.internal_initiative = true;
    }

    return await Manufacturer.findAll({
      attributes: ["id", "name", "logo"],
      include: [
        {
          model: Program,
          as: "programs",
          attributes: [
            "id",
            "name",
            "program_header",
            "program_type",
            "start_date",
            "end_date",
            "approval_status",
            [
              fn(
                "COALESCE",
                fn("SUM", col("programs->compliances.earned_rebate")),
                0
              ),
              "total_earnings"
            ]
          ],
          required: true,
          where: {
            participant_type: ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER,
            deleted_at: null,
            manufacturer_id: { [Op.in]: authorizedManufacturerIds },
            internal_initiative: isInternal
              ? true
              : { [Op.or]: [false, { [Op.is]: null }] },
            [Op.and]: [
              literal(`
                EXISTS (
                  SELECT 1
                  FROM program_approvals pa
                  WHERE pa.program_id = "programs".id
                    AND pa.approver_type = 'DISTRIBUTOR'
                    AND pa.approver_id = ${distributorId}
                    AND pa.status = 'APPROVED'
                    AND pa.deleted_at IS NULL
                )
              `)
            ]
          },
          include: [
            {
              model: ProgramDetail,
              as: "details",
              attributes: [
                "id",
                "tier",
                "overview",
                "rebate_amount",
                "rebate_percentage"
              ],
              where: { deleted_at: null },
              required: false
            },
            {
              model: ProgramCompliance,
              as: "compliances",
              attributes: [],
              where: {
                entity_id: { [Op.in]: salesManagerIds },
                entity_type: ENTITY_TYPE.DISTRIBUTOR_SALES_MANAGER,
                status: "active",
                deleted_at: null
              },
              required: false
            }
          ]
        }
      ],
      group: ["Manufacturer.id", "programs.id", "programs->details.id"],
      order: [[fn("MIN", col("programs.start_date")), "ASC"]],
      raw: false,
      nest: true
    });
  }

  /**
   * Get void fill programs for authorized manufacturers
   * @param distributorId - The distributor ID (creator_id)
   * @param authorizedManufacturerIds - Array of authorized manufacturer IDs
   * @returns Promise<Record<number, any[]>> - Programs grouped by manufacturer ID
   */
  public async getVoidFillPrograms(
    distributorId: number,
    authorizedManufacturerIds: number[],
    programId?: number,
    programTimeline?: string
  ): Promise<Record<number, any[]>> {
    if (!authorizedManufacturerIds || authorizedManufacturerIds.length === 0) {
      return {};
    }

    const programs = await Program.findAll({
      attributes: [
        "id",
        "manufacturer_id",
        "start_date",
        "end_date",
        "name",
        "program_header",
        "program_type",
        "participant_type"
      ],
      include: [
        {
          model: ProgramDetail,
          attributes: ["id", "criteria", "rebate_type", "rebate_amount"],
          required: true,
          where: {
            criteria: {
              [Op.iLike]: `%${ProgramsDetailCriteria.VOID_FILL}%`
            },
            ...(programId ? { program_id: programId } : {})
          }
        }
      ],
      where: {
        manufacturer_id: {
          [Op.in]: authorizedManufacturerIds
        },
        participant_type: ENTITY_TYPE.SALES_REP,
        creator_id: distributorId,
        ...Program.getProgramTimelineFilter(programTimeline)
      },
      raw: true
    });

    // Transform response to group by manufacturer ID
    const result: Record<number, any[]> = {};

    programs.forEach((program: any) => {
      const manufacturerId = program.manufacturer_id;
      if (!result[manufacturerId]) {
        result[manufacturerId] = [];
      }

      result[manufacturerId].push({
        programId: program.id,
        programName: program.name,
        programHeader: program.program_header,
        programType: program.program_type,
        startDate: program.start_date,
        endDate: program.end_date,
        participantType: program.participant_type,
        rebateType: program["ProgramDetails.rebate_type"],
        rebateAmount: program["ProgramDetails.rebate_amount"]
      });
    });

    return result;
  }

  /**
   * Get total remaining voids per program for given stores and program ids
   * Returns an array of objects: [{ programId, remainingTarget }]
   */
  public async getTotalVoidsRemaining({
    programIds,
    storeIds
  }: {
    programIds: number[];
    storeIds: number[];
  }): Promise<Array<{ programId: number; remainingTarget: number }>> {
    if (!Array.isArray(storeIds) || storeIds.length === 0) return [];
    if (!Array.isArray(programIds) || programIds.length === 0) return [];

    const rows = await StoreVoidFillTarget.findAll({
      attributes: [
        [col("program_id"), "programId"],
        [fn("SUM", col("remaining_target")), "remainingTarget"]
      ],
      where: {
        programId: { [Op.in]: programIds },
        storeId: { [Op.in]: storeIds }
      },
      group: [col("program_id")],
      raw: true
    });

    // Normalize numeric types
    return rows.map((r: any) => ({
      programId: Number(r.programId),
      remainingTarget: Number(r.remainingTarget) || 0
    }));
  }

  /**
   * Get earnings and total voids from sales_rep_store_earnings with program_compliances join
   * @param distributorId - The distributor ID
   * @param programIds - Array of program IDs
   * @param salesRepIds - Array of sales rep IDs
   * @returns Array of {programId, totalEarning, totalVoids}
   */
  public async getSalesRepEarningsWithCompliance({
    distributorId,
    programIds,
    salesRepIds
  }: {
    distributorId: number;
    programIds: number[];
    salesRepIds: number[];
  }): Promise<
    Array<{ programId: number; totalEarning: number; totalVoids: number }>
  > {
    if (!Array.isArray(programIds) || programIds.length === 0) return [];
    if (!Array.isArray(salesRepIds) || salesRepIds.length === 0) return [];
    if (!Number.isFinite(distributorId) || distributorId <= 0) return [];

    const query = `
      SELECT
        sre.program_id,
        sre.distributor_id,
        SUM(sre.earning) AS total_earning,
        SUM(sre.total_quantity) AS total_voids
      FROM sales_rep_store_earnings sre
      JOIN program_compliances pc 
        ON pc.program_id = sre.program_id 
       AND pc.entity_id = sre.sales_rep_id
       AND pc.entity_type = :entityType
      WHERE sre.program_id IN (:programIds)
        AND sre.distributor_id = :distributorId
        AND sre.sales_rep_id IN (:salesRepIds)
        AND pc.status = :status
      GROUP BY sre.program_id, sre.distributor_id
    `;

    const results = await sequelize.query(query, {
      replacements: {
        programIds,
        distributorId,
        salesRepIds,
        entityType: ENTITY_TYPE.SALES_REP,
        status: ProgramsComplianceStatus.Active
      },
      type: QueryTypes.SELECT
    });

    return results.map((r: any) => ({
      programId: Number(r.program_id),
      totalEarning: Number(r.total_earning) || 0,
      totalVoids: Number(r.total_voids) || 0
    }));
  }

  /**
   * Get earnings and voids filled from sales_rep_store_earnings table
   * @param distributorId - The distributor ID (parent_entity_id)
   * @param programIds - Array of program IDs
   * @returns Array of {programId, earnings, voidsFilled}
   */
  public async getSalesRepStoreEarnings({
    distributorId,
    programIds
  }: {
    distributorId: number;
    programIds: number[];
  }): Promise<
    Array<{ programId: number; earnings: number; voidsFilled: number }>
  > {
    if (!Array.isArray(programIds) || programIds.length === 0) return [];
    if (!Number.isFinite(distributorId) || distributorId <= 0) return [];

    const query = `
      SELECT 
        srse.program_id, 
        SUM(srse.earning) as earnings,
        SUM(srse.unique_products) as voids_filled
      FROM sales_rep_store_earnings srse
      WHERE srse.program_id IN (:programIds)
        AND srse.distributor_id = :distributorId
        AND srse.sales_rep_id IN (
          SELECT ur.associated_user_id 
          FROM user_roles ur 
          WHERE ur.role = :role
            AND ur.parent_entity_id = :distributorId 
            AND ur.parent_entity_type = :parentEntityType
        )
      GROUP BY srse.program_id
    `;

    const results = await sequelize.query(query, {
      replacements: {
        programIds,
        distributorId,
        role: ENTITY_TYPE.DISTRIBUTOR_SALES_REP,
        parentEntityType: ENTITY_TYPE.DISTRIBUTOR
      },
      type: QueryTypes.SELECT
    });

    return results.map((r: any) => ({
      programId: Number(r.program_id),
      earnings: Number(r.earnings) || 0,
      voidsFilled: Number(r.voids_filled) || 0
    }));
  }

  /**
   * Get earnings and voids filled for programs with their specific date ranges
   * @param programIds - Array of program IDs
   * @param salesRepIds - Array of sales rep IDs (entity_id)
   * @param entityType - Entity type (e.g., 'SALES_REP')
   * @param programDateRanges - Object with program_id as key and {startDate, endDate} as value
   * @returns Array of {programId, earnings, voidsFilled, earningOpportunity}
   */
  public async getProgramEarningsAndVoidsFilled({
    programIds,
    salesRepIds,
    entityType,
    programDateRanges,
    distributorId
  }: {
    programIds: number[];
    salesRepIds: number[];
    entityType: string;
    programDateRanges: Record<number, { startDate: Date; endDate: Date }>;
    distributorId: number;
  }): Promise<
    Array<{
      programId: number;
      earnings: number;
      voidsFilled: number;
      earningOpportunity: number;
    }>
  > {
    if (!Array.isArray(programIds) || programIds.length === 0) return [];
    if (!Array.isArray(salesRepIds) || salesRepIds.length === 0) return [];

    // Get earnings and earning opportunity from program_compliances
    const programConditions: string[] = [];
    const replacements: any = {
      entityType,
      programIds,
      salesRepIds
    };

    programIds.forEach((programId, index) => {
      const dateRange = programDateRanges[programId];
      if (!dateRange) return;

      const startDateKey = `startDate${index}`;
      const endDateKey = `endDate${index}`;

      programConditions.push(`(
        pc.program_id = :programId${index} 
        AND pc.compliance_date >= :${startDateKey} 
        AND pc.compliance_date <= :${endDateKey}
      )`);

      replacements[`programId${index}`] = programId;
      replacements[startDateKey] = dateRange.startDate
        .toISOString()
        .split("T")[0];
      replacements[endDateKey] = dateRange.endDate.toISOString().split("T")[0];
    });

    if (programConditions.length === 0) return [];

    const earningsQuery = `
      SELECT 
        pc.program_id, 
        SUM(pc.earned_rebate) as earnings,
        SUM(pc.rebate_opportunity) as earning_opportunity
      FROM program_compliances pc
      INNER JOIN programs p ON pc.program_id = p.id
      WHERE pc.entity_type = :entityType 
        AND pc.program_id IN (:programIds)
        AND pc.entity_id IN (:salesRepIds)
        AND (${programConditions.join(" OR ")})
      GROUP BY pc.program_id
    `;

    const earningsResults = await sequelize.query(earningsQuery, {
      replacements,
      type: QueryTypes.SELECT
    });

    // Get voids filled from sales_rep_store_earnings
    const voidsFilledResults = await this.getSalesRepStoreEarnings({
      distributorId,
      programIds
    });

    // Combine results
    const combinedResults: Array<{
      programId: number;
      earnings: number;
      voidsFilled: number;
      earningOpportunity: number;
    }> = [];

    programIds.forEach((programId) => {
      const earningsData = earningsResults.find(
        (r: any) => Number(r.program_id) === programId
      );
      const voidsFilledData = voidsFilledResults.find(
        (r) => r.programId === programId
      );

      combinedResults.push({
        programId,
        earnings: earningsData
          ? Number((earningsData as any).earnings) || 0
          : 0,
        voidsFilled: voidsFilledData ? voidsFilledData.voidsFilled : 0,
        earningOpportunity: earningsData
          ? Number((earningsData as any).earning_opportunity) || 0
          : 0
      });
    });

    return combinedResults;
  }

  /**
   * Gets enrolled program IDs for a specific store
   * @param storeId - The store ID
   * @returns Promise<number[]> - Array of enrolled program IDs
   */
  public async getEnrolledProgramIdsForStore(
    storeId: number
  ): Promise<number[]> {
    try {
      const enrolledPrograms = await ProgramParticipant.findAll({
        attributes: ["program_id"],
        where: {
          entity_id: storeId,
          entity_type: ENTITY_TYPE.STORE,
          deleted_at: null
        },
        raw: true
      });

      return enrolledPrograms.map((ep: any) => ep.program_id);
    } catch (error) {
      console.error("Error in getEnrolledProgramIdsForStore:", error);
      return [];
    }
  }

  /**
   * Get manufacturer agreements with enrollment status for a store
   * @param distributorId - The distributor ID
   * @param storeId - The store ID
   * @returns Promise<Array<{manufacturer_id: number, agreementInfo: Array<{status: string, id: number, name: string, endDate: Date}>}>>
   */
  public async getStoreManufacturerAgreements(
    distributorId: number,
    storeId: number
  ): Promise<
    Array<{
      manufacturer_id: number;
      agreementInfo: Array<{
        status: string;
        id: number;
        name: string;
        endDate: Date;
      }>;
    }>
  > {
    return await newrelic.startSegment(
      "getStoreManufacturerAgreements",
      true,
      async () => {
        try {
          const query = `
            SELECT 
              "manufacturerId",
              "agreementId",
              "agreementName",
              MAX("endDate") AS "endDate",
              SUM("programCount") AS "programCount",
              MAX("status") AS "status"
            FROM (
              SELECT 
                adm.manufacturer_id AS "manufacturerId",
                COALESCE(pa.agreement_id, pa.id) AS "agreementId",
                pa.agreement_name AS "agreementName",
                p.end_date AS "endDate",
                COUNT(DISTINCT pa.program_id) AS "programCount",
                'enrolled' AS "status"
              FROM program_agreements pa
              INNER JOIN programs p
                ON p.id = pa.program_id
              INNER JOIN authorized_distributor_manufacturers adm
                ON adm.manufacturer_id = p.manufacturer_id
                AND adm.distributor_id = :distributorId
              INNER JOIN program_approvals papp
                ON papp.program_id = p.id
                AND papp.approver_type = 'DISTRIBUTOR'
                AND papp.approver_id = :distributorId
                AND papp.status = '${PROGRAM_APPROVAL_STATUS.APPROVED}'
                AND papp.deleted_at IS NULL
              WHERE p.end_date > NOW()
                AND pa.deleted_at IS NULL
                AND p.deleted_at IS NULL
                AND p.id IN (
                  SELECT pp.program_id
                  FROM program_participants pp
                  WHERE pp.entity_type = 'STORE'
                    AND pp.entity_id = :storeId
                    AND pp.deleted_at IS NULL
                )
              GROUP BY adm.manufacturer_id, COALESCE(pa.agreement_id, pa.id), pa.agreement_name, p.end_date
              UNION ALL
              SELECT 
                adm.manufacturer_id AS "manufacturerId",
                COALESCE(pa.agreement_id, pa.id) AS "agreementId",
                pa.agreement_name AS "agreementName",
                p.end_date AS "endDate",
                COUNT(DISTINCT pa.program_id) AS "programCount",
                'available' AS "status"
              FROM program_agreements pa
              INNER JOIN programs p
                ON p.id = pa.program_id
              INNER JOIN authorized_distributor_manufacturers adm 
                ON adm.manufacturer_id = p.manufacturer_id
                AND adm.distributor_id = :distributorId
              INNER JOIN program_approvals papp
                ON papp.program_id = p.id
                AND papp.approver_type = 'DISTRIBUTOR'
                AND papp.approver_id = :distributorId
                AND papp.status = '${PROGRAM_APPROVAL_STATUS.APPROVED}'
                AND papp.deleted_at IS NULL
              WHERE p.end_date > NOW()
                AND pa.deleted_at IS NULL
                AND p.deleted_at IS NULL
                AND NOT EXISTS (
                  SELECT 1
                  FROM program_participants pp
                  WHERE pp.program_id = p.id
                    AND pp.entity_type = 'STORE'
                    AND pp.entity_id = :storeId
                    AND pp.deleted_at IS NULL
                )
              GROUP BY adm.manufacturer_id, COALESCE(pa.agreement_id, pa.id), pa.agreement_name, p.end_date
            ) AS combined_results
            GROUP BY "manufacturerId", "agreementId", "agreementName"
            ORDER BY "manufacturerId", "agreementId"
          `;

          const results: any[] = await sequelize.query(query, {
            replacements: {
              distributorId,
              storeId
            },
            type: QueryTypes.SELECT
          });

          // Transform results into the expected format
          const manufacturerMap = new Map<
            number,
            Array<{ status: string; id: number; name: string; endDate: Date }>
          >();

          results.forEach((row: any) => {
            const manufacturerId = Number(row.manufacturerId);
            const agreementId = Number(row.agreementId);
            const status = row.status;
            const agreementName = row.agreementName || "";
            const endDate = row.endDate ? new Date(row.endDate) : new Date();

            if (!manufacturerMap.has(manufacturerId)) {
              manufacturerMap.set(manufacturerId, []);
            }

            const agreementInfo = manufacturerMap.get(manufacturerId)!;
            // Check if this agreement with this status already exists
            const existing = agreementInfo.find(
              (agreement) =>
                agreement.id === agreementId && agreement.status === status
            );

            if (!existing) {
              agreementInfo.push({
                status,
                id: agreementId,
                name: agreementName,
                endDate
              });
            }
          });

          // Convert map to array format
          const formattedResults = Array.from(manufacturerMap.entries()).map(
            ([manufacturer_id, agreementInfo]) => ({
              manufacturer_id,
              agreementInfo
            })
          );

          return formattedResults;
        } catch (error) {
          console.error("Error in getStoreManufacturerAgreements:", error);
          if (error instanceof Error) {
            throw ApiError.internal(
              `Failed to get manufacturer agreements: ${error.message}`
            );
          } else {
            throw ApiError.internal("Failed to get manufacturer agreements");
          }
        }
      }
    );
  }
}

export default new ProgramRepository();
