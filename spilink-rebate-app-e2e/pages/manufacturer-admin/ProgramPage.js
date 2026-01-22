const BasePage = require('../BasePage');
const { parseCurrency } = require('../../utils/helper');

const timeOut = 400000;

class ProgramPage extends BasePage {
  constructor(page) {
    super(page);
    this.selectors = {
      // Program Tabs
      storeProgramTab: 'a[href="/app/programs/store"]',

      // Program List
      programList: '.programOverview .flex.flex-wrap.gap-4.mt-2',
      programCard: '.programOverview .flex.flex-wrap.gap-4.mt-2 > a',
      manufacturerName:
        '.rounded-lg.p-4.bg-white.h-full span.flex-1.font-medium.text-lg',
      programTitle:
        '.flex.justify-between.p-3.border-border-gray.border-b.text-filter-light span.font-normal',
      programStatus: '[data-testid="program-status"], .program-status',

      // Metrics
      purchaseVolume: '#purchase-volume-container > span',
      estimatedEarnings: '#savings-container span.block.font-semibold',

      // Program Details
      distributorProgramDetails: '#manufacturer-program-detail',
      storeProgramDetails: '#store-program-detail',
      optInButton: '[data-testid="opt-in-button"], button:text("Opt In")',
      optOutButton: '[data-testid="opt-out-button"], button:text("Opt Out")',
    };
  }

  /**
   * Navigate to Store Programs page
   */
  async navigateToStorePrograms() {
    await this.page.waitForSelector(this.selectors.storeProgramTab, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.click(this.selectors.storeProgramTab);
    await this.page.waitForURL('**/programs/store');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Switch to Store Programs tab
   */
  async switchToStorePrograms() {
    await this.page.waitForSelector(this.selectors.storeProgramTab, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.click(this.selectors.storeProgramTab);
    await this.page.waitForSelector(this.selectors.programCard, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get all program cards
   */
  async getProgramCards() {
    await this.page.waitForSelector(this.selectors.programCard, {
      state: 'visible',
      timeout: timeOut,
    });
    return this.page.$$(this.selectors.programCard);
  }

  /**
   * Click on a program card by index
   */
  async clickProgram(index) {
    const cards = await this.getProgramCards();
    if (index >= cards.length) {
      throw new Error(
        `Program card index ${index} is out of bounds. Total cards: ${cards.length}`
      );
    }

    await cards[index].click();

    // Determine which details panel to wait for based on current URL
    const currentUrl = this.page.url();
    const detailsSelector = currentUrl.includes('/store')
      ? this.selectors.storeProgramDetails
      : this.selectors.distributorProgramDetails;

    await this.page.waitForSelector(detailsSelector, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Get all programs with their titles and statuses
   */
  async getPrograms() {
    await this.page.waitForSelector(this.selectors.programCard, {
      state: 'visible',
      timeout: timeOut,
    });

    return Promise.all(
      (await this.page.$$(this.selectors.programCard)).map(async (card) => {
        const titleElement = await card.$(this.selectors.programTitle);
        const statusElement = await card.$(this.selectors.programStatus);
        const manufacturerNameElement = await card.$(
          this.selectors.manufacturerName
        );
        const purchaseVolumeElement = await card.$(
          this.selectors.purchaseVolume
        );
        const estimatedEarningsElement = await card.$(
          this.selectors.estimatedEarnings
        );
        const manufacturerName = await manufacturerNameElement.textContent();
        return {
          title: titleElement ? await titleElement.textContent() : 'Unknown',
          status: statusElement ? await statusElement.textContent() : 'Unknown',
          element: card,
          purchaseVolume: purchaseVolumeElement,
          estimatedEarnings: estimatedEarningsElement,
          manufacturerName: manufacturerName,
        };
      })
    );
  }

  /**
   * Get a single program by index
   */
  async getProgramByIndex(index) {
    const programs = await this.getPrograms();
    if (index >= programs.length) {
      throw new Error(
        `Program index ${index} is out of bounds. Total programs: ${programs.length}`
      );
    }
    const program = programs[index];

    return {
      title: program.title,
      purchaseVolume: parseCurrency(await program.purchaseVolume.textContent()),
      estimatedEarnings: parseCurrency(
        await program.estimatedEarnings.textContent()
      ),
      manufacturerName: program.manufacturerName,
    };
  }
}

module.exports = ProgramPage;
