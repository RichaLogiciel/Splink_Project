import { FindOptions, Op, QueryTypes } from "sequelize";
import sequelize from "../db";
import Distributor from "../models/Distributor";
import Manufacturer from "../models/Manufacturer";
import Product from "../models/Product";
import ProductCategory from "../models/ProductCategory";

interface ProductsQueryOptions {
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  manufacturerId?: number;
  categoryId?: number;
  search?: string;
  fields?: string[];
  categoryTags?: string;
}

interface ProductMetadata {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: any;
  description?: string;
}

interface ProductsResponse {
  data: any[];
  metadata: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
  schema?: ProductMetadata[];
}

class DistributorAdminRepository {
  /**
   * Retrieves all products with metadata for distributor admin analytics
   * @param options Query options for filtering, pagination, and sorting
   * @returns Promise<ProductsResponse>
   */
  public async getAllProducts(
    options: ProductsQueryOptions = {}
  ): Promise<ProductsResponse> {
    try {
      const {
        limit = 100,
        offset = 0,
        sortBy = "id",
        sortOrder = "ASC",
        manufacturerId,
        categoryId,
        search,
        fields,
        categoryTags
      } = options;

      // Build where conditions
      const whereConditions: any = {
        deleted_at: null // Only non-deleted products
      };

      if (manufacturerId) {
        whereConditions.manufacturer_id = manufacturerId;
      }

      if (categoryId) {
        whereConditions.category_id = categoryId;
      }

      if (search) {
        const searchTerm = search.trim();
        if (searchTerm.length > 0) {
          // Use case-insensitive search with explicit LOWER() function
          whereConditions[Op.or] = [
            sequelize.where(
              sequelize.fn("LOWER", sequelize.col("Product.name")),
              "LIKE",
              `%${searchTerm.toLowerCase()}%`
            ),
            sequelize.where(
              sequelize.fn("LOWER", sequelize.col("Product.brand")),
              "LIKE",
              `%${searchTerm.toLowerCase()}%`
            ),
            sequelize.where(
              sequelize.fn(
                "LOWER",
                sequelize.cast(sequelize.col("Product.skus_id"), "TEXT")
              ),
              "LIKE",
              `%${searchTerm.toLowerCase()}%`
            )
          ];
        }
      }

      // Add category tags filtering
      if (categoryTags) {
        // Filter products that contain the specified category tag string
        // Using LIKE to search for the tag string within the JSON
        whereConditions[Op.and] = [
          ...(whereConditions[Op.and] || []),
          sequelize.where(
            sequelize.cast(sequelize.col("Product.category_tags_json"), "TEXT"),
            "LIKE",
            `%${categoryTags}%`
          )
        ];
      }

      // Build query options
      const queryOptions: FindOptions = {
        where: whereConditions,
        limit,
        offset,
        order: [[sortBy, sortOrder]],
        include: [
          {
            model: Manufacturer,
            as: "manufacturer",
            attributes: ["id", "name", "logo"]
          },
          {
            model: ProductCategory,
            as: "category",
            attributes: ["id", "name", "description"]
          }
        ]
      };

      // Add field selection if specified
      if (fields && fields.length > 0) {
        queryOptions.attributes = fields;
      }

      // Execute queries
      const [products, totalCount] = await Promise.all([
        Product.findAll(queryOptions),
        Product.count({ where: whereConditions })
      ]);

      // Calculate metadata
      const totalPages = Math.ceil(totalCount / limit);
      const currentPage = Math.floor(offset / limit) + 1;

      return {
        data: products,
        metadata: {
          total: totalCount,
          page: currentPage,
          limit,
          totalPages,
          hasNext: currentPage < totalPages,
          hasPrevious: currentPage > 1
        }
      };
    } catch (error) {
      console.error("Error in getAllProducts:", error);
      throw error;
    }
  }

