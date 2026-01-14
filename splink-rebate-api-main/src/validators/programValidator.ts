import Joi from "joi";
import {
  PROGRAM_CALCULATION_TYPE_VALUES,
  ProgramsDetailCriteria
} from "../config/appConstants";

// Common field definitions
const commonFields = {
  tier: Joi.number().required(),
  description: Joi.string().allow(null).required(),
  overview: Joi.string().allow(null).required(),
  program_line: Joi.string().allow(null).required(),
  rebate_type: Joi.string().required(),
  rebate_calculation: Joi.string()
    .valid(...Object.values(PROGRAM_CALCULATION_TYPE_VALUES))
    .required(),
  rebate_calculation_type: Joi.string().required(),
  criteria: Joi.string().required(),
  rebate_amount: Joi.number().allow(null).optional(),
  rebate_percentage: Joi.number().allow(null).optional(),
  products: Joi.array().optional()
};

const optionalFields = {
  id: Joi.number().optional(),
  max_qty: Joi.number().allow(null).optional(),
  program_type: Joi.string().allow(null).optional(),
  products_tags: Joi.string().allow(null).optional(),
  products_tags_qty: Joi.string().allow(null).optional(),
  products_tags_qty_max: Joi.string().allow(null).optional(),
  min_spend: Joi.number().default(0),
  max_rebate: Joi.number().default(0),
  points: Joi.number().allow(null).optional(),
  quantity_type: Joi.string().allow(null).optional(),
  is_other: Joi.boolean().default(false),
  points_per_sku: Joi.string().allow(null).optional(),
  percentage_per_point: Joi.string().allow(null).optional(),
  max_points: Joi.string().allow(null).optional()
};

function getProgramDetailSchemaByCriteria(criteria: string) {
  const baseSchema = Joi.object({
    ...commonFields,
    min_qty: Joi.number().required()
  })
    .unknown(true)
    .xor("rebate_amount", "rebate_percentage");

  switch (criteria) {
    case ProgramsDetailCriteria.CategorySKUs:
    case ProgramsDetailCriteria.PerItem:
    case ProgramsDetailCriteria.POD:
      return baseSchema.keys({
        products_tags: Joi.string().allow(null).required(),
        products_tags_qty: Joi.string().allow(null).required(),
        products_tags_qty_max: Joi.string().allow(null).optional()
      });
    case ProgramsDetailCriteria.PurchaseQuantity:
      return baseSchema.keys({
        quantity_type: Joi.string()
          .valid("box", "case", "unit")
          .allow(null)
          .required(),
        max_qty: Joi.number().allow(null).optional()
      });
    case ProgramsDetailCriteria.PurchaseValue:
      return baseSchema.keys({
        min_spend: Joi.number().default(0).required()
      });
    case ProgramsDetailCriteria.Growth:
    case ProgramsDetailCriteria.Base:
      return baseSchema;
    case ProgramsDetailCriteria.BaseSPIFF:
    case ProgramsDetailCriteria.VOID_FILL:
      return baseSchema.keys({
        products_tags: Joi.string().allow(null).optional(),
        products_tags_qty: Joi.string().allow(null).optional(),
        products_tags_qty_max: Joi.string().allow(null).optional(),

        ...(criteria === ProgramsDetailCriteria.VOID_FILL
          ? {
              days_criteria: Joi.number().required()
            }
          : {}),

        quantity_type: Joi.string()
          .valid("box", "case", "unit")
          .allow(null)
          .optional(),
        max_qty: Joi.number().allow(null).optional()
      });
    default:
      return Joi.forbidden();
  }
}

const programDetailSchema = Joi.object().custom((value, helpers) => {
  const { criteria } = value;

  if (!criteria) {
    return helpers.error("any.invalid", {
      message: "Program detail must include a valid 'criteria' field"
    });
  }

  const schema = getProgramDetailSchemaByCriteria(criteria);
  const { error } = schema.validate(value, { abortEarly: false });
  if (error) {
    const errorMessage = error.details
      .map((detail) => detail?.message)
      .join(", ");

    return helpers.error("any.invalid", {
      message: errorMessage
    });
  }
  return value;
}, "Dynamic program detail schema validation");

const visibilityEntitySchema = Joi.object({
  entity_type: Joi.string()
    .valid("DISTRIBUTOR", "STORE", "SALES_REP")
    .required(),
  entity_id: Joi.number().required()
});

