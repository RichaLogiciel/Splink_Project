import Joi from "joi";

// Chain program details validation schema
export const chainProgramDetailsSchema = Joi.object({
  type: Joi.string().valid("CHAIN", "STORE").required(),
  chainView: Joi.boolean().when("type", {
    is: "CHAIN",
    then: Joi.required(),
    otherwise: Joi.optional()
  }),
  manufacturerId: Joi.number().integer().positive().required(),
  warehouseId: Joi.string().optional(),
  programTimeline: Joi.string().optional(),
  isInternal: Joi.boolean().optional(),
  searchQuery: Joi.string().optional(),
  enrolledPage: Joi.number().integer().min(1).default(1),
  notEnrolledPage: Joi.number().integer().min(1).default(1),
  sort: Joi.string().valid("ASC", "DESC").default("ASC"),
  sortKey: Joi.string()
    .valid(
      "chain_name",
      "total_stores",
      "purchase_volume",
      "earned_rebate",
      "compliance_percentage"
    )
    .default("chain_name")
});

// Chain programs listing validation schema
export const chainProgramsListingSchema = Joi.object({
  type: Joi.string().valid("STORE").required(),
  chainView: Joi.boolean().valid(true).required(),
  warehouseId: Joi.string().optional(),
  programTimeline: Joi.string().optional(),
  isInternal: Joi.boolean().optional(),
  storeId: Joi.number().integer().positive().optional(),
  selectedWarehouseId: Joi.number().integer().positive().optional()
});

// Chain categorized products validation schema
export const chainCategorizedProductsSchema = Joi.object({
  type: Joi.string().valid("STORE").required(),
  chainView: Joi.boolean().valid(true).required(),
  manufacturerId: Joi.number().integer().positive().required(),
  programId: Joi.number().integer().positive().optional(),
  chainId: Joi.number().integer().positive().optional()
});

// General chain view parameters validation
export const chainViewParamsSchema = Joi.object({
  chainView: Joi.boolean().required(),
  type: Joi.string().when("chainView", {
    is: true,
    then: Joi.string().valid("CHAIN", "STORE").required(),
    otherwise: Joi.string().optional()
  })
});

// Chain ID validation schema
export const chainIdSchema = Joi.object({
  chainId: Joi.number().integer().positive().required()
});

// Chain pagination validation schema
export const chainPaginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid("ASC", "DESC").default("ASC"),
  sortKey: Joi.string()
    .valid(
      "chain_name",
      "total_stores",
      "purchase_volume",
      "earned_rebate",
      "compliance_percentage",
      "created_at",
      "updated_at"
    )
    .default("chain_name"),
  searchQuery: Joi.string().optional()
});

// Chain query options validation schema
export const chainQueryOptionsSchema = Joi.object({
  searchQuery: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().valid("ASC", "DESC").default("ASC"),
  sortKey: Joi.string()
    .valid(
      "chain_name",
      "total_stores",
      "purchase_volume",
      "earned_rebate",
      "compliance_percentage"
    )
    .default("chain_name"),
  programTimeline: Joi.string().optional(),
  isInternal: Joi.boolean().optional()
});

// Validation functions for use in controllers
export const validateChainProgramDetails = (data: any) => {
  return chainProgramDetailsSchema.validate(data);
};

export const validateChainProgramsListing = (data: any) => {
  return chainProgramsListingSchema.validate(data);
};

export const validateChainCategorizedProducts = (data: any) => {
  return chainCategorizedProductsSchema.validate(data);
};

export const validateChainViewParams = (data: any) => {
  return chainViewParamsSchema.validate(data);
};

export const validateChainId = (data: any) => {
  return chainIdSchema.validate(data);
};

export const validateChainPagination = (data: any) => {
  return chainPaginationSchema.validate(data);
};

export const validateChainQueryOptions = (data: any) => {
  return chainQueryOptionsSchema.validate(data);
};