  /**
   * Retrieves schema information for the products table
   * @returns Promise<ProductMetadata[]>
   */
  public async getProductsMetadata(): Promise<ProductMetadata[]> {
    try {
      const query = `
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default,
          character_maximum_length,
          numeric_precision,
          numeric_scale
        FROM information_schema.columns 
        WHERE table_name = 'products' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `;

      const result = await sequelize.query(query, {
        type: QueryTypes.SELECT
      });

      return (result as any[]).map((column) => ({
        columnName: column.column_name,
        dataType: this.formatDataType(column),
        isNullable: column.is_nullable === "YES",
        defaultValue: column.column_default,
        description: this.getColumnDescription(column.column_name)
      }));
    } catch (error) {
      console.error("Error in getProductsMetadata:", error);
      throw error;
    }
  }

  /**
   * Gets distinct values for specified column (useful for filtering options)
   * @param columnName The column to get distinct values for
   * @param limit Maximum number of values to return
   * @returns Promise<any[]>
   */
  public async getDistinctValues(
    columnName: string,
    limit: number = 50
  ): Promise<any[]> {
    try {
      const validColumns = [
        "brand",
        "manufacturer_id",
        "category_id",
        "ranking",
        "primary_variant"
      ];

      if (!validColumns.includes(columnName)) {
        throw new Error(`Invalid column name: ${columnName}`);
      }

      const query = `
        SELECT DISTINCT ${columnName} as value, COUNT(*) as count
        FROM products 
        WHERE deleted_at IS NULL AND ${columnName} IS NOT NULL
        GROUP BY ${columnName}
        ORDER BY count DESC
        LIMIT ${limit};
      `;

      const result = await sequelize.query(query, {
        type: QueryTypes.SELECT
      });

      return result as any[];
    } catch (error) {
      console.error("Error in getDistinctValues:", error);
      throw error;
    }
  }

  /**
   * Gets product statistics for dashboard analytics
   * @returns Promise<any>
   */
  public async getProductStatistics(): Promise<any> {
    try {
      const query = `
        SELECT 
          COUNT(*) as total_products,
          COUNT(DISTINCT manufacturer_id) as total_manufacturers,
          COUNT(DISTINCT category_id) as total_categories,
          COUNT(DISTINCT brand) as total_brands,
          COUNT(CASE WHEN primary_variant = true THEN 1 END) as primary_variants,
          AVG(price) as average_price,
          MIN(price) as min_price,
          MAX(price) as max_price
        FROM products 
        WHERE deleted_at IS NULL;
      `;

      const result = await sequelize.query(query, {
        type: QueryTypes.SELECT
      });

      return (result as any[])[0];
    } catch (error) {
      console.error("Error in getProductStatistics:", error);
      throw error;
    }
  }

  /**
   * Formats data type information for better readability
   * @param column Column information from information_schema
   * @returns string
   */
  private formatDataType(column: any): string {
    let dataType = column.data_type;

    if (column.character_maximum_length) {
      dataType += `(${column.character_maximum_length})`;
    } else if (column.numeric_precision && column.numeric_scale) {
      dataType += `(${column.numeric_precision},${column.numeric_scale})`;
    }

    return dataType;
  }

  /**
   * Provides human-readable descriptions for column names
   * @param columnName The column name
   * @returns string
   */
  private getColumnDescription(columnName: string): string {
    const descriptions: Record<string, string> = {
      id: "Unique product identifier",
      manufacturer_id: "Reference to manufacturer",
      category_id: "Reference to product category",
      skus_id: "Stock Keeping Unit identifier",
      unit_skus_id: "Unit-level SKU identifier",
      box_skus_id: "Box-level SKU identifier",
      case_skus_id: "Case-level SKU identifier",
      name: "Product name",
      brand: "Product brand name",
      price: "Product price in USD",
      ranking: "Product ranking/classification",
      primary_variant: "Primary product variant flag",
      category_tags_json: "Category tags in JSON format",
      sandstrom_internal_code: "Sandstrom internal product code",
      pitco_internal_code: "Pitco internal product code",
      demo_internal_code: "Demo internal product code",
      merrill_internal_code: "Merrill internal product code",
      created_at: "Record creation timestamp",
      updated_at: "Record last update timestamp",
      deleted_at: "Record soft deletion timestamp"
    };

    return descriptions[columnName] || "No description available";
  }

