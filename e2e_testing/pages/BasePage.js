class BasePage {
  /**
   * @param {import('@playwright/test').Page} page
   */
  constructor(page) {
    this.page = page;
  }

  /**
   * Navigate to a specific URL
   * @param {string} url
   */
  async navigate(url) {
    await this.page.goto(url);
  }

  /**
   * Wait for element to be visible
   * @param {string} selector
   */
  async waitForElement(selector) {
    await this.page.waitForSelector(selector);
  }

  /**
   * Click on an element
   * @param {string} selector
   */
  async click(selector) {
    await this.waitForElement(selector);
    await this.page.click(selector);
  }

  /**
   * Fill an input field
   * @param {string} selector
   * @param {string} text
   */
  async fill(selector, text) {
    await this.waitForElement(selector);
    await this.page.fill(selector, text);
  }

  /**
   * Get text content of an element
   * @param {string} selector
   * @returns {Promise<string|null>}
   */
  async getText(selector) {
    await this.waitForElement(selector);
    return await this.page.textContent(selector);
  }

  /**
   * Check if element exists
   * @param {string} selector
   * @returns {Promise<boolean>}
   */
  async isElementVisible(selector) {
    try {
      await this.page.waitForSelector(selector, {
        state: 'visible',
        timeout: 30000,
      });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = BasePage;
