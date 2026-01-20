const { QueryTypes } = require("sequelize");

/**
 * Get order items for a warehouse and date range
 * @param {Object} sequelize - Sequelize instance
 * @param {number} warehouseId - Warehouse ID
 * @param {Date|string} startOfDay - Start of day (Date object) or date string (YYYY-MM-DD) for date-only comparison
 * @param {Date|string} endOfDay - End of day (Date object) or date string (YYYY-MM-DD) for date-only comparison
 * @param {string|null} dateString - Optional date string (YYYY-MM-DD) for date-only comparison (ignores timezone)
 * @param {number|null} lastSentOrderId - Optional last sent order ID (filters to only new orders)
 * @returns {Promise<Array>} Array of order items
 */
async function getOrderItems(
  sequelize,
  warehouseId,
  startOfDay,
  endOfDay,
  dateString = null,
  lastSentOrderId = null
) {
  let query;
  let replacements;

  // If dateString is provided, use DATE() function for date-only comparison (ignores timezone)
  // When dateString is provided, ignore lastSentOrderId (get all orders for that date)
  if (dateString) {
    query = `
      SELECT 
        oi.id,
        oi.quantity,
        oi.splink_product_id,
        oi.dist_product_id,
        oi.order_id,
        o.entity_id,
        o.created_at as order_created_at
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE oi.warehouse_id = :warehouseId
        AND o.entity_type = 'STORE'
        AND DATE(o.created_at) = :dateString
        AND oi.deleted_at IS NULL
        AND o.deleted_at IS NULL
      ORDER BY o.created_at ASC, o.id ASC, oi.id ASC
    `;
    replacements = {
      warehouseId,
      dateString
    };
  } else if (lastSentOrderId !== null) {
    // Use lastSentOrderId to get only new orders (no date filter)
    query = `
      SELECT 
        oi.id,
        oi.quantity,
        oi.splink_product_id,
        oi.dist_product_id,
        oi.order_id,
        o.entity_id,
        o.created_at as order_created_at
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE oi.warehouse_id = :warehouseId
        AND o.entity_type = 'STORE'
        AND o.id > :lastSentOrderId
        AND oi.deleted_at IS NULL
        AND o.deleted_at IS NULL
      ORDER BY o.created_at ASC, o.id ASC, oi.id ASC
    `;
    replacements = {
      warehouseId,
      lastSentOrderId
    };
  } else {
    // Use timestamp range comparison (for initial run with today/yesterday)
    query = `
      SELECT 
        oi.id,
        oi.quantity,
        oi.splink_product_id,
        oi.dist_product_id,
        oi.order_id,
        o.entity_id,
        o.created_at as order_created_at
      FROM order_items oi
      INNER JOIN orders o ON oi.order_id = o.id
      WHERE oi.warehouse_id = :warehouseId
        AND o.entity_type = 'STORE'
        AND o.created_at BETWEEN :startOfDay AND :endOfDay
        AND oi.deleted_at IS NULL
        AND o.deleted_at IS NULL
      ORDER BY o.created_at ASC, o.id ASC, oi.id ASC
    `;
    replacements = {
      warehouseId,
      startOfDay,
      endOfDay
    };
  }

  const results = await sequelize.query(query, {
    replacements,
    type: QueryTypes.SELECT
  });

  return results || [];
}

/**
 * Get stores by IDs and warehouse
 * @param {Object} sequelize - Sequelize instance
 * @param {Array<number>} storeIds - Array of store IDs
 * @param {number} warehouseId - Warehouse ID
 * @returns {Promise<Array>} Array of stores
 */
async function getStores(sequelize, storeIds, warehouseId) {
  if (!storeIds || storeIds.length === 0) {
    return [];
  }

  const query = `
    SELECT 
      id,
      external_store_id,
      warehouse_id
    FROM stores
    WHERE id IN (:storeIds)
      AND warehouse_id = :warehouseId
      AND deleted_at IS NULL
    ORDER BY warehouse_id ASC
  `;

  const results = await sequelize.query(query, {
    replacements: {
      storeIds,
      warehouseId
    },
    type: QueryTypes.SELECT
  });

  return results || [];
}

/**
 * Get product code mappings for warehouse and products
 * @param {Object} sequelize - Sequelize instance
 * @param {Array<number>} productIds - Array of product IDs
 * @param {number} warehouseId - Warehouse ID
 * @returns {Promise<Array>} Array of product code mappings
 */
async function getProductCodeMappings(sequelize, productIds, warehouseId) {
  if (!productIds || productIds.length === 0) {
    return [];
  }

  const query = `
    SELECT 
      product_id,
      code
    FROM product_code_mappings
    WHERE warehouse_id = :warehouseId
      AND product_id IN (:productIds)
      AND deleted_at IS NULL
  `;

  const results = await sequelize.query(query, {
    replacements: {
      warehouseId,
      productIds: productIds.filter((id) => id !== null)
    },
    type: QueryTypes.SELECT
  });

  return results || [];
}

/**
 * Get products by IDs
 * @param {Object} sequelize - Sequelize instance
 * @param {Array<number>} productIds - Array of product IDs
 * @returns {Promise<Array>} Array of products
 */
async function getProducts(sequelize, productIds) {
  if (!productIds || productIds.length === 0) {
    return [];
  }

  const query = `
    SELECT 
      id,
      name
    FROM products
    WHERE id IN (:productIds)
      AND deleted_at IS NULL
  `;

  const results = await sequelize.query(query, {
    replacements: {
      productIds
    },
    type: QueryTypes.SELECT
  });

  return results || [];
}