  /**
   * Retrieves all product categories with product counts
   * @returns Promise<any[]>
   */
  public async getCategories(): Promise<any[]> {
    try {
      const query = `
        SELECT 
          pc.id,
          pc.name,
          pc.description,
          pc.created_at,
          pc.updated_at,
          COUNT(p.id) as product_count
        FROM product_categories pc
        LEFT JOIN products p ON pc.id = p.category_id AND p.deleted_at IS NULL
        WHERE pc.deleted_at IS NULL
        GROUP BY pc.id, pc.name, pc.description, pc.created_at, pc.updated_at
        ORDER BY pc.name ASC;
      `;

      const result = await sequelize.query(query, {
        type: QueryTypes.SELECT
      });

      return result as any[];
    } catch (error) {
      console.error("Error in getCategories:", error);
      throw error;
    }
  }

  /**
   * Retrieves all manufacturers with product counts
   * @returns Promise<any[]>
   */
  public async getManufacturers(): Promise<any[]> {
    try {
      const query = `
        SELECT 
          m.id,
          m.name,
          m.logo,
          m.created_at,
          m.updated_at,
          COUNT(p.id) as product_count
        FROM manufacturers m
        LEFT JOIN products p ON m.id = p.manufacturer_id AND p.deleted_at IS NULL
        WHERE m.deleted_at IS NULL
        GROUP BY m.id, m.name, m.logo, m.created_at, m.updated_at
        ORDER BY m.name ASC;
      `;

      const result = await sequelize.query(query, {
        type: QueryTypes.SELECT
      });

      return result as any[];
    } catch (error) {
      console.error("Error in getManufacturers:", error);
      throw error;
    }
  }

  /**
   * Retrieves all authorized distributor manufacturers
   * @returns Promise<any[]>
   */
  public async getAuthorizedDistributorManufacturers(): Promise<any[]> {
    try {
      const query = `
        SELECT 
          d.organization_name,  
          m.name
        FROM authorized_distributor_manufacturers adm
        JOIN distributors d 
          ON d.id = adm.distributor_id
        JOIN manufacturers m 
          ON m.id = adm.manufacturer_id
        ORDER BY d.organization_name;
      `;

      const result = await sequelize.query(query, {
        type: QueryTypes.SELECT
      });

      return result as any[];
    } catch (error) {
      console.error("Error in getAuthorizedDistributorManufacturers:", error);
      throw error;
    }
  }

  /**
   * Retrieves store lookup data with filters
   * @param storeName - Store name filter (required)
   * @param startDate - Start date filter for transaction date range (optional)
   * @param endDate - End date filter for transaction date range (optional)
   * @param manufacturerName - Manufacturer name filter (optional)
   * @param categoryTags - Category tags filter (optional, JSON string)
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
      // Build dynamic WHERE conditions
      const whereConditions: string[] = [
        "li.seller_type = 'DISTRIBUTOR'",
        "s.name LIKE :storeName"
      ];
      const replacements: any = { storeName };

      if (startDate && endDate) {
        whereConditions.push(
          "li.transaction_date BETWEEN :startDate AND :endDate"
        );
        replacements.startDate = startDate;
        replacements.endDate = endDate;
      } else if (startDate) {
        whereConditions.push("li.transaction_date >= :startDate");
        replacements.startDate = startDate;
      } else if (endDate) {
        whereConditions.push("li.transaction_date <= :endDate");
        replacements.endDate = endDate;
      }

      if (manufacturerName) {
        whereConditions.push("m.name = :manufacturerName");
        replacements.manufacturerName = manufacturerName;
      }

      if (categoryTags) {
        // Filter products that contain the specified category tag string
        // Using LIKE to search for the tag string within the JSON
        whereConditions.push("p.category_tags_json::text LIKE :categoryTags");
        replacements.categoryTags = `%${categoryTags}%`;
      }

      console.log("replacements", replacements);

      const query = `
        SELECT 
          s.name AS store_name,
          m.name AS manufacturer_name,
          p.name AS product_name,
          li.product_id,
          CASE
            WHEN li.product_id = p.unit_skus_id THEN 'each'
            WHEN li.product_id = p.case_skus_id THEN 'case'
            WHEN li.product_id = p.box_skus_id  THEN 'box'
            ELSE 'unknown'
          END AS matched_sku_type,
          li.transaction_date,
          p.category_tags_json,
          li.total_units,
          li.warehouse
        FROM line_items li
        JOIN stores s
          ON li.buyer_id = s.id
        JOIN products p
          ON li.splink_product_id = p.id
        JOIN manufacturers m
          ON m.id = p.manufacturer_id
        WHERE ${whereConditions.join(" AND ")}
        ORDER BY li.transaction_date DESC, p.name ASC;
      `;

      const result = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements
      });

      return result as any[];
    } catch (error) {
      console.error("Error in getStoreLookup:", error);
      throw error;
    }
  }

  /**
   * Retrieves all manufacturer names from products table
   * @returns Promise<any[]>
   */
  public async getAllManufacturersFromProducts(): Promise<any[]> {
    try {
      const query = `
        SELECT DISTINCT
          m.name
        FROM manufacturers m
        INNER JOIN products p ON m.id = p.manufacturer_id
        WHERE m.deleted_at IS NULL
        AND p.deleted_at IS NULL
        ORDER BY m.name ASC;
      `;

      const result = await sequelize.query(query, {
        type: QueryTypes.SELECT
      });

      return result as any[];
    } catch (error) {
      console.error("Error in getAllManufacturersFromProducts:", error);
      throw error;
    }
  }

