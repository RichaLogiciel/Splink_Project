const queries = require("./queries");

/**
 * Generate HLA warehouse-level order report
 * @param {Object} sequelize - Sequelize instance
 * @param {number} warehouseId - Warehouse ID
 * @param {Date} targetDate - Target date (defaults to today)
 * @returns {Promise<Array>} Array of report rows
 */
async function generateWarehouseOrderReport(
  sequelize,
  warehouseId,
  targetDate
) {
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

  // Get order items
  const orderItems = await queries.getOrderItems(
    sequelize,
    warehouseId,
    startOfDay,
    endOfDay
  );

  // Get unique store IDs and product IDs for batch lookups
  const storeIds = new Set();
  const productIds = new Set();

  orderItems.forEach((item) => {
    if (item.entity_id) {
      storeIds.add(item.entity_id);
    }
    if (item.splink_product_id) {
      productIds.add(item.splink_product_id);
    }
  });

  // Batch fetch stores and product code mappings in parallel
  const [stores, productCodeMappings] = await Promise.all([
    queries.getStores(sequelize, Array.from(storeIds), warehouseId),
    queries.getProductCodeMappings(
      sequelize,
      Array.from(productIds).filter((id) => id !== null),
      warehouseId
    )
  ]);

  // Create maps for O(1) lookups
  const storeMap = new Map(
    stores.map((store) => [store.id, store.external_store_id])
  );

  const productCodeMap = new Map(
    productCodeMappings.map((mapping) => [mapping.product_id, mapping.code])
  );

  // Transform order items into report rows
  const reportRows = [];

  for (const orderItem of orderItems) {
    if (!orderItem.entity_id) continue;

    // Get store from stores array
    const store = stores.find((s) => s.id === orderItem.entity_id);

    // Ensure store belongs to this warehouse
    if (!store || store.warehouse_id !== warehouseId) {
      continue;
    }

    // Get internal store ID
    const internalStoreId = storeMap.get(orderItem.entity_id) || null;

    // Get internal product ID from ProductCodeMapping or use distProductId as fallback
    let internalProductId = null;

    if (orderItem.splink_product_id) {
      internalProductId =
        productCodeMap.get(orderItem.splink_product_id) || null;
    }

    // Fallback to distProductId if ProductCodeMapping not found
    if (!internalProductId && orderItem.dist_product_id) {
      internalProductId = orderItem.dist_product_id;
    }

    // Only include rows where we have both store and product IDs
    if (internalStoreId !== null && internalProductId !== null) {
      reportRows.push({
        internalStoreId,
        internalProductId,
        quantity: orderItem.quantity,
        orderDate: new Date(orderItem.order_created_at)
      });
    }
  }

  return reportRows;
}

/**
 * Generate J-Polep warehouse-level order report
 * @param {Object} sequelize - Sequelize instance
 * @param {number} warehouseId - Warehouse ID
 * @param {Date} targetDate - Target date (defaults to today)
 * @returns {Promise<Array>} Array of report rows
 */
async function generateJPolepReport(sequelize, warehouseId, targetDate) {
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

  // Get order items
  const orderItems = await queries.getOrderItems(
    sequelize,
    warehouseId,
    startOfDay,
    endOfDay
  );

  // Get unique store IDs and product IDs for batch lookups
  const storeIds = new Set();
  const productIds = new Set();

  // Single pass to collect all IDs
  for (const item of orderItems) {
    if (item.entity_id) {
      storeIds.add(item.entity_id);
    }
    if (item.splink_product_id) {
      productIds.add(Number(item.splink_product_id));
    }
  }

  // Convert to arrays for database queries
  const storeIdsArray = Array.from(storeIds);
  const productIdsArray = Array.from(productIds);

  // Parallel batch fetches for better performance
  const [stores, productCodeMappings, products] = await Promise.all([
    queries.getStores(sequelize, storeIdsArray, warehouseId),
    queries.getProductCodeMappings(sequelize, productIdsArray, warehouseId),
    queries.getProducts(sequelize, productIdsArray)
  ]);

  // Create maps with numeric keys for O(1) lookups
  const storeMap = new Map(
    stores.map((store) => [store.id, store.external_store_id])
  );

  const productCodeMap = new Map(
    productCodeMappings.map((mapping) => [
      Number(mapping.product_id),
      mapping.code
    ])
  );

  const productNameMap = new Map(
    products.map((product) => [Number(product.id), product.name || ""])
  );

  // Transform order items into J-Polep report rows
  const reportRows = [];

  for (const orderItem of orderItems) {
    // Early continue if no entity_id
    if (!orderItem.entity_id) continue;

    const entityId = orderItem.entity_id;
    const splinkProductId = orderItem.splink_product_id
      ? Number(orderItem.splink_product_id)
      : null;

    // Get customer ID (store ID) - use O(1) map lookup
    const customerId = storeMap.get(entityId) || null;
    if (!customerId) continue; // Skip if store not found

    // Get item ID (product ID) from ProductCodeMapping or use distProductId as fallback
    // Use O(1) map lookup with normalized product ID
    const itemId =
      (splinkProductId && productCodeMap.get(splinkProductId)) ||
      orderItem.dist_product_id ||
      null;

    if (!itemId) continue; // Skip if no item ID found

    // Get product name for description field - O(1) map lookup
    const productName =
      splinkProductId && productNameMap.get(splinkProductId)
        ? productNameMap.get(splinkProductId)
        : null;

    // Build report row
    reportRows.push({
      customerId,
      itemId,
      quantity: orderItem.quantity,
      orderDate: new Date(orderItem.order_created_at),
      productName
    });
  }

  return reportRows;
}

