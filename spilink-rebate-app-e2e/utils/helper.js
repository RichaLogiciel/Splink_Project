import { test } from '@playwright/test';
import { CATEGORY_DISPLAY_NAME } from './constant';

export const formatNumber = (num, round = true, minimumFractionDigits = 1) => {
  const integerValue = round ? Math.round(num) : num;

  // Return the formatted integer value as a string
  return integerValue
    ? integerValue.toLocaleString('en-US', {
        minimumFractionDigits: minimumFractionDigits,
        maximumFractionDigits: 1,
      })
    : '0';
};

export const parseCurrency = (text) => {
  const value = parseFloat((String(text) || '0')?.replace(/[^\d.]/g, '')) || 0;
  return isNaN(value) ? 0 : value;
};

export async function softExpectWithScreenshot(
  page,
  assertionFn,
  errorMessage = ''
) {
  const beforeErrors = test.info().errors.length;

  await assertionFn(); // this is expect.soft(...)

  const afterErrors = test.info().errors.length;

  if (afterErrors > beforeErrors) {
    await page.screenshot({ fullPage: true });
    console.warn(errorMessage || `Soft assertion failed — screenshot saved`);
  }
}

export async function expectWithMessage(assertionFn, errorMessage = '') {
  try {
    await assertionFn();
  } catch (error) {
    // Only show your custom message
    throw new Error(errorMessage || error.message);
  }
}

/**
 * Saves a full-page screenshot to the test's output path.
 * @param {import('@playwright/test').Page} page - The Playwright page object.
 * @param {string} label - Optional filename label (default: 'screenshot').
 */
export async function saveScreenshot(page, label = 'screenshot') {
  const timestamp = new Date().getTime();
  const filename = `${label}-${timestamp}.png`;
  const path = test.info().outputPath(filename);

  await page.screenshot({ path, fullPage: true });
  // Attach to Playwright report
  await test.info().attach(label, { path, contentType: 'image/png' });
  console.log(`📸 Screenshot saved: ${path}`);
  return filename;
}

// Wait for the page to load
export async function waitForPageLoad({
  page,
  timeout = 5000,
  errorMessage = 'Response timeout - continuing with test',
}) {
  await expectWithMessage(
    () => page.waitForLoadState('networkidle', { timeout }),
    errorMessage || 'Response timeout - continuing with test'
  );
}

/**
 * Get the display name of a category
 * @param {string} categoryName - The name of the category
 * @returns {string} The display name of the category
 */
export const getCategoryDisplayName = (categoryName) => {
  return CATEGORY_DISPLAY_NAME.get(categoryName) || categoryName;
};
