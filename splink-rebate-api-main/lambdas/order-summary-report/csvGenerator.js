/**
 * Generate CSV buffer from data rows
 * @param {Array} data - Array of data objects to convert to CSV
 * @param {Array<string>} headers - Array of header names (exact column names)
 * @returns {Promise<Buffer>} Promise resolving to CSV buffer
 */
function generateCSV(data, headers) {
  return new Promise((resolve, reject) => {
    try {
      const rows = [];

      // Add header row
      rows.push(headers);

      // Add data rows
      data.forEach((row) => {
        const csvRow = headers.map((header) => {
          // Map common header names to property names
          const propertyMap = {
            "Internal Store ID": "internalStoreId",
            "Internal Product ID": "internalProductId",
            Quantity: "quantity",
            "Order Date": "orderDate"
          };

          const propertyName = propertyMap[header] || header;
          let value = row[propertyName];

          // Format date as MM/DD/YYYY
          if (header === "Order Date" && value instanceof Date) {
            const month = String(value.getMonth() + 1).padStart(2, "0");
            const day = String(value.getDate()).padStart(2, "0");
            const year = value.getFullYear();
            value = `${month}/${day}/${year}`;
          }

          // Handle null/undefined values
          if (value === null || value === undefined) {
            return "";
          }

          return String(value);
        });
        rows.push(csvRow);
      });

      // Generate CSV string manually
      const csvString = rows
        .map((row) => {
          return row
            .map((cell) => {
              // Escape quotes and wrap in quotes if contains comma, quote, or newline
              const cellStr = String(cell || "");
              if (
                cellStr.includes(",") ||
                cellStr.includes('"') ||
                cellStr.includes("\n")
              ) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            })
            .join(",");
        })
        .join("\n");

      resolve(Buffer.from(csvString, "utf-8"));
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateCSV
};