/**
 * Get warehouse by ID
 * @param {Object} sequelize - Sequelize instance
 * @param {number} warehouseId - Warehouse ID
 * @returns {Promise<Object|null>} Warehouse object or null
 */
async function getWarehouse(sequelize, warehouseId) {
  const query = `
    SELECT 
      id,
      name,
      distributor_id
    FROM warehouses
    WHERE id = :warehouseId
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const results = await sequelize.query(query, {
    replacements: {
      warehouseId
    },
    type: QueryTypes.SELECT
  });

  return results && results.length > 0 ? results[0] : null;
}

/**
 * Get email recipients for a warehouse
 * @param {Object} sequelize - Sequelize instance
 * @param {number} warehouseId - Warehouse ID
 * @returns {Promise<Array<string>>} Array of email addresses
 */
async function getEmailRecipients(sequelize, warehouseId) {
  const query = `
    SELECT 
      email
    FROM warehouse_report_email_recipients
    WHERE warehouse_id = :warehouseId
      AND deleted_at IS NULL
  `;

  const results = await sequelize.query(query, {
    replacements: {
      warehouseId
    },
    type: QueryTypes.SELECT
  });

  return (results || []).map((row) => row.email);
}

/**
 * Get last sent order ID for a warehouse and report type
 * @param {Object} sequelize - Sequelize instance
 * @param {number} warehouseId - Warehouse ID
 * @param {string} reportType - Report type ('HLA', 'JPOLEP', 'ALLENBROTHER')
 * @returns {Promise<number|null>} Last sent order ID or null if no record exists
 */
async function getLastSentOrderId(sequelize, warehouseId, reportType) {
  const query = `
    SELECT 
      last_sent_order_id
    FROM warehouse_report_sent_orders
    WHERE warehouse_id = :warehouseId
      AND report_type = :reportType
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const results = await sequelize.query(query, {
    replacements: {
      warehouseId,
      reportType: reportType.toUpperCase()
    },
    type: QueryTypes.SELECT
  });

  if (results && results.length > 0) {
    return results[0].last_sent_order_id;
  }

  return null;
}

/**
 * Update last sent order ID for a warehouse and report type
 * Handles upsert logic: updates existing record, restores soft-deleted record, or creates new record
 * @param {Object} sequelize - Sequelize instance
 * @param {number} warehouseId - Warehouse ID
 * @param {string} reportType - Report type ('HLA', 'JPOLEP', 'ALLENBROTHER')
 * @param {number} orderId - Order ID to set as last sent
 * @returns {Promise<void>}
 */
async function updateLastSentOrderId(
  sequelize,
  warehouseId,
  reportType,
  orderId
) {
  const reportTypeUpper = reportType.toUpperCase();

  // First, try to find an active record
  const activeRecordQuery = `
    SELECT id, last_sent_order_id
    FROM warehouse_report_sent_orders
    WHERE warehouse_id = :warehouseId
      AND report_type = :reportType
      AND deleted_at IS NULL
    LIMIT 1
  `;

  const activeRecords = await sequelize.query(activeRecordQuery, {
    replacements: {
      warehouseId,
      reportType: reportTypeUpper
    },
    type: QueryTypes.SELECT
  });

  if (activeRecords && activeRecords.length > 0) {
    // Update existing active record
    const updateQuery = `
      UPDATE warehouse_report_sent_orders
      SET last_sent_order_id = :orderId,
          updated_at = NOW()
      WHERE id = :id
    `;

    await sequelize.query(updateQuery, {
      replacements: {
        id: activeRecords[0].id,
        orderId
      },
      type: QueryTypes.UPDATE
    });

    console.log(
      `Updated last_sent_order_id to ${orderId} for warehouse ${warehouseId}, report type ${reportTypeUpper}`
    );
    return;
  }

  // Check if a soft-deleted record exists
  const softDeletedQuery = `
    SELECT id
    FROM warehouse_report_sent_orders
    WHERE warehouse_id = :warehouseId
      AND report_type = :reportType
      AND deleted_at IS NOT NULL
    LIMIT 1
  `;

  const softDeletedRecords = await sequelize.query(softDeletedQuery, {
    replacements: {
      warehouseId,
      reportType: reportTypeUpper
    },
    type: QueryTypes.SELECT
  });

  if (softDeletedRecords && softDeletedRecords.length > 0) {
    // Restore soft-deleted record
    const restoreQuery = `
      UPDATE warehouse_report_sent_orders
      SET last_sent_order_id = :orderId,
          deleted_at = NULL,
          updated_at = NOW()
      WHERE id = :id
    `;

    await sequelize.query(restoreQuery, {
      replacements: {
        id: softDeletedRecords[0].id,
        orderId
      },
      type: QueryTypes.UPDATE
    });

    console.log(
      `Restored and updated last_sent_order_id to ${orderId} for warehouse ${warehouseId}, report type ${reportTypeUpper}`
    );
    return;
  }

  // Insert new record
  const insertQuery = `
    INSERT INTO warehouse_report_sent_orders (warehouse_id, report_type, last_sent_order_id, created_at, updated_at)
    VALUES (:warehouseId, :reportType, :orderId, NOW(), NOW())
  `;

  await sequelize.query(insertQuery, {
    replacements: {
      warehouseId,
      reportType: reportTypeUpper,
      orderId
    },
    type: QueryTypes.INSERT
  });

  console.log(
    `Created new record with last_sent_order_id ${orderId} for warehouse ${warehouseId}, report type ${reportTypeUpper}`
  );
}

module.exports = {
  getOrderItems,
  getStores,
  getProductCodeMappings,
  getProducts,
  getWarehouse,
  getEmailRecipients,
  getLastSentOrderId,
  updateLastSentOrderId
};