  /**
   * Retrieves programs with filters for super admin
   * @param participantType - Filter by participant type (SALES_REP/DISTRIBUTOR/STORE)
   * @param manufacturerName - Filter by manufacturer name
   * @param startDate - Filter by programs starting before this date
   * @param endDate - Filter by programs ending after this date
   * @param distributorId - Filter by distributor ID (optional)
   * @returns Promise<any[]>
   */
  public async getProgramsWithFilters(
    participantType?: string,
    manufacturerName?: string,
    startDate?: string,
    endDate?: string,
    distributorId?: number
  ): Promise<any[]> {
    try {
      const whereConditions: string[] = [];
      const replacements: any = {};

      // Add participant type filter
      if (participantType) {
        whereConditions.push("p.participant_type = :participantType");
        replacements.participantType = participantType;
      }

      // Add manufacturer name filter
      if (manufacturerName) {
        whereConditions.push("m.name = :manufacturerName");
        replacements.manufacturerName = manufacturerName;
      }

      // Add start date filter (programs that start before this date)
      if (startDate) {
        whereConditions.push("p.start_date < :startDate");
        replacements.startDate = startDate;
      }

      // Add end date filter (programs that end after this date)
      if (endDate) {
        whereConditions.push("p.end_date > :endDate");
        replacements.endDate = endDate;
      }

      // Handle distributor filter based on participant type
      let distributorJoin = "";
      if (participantType === "SALES_REP") {
        // Special case: SALES_REP programs need program_approvals filter
        // Remove program_compliances join to show all programs regardless of compliance status
        distributorJoin = `JOIN program_approvals pm ON pm.program_detail_id = pd.id`;

        whereConditions.push("pm.status = 'APPROVED'");

        if (distributorId) {
          whereConditions.push("pm.approver_id = :distributorId");
          // Add manufacturer authorization check
          whereConditions.push(`EXISTS (
            SELECT 1
            FROM authorized_distributor_manufacturers adm
            WHERE adm.distributor_id = :distributorId
            AND adm.manufacturer_id = p.manufacturer_id
          )`);
          replacements.distributorId = distributorId;
        }
      } else if (participantType === "DISTRIBUTOR") {
        // DISTRIBUTOR programs: No joins needed, just show all programs with manufacturer authorization
        if (distributorId) {
          // Add manufacturer authorization check
          whereConditions.push(`EXISTS (
            SELECT 1
            FROM authorized_distributor_manufacturers adm
            WHERE adm.distributor_id = :distributorId
            AND adm.manufacturer_id = p.manufacturer_id
          )`);
          replacements.distributorId = distributorId;
        }
      } else if (participantType === "STORE") {
        // STORE programs: Need program_approvals filter like SALES_REP programs
        distributorJoin = `JOIN program_approvals pm ON pm.program_detail_id = pd.id`;

        whereConditions.push("pm.status = 'APPROVED'");

        if (distributorId) {
          whereConditions.push("pm.approver_id = :distributorId");
          // Add manufacturer authorization check
          whereConditions.push(`EXISTS (
            SELECT 1
            FROM authorized_distributor_manufacturers adm
            WHERE adm.distributor_id = :distributorId
            AND adm.manufacturer_id = p.manufacturer_id
          )`);
          replacements.distributorId = distributorId;
        }
      } else if (distributorId) {
        // Standard case: Filter by distributor directly
        distributorJoin = `JOIN program_compliances pc ON pc.program_id = p.id`;
        whereConditions.push(
          "pc.entity_id = :distributorId AND pc.entity_type = 'DISTRIBUTOR'"
        );
        // Add manufacturer authorization check for standard case too
        whereConditions.push(`EXISTS (
          SELECT 1
          FROM authorized_distributor_manufacturers adm
          WHERE adm.distributor_id = :distributorId
          AND adm.manufacturer_id = p.manufacturer_id
        )`);
        replacements.distributorId = distributorId;
      }

      // Build WHERE clause
      const whereClause =
        whereConditions.length > 0
          ? `WHERE ${whereConditions.join(" AND ")}`
          : "";

      const query = `
        SELECT
          m.name AS manufacturer_name,
          p.name AS program_name,
          p.participant_type,
          p.program_type,
          p.start_date,
          p.end_date,
          p.approval_status,
          p.visibility_scope,
          p.internal_initiative,
          pd.*
        FROM programs p
        JOIN program_details pd ON pd.program_id = p.id
        JOIN manufacturers m ON p.manufacturer_id = m.id
        ${distributorJoin}
        ${whereClause}
        ORDER BY m.name ASC, p.start_date DESC, p.name ASC;
      `;

      const result = await sequelize.query(query, {
        type: QueryTypes.SELECT,
        replacements
      });

      return result as any[];
    } catch (error) {
      console.error("Error in getProgramsWithFilters:", error);
      throw error;
    }
  }

