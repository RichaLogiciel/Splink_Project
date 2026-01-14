import { CACHE_TTL_TIME, useApiCaching } from "../config/appConstants";
import { ApiError } from "../lib/errors/APIError";
import DistributorAdminRepository from "../repositories/DistributorAdminRepository";
import { getCacheKey, redisClient } from "../utils/redis";

interface ProductsServiceOptions {
  limit?: number;
  offset?: number;
  page?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  manufacturerId?: number;
  categoryId?: number;
  search?: string;
  fields?: string[];
  includeSchema?: boolean;
  categoryTags?: string;
}

interface FormattedProductsResponse {
  products: any[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  schema?: any[];
  statistics?: any;
}

class DistributorAdminService {
  /**
   * Retrieves products data with business logic applied
   * @param options Service options for data retrieval and formatting
   * @returns Promise<FormattedProductsResponse>
   */
  public async getProducts(
    options: ProductsServiceOptions = {}
  ): Promise<FormattedProductsResponse> {
    try {
      // Validate and normalize options
      const normalizedOptions = this.normalizeOptions(options);

      // Generate cache key
      const cacheKey = getCacheKey(
        "distributor_admin_products",
        "getProducts",
        JSON.stringify(normalizedOptions)
      );

      // Try to get from cache first
      if (useApiCaching && redisClient) {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          return JSON.parse(cachedResult);
        }
      }

      // Get products data from repository
      const productsResponse =
        await DistributorAdminRepository.getAllProducts(normalizedOptions);

      // Format the response
      const formattedResponse: FormattedProductsResponse = {
        products: this.formatProductsData(productsResponse.data),
        pagination: productsResponse.metadata
      };

      // Include schema if requested
      if (options.includeSchema) {
        formattedResponse.schema =
          await DistributorAdminRepository.getProductsMetadata();
      }

      // Cache the result
      if (useApiCaching && redisClient) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(formattedResponse)
        );
      }

