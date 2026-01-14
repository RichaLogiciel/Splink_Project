const ProgramPageBase = require('../shared/ProgramPageBase');
const { parseCurrency } = require('../../utils/helper');
const { PROGRAM_TIMELINE_TO_TEST } = require('../../utils/constant');
const {
  extractManufacturerId,
} = require('../../tests/shared/utils/ManufacturerIdExtractor.js');

const timeOut = 400000;

class ProgramPage extends ProgramPageBase {
  constructor(page) {
    super(page);
    // Add distributor-admin specific selectors
    this.selectors = {
      ...this.selectors, // Inherit common selectors
      // Navigation
      programsMenu: '.logo-and-menus .Programs',
      programsTab: '.logo-and-menus a[href^="/app/programs"]',

      // Program Tabs
      distributorProgramTab: '.logo-and-menus a[href="/app/programs"]',
      storeProgramTab: '.logo-and-menus a[href^="/app/programs/store"]',

      // Program List (distributor-admin specific)
      programList: 'main .flex.flex-wrap.gap-4',
      programCard: 'main .flex.flex-wrap.gap-4 > a',

      // Program Timeline (distributor-admin specific)
      programTimelineDropdown: '#programTimelineSelector',
    };
  }

  /**
   * Navigate to Programs page
   */
  async navigateToPrograms() {
    await this.page.waitForSelector(this.selectors.programsMenu, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.click(this.selectors.programsMenu);

    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(this.selectors.programsTab, {
      state: 'visible',
      timeout: timeOut,
    });
    // await this.click(this.selectors.programsTab);
    // await this.page.waitForURL('**/programs');

    // await this.click(this.selectors.programsTab);
    if (PROGRAM_TIMELINE_TO_TEST !== 'Current') {
      await this.page.goto(
        'app/programs?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
      );
      await this.page.waitForLoadState('networkidle');
      await this.changeProgramTimeline();
      await this.page.waitForURL(
        'app/programs?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
      );
    } else {
      await this.page.goto('app/programs');
      await this.page.waitForLoadState('networkidle');
    }
  }

  // Changes the program timeline to the specified value
  // Default is 'Historical'
  async changeProgramTimeline(timeline = PROGRAM_TIMELINE_TO_TEST) {
    if (timeline == 'Current') {
      console.log(`Program timeline default option is: ${timeline}`);
      return;
    }
    // Wait for the program timeline dropdown to be visible
    await this.page.waitForSelector(this.selectors.programTimelineDropdown, {
      state: 'visible',
      timeout: timeOut,
    });

    // Select the desired timeline from the dropdown
    await this.page.selectOption(this.selectors.programTimelineDropdown, {
      label: timeline,
    });

    // Ensure the page is fully loaded after the change
    await this.page.waitForLoadState('networkidle');
    // await this.page.waitForURL('?programTimeline=' + PROGRAM_TIMELINE_TO_TEST);

    // Log the change for debugging purposes
    console.log(`Program timeline changed to: ${timeline}`);
  }

  /**
   * Navigate to Store Programs page
   */
  async navigateToStorePrograms() {
    await this.page.waitForSelector(this.selectors.programsMenu, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.click(this.selectors.programsMenu);

    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(this.selectors.storeProgramTab, {
      state: 'visible',
      timeout: timeOut,
    });
    // await this.click(this.selectors.storeProgramTab);
    // await this.page.waitForURL('**/programs/store');
    await this.page.goto(
      'app/programs/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
    );
    await this.page.waitForLoadState('networkidle');
    await this.changeProgramTimeline();

    await this.page.waitForURL(
      'app/programs/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
    );
  }

  /**
   * Switch to Distributor Program tab
   */
  async switchToDistributorPrograms() {
    await this.page.waitForSelector(this.selectors.programsMenu, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.click(this.selectors.programsMenu);

    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(this.selectors.distributorProgramTab, {
      state: 'visible',
      timeout: timeOut,
    });
    // await this.click(this.selectors.distributorProgramTab);
    // await this.page.waitForSelector(this.selectors.programCard, {
    //   state: 'visible',
    //   timeout: timeOut,
    // });
    await this.page.goto(
      'app/programs?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
    );
    await this.page.waitForLoadState('networkidle');
    await this.changeProgramTimeline();

    await this.page.waitForURL(
      'app/programs?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
    );
  }

  /**
   * Switch to Store Programs tab
   */
  async switchToStorePrograms() {
    await this.navigateToPrograms();
    await this.page.waitForLoadState('networkidle');
    // await this.page.waitForSelector(this.selectors.storeProgramTab, {
    //   state: 'visible',
    //   timeout: timeOut,
    // });
    // await this.click(this.selectors.storeProgramTab);
    // await this.page.waitForSelector(this.selectors.programCard, {
    //   state: 'visible',
    //   timeout: timeOut,
    // });
    await this.page.goto(
      'app/programs/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
    );
    await this.page.waitForLoadState('networkidle');

    // Change program timeline to the default value
    await this.changeProgramTimeline();

    await this.page.waitForURL(
      'app/programs/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
    );
    return this.page.url();
  }

  /**
   * Get all program cards
   */
  async getProgramCards() {
    try {
      await this.page.waitForSelector(this.selectors.programCard, {
        state: 'visible',
        timeout: 50000,
      });
      return this.page.$$(this.selectors.programCard);
    } catch (error) {
      console.error('Error in getProgramCards:', error);
      return [];
    }
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
    const cardSaleInfo = await cards[index].$('.saleinfo');
    console.log('Card Sale Info: ', await cardSaleInfo.textContent());

    cardSaleInfo.click();
    await this.page.waitForLoadState('networkidle');

    // Determine which details panel to wait for based on current URL
    const currentUrl = this.page.url();
    console.log(`Current URL: ${currentUrl}`);
    const detailsSelector = currentUrl.includes('/store')
      ? this.selectors.storeProgramDetails
      : this.selectors.distributorProgramDetails;

    await this.page.waitForSelector(detailsSelector, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(1500); // Wait for any animations or transitions
  }

  /**
   * Get all programs with their titles and statuses
   */
  async getPrograms() {
    try {
      const programCards = this.page.locator(this.selectors.programCard);

      // Some distributors legitimately have no programs. In that case the page
      // shows an "empty state" message and there will be zero cards.
      const noProgramsMessage = this.page.getByText(
        /It seems there are currently no programs available/i
      );

      // Wait for either: at least one card OR the empty-state message.
      // If neither appears, we'll fall through to the catch and return [].
      await Promise.race([
        programCards.first().waitFor({ state: 'attached', timeout: 15000 }),
        noProgramsMessage.waitFor({ state: 'visible', timeout: 15000 }),
      ]);

      const cardCount = await programCards.count();
      if (cardCount === 0) return [];
    } catch (error) {
      console.error('Error in getPrograms:', error);
      return [];
    }

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

  /**
   * Get all programs with estimated earnings and manufacturer names
   * Optimized method using specific selectors for store program overview
   */
  async getAllProgramsWithEarnings() {
    try {
      await this.page.waitForSelector(
        '.storeProgramOverview .rounded-lg.p-4.bg-white.h-full',
        {
          state: 'visible',
          timeout: 50000,
        }
      );

      const programCards = await this.page.$$(
        '.storeProgramOverview .rounded-lg.p-4.bg-white.h-full'
      );
      const programs = [];

      for (const card of programCards) {
        try {
          // Get manufacturer name
          const manufacturerElement = await card.$(
            'span.flex-1.font-medium.text-lg'
          );
          const manufacturerName = manufacturerElement
            ? await manufacturerElement.textContent()
            : 'Unknown';

          // Get estimated earnings
          const earningsElement = await card.$(
            'div#savings-container span.block.font-semibold'
          );
          const estimatedEarnings = earningsElement
            ? parseCurrency(await earningsElement.textContent())
            : 0;

          programs.push({
            manufacturerName: manufacturerName.trim(),
            estimatedEarnings: estimatedEarnings,
          });
        } catch (error) {
          console.warn('Error extracting program data from card:', error);
          // Continue with next card if one fails
        }
      }

      return programs;
    } catch (error) {
      console.error('Error in getAllProgramsWithEarnings:', error);
      return [];
    }
  }

  /**
   * Get all store programs with complete data including manufacturer_id
   * Extracts: manufacturer_id (from href), manufacturer_name, sales_volume, earnings
   * Uses BASE_URL from environment for URL parsing
   */
  async getAllStoreProgramsWithCompleteData() {
    try {
      // Wait for the program cards container
      await this.page.waitForSelector(
        '.storeProgramOverview a[href*="/programs/store/"]',
        {
          state: 'visible',
          timeout: 50000,
        }
      );

      // Select the <a> tags that contain the href (not the inner div)
      const programCards = await this.page.$$(
        '.storeProgramOverview a[href*="/programs/store/"]'
      );
      const programs = [];

      // Get base URL from environment
      const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

      for (const card of programCards) {
        try {
          // Extract href to get manufacturer ID
          const href = await card.getAttribute('href');
          if (!href) {
            console.error('Program card missing href attribute');
            continue;
          }

          // Extract manufacturer ID from URL
          const manufacturerId = extractManufacturerId(href, baseUrl);
          if (!manufacturerId) {
            console.log(`Failed to extract manufacturer ID from: ${href}`);
            // Continue anyway, might match by name later
          }

          // Get manufacturer name
          const manufacturerElement = await card.$(
            'span.flex-1.font-medium.text-lg'
          );
          const manufacturerName = manufacturerElement
            ? await manufacturerElement.textContent()
            : 'Unknown';

          // Get sales volume (purchase volume)
          const purchaseVolumeElement = await card.$(
            '#purchase-volume-container > span'
          );
          const salesVolume = purchaseVolumeElement
            ? parseCurrency(await purchaseVolumeElement.textContent())
            : 0;

          // Get estimated earnings
          const earningsElement = await card.$(
            'div#savings-container span.block.font-semibold'
          );
          const earnings = earningsElement
            ? parseCurrency(await earningsElement.textContent())
            : 0;

          // Skip programs without both manufacturer ID and name
          if (
            !manufacturerId ||
            !manufacturerName ||
            manufacturerName.trim() === 'Unknown'
          ) {
            console.log(
              `Skipping program: missing manufacturer ID (${manufacturerId}) or name (${manufacturerName})`
            );
            continue;
          }

          programs.push({
            manufacturer_id: manufacturerId,
            manufacturer_name: manufacturerName.trim(),
            sales_volume: salesVolume,
            earnings: earnings,
          });
        } catch (error) {
          console.warn('Error extracting program data from card:', error);
          // Continue with next card if one fails
        }
      }

      return programs;
    } catch (error) {
      console.error('Error in getAllStoreProgramsWithCompleteData:', error);
      return [];
    }
  }
}

module.exports = ProgramPage;
