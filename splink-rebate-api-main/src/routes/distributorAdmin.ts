import { Router } from "express";
import DistributorAdminController from "../controllers/DistributorAdminController";
import asyncHandler from "../middleware/asyncHandler";

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Distributor Admin
 *     description: API endpoints for distributor admin dashboard and analytics
 *
 * /distributor-admin/products:
 *   get:
 *     summary: Retrieve all products with metadata for distributor admin dashboard
 *     description: |
 *       Returns paginated list of products with comprehensive metadata.
 *       Supports filtering by manufacturer, category, search terms, and category tags,
 *       along with sorting, field selection, and schema inclusion.
 *       Restricted to distributor admins and super admins only.
 *     tags: [Distributor Admin]
 *     parameters:
 *       - name: page
 *         in: query
 *         required: false
 *         description: Page number for pagination (1-10000)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 10000
 *           default: 1
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Number of products per page (1-1000)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 1000
 *           default: 100
 *       - name: sortBy
 *         in: query
 *         required: false
 *         description: Field to sort by
 *         schema:
 *           type: string
 *           enum: [id, name, brand, price, manufacturer_id, category_id, created_at, updated_at, ranking, skus_id]
 *           default: id
 *       - name: sortOrder
 *         in: query
 *         required: false
 *         description: Sort order
 *         schema:
 *           type: string
 *           enum: [ASC, DESC]
 *           default: ASC
 *       - name: manufacturerId
 *         in: query
 *         required: false
 *         description: Filter by manufacturer ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - name: categoryId
 *         in: query
 *         required: false
 *         description: Filter by category ID
 *         schema:
 *           type: integer
 *           minimum: 1
 *       - name: search
 *         in: query
 *         required: false
 *         description: Search in product name, brand, or SKU
 *         schema:
 *           type: string
 *           maxLength: 255
 *       - name: fields
 *         in: query
 *         required: false
 *         description: Comma-separated list of fields to include in response
 *         schema:
 *           type: string
 *           example: "id,name,brand,price"
 *       - name: includeSchema
 *         in: query
 *         required: false
 *         description: Include table schema metadata in response
 *         schema:
 *           type: boolean
 *           default: false
 *       - name: categoryTags
 *         in: query
 *         required: false
 *         description: Category tag string to filter products by (optional, partial string match)
 *         schema:
 *           type: string
 *           maxLength: 100
 *           example: 'essential'
 *     responses:
 *       200:
 *         description: Products retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Products retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     products:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                             example: 123
 *                           manufacturerId:
 *                             type: integer
 *                             example: 5
 *                           categoryId:
 *                             type: integer
 *                             example: 2
 *                           sku:
 *                             type: string
 *                             example: "ABC123"
 *                           unitSku:
 *                             type: string
 *                             example: "ABC123-UNIT"
 *                           boxSku:
 *                             type: string
 *                             example: "ABC123-BOX"
 *                           caseSku:
 *                             type: string
 *                             example: "ABC123-CASE"
 *                           name:
 *                             type: string
 *                             example: "Sample Product"
 *                           brand:
 *                             type: string
 *                             example: "Brand Name"
 *                           price:
 *                             type: number
 *                             format: float
 *                             example: 29.99
 *                           ranking:
 *                             type: string
 *                             example: "A"
 *                           primaryVariant:
 *                             type: boolean
 *                             example: true
 *                           categoryTags:
 *                             type: object
 *                             example: {"isEssential": true, "isFlex": false}
 *                           internalCodes:
 *                             type: object
 *                             properties:
 *                               sandstrom:
 *                                 type: string
 *                               pitco:
 *                                 type: string
 *                               demo:
 *                                 type: string
 *                               merrill:
 *                                 type: string
 *                           manufacturer:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               logo:
 *                                 type: string
 *                           category:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: integer
 *                               name:
 *                                 type: string
 *                               description:
 *                                 type: string
 *                           createdAt:
 *                             type: string
 *                             format: date-time
 *                           updatedAt:
 *                             type: string
 *                             format: date-time
 *                     pagination:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: integer
 *                           example: 1500
 *                         page:
 *                           type: integer
 *                           example: 1
 *                         limit:
 *                           type: integer
 *                           example: 100
 *                         totalPages:
 *                           type: integer
 *                           example: 15
 *                         hasNext:
 *                           type: boolean
 *                           example: true
 *                         hasPrevious:
 *                           type: boolean
 *                           example: false
 *                     schema:
 *                       type: array
 *                       description: Table schema metadata (only included if includeSchema=true)
 *                       items:
 *                         type: object
 *                         properties:
 *                           columnName:
 *                             type: string
 *                           dataType:
 *                             type: string
 *                           isNullable:
 *                             type: boolean
 *                           defaultValue:
 *                             type: string
 *                           description:
 *                             type: string
 *       400:
 *         description: Bad request - invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   examples:
 *                     invalid_page:
 *                       value: "Page must be between 1 and 10000"
 *                     invalid_limit:
 *                       value: "Limit must be between 1 and 1000"
 *                     invalid_manufacturer_id:
 *                       value: "Manufacturer ID must be a positive integer"
 *                     invalid_category_id:
 *                       value: "Category ID must be a positive integer"
 *                     invalid_sort_order:
 *                       value: "Sort order must be ASC or DESC"
 *                     invalid_category_tags_type:
 *                       value: "Invalid parameter type: categoryTags must be a string"
 *                     category_tags_too_long:
 *                       value: "Invalid parameter: categoryTags must be 100 characters or less"
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Access restricted to distributor admins"
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.get("/products", asyncHandler(DistributorAdminController.getProducts));