      return formattedResponse;
    } catch (error) {
      console.error("Error in DistributorAdminService.getProducts:", error);
      throw new ApiError(500, "Failed to retrieve products data");
    }
  }

  /**
   * Retrieves products metadata/schema information
   * @returns Promise<any[]>
   */
  public async getProductsSchema(): Promise<any[]> {
    try {
      const cacheKey = getCacheKey("distributor_admin_products", "schema");

      // Try to get from cache first
      if (useApiCaching && redisClient) {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          return JSON.parse(cachedResult);
        }
      }

      const schema = await DistributorAdminRepository.getProductsMetadata();

      // Cache the result for longer since schema doesn't change often
      if (useApiCaching && redisClient) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME * 10,
          JSON.stringify(schema)
        );
      }

      return schema;
    } catch (error) {
      console.error(
        "Error in DistributorAdminService.getProductsSchema:",
        error
      );
      throw new ApiError(500, "Failed to retrieve products schema");
    }
  }

  /**
   * Retrieves products statistics for dashboard
   * @returns Promise<any>
   */
  public async getProductsStatistics(): Promise<any> {
    try {
      const cacheKey = getCacheKey("distributor_admin_products", "statistics");

      // Try to get from cache first
      if (useApiCaching && redisClient) {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          return JSON.parse(cachedResult);
        }
      }

      const statistics =
        await DistributorAdminRepository.getProductStatistics();

      // Format statistics with better data types
      const formattedStats = {
        totalProducts: parseInt(statistics.total_products) || 0,
        totalManufacturers: parseInt(statistics.total_manufacturers) || 0,
        totalCategories: parseInt(statistics.total_categories) || 0,
        totalBrands: parseInt(statistics.total_brands) || 0,
        primaryVariants: parseInt(statistics.primary_variants) || 0,
        pricing: {
          average: parseFloat(statistics.average_price) || 0,
          minimum: parseFloat(statistics.min_price) || 0,
          maximum: parseFloat(statistics.max_price) || 0
        }
      };

      // Cache the result
      if (useApiCaching && redisClient) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(formattedStats)
        );
      }

      return formattedStats;
    } catch (error) {
      console.error(
        "Error in DistributorAdminService.getProductsStatistics:",
        error
      );
      throw new ApiError(500, "Failed to retrieve products statistics");
    }
  }

  /**
   * Retrieves distinct values for filtering options
   * @param field The field to get distinct values for
   * @param limit Maximum number of values to return
   * @returns Promise<any[]>
   */
  public async getFilterOptions(
    field: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      // Validate field name and normalize to database column names
      const allowedFields = [
        "brand",
        "manufacturer_id",
        "manufacturerId", // camelCase alias
        "category_id",
        "categoryId", // camelCase alias
        "ranking",
        "primary_variant"
      ];

      if (!allowedFields.includes(field)) {
        throw new ApiError(400, `Invalid field for filter options: ${field}`);
      }

      // Normalize camelCase field names to database column names
      const normalizedField =
        field === "manufacturerId"
          ? "manufacturer_id"
          : field === "categoryId"
            ? "category_id"
            : field;

      const cacheKey = getCacheKey(
        "distributor_admin_products",
        "filter_options",
        normalizedField,
        limit.toString()
      );

      // Try to get from cache first
      if (useApiCaching && redisClient) {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          return JSON.parse(cachedResult);
        }
      }

      const options = await DistributorAdminRepository.getDistinctValues(
        normalizedField,
        limit
      );

      // Cache the result
      if (useApiCaching && redisClient) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(options)
        );
      }

      return options;
    } catch (error) {
      console.error(
        "Error in DistributorAdminService.getFilterOptions:",
        error
      );
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Failed to retrieve filter options");
    }
  }

  /**
   * Normalizes and validates service options
   * @param options Raw service options
   * @returns Normalized options
   */
  private normalizeOptions(options: ProductsServiceOptions): any {
    const normalized: any = {};

    // Handle pagination
    if (options.page && options.page > 0) {
      const limit = Math.min(options.limit || 100, 1000); // Max 1000 per page
      normalized.limit = limit;
      normalized.offset = (options.page - 1) * limit;
    } else {
      normalized.limit = Math.min(options.limit || 100, 1000);
      normalized.offset = Math.max(options.offset || 0, 0);
    }

    // Handle sorting
    const allowedSortFields = [
      "id",
      "name",
      "brand",
      "price",
      "manufacturer_id",
      "category_id",
      "created_at",
      "updated_at",
      "ranking",
      "skus_id"
    ];

    if (options.sortBy && allowedSortFields.includes(options.sortBy)) {
      normalized.sortBy = options.sortBy;
    } else {
      normalized.sortBy = "id";
    }

    normalized.sortOrder = options.sortOrder === "DESC" ? "DESC" : "ASC";

    // Handle filters
    if (options.manufacturerId && options.manufacturerId > 0) {
      normalized.manufacturerId = options.manufacturerId;
    }

    if (options.categoryId && options.categoryId > 0) {
      normalized.categoryId = options.categoryId;
    }

    if (options.search && options.search.trim().length > 0) {
      normalized.search = options.search.trim();
    }

    // Handle field selection
    if (
      options.fields &&
      Array.isArray(options.fields) &&
      options.fields.length > 0
    ) {
      // Validate field names to prevent SQL injection
      const allowedFields = [
        "id",
        "manufacturer_id",
        "category_id",
        "skus_id",
        "unit_skus_id",
        "box_skus_id",
        "case_skus_id",
        "name",
        "brand",
        "price",
        "ranking",
        "primary_variant",
        "category_tags_json",
        "sandstrom_internal_code",
        "pitco_internal_code",
        "demo_internal_code",
        "merrill_internal_code",
        "created_at",
        "updated_at"
      ];

      normalized.fields = options.fields.filter((field) =>
        allowedFields.includes(field)
      );
    }

    // Handle category tags filter
    if (options.categoryTags && options.categoryTags.trim().length > 0) {
      normalized.categoryTags = options.categoryTags.trim();
    }

    return normalized;
  }

  /**
   * Formats products data for consistent API response
   * @param products Raw products data from repository
   * @returns Formatted products data
   */
  private formatProductsData(products: any[]): any[] {
    return products.map((product) => {
      const productData = product.toJSON ? product.toJSON() : product;

      return {
        id: productData.id,
        manufacturerId:
          productData.manufacturerId || productData.manufacturer_id,
        categoryId: productData.categoryId || productData.category_id,
        sku: productData.skusId || productData.skus_id,
        unitSku: productData.unitSkusId || productData.unit_skus_id,
        boxSku: productData.boxSkusId || productData.box_skus_id,
        caseSku: productData.caseSkusId || productData.case_skus_id,
        name: productData.name,
        brand: productData.brand,
        price: parseFloat(productData.price) || 0,
        ranking: productData.ranking,
        primaryVariant: Boolean(
          productData.primaryVariant || productData.primary_variant
        ),
        categoryTags:
          productData.CategoryTagsJson || productData.category_tags_json,
        internalCodes: {
          sandstrom:
            productData.sandstromInternalCode ||
            productData.sandstrom_internal_code,
          pitco:
            productData.pitcoInternalCode || productData.pitco_internal_code,
          demo: productData.demoInternalCode || productData.demo_internal_code,
          merrill:
            productData.merrillInternalCode || productData.merrill_internal_code
        },
        manufacturer: productData.manufacturer,
        category: productData.category,
        createdAt: productData.createdAt || productData.created_at,
        updatedAt: productData.updatedAt || productData.updated_at
      };
    });
  }

  /**
   * Retrieves all product categories with product counts
   * @returns Promise<any[]>
   */
  public async getCategories(): Promise<any[]> {
    try {
      const cacheKey = getCacheKey("distributor_admin_products", "categories");

      // Try to get from cache first
      if (useApiCaching && redisClient) {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          return JSON.parse(cachedResult);
        }
      }

      const categories = await DistributorAdminRepository.getCategories();

      // Format the categories for consistent response
      const formattedCategories = categories.map((category: any) => ({
        id: category.id,
        name: category.name,
        description: category.description,
        productCount: parseInt(category.product_count) || 0,
        createdAt: category.created_at,
        updatedAt: category.updated_at
      }));

      // Cache the result
      if (useApiCaching && redisClient) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME * 2, // Categories don't change often, cache longer
          JSON.stringify(formattedCategories)
        );
      }

      return formattedCategories;
    } catch (error) {
      console.error("Error in DistributorAdminService.getCategories:", error);
      throw new ApiError(500, "Failed to retrieve product categories");
    }
  }

  /**
   * Retrieves all manufacturers with product counts
   * @returns Promise<any[]>
   */
  public async getManufacturers(): Promise<any[]> {
    try {
      const cacheKey = getCacheKey(
        "distributor_admin_products",
        "manufacturers"
      );

      // Try to get from cache first
      if (useApiCaching && redisClient) {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          return JSON.parse(cachedResult);
        }
      }

      const manufacturers = await DistributorAdminRepository.getManufacturers();

      // Format the manufacturers for consistent response
      const formattedManufacturers = manufacturers.map((manufacturer: any) => ({
        id: manufacturer.id,
        name: manufacturer.name,
        logo: manufacturer.logo,
        productCount: parseInt(manufacturer.product_count) || 0,
        createdAt: manufacturer.created_at,
        updatedAt: manufacturer.updated_at
      }));

      // Cache the result
      if (useApiCaching && redisClient) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME * 2, // Manufacturers don't change often, cache longer
          JSON.stringify(formattedManufacturers)
        );
      }

      return formattedManufacturers;
    } catch (error) {
      console.error(
        "Error in DistributorAdminService.getManufacturers:",
        error
      );
      throw new ApiError(500, "Failed to retrieve manufacturers");
    }
  }

  /**
   * Retrieves all authorized distributor manufacturers
   * @returns Promise<any[]>
   */
  public async getAuthorizedDistributorManufacturers(): Promise<any[]> {
    try {
      const cacheKey = getCacheKey(
        "distributor_admin_products",
        "authorized_distributor_manufacturers"
      );

      // Try to get from cache first
      if (useApiCaching && redisClient) {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          return JSON.parse(cachedResult);
        }
      }

      const authorizedData =
        await DistributorAdminRepository.getAuthorizedDistributorManufacturers();

      // Format the response for consistent API response
      const formattedData = authorizedData.map((item: any) => ({
        distributorName: item.organization_name,
        manufacturerName: item.name
      }));

      // Cache the result
      if (useApiCaching && redisClient) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME * 2, // Authorization data doesn't change often, cache longer
          JSON.stringify(formattedData)
        );
      }

      return formattedData;
    } catch (error) {
      console.error(
        "Error in DistributorAdminService.getAuthorizedDistributorManufacturers:",
        error
      );
      throw new ApiError(
        500,
        "Failed to retrieve authorized distributor manufacturers"
      );
    }
  }

  /**
   * Retrieves store lookup data with filters and validation
   * @param storeName - Store name filter (required)
   * @param startDate - Start date filter for transaction date range (optional, format: YYYY-MM-DD)
   * @param endDate - End date filter for transaction date range (optional, format: YYYY-MM-DD)
   * @param manufacturerName - Manufacturer name filter (optional)
   * @returns Promise<any[]>
   */
  public async getStoreLookup(
    storeName: string,
    startDate?: string,
    endDate?: string,
    manufacturerName?: string,
    categoryTags?: string
  ): Promise<any[]> {
    try {
      // Validate required parameters
      if (!storeName) {
        throw new ApiError(400, "Store name is required");
      }

      // Validate optional date formats (YYYY-MM-DD)
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;

      if (startDate) {
        if (!datePattern.test(startDate)) {
          throw new ApiError(400, "Start date must be in YYYY-MM-DD format");
        }
        const parsedStartDate = new Date(startDate);
        if (
          isNaN(parsedStartDate.getTime()) ||
          parsedStartDate.toISOString().split("T")[0] !== startDate
        ) {
          throw new ApiError(400, "Invalid start date provided");
        }
      }

      if (endDate) {
        if (!datePattern.test(endDate)) {
          throw new ApiError(400, "End date must be in YYYY-MM-DD format");
        }
        const parsedEndDate = new Date(endDate);
        if (
          isNaN(parsedEndDate.getTime()) ||
          parsedEndDate.toISOString().split("T")[0] !== endDate
        ) {
          throw new ApiError(400, "Invalid end date provided");
        }
      }

      // Validate date range logic
      if (startDate && endDate) {
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (start > end) {
          throw new ApiError(
            400,
            "Start date must be before or equal to end date"
          );
        }
      }

      // Basic validation for categoryTags if provided
      if (categoryTags && categoryTags.trim().length === 0) {
        throw new ApiError(400, "Category tags cannot be empty");
      }

      // Get data from repository
      const lookupData = await DistributorAdminRepository.getStoreLookup(
        `%${storeName}%`,
        startDate,
        endDate,
        manufacturerName,
        categoryTags
      );

      // Format the response for consistent API response
      const formattedData = lookupData.map((item: any) => ({
        storeName: item.name || item.store_name,
        manufacturerName: item.manufacturer_name,
        productName: item.product_name,
        productId: item.product_id,
        matchedSkuType: item.matched_sku_type,
        transactionDate: item.transaction_date,
        categoryTags: item.category_tags_json,
        totalUnits: parseInt(item.total_units) || 0,
        warehouse: item.warehouse
      }));

      return formattedData;
    } catch (error) {
      console.error("Error in DistributorAdminService.getStoreLookup:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Failed to retrieve store lookup data");
    }
  }

  /**
   * Retrieves all manufacturer names that have products
   * @returns Promise<string[]>
   */
  public async getAllManufacturersFromProducts(): Promise<string[]> {
    try {
      const cacheKey = getCacheKey(
        "distributor_admin_products",
        "all_manufacturers_from_products"
      );

      // Try to get from cache first
      if (useApiCaching && redisClient) {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          return JSON.parse(cachedResult);
        }
      }

      const manufacturers =
        await DistributorAdminRepository.getAllManufacturersFromProducts();

      // Extract only the manufacturer names
      const manufacturerNames = manufacturers.map(
        (manufacturer: any) => manufacturer.name
      );

      // Cache the result
      if (useApiCaching && redisClient) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME * 3, // Manufacturers don't change often, cache longer
          JSON.stringify(manufacturerNames)
        );
      }

      return manufacturerNames;
    } catch (error) {
      console.error(
        "Error in DistributorAdminService.getAllManufacturersFromProducts:",
        error
      );
      throw new ApiError(500, "Failed to retrieve manufacturers from products");
    }
  }

  /**
   * Retrieves programs with filters for super admin
   * @param participantType - Filter by participant type (SALES_REP/DISTRIBUTOR/STORE)
   * @param manufacturerName - Filter by manufacturer name
   * @param startDate - Filter by programs starting before this date
   * @param endDate - Filter by programs ending after this date
   * @param distributorName - Filter by distributor organization name
   * @returns Promise<any[]>
   */
  public async getProgramsWithFilters(
    participantType?: string,
    manufacturerName?: string,
    startDate?: string,
    endDate?: string,
    distributorName?: string
  ): Promise<any[]> {
    try {
      // Validate participant type if provided
      if (participantType) {
        const validParticipantTypes = ["SALES_REP", "DISTRIBUTOR", "STORE"];
        if (!validParticipantTypes.includes(participantType.toUpperCase())) {
          throw new ApiError(
            400,
            "Invalid participant type. Must be one of: SALES_REP, DISTRIBUTOR, STORE"
          );
        }
      }

      // Validate date formats (YYYY-MM-DD) if provided
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;

      if (startDate) {
        if (!datePattern.test(startDate)) {
          throw new ApiError(400, "Start date must be in YYYY-MM-DD format");
        }
        const parsedStartDate = new Date(startDate);
        if (
          isNaN(parsedStartDate.getTime()) ||
          parsedStartDate.toISOString().split("T")[0] !== startDate
        ) {
          throw new ApiError(400, "Invalid start date provided");
        }
      }

      if (endDate) {
        if (!datePattern.test(endDate)) {
          throw new ApiError(400, "End date must be in YYYY-MM-DD format");
        }
        const parsedEndDate = new Date(endDate);
        if (
          isNaN(parsedEndDate.getTime()) ||
          parsedEndDate.toISOString().split("T")[0] !== endDate
        ) {
          throw new ApiError(400, "Invalid end date provided");
        }
      }

      // Generate cache key
      const cacheKeyParts = ["getPrograms"];
      if (participantType)
        cacheKeyParts.push(`participant-${participantType.toLowerCase()}`);
      if (manufacturerName)
        cacheKeyParts.push(`manufacturer-${manufacturerName.toLowerCase()}`);
      if (startDate) cacheKeyParts.push(`start-${startDate}`);
      if (endDate) cacheKeyParts.push(`end-${endDate}`);
      if (distributorName)
        cacheKeyParts.push(`distributor-${distributorName.toLowerCase()}`);

      const cacheKey = getCacheKey(
        "distributor_admin_programs",
        cacheKeyParts.join("_")
      );

      // Try to get from cache first
      if (useApiCaching && redisClient) {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          return JSON.parse(cachedResult);
        }
      }

      // If distributorName is provided, get distributor ID first
      let distributorId: number | undefined;
      if (distributorName) {
        const foundDistributorId =
          await DistributorAdminRepository.getDistributorIdByOrganizationName(
            distributorName
          );

        if (!foundDistributorId) {
          throw new ApiError(
            404,
            `Distributor with organization name '${distributorName}' not found`
          );
        }

        distributorId = foundDistributorId;
      }

      // Get programs data from repository (with optional distributor filtering)
      const programs = await DistributorAdminRepository.getProgramsWithFilters(
        participantType?.toUpperCase(),
        manufacturerName,
        startDate,
        endDate,
        distributorId
      );

      // Group programs by program_id and format the response
      const programsMap = new Map();

      programs.forEach((program: any) => {
        const programId = program.program_id;

        // Extract program details (everything that's not program-level info)
        const programDetail = {
          id: program.id,
          tier: program.tier,
          minQty: parseFloat(program.min_qty) || 0,
          maxQty: program.max_qty ? parseFloat(program.max_qty) : null,
          rebateAmount: program.rebate_amount
            ? parseFloat(program.rebate_amount)
            : null,
          rebatePercentage: program.rebate_percentage
            ? parseFloat(program.rebate_percentage)
            : null,
          rebateType: program.rebate_type,
          requiredEssentialSkus: program.required_essential_skus,
          requiredFlexSkus: program.required_flex_skus,
          requiredCoreSkus: program.required_core_skus,
          daysCriteria: program.days_criteria,
          programLine: program.program_line,
          description: program.description,
          overview: program.overview,
          rebateCalculation: program.rebate_calculation,
          rebatableProducts: program.rebatable_products,
          dependency: program.dependecy, // Note: typo in database field name
          minSpend: parseFloat(program.min_spend) || 0,
          maxRebate: parseFloat(program.max_rebate) || 0,
          productsTags: program.products_tags,
          productsTagsQty: program.products_tags_qty,
          productsTagsQtyMax: program.products_tags_qty_max,
          criteria: program.criteria,
          points: program.points,
          rebateCalculationType: program.rebate_calculation_type,
          quantityType: program.quantity_type,
          isOther: program.is_other,
          pointsPerSku: program.points_per_sku,
          percentagePerPoint: program.percentage_per_point,
          maxPoints: program.max_points,
          targetQualifyingEntities: program.target_qualifying_entities,
          fixedRebateCategory: program.fixed_rebate_category,
          fixedRebateAmount: program.fixed_rebate_amount,
          growthNeeded: program.growth_needed
            ? parseFloat(program.growth_needed)
            : null,
          baselinePeriodStart: program.baseline_period_start,
          baselinePeriodEnd: program.baseline_period_end,
          createdAt: program.created_at,
          updatedAt: program.updated_at,
          deletedAt: program.deleted_at
        };

        if (!programsMap.has(programId)) {
          // First time seeing this program_id, create the program entry
          programsMap.set(programId, {
            programId: programId,
            manufacturerName: program.manufacturer_name,
            programName: program.program_name,
            participantType: program.participant_type,
            programType: program.program_type,
            startDate: program.start_date,
            endDate: program.end_date,
            approvalStatus: program.approval_status,
            visibilityScope: program.visibility_scope,
            internalInitiative: program.internal_initiative,
            programDetails: [programDetail]
          });
        } else {
          // Program already exists, just add this detail to the array
          programsMap.get(programId).programDetails.push(programDetail);
        }
      });

      // Convert map to array and sort program details by tier
      const formattedPrograms = Array.from(programsMap.values()).map(
        (program) => ({
          ...program,
          programDetails: program.programDetails.sort(
            (a: any, b: any) => a.tier - b.tier
          )
        })
      );

      // Cache the result
      if (useApiCaching && redisClient) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME,
          JSON.stringify(formattedPrograms)
        );
      }

      return formattedPrograms;
    } catch (error) {
      console.error(
        "Error in DistributorAdminService.getProgramsWithFilters:",
        error
      );
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Failed to retrieve programs with filters");
    }
  }

  /**
   * Retrieves all distributors with organization names
   * @returns Promise<any[]>
   */
  public async getAllDistributors(): Promise<any[]> {
    try {
      const cacheKey = getCacheKey("distributor_admin", "getAllDistributors");

      // Try to get from cache first
      if (useApiCaching && redisClient) {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          return JSON.parse(cachedResult);
        }
      }

      const distributors =
        await DistributorAdminRepository.getAllDistributors();

      // Cache the result
      if (useApiCaching && redisClient) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME * 2, // Cache longer since distributor data doesn't change often
          JSON.stringify(distributors)
        );
      }

      return distributors;
    } catch (error) {
      console.error(
        "Error in DistributorAdminService.getAllDistributors:",
        error
      );
      throw new ApiError(500, "Failed to retrieve distributors");
    }
  }

  /**
   * Retrieves distinct category tags for a specific manufacturer
   * @param manufacturerId - The manufacturer ID to get category tags for
   * @returns Promise<any[]>
   */
  public async getCategoryTags(manufacturerId: number): Promise<any[]> {
    try {
      // Validate manufacturer ID
      if (!manufacturerId || manufacturerId < 1) {
        throw new ApiError(400, "Valid manufacturer ID is required");
      }

      const cacheKey = getCacheKey(
        "distributor_admin",
        "getCategoryTags",
        manufacturerId.toString()
      );

      // Try to get from cache first
      if (useApiCaching && redisClient) {
        const cachedResult = await redisClient.get(cacheKey);
        if (cachedResult) {
          return JSON.parse(cachedResult);
        }
      }

      const categoryTags =
        await DistributorAdminRepository.getCategoryTags(manufacturerId);

      // Cache the result
      if (useApiCaching && redisClient) {
        await redisClient.setEx(
          cacheKey,
          CACHE_TTL_TIME, // Standard cache time for product-related data
          JSON.stringify(categoryTags)
        );
      }

      return categoryTags;
    } catch (error) {
      console.error("Error in DistributorAdminService.getCategoryTags:", error);
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError(500, "Failed to retrieve category tags");
    }
  }
}

export default new DistributorAdminService();
