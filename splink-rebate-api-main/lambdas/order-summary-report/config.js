/**
 * Warehouse IDs configuration per distributor
 * Maps distributor codes to warehouse IDs for different report types
 */
const warehouseIds = {
  NCD: {
    HLA: 149,
    JPOLEP: 150,
    ALLENBROTHER: 217
  }
  // Add more distributors as needed
  // Example:
  // ANOTHER_DISTRIBUTOR: {
  //   HLA: 151,
  //   JPOLEP: 152
  // }
};

/**
 * Get warehouse ID for a distributor and report type
 * @param {string} distributorCode - Distributor code (e.g., "NCD")
 * @param {string} reportType - Report type ("HLA", "JPOLEP", or "ALLENBROTHER")
 * @returns {number|null} Warehouse ID or null if not found
 */
function getWarehouseId(distributorCode, reportType) {
  const distributor = warehouseIds[distributorCode];
  if (!distributor) {
    return null;
  }
  return distributor[reportType] || null;
}

/**
 * Get all warehouse IDs for a distributor
 * @param {string} distributorCode - Distributor code
 * @returns {object|null} Object with HLA, JPOLEP, and ALLENBROTHER warehouse IDs or null
 */
function getDistributorWarehouses(distributorCode) {
  return warehouseIds[distributorCode] || null;
}

/**
 * Validate if a distributor and report type combination exists
 * @param {string} distributorCode - Distributor code
 * @param {string} reportType - Report type
 * @returns {boolean} True if valid combination exists
 */
function isValidConfig(distributorCode, reportType) {
  const warehouseId = getWarehouseId(distributorCode, reportType);
  return warehouseId !== null && warehouseId > 0;
}

module.exports = {
  warehouseIds,
  getWarehouseId,
  getDistributorWarehouses,
  isValidConfig
};
