import { Op } from "sequelize";
import Order from "../models/Order";
import OrderItem from "../models/OrderItem";
import Product from "../models/Product";
import ProductCodeMapping from "../models/ProductCodeMapping";
import Store from "../models/Store";
import { JPolepReportRow } from "../utils/helpers";

interface HLAReportRow {
  internalStoreId: number | null;
  internalProductId: string | null;
  quantity: number;
  orderDate: Date;
}

class HLAReportService {
  /**
   * Generate warehouse-level order report for specified warehouse
   * @param warehouseId Required warehouse ID to filter orders
   * @param targetDate Optional date to filter orders. If not provided, uses today's date
   * @returns Array of report rows ready for CSV generation
   */
  public async generateWarehouseOrderReport(
    warehouseId: number,
    targetDate?: Date
  ): Promise<HLAReportRow[]> {
    // Validate warehouseId
    if (!warehouseId || warehouseId <= 0) {
      throw new Error("Invalid warehouse ID");
    }
    // Use today's date if no target date provided
    const reportDate = targetDate || new Date();

    // Set start and end of day for the target date
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Query order items with orders for the target date and specified warehouse
    // Strict filtering - ensure warehouseId is not null
    const orderItems = await OrderItem.findAll({
      where: {
        warehouseId: warehouseId // Explicit warehouse ID filter
      },
      include: [
        {
          model: Order,
          as: "Order",
          required: true,
          where: {
            createdAt: {
              [Op.between]: [startOfDay, endOfDay]
            },
            entityType: "STORE" // Only store orders
          },
          attributes: ["id", "entityId", "createdAt"]
        }
      ],
      attributes: [
        "id",
        "quantity",
        "splinkProductId",
        "distProductId",
        "orderId"
      ]
    });

    // Get unique store IDs and product IDs for batch lookups
    const storeIds = new Set<number>();
    const productIds = new Set<number | null>();

    orderItems.forEach((item: any) => {
      if (item.Order) {
        storeIds.add(item.Order.entityId);
      }
      if (item.splinkProductId) {
        productIds.add(item.splinkProductId);
      }
    });

    // Batch fetch stores - CRITICAL: filter by warehouse_id to ensure only stores belonging to this warehouse
    // This ensures we only export data for stores that belong to the specified warehouse
    const stores = await Store.findAll({
      where: {
        id: Array.from(storeIds),
        warehouseId: warehouseId // Only stores belonging to this warehouse (HLA warehouse)
      },
      attributes: ["id", "externalStoreId", "warehouseId"],
      order: [["warehouse_id", "ASC"]] // Order by warehouse_id as per requirement
    });

    const storeMap = new Map(
      stores.map((store: any) => [store.id, store.externalStoreId])
    );

    // Batch fetch product code mappings for the specified warehouse
    const productCodeMappings = await ProductCodeMapping.findAll({
      where: {
        warehouseId: warehouseId, // Filter by the same warehouse ID
        productId: {
          [Op.in]: Array.from(productIds).filter(
            (id) => id !== null
          ) as number[]
        }
      },
      attributes: ["productId", "code"]
    });

    const productCodeMap = new Map(
      productCodeMappings.map((mapping) => [mapping.productId, mapping.code])
    );

    // Transform order items into report rows
    // Only include stores that belong to the specified warehouse
    const reportRows: HLAReportRow[] = [];

    for (const orderItem of orderItems as any) {
      if (!orderItem.Order) continue;

      // Get store from stores array - only stores that passed warehouse_id filter are included
      const store = stores.find((s: any) => s.id === orderItem.Order.entityId);

      // Double-check: ensure store belongs to this warehouse (safety check)
      if (!store || store.warehouseId !== warehouseId) {
        continue; // Skip if store doesn't belong to this warehouse
      }

      // Get internal store ID from storeMap (which only contains stores from this warehouse)
      const internalStoreId = storeMap.get(orderItem.Order.entityId) || null;

      // Get internal product ID from ProductCodeMapping or use distProductId as fallback
      let internalProductId: string | null = null;

      if (orderItem.splinkProductId) {
        internalProductId =
          productCodeMap.get(orderItem.splinkProductId) || null;
      }

      // Fallback to distProductId if ProductCodeMapping not found
      if (!internalProductId && orderItem.distProductId) {
        internalProductId = orderItem.distProductId;
      }

      // Only include rows where we have both store and product IDs
      if (internalStoreId !== null && internalProductId !== null) {
        reportRows.push({
          internalStoreId,
          internalProductId,
          quantity: orderItem.quantity,
          orderDate: orderItem.Order.createdAt
        });
      }
    }

    return reportRows;
  }