/**
 * @swagger
 * /distributor-admin/products/schema:
 *   get:
 *     summary: Retrieve products table schema metadata
 *     description: |
 *       Returns detailed schema information for the products table including
 *       column names, data types, nullability, and descriptions.
 *       Useful for dynamic form generation and data validation.
 *     tags: [Distributor Admin]
 *     responses:
 *       200:
 *         description: Products schema retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Products schema retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       columnName:
 *                         type: string
 *                         example: "id"
 *                       dataType:
 *                         type: string
 *                         example: "integer"
 *                       isNullable:
 *                         type: boolean
 *                         example: false
 *                       defaultValue:
 *                         type: string
 *                         example: "nextval('products_id_seq'::regclass)"
 *                       description:
 *                         type: string
 *                         example: "Unique product identifier"
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/products/schema",
  asyncHandler(DistributorAdminController.getProductsSchema)
);

/**
 * @swagger
 * /distributor-admin/products/statistics:
 *   get:
 *     summary: Retrieve products statistics for dashboard
 *     description: |
 *       Returns comprehensive statistics about products including
 *       counts by various categories, pricing information, and recommendations.
 *     tags: [Distributor Admin]
 *     responses:
 *       200:
 *         description: Products statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Products statistics retrieved successfully"
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalProducts:
 *                       type: integer
 *                       example: 1500
 *                     totalManufacturers:
 *                       type: integer
 *                       example: 25
 *                     totalCategories:
 *                       type: integer
 *                       example: 12
 *                     totalBrands:
 *                       type: integer
 *                       example: 45
 *                     primaryVariants:
 *                       type: integer
 *                       example: 1200
 *                     pricing:
 *                       type: object
 *                       properties:
 *                         average:
 *                           type: number
 *                           format: float
 *                           example: 24.99
 *                         minimum:
 *                           type: number
 *                           format: float
 *                           example: 0.99
 *                         maximum:
 *                           type: number
 *                           format: float
 *                           example: 299.99
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/products/statistics",
  asyncHandler(DistributorAdminController.getProductsStatistics)
);

/**
 * @swagger
 * /distributor-admin/products/filter-options/{field}:
 *   get:
 *     summary: Retrieve distinct values for filtering options
 *     description: |
 *       Returns distinct values for a specified field to be used as filter options
 *       in frontend interfaces. Includes usage counts for each value.
 *     tags: [Distributor Admin]
 *     parameters:
 *       - name: field
 *         in: path
 *         required: true
 *         description: Field name to get distinct values for
 *         schema:
 *           type: string
 *           enum: [brand, manufacturer_id, manufacturerId, category_id, categoryId, ranking, primary_variant]
 *       - name: limit
 *         in: query
 *         required: false
 *         description: Maximum number of values to return (1-500)
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 500
 *           default: 50
 *     responses:
 *       200:
 *         description: Filter options retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Filter options for brand retrieved successfully"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                         example: "Coca-Cola"
 *                       count:
 *                         type: integer
 *                         example: 25
 *       400:
 *         description: Bad request - invalid field name or parameters
 *       403:
 *         description: Forbidden - insufficient permissions
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/products/filter-options/:field",
  asyncHandler(DistributorAdminController.getFilterOptions)
);

/**
 * @swagger
 * /distributor-admin/categories:
 *   get:
 *     summary: Retrieve all product categories with product counts
 *     description: |
 *       Returns a list of all product categories with their associated product counts.
 *       Useful for building category filters and understanding product distribution.
 *       Restricted to distributor admins and super admins only.
 *     tags: [Distributor Admin]
 *     responses:
 *       200:
 *         description: Categories retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                         description: Category unique identifier
 *                       name:
 *                         type: string
 *                         example: "Beverages"
 *                         description: Category name
 *                       description:
 *                         type: string
 *                         example: "All types of beverages including sodas, juices, etc."
 *                         description: Category description
 *                       productCount:
 *                         type: integer
 *                         example: 25
 *                         description: Number of products in this category
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Category creation timestamp
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Category last update timestamp
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 data:
 *                   type: string
 *                   example: "Unauthorized: Access restricted to distributor admins"
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/categories",
  asyncHandler(DistributorAdminController.getCategories)
);

/**
 * @swagger
 * /distributor-admin/manufacturers:
 *   get:
 *     summary: Retrieve all manufacturers with product counts
 *     description: |
 *       Returns a list of all manufacturers with their associated product counts.
 *       Includes manufacturer information such as logos and provides insights
 *       into product distribution across manufacturers.
 *       Restricted to distributor admins and super admins only.
 *     tags: [Distributor Admin]
 *     responses:
 *       200:
 *         description: Manufacturers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 5
 *                         description: Manufacturer unique identifier
 *                       name:
 *                         type: string
 *                         example: "Coca-Cola Company"
 *                         description: Manufacturer name
 *                       logo:
 *                         type: string
 *                         example: "https://example.com/logo.png"
 *                         description: Manufacturer logo URL
 *                       productCount:
 *                         type: integer
 *                         example: 42
 *                         description: Number of products from this manufacturer
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         description: Manufacturer creation timestamp
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                         description: Manufacturer last update timestamp
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 data:
 *                   type: string
 *                   example: "Unauthorized: Access restricted to distributor admins"
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/manufacturers",
  asyncHandler(DistributorAdminController.getManufacturers)
);

/**
 * @swagger
 * /distributor-admin/authorized-distributor-manufacturers:
 *   get:
 *     summary: Retrieve all authorized distributor manufacturer relationships (Super Admin only)
 *     description: |
 *       Returns a list of all authorized relationships between distributors and manufacturers.
 *       Shows which distributors are authorized to work with which manufacturers.
 *       This endpoint is restricted to super admin users only.
 *     tags: [Distributor Admin]
 *     responses:
 *       200:
 *         description: Authorized distributor manufacturers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       distributorName:
 *                         type: string
 *                         example: "ABC Distribution Co."
 *                         description: The organization name of the distributor
 *                       manufacturerName:
 *                         type: string
 *                         example: "XYZ Manufacturing Inc."
 *                         description: The name of the manufacturer
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 data:
 *                   type: string
 *                   example: "Unauthorized: Access restricted to super admins"
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/authorized-distributor-manufacturers",
  asyncHandler(DistributorAdminController.getAuthorizedDistributorManufacturers)
);

/**
 * @swagger
 * /distributor-admin/store-lookup:
 *   get:
 *     summary: Retrieve store transaction lookup data with filters (Super Admin only)
 *     description: |
 *       Returns store transaction data with detailed product information based on filters.
 *       Matches products by various SKU types (unit, case, box) and provides comprehensive
 *       transaction details including store name, manufacturer, products, and quantities.
 *       Only storeName is required, startDate, endDate, manufacturerName, and categoryTags are optional filters.
 *       Date filtering supports range queries between startDate and endDate.
 *       Category tags filtering allows you to find products that contain the specified tag string in their category tags.
 *       This endpoint is restricted to super admin users only.
 *     tags: [Distributor Admin]
 *     parameters:
 *       - name: storeName
 *         in: query
 *         required: true
 *         description: Exact store name to filter by (required)
 *         schema:
 *           type: string
 *           maxLength: 255
 *           minLength: 1
 *           example: "ABC Store Downtown"
 *       - name: startDate
 *         in: query
 *         required: false
 *         description: Start date for transaction date range filter in YYYY-MM-DD format (optional)
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *           example: "2025-01-01"
 *       - name: endDate
 *         in: query
 *         required: false
 *         description: End date for transaction date range filter in YYYY-MM-DD format (optional)
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *           example: "2025-01-31"
 *       - name: manufacturerName
 *         in: query
 *         required: false
 *         description: Exact manufacturer name to filter by (optional)
 *         schema:
 *           type: string
 *           maxLength: 255
 *           minLength: 1
 *           example: "XYZ Manufacturing Inc."
 *       - name: categoryTags
 *         in: query
 *         required: false
 *         description: Category tag string to filter products by (optional, partial string match)
 *         schema:
 *           type: string
 *           maxLength: 100
 *           example: 'essential'
 *     responses:
 *       200:
 *         description: Store lookup data retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       storeName:
 *                         type: string
 *                         example: "ABC Store Downtown"
 *                         description: Name of the store
 *                       manufacturerName:
 *                         type: string
 *                         example: "XYZ Manufacturing Inc."
 *                         description: Name of the manufacturer
 *                       productName:
 *                         type: string
 *                         example: "Premium Product Line X"
 *                         description: Name of the product
 *                       productId:
 *                         type: string
 *                         example: "SKU123456"
 *                         description: Product ID/SKU that was matched
 *                       matchedSkuType:
 *                         type: string
 *                         enum: [each, case, box, unknown]
 *                         example: "case"
 *                         description: Type of SKU that matched the product
 *                       transactionDate:
 *                         type: string
 *                         format: date
 *                         example: "2025-01-15"
 *                         description: Date of the transaction
 *                       categoryTags:
 *                         type: object
 *                         example: {"isEssential": true, "isFlex": false}
 *                         description: Product category tags in JSON format
 *                       totalUnits:
 *                         type: integer
 *                         example: 24
 *                         description: Total units in the transaction
 *                       warehouse:
 *                         type: string
 *                         example: "Warehouse North"
 *                         description: Warehouse associated with the transaction
 *       400:
 *         description: Bad request - missing or invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 data:
 *                   type: string
 *                   examples:
 *                     missing_store_name:
 *                       value: "Missing required parameter: storeName is required"
 *                     invalid_start_date:
 *                       value: "Start date must be in YYYY-MM-DD format"
 *                     invalid_end_date:
 *                       value: "End date must be in YYYY-MM-DD format"
 *                     invalid_date_range:
 *                       value: "Start date must be before or equal to end date"
 *                     invalid_store_type:
 *                       value: "Invalid parameter type: storeName must be a string"
 *                     invalid_start_date_type:
 *                       value: "Invalid parameter type: startDate must be a string"
 *                     invalid_end_date_type:
 *                       value: "Invalid parameter type: endDate must be a string"
 *                     invalid_manufacturer_type:
 *                       value: "Invalid parameter type: manufacturerName must be a string"
 *                     empty_store_name:
 *                       value: "Invalid parameter: storeName cannot be empty"
 *                     store_name_too_long:
 *                       value: "Invalid parameter: storeName must be 255 characters or less"
 *                     manufacturer_name_too_long:
 *                       value: "Invalid parameter: manufacturerName must be 255 characters or less"
 *                     invalid_category_tags_type:
 *                       value: "Invalid parameter type: categoryTags must be a string"
 *                     category_tags_too_long:
 *                       value: "Invalid parameter: categoryTags must be 100 characters or less"
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 data:
 *                   type: string
 *                   example: "Unauthorized: Access restricted to super admins"
 *       500:
 *         description: Internal server error
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/store-lookup",
  asyncHandler(DistributorAdminController.getStoreLookup)
);

/**
 * @swagger
 * /distributor-admin/all-manufacturers-from-products:
 *   get:
 *     summary: Retrieve all manufacturer names that have products (Super Admin only)
 *     description: |
 *       Returns a simple list of manufacturer names that have at least one product in the system.
 *       This endpoint only includes manufacturers that are actively associated with products,
 *       providing a clean list of manufacturer names for dropdown/selection purposes.
 *       This endpoint is restricted to super admin users only.
 *     tags: [Distributor Admin]
 *     responses:
 *       200:
 *         description: Manufacturer names retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 *                     example: "ABC Manufacturing Inc."
 *                   description: Array of manufacturer names
 *                   example: ["ABC Manufacturing Inc.", "XYZ Corp", "Global Products Ltd"]
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 data:
 *                   type: string
 *                   example: "Unauthorized: Access restricted to super admins"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 data:
 *                   type: string
 *                   example: "Failed to retrieve manufacturers from products"
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/all-manufacturers-from-products",
  asyncHandler(DistributorAdminController.getAllManufacturersFromProducts)
);

/**
 * @swagger
 * /distributor-admin/programs:
 *   get:
 *     summary: Retrieve programs with optional filters (Super Admin only)
 *     description: |
 *       Returns a list of programs with comprehensive details including manufacturer information
 *       and program details. Supports filtering by participant type, manufacturer name, and date ranges.
 *       All filters are optional and can be combined. This endpoint is restricted to super admin users only.
 *     tags: [Distributor Admin]
 *     parameters:
 *       - name: participantType
 *         in: query
 *         required: false
 *         description: Filter by participant type
 *         schema:
 *           type: string
 *           enum: [SALES_REP, DISTRIBUTOR, STORE]
 *           example: "DISTRIBUTOR"
 *       - name: manufacturerName
 *         in: query
 *         required: false
 *         description: Exact manufacturer name to filter by
 *         schema:
 *           type: string
 *           maxLength: 255
 *           minLength: 1
 *           example: "XYZ Manufacturing Inc."
 *       - name: startDate
 *         in: query
 *         required: false
 *         description: Filter programs that start before this date in YYYY-MM-DD format
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *           example: "2025-01-01"
 *       - name: endDate
 *         in: query
 *         required: false
 *         description: Filter programs that end after this date in YYYY-MM-DD format
 *         schema:
 *           type: string
 *           format: date
 *           pattern: '^\d{4}-\d{2}-\d{2}$'
 *           example: "2025-12-31"
 *       - name: distributorName
 *         in: query
 *         required: false
 *         description: Filter programs by distributor organization name to show only programs that specific distributor is part of
 *         schema:
 *           type: string
 *           maxLength: 255
 *           minLength: 1
 *           example: "ABC Distribution Company"
 *     responses:
 *       200:
 *         description: Programs retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       manufacturerName:
 *                         type: string
 *                         example: "XYZ Manufacturing Inc."
 *                         description: Name of the manufacturer
 *                       programName:
 *                         type: string
 *                         example: "Q1 2025 Rebate Program"
 *                         description: Name of the program
 *                       participantType:
 *                         type: string
 *                         enum: [SALES_REP, DISTRIBUTOR, STORE]
 *                         example: "DISTRIBUTOR"
 *                         description: Type of participant for the program
 *                       programType:
 *                         type: string
 *                         example: "REBATE"
 *                         description: Type of program
 *                       startDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-01-01T00:00:00.000Z"
 *                         description: Program start date
 *                       endDate:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-03-31T23:59:59.000Z"
 *                         description: Program end date
 *                       approvalStatus:
 *                         type: string
 *                         example: "APPROVED"
 *                         description: Current approval status of the program
 *                       visibilityScope:
 *                         type: string
 *                         example: "ALL_DISTRIBUTORS"
 *                         description: Visibility scope of the program
 *                       internalInitiative:
 *                         type: boolean
 *                         example: false
 *                         description: Whether this is an internal initiative
 *                       programId:
 *                         type: integer
 *                         example: 57
 *                         description: Unique program identifier
 *                       programDetails:
 *                         type: array
 *                         description: Array of program details (tiers) for this program
 *                         items:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: integer
 *                               example: 91
 *                               description: Program detail unique identifier
 *                             tier:
 *                               type: integer
 *                               example: 1
 *                               description: Program tier number
 *                             minQty:
 *                               type: number
 *                               example: 100.00
 *                               description: Minimum quantity for this tier
 *                             maxQty:
 *                               type: number
 *                               example: 250.00
 *                               description: Maximum quantity for this tier (null for highest tier)
 *                             rebateAmount:
 *                               type: number
 *                               example: 5.00
 *                               description: Fixed rebate amount
 *                             rebatePercentage:
 *                               type: number
 *                               example: 4.00
 *                               description: Rebate percentage
 *                             rebateType:
 *                               type: string
 *                               example: "percentage"
 *                               description: Type of rebate calculation
 *                             programLine:
 *                               type: string
 *                               example: "Base"
 *                               description: Program line description
 *                             overview:
 *                               type: string
 *                               example: "Must include 12 Flavor Bears"
 *                               description: Program tier overview
 *       400:
 *         description: Bad request - invalid parameters
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   examples:
 *                     invalid_participant_type:
 *                       value: "Invalid participant type. Must be one of: SALES_REP, DISTRIBUTOR, STORE"
 *                     invalid_start_date:
 *                       value: "Start date must be in YYYY-MM-DD format"
 *                     invalid_end_date:
 *                       value: "End date must be in YYYY-MM-DD format"
 *                     manufacturer_name_too_long:
 *                       value: "Invalid parameter: manufacturerName must be 255 characters or less"
 *                     invalid_distributor_type:
 *                       value: "Invalid parameter type: distributorName must be a string"
 *                     distributor_name_too_long:
 *                       value: "Invalid parameter: distributorName must be 255 characters or less"
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Access restricted to super admins"
 *       404:
 *         description: Distributor not found (when distributorName is provided)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Distributor with organization name 'ABC Company' not found"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Internal server error while retrieving programs with filters"
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/programs",
  asyncHandler(DistributorAdminController.getProgramsWithFilters)
);

/**
 * @swagger
 * /distributor-admin/distributors:
 *   get:
 *     summary: Retrieve all distributors with organization names (Super Admin only)
 *     description: |
 *       Returns a list of all distributors that have organization names defined.
 *       This endpoint is restricted to super admin users only.
 *     tags: [Distributor Admin]
 *     responses:
 *       200:
 *         description: Distributors retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                         description: Distributor unique identifier
 *                       name:
 *                         type: string
 *                         example: "John Doe"
 *                         description: Distributor name
 *                       title:
 *                         type: string
 *                         example: "Sales Manager"
 *                         description: Distributor title
 *                       organization_name:
 *                         type: string
 *                         example: "ABC Distribution Company"
 *                         description: Organization name
 *                       logo:
 *                         type: string
 *                         example: "https://example.com/logo.png"
 *                         description: Organization logo URL
 *                       is_disabled:
 *                         type: boolean
 *                         example: false
 *                         description: Whether the distributor is disabled
 *                       created_at:
 *                         type: string
 *                         format: date-time
 *                         description: Distributor creation timestamp
 *                       updated_at:
 *                         type: string
 *                         format: date-time
 *                         description: Distributor last update timestamp
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Access restricted to super admins"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Internal server error while retrieving distributors"
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/distributors",
  asyncHandler(DistributorAdminController.getAllDistributors)
);

/**
 * @swagger
 * /distributor-admin/category-tags/{manufacturerId}:
 *   get:
 *     summary: Retrieve distinct category tags for a specific manufacturer (Super Admin only)
 *     description: |
 *       Returns a list of distinct category tags (category_tags_json) for products from a specific manufacturer.
 *       This endpoint helps identify all category tag variations used by a particular manufacturer.
 *       This endpoint is restricted to super admin users only.
 *     tags: [Distributor Admin]
 *     parameters:
 *       - name: manufacturerId
 *         in: path
 *         required: true
 *         description: Manufacturer ID to get category tags for
 *         schema:
 *           type: integer
 *           minimum: 1
 *           example: 5
 *     responses:
 *       200:
 *         description: Category tags retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     description: Category tags JSON object
 *                     example: {"isEssential": true, "isFlex": false}
 *                   description: Array of distinct category tags
 *                   example: [{"isEssential": true, "isFlex": false}, {"isCore": true, "category": "beverages"}]
 *       400:
 *         description: Bad request - invalid manufacturer ID
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   examples:
 *                     missing_manufacturer_id:
 *                       value: "Manufacturer ID parameter is required"
 *                     invalid_manufacturer_id:
 *                       value: "Manufacturer ID must be a positive integer"
 *       403:
 *         description: Forbidden - insufficient permissions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Unauthorized: Access restricted to super admins"
 *       500:
 *         description: Internal server error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 message:
 *                   type: string
 *                   example: "Internal server error while retrieving category tags"
 *     security:
 *       - bearerAuth: []
 */
router.get(
  "/category-tags/:manufacturerId",
  asyncHandler(DistributorAdminController.getCategoryTags)
);

export default router;
