const BasePage = require('../BasePage');
const { parseCurrency } = require('../../utils/helper');

const timeOut = 400000;

class SalesRepDashboardPage extends BasePage {
  constructor(page) {
    super(page);
    this.selectors = {
      // Dashboard Navigation
      dashboardTab: 'a.pb-3.font-medium[href="/app/dashboard"]',

      // SPIFF Program Overview Card
      spiffProgramOverviewCard: '#spiff-program-overview',
      mySpiffEarnings: '#my-spiff-earnings .text-2xl.font-semibold',
      storeProgramsAvailable:
        '#store-programs-available .text-2xl.font-semibold',
      pendingPayout:
        '.rounded-full.relative.transition-all.duration-300.w-10.h-5.cursor-pointer.bg-gray-300 > input',
      SpiffProgramOverviewModal: '#spiff-program-overview-modal',
      ModelCloseButton:
        '#spiff-program-overview-modal img[alt="popupCloseIcon"]',
    };
  }

  /**
   * Navigate to Dashboard page
   */
  async navigateToDashboard() {
    await this.page.waitForSelector(this.selectors.dashboardTab, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.click(this.selectors.dashboardTab);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get My SPIFF Earnings from dashboard overview card
   */
  async getMySpiffEarnings() {
    await this.page.waitForSelector(this.selectors.mySpiffEarnings, {
      state: 'visible',
      timeout: timeOut,
    });
    return parseCurrency(
      (await this.page.locator(this.selectors.mySpiffEarnings).textContent()) ||
        '0'
    );
  }

  /**
   * Get SPIFF Programs Available count from dashboard overview card
   */
  async getStoreProgramsAvailable() {
    await this.page.waitForSelector(this.selectors.storeProgramsAvailable, {
      state: 'visible',
      timeout: timeOut,
    });
    return (
      (
        await this.page
          .locator(this.selectors.storeProgramsAvailable)
          .textContent()
      )
        ?.trim()
        ?.replace(/,/g, '') || '0'
    );
  }

  /**
   * Get Pending Payout from dashboard overview card
   */
  async getPendingPayout() {
    await this.page.waitForSelector(this.selectors.pendingPayout, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.page.click(this.selectors.pendingPayout);
    await this.page.waitForTimeout(200);
    return await this.getMySpiffEarnings();
  }

  /**
   * Get Historical Payout from dashboard overview card
   * Currently not applied in the component so it's placed here for future reference
   */
  // async getHistoricalPayout() {
  //   await this.page.waitForSelector(this.selectors.historicalPayout, {
  //     state: 'visible',
  //     timeout: timeOut,
  //   });
  //   return parseCurrency(
  //     (await this.page
  //       .locator(this.selectors.historicalPayout)
  //       .textContent()) || '0'
  //   );
  // }

  /**
   * Get SPIFF Program Overview table data
   */
  async getSpiffProgramOverviewData() {
    await this.page.waitForSelector(this.selectors.spiffProgramOverviewCard, {
      state: 'visible',
      timeout: timeOut,
    });

    const rows = await this.page
      .locator(`${this.selectors.spiffProgramOverviewCard} tbody tr`)
      .all();
    const spiffPrograms = [];

    for (const row of rows) {
      const cells = await row.locator('td').allTextContents();
      if (cells.length >= 4) {
        const manufacturer = cells[0]?.trim() || '';
        const earningsText = cells[1]?.trim() || '0';
        const myEarnings = parseCurrency(earningsText);

        spiffPrograms.push({
          manufacturer: manufacturer,
          myEarnings: myEarnings,
          startDate: cells[2]?.trim() || '',
          endDate: cells[3]?.trim() || '',
        });

        console.log(
          `Extracted manufacturer: ${manufacturer}, earnings: ${myEarnings} from text: "${earningsText}"`
        );
      }
    }

    return spiffPrograms;
  }

  /**
   * Get sum of My Earnings from SPIFF Program Overview table
   */
  async getSpiffProgramOverviewEarningsSum() {
    const spiffPrograms = await this.getSpiffProgramOverviewData();
    return spiffPrograms.reduce((sum, program) => sum + program.myEarnings, 0);
  }

  /**
   * Get manufacturer modal data when modal is open
   */
  async getManufacturerModalData() {
    // Wait for modal to be visible
    await this.page.waitForSelector(this.selectors.SpiffProgramOverviewModal, {
      state: 'visible',
      timeout: 5000,
    });

    // Extract My Earnings from modal - look for the green dollar sign with earnings
    const myEarningsElement = this.page
      .locator(
        `${this.selectors.SpiffProgramOverviewModal} span.flex.items-center.mt-3 > p.font-bold.text-lg`
      )
      .first();
    let myEarnings = 0;
    if (myEarningsElement) {
      const earningsText = await myEarningsElement.textContent();
      myEarnings = parseCurrency(earningsText || '0');
    }

    // Extract program details from modal - look for "Earn per" text
    const programElements = await this.page
      .locator(`${this.selectors.SpiffProgramOverviewModal} #store-tiers > div`)
      .all();
    const programs = [];

    for (const element of programElements) {
      const text = await element.textContent();
      if (text) {
        programs.push({
          description: text,
        });
      }
    }

    console.log(
      `Modal data extracted - My Earnings: ${myEarnings}, Programs: ${programs.length}`
    );

    return {
      myEarnings: myEarnings,
      programs: programs,
    };
  }

  /**
   * Get all dashboard metrics for comparison
   */
  async getDashboardMetrics() {
    return {
      mySpiffEarnings: await this.getMySpiffEarnings(),
      storeProgramsAvailable: await this.getStoreProgramsAvailable(),
      pendingPayout: await this.getPendingPayout(),
      // historicalPayout: await this.getHistoricalPayout(),
      spiffProgramOverviewData: await this.getSpiffProgramOverviewData(),
      spiffProgramOverviewEarningsSum:
        await this.getSpiffProgramOverviewEarningsSum(),
    };
  }
}

module.exports = SalesRepDashboardPage;
