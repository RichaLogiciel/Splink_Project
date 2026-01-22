require('dotenv').config();

/**
 * Extract manufacturer ID from program card href URL
 * Supports both path-based and query param extraction
 * Uses BASE_URL from environment variables
 *
 * @param {string} href - The href attribute from the program card
 * @param {string} [baseUrl] - Optional base URL (defaults to process.env.BASE_URL)
 * @returns {number|null} Manufacturer ID as number, or null if extraction fails
 */
function extractManufacturerId(href, baseUrl) {
  if (!href) {
    return null;
  }

  // Get base URL from parameter or environment
  const base = baseUrl || process.env.BASE_URL || 'http://localhost:3000';

  // Try path extraction first: /app/programs/store/598
  const pathMatch = href.match(/\/store\/(\d+)/);
  if (pathMatch) {
    const id = parseInt(pathMatch[1]);
    return isNaN(id) ? null : id;
  }

  // Fallback to query param extraction: ?id=598
  try {
    // Handle relative URLs by combining with base URL
    const fullUrl = href.startsWith('http') ? href : new URL(href, base).href;
    const url = new URL(fullUrl);
    const idParam = url.searchParams.get('id');
    if (idParam) {
      const id = parseInt(idParam);
      return isNaN(id) ? null : id;
    }
  } catch (error) {
    console.warn(`Failed to parse URL: ${href}`, error);
  }

  return null;
}

module.exports = { extractManufacturerId };

