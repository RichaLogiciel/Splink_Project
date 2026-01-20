const ProgramPageBase = require('../shared/ProgramPageBase');
const { parseCurrency } = require('../../utils/helper');
const { PROGRAM_TIMELINE_TO_TEST } = require('../../utils/constant');

const timeOut = 400000;

class ProgramPage extends ProgramPageBase {
  constructor(page) {
    super(page);
    // Add sales-rep specific selectors
    this.selectors = {
      ...this.selectors, // Inherit common selectors
      // Program List (sales-rep specific)
      programList: '.flex.flex-wrap.gap-4.mt-2',
      programCard: '.flex.flex-wrap.gap-4.mt-2 > a',

      // Program Timeline (sales-rep specific)
      programTimelineDropdown:
        'select.text-xs.outline-none.rounded.p-2.border.border-border-gray',
    };
  }

  /**
   * Navigate to Store Programs page
   */
  async navigateToStorePrograms() {
    await this.page.waitForLoadState('networkidle');
    // await this.page.waitForSelector(this.selectors.storeProgramTab, {
    //   state: 'visible',
    //   timeout: timeOut,
    // });
    // await this.click(this.selectors.storeProgramTab);
    await this.page.goto(
      'app/programs/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
    );
    await this.page.waitForURL(
      'app/programs/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
    );
    await this.page.waitForLoadState('networkidle');

    // Change program timeline to the default value
    await this.changeProgramTimeline();
  }

  // Changes the program timeline to the specified value
  // Default is 'Historical'
  async changeProgramTimeline(timeline = PROGRAM_TIMELINE_TO_TEST) {
    console.log('Changing program timeline to: ', timeline);
    console.log(
      'Program Timeline Dropdown Selector: ',
      this.selectors.programTimelineDropdown
    );
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
    // await this.page.waitForURL(
    //   'app/programs/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
    // );
    await this.page.waitForTimeout(1000); // Ensure the page is ready before interacting

    // Log the change for debugging purposes
    console.log(`Program timeline changed to: ${timeline}`);
  }

  /**
   * Switch to Store Programs tab
   */
  async switchToStorePrograms() {
    // await this.navigateToStorePrograms();
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
    await this.page.waitForURL(
      'app/programs/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
    );
    await this.page.waitForLoadState('networkidle');

    console.log('Store Programs Page Loaded');
    // Change program timeline to the default value
    await this.changeProgramTimeline();

    // Return the current URL for verification
    return this.page.url();
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