  /**
   * Generate J-Polep warehouse-level order report for specified warehouse
   * Similar to generateWarehouseOrderReport but includes product names for description field
   * @param warehouseId Required warehouse ID to filter orders
   * @param targetDate Optional date to filter orders. If not provided, uses today's date
   * @returns Array of report rows ready for fixed-width text generation
   */
  public async generateJPolepReport(
    warehouseId: number,
    targetDate?: Date
  ): Promise<JPolepReportRow[]> {
    // Validate warehouseId
    if (!warehouseId || warehouseId <= 0) {
      throw new Error("Invalid warehouse ID");
    }
    // Use today's date if no target date provided
    const reportDate = targetDate || new Date();

    // Set start and end of day for the target date
    const startOfDay = new Date(reportDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(reportDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Query order items with orders for the target date and specified warehouse
    const orderItems = await OrderItem.findAll({
      where: {
        warehouseId: warehouseId
      },
      include: [
        {
          model: Order,
          as: "Order",
          required: true,
          where: {
            createdAt: {
              [Op.between]: [startOfDay, endOfDay]
            },
            entityType: "STORE"
          },
          attributes: ["id", "entityId", "createdAt"]
        }
      ],
      attributes: [
        "id",
        "quantity",
        "splinkProductId",
        "distProductId",
        "orderId"
      ]
    });

    // Get unique store IDs and product IDs for batch lookups
    const storeIds = new Set<number>();
    const productIds = new Set<number>();

    // Single pass to collect all IDs
    for (const item of orderItems as any) {
      if (item.Order?.entityId) {
        storeIds.add(item.Order.entityId);
      }
      if (item.splinkProductId) {
        productIds.add(Number(item.splinkProductId)); // Normalize to number immediately
      }
    }

    // Convert to arrays for database queries
    const storeIdsArray = Array.from(storeIds);
    const productIdsArray = Array.from(productIds);

    // Parallel batch fetches for better performance
    const [stores, productCodeMappings, products] = await Promise.all([
      // Batch fetch stores - filter by warehouse_id
      Store.findAll({
        where: {
          id: storeIdsArray,
          warehouseId: warehouseId
        },
        attributes: ["id", "externalStoreId", "warehouseId"],
        order: [["warehouse_id", "ASC"]]
      }),
      // Batch fetch product code mappings for the specified warehouse
      ProductCodeMapping.findAll({
        where: {
          warehouseId: warehouseId,
          productId: {
            [Op.in]: productIdsArray
          }
        },
        attributes: ["productId", "code"]
      }),
      // Batch fetch products to get product names
      Product.findAll({
        where: {
          id: {
            [Op.in]: productIdsArray
          }
        },
        attributes: ["id", "name"]
      })
    ]);

    // Create maps with numeric keys for O(1) lookups
    const storeMap = new Map<number, string | null>(
      stores.map((store: any) => [store.id, store.externalStoreId])
    );

    const productCodeMap = new Map<number, string>(
      productCodeMappings.map((mapping) => [
        Number(mapping.productId),
        mapping.code
      ])
    );

    const productNameMap = new Map<number, string>(
      products.map((product: any) => [Number(product.id), product.name || ""])
    );

    // Transform order items into J-Polep report rows
    const reportRows: JPolepReportRow[] = [];

    for (const orderItem of orderItems as any) {
      // Early continue if no Order
      if (!orderItem.Order) continue;

      const entityId = orderItem.Order.entityId;
      const splinkProductId = orderItem.splinkProductId
        ? Number(orderItem.splinkProductId)
        : null;

      // Get customer ID (store ID) - use O(1) map lookup
      const customerId = storeMap.get(entityId) || null;
      if (!customerId) continue; // Skip if store not found

      // Get item ID (product ID) from ProductCodeMapping or use distProductId as fallback
      // Use O(1) map lookup with normalized product ID
      const itemId =
        (splinkProductId && productCodeMap.get(splinkProductId)) ||
        orderItem.distProductId ||
        null;

      if (!itemId) continue; // Skip if no item ID found

      // Get product name for description field - O(1) map lookup
      const productName =
        splinkProductId && productNameMap.get(splinkProductId)
          ? productNameMap.get(splinkProductId)!
          : null;

      // Build report row
      reportRows.push({
        customerId,
        itemId,
        quantity: orderItem.quantity,
        orderDate: orderItem.Order.createdAt,
        productName
      });
    }

    return reportRows;
  }
}

export default new HLAReportService();
