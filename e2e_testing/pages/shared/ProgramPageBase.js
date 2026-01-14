const BasePage = require('../BasePage');
const { parseCurrency } = require('../../utils/helper');
const { PROGRAM_TIMELINE_TO_TEST } = require('../../utils/constant');

const timeOut = 400000;

/**
 * Base class for ProgramPage with ONLY common selectors and methods
 * that are identical across all roles
 */
class ProgramPageBase extends BasePage {
  constructor(page) {
    super(page);
    // ONLY identical selectors with matching values
    this.selectors = {
      // Program Tabs
      storeProgramTab: 'a[href^="/app/programs/store"]',

      // Program Card Elements (used within cards)
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
   * Get a program by index from the list
   * Delegates to child class's getPrograms() method
   */
  async getProgramByIndex(index) {
    const programs = await this.getPrograms();
    if (index >= programs.length) {
      throw new Error(
        `Program index ${index} is out of bounds. Total programs: ${programs.length}`
      );
    }
    return programs[index];
  }

  /**
   * Extract data from a single program card element
   * Uses common selectors only
   */
  async getProgramData(card) {
    const manufacturerElement = await card.$(this.selectors.manufacturerName);
    const purchaseVolumeElement = await card.$(this.selectors.purchaseVolume);
    const estimatedEarningsElement = await card.$(
      this.selectors.estimatedEarnings
    );

    return {
      manufacturerName: manufacturerElement
        ? await manufacturerElement.textContent()
        : 'Unknown',
      purchaseVolume: purchaseVolumeElement
        ? parseCurrency(await purchaseVolumeElement.textContent())
        : 0,
      estimatedEarnings: estimatedEarningsElement
        ? parseCurrency(await estimatedEarningsElement.textContent())
        : 0,
    };
  }

  /**
   * Click on a program card by index
   * Uses child class's getProgramCards() method
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
  }

  // Abstract methods that MUST be implemented by child classes
  async changeProgramTimeline(timeline) {
    throw new Error(
      'changeProgramTimeline() must be implemented by child class'
    );
  }

  async getProgramCards() {
    throw new Error('getProgramCards() must be implemented by child class');
  }

  async getPrograms() {
    throw new Error('getPrograms() must be implemented by child class');
  }

  async switchToStorePrograms() {
    throw new Error(
      'switchToStorePrograms() must be implemented by child class'
    );
  }
}

module.exports = ProgramPageBase;
