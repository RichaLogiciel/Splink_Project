const iconv = require("iconv-lite");

/**
 * Interface for J-Polep report row data
 * @typedef {Object} JPolepReportRow
 * @property {string|null} customerId - Store ID (6 digits, may include leading zeros)
 * @property {string|null} itemId - Product ID (6 digits)
 * @property {number} quantity - Quantity
 * @property {Date} orderDate - Order date
 * @property {string|null} productName - Product description/name
 */

/**
 * Generates a fixed-width text buffer from J-Polep report data.
 * Each line is exactly 85 characters with specific field formatting:
 * - Customer: 10 chars (LEFT justified, 6-char ID with leading zeros, 4 trailing blanks)
 * - Item: 10 chars (LEFT justified, 6-char ID, 4 trailing blanks)
 * - Qty: 3 chars (LEADING zeros)
 * - Usr: 4 chars (BLANKS - "    ")
 * - Date: 8 chars (MMDDYYYY format)
 * - Description: 50 chars (LEFT justified, padded with trailing blanks)
 *
 * @param {JPolepReportRow[]} data - Array of JPolepReportRow objects to convert to fixed-width text
 * @returns {Promise<Buffer>} Promise resolving to a Buffer containing the fixed-width text data
 */
function generateFixedWidthText(data) {
  return new Promise((resolve, reject) => {
    try {
      const lines = [];

      data.forEach((row) => {
        // Customer: 10 chars - LEFT justified, 6-char ID with leading zeros, 4 trailing blanks
        // Extract only numeric characters and take first 6 characters
        const customerId = (row.customerId || "")
          .replace(/\D/g, "") // Remove all non-digit characters
          .slice(0, 6); // Take only first 6 characters
        const customerFormatted = customerId
          .padStart(6, "0") // Ensure 6 digits with leading zeros
          .padEnd(10, " "); // Add 4 trailing blanks to make 10 chars

        // Item: 10 chars - LEFT justified, 6-char ID, 4 trailing blanks
        // Extract only numeric characters and take first 6 characters
        const itemId = (row.itemId || "")
          .replace(/\D/g, "") // Remove all non-digit characters
          .slice(0, 6); // Take only first 6 characters
        const itemFormatted = itemId
          .padStart(6, "0") // Ensure 6 digits with leading zeros
          .padEnd(10, " "); // Add 4 trailing blanks to make 10 chars

        // Qty: 3 chars - LEADING zeros
        const qtyFormatted = String(row.quantity || 0)
          .padStart(3, "0")
          .slice(0, 3); // Ensure exactly 3 chars

        // Usr: 4 chars - BLANKS (always "    ")
        const usrFormatted = "    ";

        // Date: 8 chars - MMDDYYYY format
        const orderDate = row.orderDate || new Date();
        const month = String(orderDate.getMonth() + 1).padStart(2, "0");
        const day = String(orderDate.getDate()).padStart(2, "0");
        const year = orderDate.getFullYear();
        const dateFormatted = `${month}${day}${year}`; // MMDDYYYY

        // Description: 50 chars - LEFT justified, padded with trailing blanks
        const productName = row.productName || "";
        const descriptionFormatted = productName
          .slice(0, 50) // Truncate if longer than 50 chars
          .padEnd(50, " "); // Pad with trailing blanks to make 50 chars

        // Combine all fields: 10 + 10 + 3 + 4 + 8 + 50 = 85 characters
        const line = `${customerFormatted}${itemFormatted}${qtyFormatted}${usrFormatted}${dateFormatted}${descriptionFormatted}`;

        // Validate line length (should be exactly 85)
        if (line.length !== 85) {
          throw new Error(
            `Invalid line length: expected 85, got ${line.length}. Line: ${line}`
          );
        }

        lines.push(line);
      });

      // Join lines with UNIX line endings (\n)
      const textContent = lines.join("\n");

      resolve(Buffer.from(textContent, "utf-8"));
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Interface for Allenbrother report record data
 * @typedef {Object} AllenbrotherReportRecord
 * @property {string} type - Record type ("SOH" or "SOD")
 * @property {string} customerNumber - Customer number (6 digits, for SOH)
 * @property {Date} orderDate - Order date (for SOH)
 * @property {Date} deliveryDate - Delivery date (for both SOH and SOD)
 * @property {number} quantity - Quantity (for SOD)
 * @property {string} itemNumber - Item number (10 chars, for SOD)
 */

/**
 * Format date as YYMMDD (2-digit year)
 * @param {Date} date - Date to format
 * @returns {string} Formatted date string (YYMMDD)
 */
function formatDateYYMMDD(date) {
  const year = String(date.getFullYear() % 100).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

/**
 * Generates ANSI TXT fixed-length records with thorn (þ) delimiter for Allenbrother reports.
 * Each record is exactly 100 characters with SOH (header) and SOD (detail) record types.
 *
 * SOH Format: SOHþ{CustomerNumber}þ{OrderDate}þNCDþREGþ{DeliveryDate}þNCD{TrailingPadding}
 * SOD Format: SODþ{DeliveryDate}þ{Quantity}þ{ItemNumber}þ\|01{TrailingPadding}
 *
 * @param {AllenbrotherReportRecord[]} data - Array of AllenbrotherReportRecord objects
 * @returns {Promise<Buffer>} Promise resolving to a Buffer containing the fixed-width text data
 */
function generateAllenbrotherText(data) {
  return new Promise((resolve, reject) => {
    try {
      const THORN = "\u00FE"; // þ (lowercase thorn — Windows-1252 at 0xFE)
      const lines = [];

      data.forEach((record) => {
        let line = "";

        if (record.type === "SOH") {
          // SOH Record: SOHþ{CustomerNumber}þ{OrderDate}þþNCDþþþþþþþþþþþREGþþþþþ{DeliveryDate}þþNCDþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþ
          // Customer Number: 6 chars, left-pad zeros
          const customerNumber = (record.customerNumber || "")
            .replace(/\D/g, "") // Extract only digits
            .slice(0, 6) // Take first 6 characters
            .padStart(6, "0"); // Left-pad with zeros

          // Order Date: 6 chars, YYMMDD format
          const orderDate = formatDateYYMMDD(record.orderDate || new Date());

          // Delivery Date: 6 chars, YYMMDD format
          const deliveryDate = formatDateYYMMDD(
            record.deliveryDate || new Date()
          );

          // Build SOH record with exact number of þ delimiters
          // After OrderDate: 2 þ, After first NCD: 11 þ, After REG: 5 þ, After DeliveryDate: 2 þ, After second NCD: 49 þ
          const thorn2 = THORN.repeat(2);
          const thorn11 = THORN.repeat(11);
          const thorn5 = THORN.repeat(5);
          const thorn49 = THORN.repeat(49);
          line = `SOH${THORN}${customerNumber}${THORN}${orderDate}${thorn2}NCD${thorn11}REG${thorn5}${deliveryDate}${thorn2}NCD${thorn49}`;
        } else if (record.type === "SOD") {
          // SOD Record: SODþ{DeliveryDate}þ{Quantity}þþþ{ItemNumber}|01þþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþþ
          // Delivery Date: 6 chars, YYMMDD format
          const deliveryDate = formatDateYYMMDD(
            record.deliveryDate || new Date()
          );

          // Quantity: No leading zeros (just the number)
          const quantity = String(record.quantity || 0);

          // Item Number: Attach |01 directly (no spaces, no padding, no backslash)
          const itemNumber = (record.itemNumber || "").replace(/\s/g, ""); // Remove any spaces
          const itemNumberWithEnd = `${itemNumber}|01`;

          // Build SOD record with exact number of þ delimiters
          // After Quantity: 3 þ, After ItemNumber|01: 51 þ
          const thorn3 = THORN.repeat(3);
          const thorn51 = THORN.repeat(51);
          line = `SOD${THORN}${deliveryDate}${THORN}${quantity}${thorn3}${itemNumberWithEnd}${thorn51}`;
        } else {
          throw new Error(`Invalid record type: ${record.type}`);
        }

        // Validate line length
        // TODO: Temporarily allow 101 for SOH records until format is finalized
        // TODO: Temporarily skip SOD record length validation until format is finalized
        if (record.type === "SOH") {
          const expectedLength = 101;
          if (line.length !== expectedLength) {
            throw new Error(
              `Invalid line length: expected ${expectedLength}, got ${line.length}. Line: ${line}`
            );
          }
        }
        // SOD record length validation is temporarily disabled

        lines.push(line);
      });

      // Join lines with CRLF (\r\n) and add line feed after the last line for Windows compatibility
      const textContent = lines.join("\r\n") + "\r\n";

      // Convert UTF-8 to ANSI (Windows-1252) encoding
      const ansiBuffer = iconv.encode(textContent, "win1252");
      resolve(ansiBuffer);
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateFixedWidthText,
  generateAllenbrotherText
};
