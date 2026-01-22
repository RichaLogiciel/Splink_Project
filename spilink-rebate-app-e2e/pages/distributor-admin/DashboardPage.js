const { expect } = require('@playwright/test');

class DistributorDashboardPage {
  constructor(page) {
    this.page = page;

    // Selectors
    this.selectors = {
      dashboardTitle: 'main > div .text-lg.font-semibold >> text=Dashboard',
      estimatedEarningsValue: '#estimated-earnings .text-2xl.font-semibold',
      purchaseVolumeValue: '#purchase-volume .text-2xl.font-semibold',
      activeStoresValue: '#active-stores .text-2xl.font-semibold',
      manufacturerPartnersValue:
        '#manufacturer-partners .text-2xl.font-semibold',
    };
  }

  async navigateTo() {
    await this.page.goto('/app/dashboard');
    await this.page.waitForLoadState('networkidle');
    await this.verifyOnPage();
  }

  async verifyOnPage() {
    await expect(
      this.page.locator(this.selectors.dashboardTitle)
    ).toBeVisible();
  }

  async getEstimatedEarnings() {
    const value = await this.page
      .locator(this.selectors.estimatedEarningsValue)
      .textContent();
    return this.parseCurrency(value);
  }

  async getPurchaseVolume() {
    const value = await this.page
      .locator(this.selectors.purchaseVolumeValue)
      .textContent();
    return this.parseCurrency(value);
  }

  parseCurrency(text) {
    const value = parseFloat(text.replace(/[^\d.]/g, '')) || 0;
    return isNaN(value) ? 0 : value;
  }

  async validateFinancialWidgets() {
    const earnings = await this.getEstimatedEarnings();
    const volume = await this.getPurchaseVolume();

    return { earnings, volume };
  }
}

module.exports = DistributorDashboardPage;