/**
 * Generate Allenbrother warehouse-level order report
 * Returns SOH (header) and SOD (detail) records grouped by order
 * @param {Object} sequelize - Sequelize instance
 * @param {number} warehouseId - Warehouse ID
 * @param {Date} targetDate - Target date (defaults to today)
 * @returns {Promise<Array>} Array of report records (SOH and SOD)
 */
async function generateAllenbrotherReport(sequelize, warehouseId, targetDate) {
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

  // Get order items
  const orderItems = await queries.getOrderItems(
    sequelize,
    warehouseId,
    startOfDay,
    endOfDay
  );

  // Get unique store IDs and product IDs for batch lookups
  const storeIds = new Set();
  const productIds = new Set();

  for (const item of orderItems) {
    if (item.entity_id) {
      storeIds.add(item.entity_id);
    }
    if (item.splink_product_id) {
      productIds.add(Number(item.splink_product_id));
    }
  }

  // Convert to arrays for database queries
  const storeIdsArray = Array.from(storeIds);
  const productIdsArray = Array.from(productIds);

  // Parallel batch fetches for better performance
  const [stores, productCodeMappings] = await Promise.all([
    queries.getStores(sequelize, storeIdsArray, warehouseId),
    queries.getProductCodeMappings(sequelize, productIdsArray, warehouseId)
  ]);

  // Create maps with numeric keys for O(1) lookups
  const storeMap = new Map(
    stores.map((store) => [store.id, store.external_store_id])
  );

  const productCodeMap = new Map(
    productCodeMappings.map((mapping) => [
      Number(mapping.product_id),
      mapping.code
    ])
  );

  // Group order items by order (order_id + order_created_at)
  const orderGroups = new Map();

  for (const orderItem of orderItems) {
    if (!orderItem.entity_id) continue;

    const entityId = orderItem.entity_id;
    const orderId = orderItem.order_id;
    const orderCreatedAt = new Date(orderItem.order_created_at);

    // Create a unique key for the order
    const orderKey = `${orderId}_${orderCreatedAt.getTime()}`;

    if (!orderGroups.has(orderKey)) {
      orderGroups.set(orderKey, {
        orderId,
        orderDate: orderCreatedAt,
        entityId,
        items: []
      });
    }

    orderGroups.get(orderKey).items.push(orderItem);
  }

  // Generate report records: SOH (one per order) and SOD (one per item)
  const reportRecords = [];

  for (const [, orderGroup] of orderGroups) {
    const entityId = orderGroup.entityId;
    const orderDate = orderGroup.orderDate;

    // Get customer number (store external ID)
    const customerNumber = storeMap.get(entityId);
    if (!customerNumber) continue; // Skip if store not found

    // Calculate delivery date (order date + 14 days)
    const deliveryDate = new Date(
      orderDate.getTime() + 14 * 24 * 60 * 60 * 1000
    );

    // Generate SOH record (one per order)
    reportRecords.push({
      type: "SOH",
      customerNumber,
      orderDate,
      deliveryDate
    });

    // Generate SOD records (one per order item)
    for (const orderItem of orderGroup.items) {
      const splinkProductId = orderItem.splink_product_id
        ? Number(orderItem.splink_product_id)
        : null;

      // Get item number from ProductCodeMapping or use distProductId as fallback
      const itemNumber =
        (splinkProductId && productCodeMap.get(splinkProductId)) ||
        orderItem.dist_product_id ||
        null;

      if (!itemNumber) continue; // Skip if no item number found

      reportRecords.push({
        type: "SOD",
        deliveryDate,
        quantity: orderItem.quantity,
        itemNumber
      });
    }
  }

  return reportRecords;
}

module.exports = {
  generateWarehouseOrderReport,
  generateJPolepReport,
  generateAllenbrotherReport
};
