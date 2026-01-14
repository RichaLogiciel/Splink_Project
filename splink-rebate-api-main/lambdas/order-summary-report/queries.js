const { QueryTypes } = require("sequelize");

/**
 * Get order items for a warehouse and date range
 * @param {Object} sequelize - Sequelize instance
 * @param {number} warehouseId - Warehouse ID
 * @param {Date} startOfDay - Start of day
 * @param {Date} endOfDay - End of day
 * @returns {Promise<Array>} Array of order items
 */
async function getOrderItems(sequelize, warehouseId, startOfDay, endOfDay) {
  const query = `
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
    ORDER BY o.created_at ASC
  `;

  const results = await sequelize.query(query, {
    replacements: {
      warehouseId,
      startOfDay,
      endOfDay
    },
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

module.exports = {
  getOrderItems,
  getStores,
  getProductCodeMappings,
  getProducts,
  getWarehouse,
  getEmailRecipients
};