const createProgramSchema = Joi.object({
  name: Joi.string().required(),
  start_date: Joi.date().required(),
  end_date: Joi.date().required(),
  program_type: Joi.string().required(),
  program_header: Joi.string().required(),
  payment_term: Joi.string().required(),
  internal_initiative: Joi.boolean().optional(),
  target_audience: Joi.string()
    .valid("DISTRIBUTOR", "STORE", "SALES_REP", "BOTH")
    .required(),
  approval_status: Joi.string()
    .valid("DRAFT", "PENDING", "APPROVED", "REJECTED")
    .optional(),
  participant_type: Joi.string()
    .valid("DISTRIBUTOR", "STORE", "SALES_REP")
    .required(),
  visibility_scope: Joi.string()
    .valid(
      "SPECIFIC_DISTRIBUTORS",
      "SPECIFIC_STORES",
      "SPECIFIC_SALES_REPS",
      "ALL_STORES_UNDER_DISTRIBUTOR",
      "ALL_DISTRIBUTORS",
      "ALL_SALES_REPS"
    )
    .required(),
  description: Joi.string().optional(),
  min_purchase_amount: Joi.number().optional(),
  manufacturer_id: Joi.number().optional(),
  rebate_percentage: Joi.number().optional(),
  program_details: Joi.array().items(programDetailSchema).min(1).required(),

  // Store criteria support (alternative to visibility_entities)
  store_criteria: Joi.object({
    rules: Joi.array().items(
      Joi.object({
        id: Joi.string().optional(), // Frontend tracking ID
        type: Joi.string()
          .valid("customer_chain", "specific_product", "category")
          .optional(),
        operator: Joi.string()
          .valid("<=", ">=", "<", ">", "=", "between")
          .optional(),
        value1: Joi.number().optional(),
        value2: Joi.number().optional(),
        startDate: Joi.alternatives()
          .try(Joi.string().isoDate(), Joi.date(), Joi.valid(null))
          .optional(),
        endDate: Joi.alternatives()
          .try(Joi.string().isoDate(), Joi.date(), Joi.valid(null))
          .optional(),
        category: Joi.alternatives()
          .try(
            Joi.string(),
            Joi.object({
              label: Joi.string().required(),
              value: Joi.string().required()
            })
          )
          .optional(),
        chains: Joi.alternatives()
          .try(
            Joi.string(),
            Joi.array().items(
              Joi.object({
                label: Joi.string().required(),
                value: Joi.string().required()
              })
            )
          )
          .optional(),
        products: Joi.alternatives()
          .try(
            Joi.string(),
            Joi.array().items(
              Joi.object({
                label: Joi.string().required(),
                value: Joi.number().required(),
                description: Joi.string().optional()
              })
            )
          )
          .optional()
      })
    )
  }).optional(),

  distributor_ids: Joi.array().items(Joi.number()).optional(),
  sales_rep_ids: Joi.array().items(Joi.number()).optional(),
  min_products_purchased: Joi.number().optional(),
  excluded_stores: Joi.array().items(Joi.number()).optional(),

  visibility_entities: Joi.array()
    .items(visibilityEntitySchema)
    .optional()
    .when("visibility_scope", {
      is: Joi.string().valid(
        "SPECIFIC_DISTRIBUTORS",
        "SPECIFIC_STORES",
        "SPECIFIC_SALES_REPS",
        "ALL_SALES_REPS"
      ),
      then: Joi.when("store_criteria", {
        is: Joi.exist(),
        then: Joi.optional(), // Optional if store_criteria provided
        otherwise: Joi.array().min(1).required() // Required if no store_criteria
      }),
      otherwise: Joi.forbidden()
    }),
  spiff_stores: Joi.array()
    .items(visibilityEntitySchema)
    .optional()
    .when("program_type", {
      is: Joi.string().valid("SPIFF", "NA"),
      then: Joi.array().min(1).required(),
      otherwise: Joi.when("store_criteria", {
        is: Joi.exist(),
        then: Joi.array().optional(), // Optional when store_criteria is provided
        otherwise: Joi.forbidden()
      })
    })
    .when("store_criteria", {
      is: Joi.exist(),
      then: Joi.array().optional(), // Optional when store_criteria is provided
      otherwise: Joi.forbidden()
    })
});

// Schema for updating a program, including program_id as required
const updateProgramSchema = Joi.object({
  program_id: Joi.number().required(),
  name: Joi.string().required(),
  start_date: Joi.date().required(),
  end_date: Joi.date().required(),
  program_type: Joi.string().required(),
  program_header: Joi.string().required(),
  payment_term: Joi.string().required(),
  target_audience: Joi.string()
    .valid("DISTRIBUTOR", "STORE", "SALES_REP", "BOTH")
    .required(),
  approval_status: Joi.string()
    .valid("DRAFT", "PENDING", "APPROVED", "REJECTED")
    .optional(),
  participant_type: Joi.string()
    .valid("DISTRIBUTOR", "STORE", "SALES_REP")
    .required(),
  visibility_scope: Joi.string()
    .valid(
      "SPECIFIC_DISTRIBUTORS",
      "SPECIFIC_STORES",
      "ALL_STORES_UNDER_DISTRIBUTOR",
      "ALL_DISTRIBUTORS"
    )
    .required(),
  description: Joi.string().optional(),
  min_purchase_amount: Joi.number().optional(),
  rebate_percentage: Joi.number().optional(),
  program_details: Joi.array().items(programDetailSchema).min(1).required(),
  visibility_entities: Joi.array()
    .items(visibilityEntitySchema)
    .optional()
    .when("visibility_scope", {
      is: Joi.string().valid("SPECIFIC_DISTRIBUTORS", "SPECIFIC_STORES"),
      then: Joi.array().min(1).required(),
      otherwise: Joi.forbidden()
    })
});

export const validateCreateProgram = (data: any) => {
  return createProgramSchema.validate(data, { abortEarly: false });
};

export const validateUpdateProgram = (data: any) => {
  return updateProgramSchema.validate(data, { abortEarly: false });
};
