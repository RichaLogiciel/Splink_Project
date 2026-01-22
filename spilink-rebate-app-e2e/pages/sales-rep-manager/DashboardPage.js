const { expect } = require('@playwright/test');

class SalesRepManagerDashboardPage {
  constructor(page) {
    this.page = page;

    // Selectors based on the recorded test
    this.selectors = {
      dashboardTitle: 'main > div .text-lg.font-semibold >> text=Dashboard',
      estimatedEarningsValue: '#estimated-earnings .text-2xl.font-semibold',
      myEarningsValue: '#my-earnings .text-2xl.font-semibold',
      programsButton: 'button:has-text("Programs")',
      independentLink: 'a:has-text("Independent")',
      // Additional selectors from the recorded test
      estimatedEarningsWidget: '#estimated-earnings',
      myEarningsWidget: '#my-earnings',
      actionIcon: '#action-icon',
      viewUserExperience: 'text=View User Experience',
      confirmButton: 'button:has-text("Yes")',
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

  async getMyEarnings() {
    const value = await this.page
      .locator(this.selectors.myEarningsValue)
      .textContent();
    return this.parseCurrency(value);
  }

  parseCurrency(text) {
    const value = parseFloat(text.replace(/[^\d.]/g, '')) || 0;
    return isNaN(value) ? 0 : value;
  }

  async validateFinancialWidgets() {
    const estimatedEarnings = await this.getEstimatedEarnings();
    const myEarnings = await this.getMyEarnings();

    return { estimatedEarnings, myEarnings };
  }

  async clickProgramsButton() {
    await this.page.click(this.selectors.programsButton);
  }

  async clickIndependentLink() {
    await this.page.click(this.selectors.independentLink);
  }

  async clickEstimatedEarnings() {
    await this.page.click(this.selectors.estimatedEarningsWidget);
  }

  async clickMyEarnings() {
    await this.page.click(this.selectors.myEarningsWidget);
  }
}

module.exports = SalesRepManagerDashboardPage;