  /**
   * Retrieves all distributors with organization names
   * @returns Promise<any[]>
   */
  public async getAllDistributors(): Promise<any[]> {
    try {
      // Use Sequelize model to get proper field mapping (organization_name -> organizationName)
      const distributors = await Distributor.findAll({
        where: {
          organizationName: {
            [Op.ne]: null
          }
        },
        raw: true
      });

      return distributors;
    } catch (error) {
      console.error("Error in getAllDistributors:", error);
      throw error;
    }
  }

  /**
   * Retrieves distributor ID by organization name
   * @param organizationName - The organization name to search for
   * @returns Promise<number | null>
   */
  public async getDistributorIdByOrganizationName(
    organizationName: string
  ): Promise<number | null> {
    try {
      const distributor = await Distributor.findOne({
        where: {
          organizationName: organizationName
        },
        attributes: ["id"],
        raw: true
      });

      return distributor ? distributor.id : null;
    } catch (error) {
      console.error("Error in getDistributorIdByOrganizationName:", error);
      throw error;
    }
  }

  /**
   * Retrieves distinct category tags for a specific manufacturer
   * @param manufacturerId - The manufacturer ID to get category tags for
   * @returns Promise<any[]>
   */
  public async getCategoryTags(manufacturerId: number): Promise<any[]> {
    try {
      const query = `
        SELECT DISTINCT(category_tags_json)
        FROM products
        WHERE manufacturer_id = :manufacturerId
          AND category_tags_json IS NOT NULL
        ORDER BY category_tags_json
      `;

      const results = await sequelize.query(query, {
        replacements: { manufacturerId },
        type: QueryTypes.SELECT
      });

      // Extract the category_tags_json values from the result objects
      return results.map((result: any) => result.category_tags_json);
    } catch (error) {
      console.error("Error in getCategoryTags:", error);
      throw error;
    }
  }
}

export default new DistributorAdminRepository();
