const BasePage = require('../BasePage');

class ProductInsightPage extends BasePage {
  constructor(page) {
    super(page);
    this.selectors = {
      // Navigation
      productInsightsTab: '.logo-and-menus a[href="/app/product-insights"]',
      // Page Title
      pageTitle: 'text="Product Insights"',
      // Filters
      manufacturerFilter:
        '#custom-dropdown label:has-text("All Manufacturers")',
      manufacturerOption: (name) => `#custom-dropdown text=${name}`,
      periodFilter: (label) => `#date-range-buttons >> text=${label}`,
      // Chart
      chartWrapper: '.recharts-wrapper',
      // Metrics
      salesVolume: '#sales-volume-card .text-2xl.font-semibold',
      units: '#units-card .text-2xl.font-semibold',
      distributorSales:
        '.total-distributor-sales-bar-chart .text-base.font-semibold',
    };
  }

  async navigateTo() {
    await this.page.goto('/app/product-insights');
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(this.selectors.pageTitle);
  }

  // async selectManufacturer(name) {
  //   await this.page.locator(this.selectors.manufacturerFilter).click();
  //   await this.page.locator(this.selectors.manufacturerOption(name)).click();
  //   await this.page.waitForLoadState('networkidle');
  // }

  async selectPeriod(label) {
    await this.page.locator(this.selectors.periodFilter(label)).click();
    await this.page.waitForTimeout(500);
  }

  async waitForChart() {
    await this.page.waitForSelector(this.selectors.chartWrapper);
  }

  async getSalesVolume() {
    const text = await this.page
      .locator(this.selectors.salesVolume)
      .textContent();
    return this.parseNumber(text);
  }

  async getUnits() {
    const text = await this.page.locator(this.selectors.units).textContent();
    return this.parseNumber(text);
  }

  async getDistributorSales() {
    const text = await this.page
      .locator(this.selectors.distributorSales)
      .textContent();
    return this.parseNumber(text);
  }

  parseNumber(text) {
    return parseFloat((text || '').replace(/[^0-9.]/g, '')) || 0;
  }
}

module.exports = ProductInsightPage;
