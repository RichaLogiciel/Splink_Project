const BasePage = require('../BasePage');
const { parseCurrency } = require('../../utils/helper');
const { PROGRAM_TIMELINE_TO_TEST } = require('../../utils/constant');

const timeOut = 400000;

class SpiffProgramsPage extends BasePage {
  constructor(page) {
    super(page);
    this.selectors = {
      // SPIFF Programs Navigation
      spiffProgramsTab: 'a[href="/app/programs/spiff"]',

      // SPIFF Program Cards
      spiffProgramList: '.programOverview .flex.flex-wrap.gap-4.mt-2',
      spiffProgramCard: '.programOverview .flex.flex-wrap.gap-4.mt-2 > a',
      manufacturerName:
        '.rounded-lg.p-4.bg-white.h-full span.flex-1.font-medium.text-lg',
      myEarnings: '#purchase-volume-container span.font-semibold',

      // Program Details within each card
      programDetails:
        '.rounded-lg.p-4.bg-white.h-full .mt-4.mb-2.max-h-48.overflow-y-auto > div .flex.items-center.gap-2',

      // Program Timeline
      programTimelineDropdown:
        'select.text-xs.outline-none.rounded.p-2.border.border-border-gray',
    };
  }

  /**
   * Navigate to SPIFF Programs page
   */
  async navigateToSpiffPrograms() {
    await this.page.waitForLoadState('networkidle');
    await this.page.goto(
      'app/programs/spiff?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
    );
    await this.page.waitForURL(
      'app/programs/spiff?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
    );
    await this.page.waitForLoadState('networkidle');

    // Change program timeline to the default value
    await this.changeProgramTimeline();
  }

  /**
   * Switch to SPIFF Programs tab
   */
  async switchToSpiffPrograms(timelineCheck = true) {
    await this.page.waitForLoadState('networkidle');
    if (timelineCheck) {
      await this.page.goto(
        'app/programs/spiff?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
      );
      await this.page.waitForURL(
        'app/programs/spiff?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
      );
      await this.page.waitForLoadState('networkidle');

      console.log('SPIFF Programs Page Loaded');
      // Change program timeline to the default value
      await this.changeProgramTimeline();
    } else {
      await this.page.goto('app/programs/spiff');
      await this.page.waitForURL('app/programs/spiff');
      await this.page.waitForLoadState('networkidle');
    }

    // Return the current URL for verification
    return this.page.url();
  }

  // Changes the program timeline to the specified value
  async changeProgramTimeline(timeline = PROGRAM_TIMELINE_TO_TEST) {
    console.log('Changing program timeline to: ', timeline);

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
    await this.page.waitForTimeout(1000);

    console.log(`Program timeline changed to: ${timeline}`);
  }

  /**
   * Get all SPIFF program cards
   */
  async getSpiffProgramCards() {
    await this.page.waitForSelector(this.selectors.spiffProgramCard, {
      state: 'visible',
      timeout: timeOut,
    });
    return this.page.$$(this.selectors.spiffProgramCard);
  }

  /**
   * Get all SPIFF programs with their data
   */
  async getSpiffPrograms() {
    await this.page.waitForSelector(this.selectors.spiffProgramCard, {
      state: 'visible',
      timeout: timeOut,
    });

    return Promise.all(
      (await this.page.$$(this.selectors.spiffProgramCard)).map(
        async (card) => {
          const manufacturerNameElement = await card.$(
            this.selectors.manufacturerName
          );
          const myEarningsElement = await card.$(this.selectors.myEarnings);

          const manufacturerName = manufacturerNameElement
            ? await manufacturerNameElement.textContent()
            : 'Unknown';
          const myEarnings = myEarningsElement
            ? parseCurrency(await myEarningsElement.textContent())
            : 0;

          // Extract program descriptions from the card
          const programDescriptionElements = await card.$$(
            this.selectors.programDetails
          );
          const programDescriptions = [];

          for (const element of programDescriptionElements) {
            const text = await element.textContent();
            if (text) {
              programDescriptions.push(text);
            }
          }

          console.log(
            `Extracted ${programDescriptions.length} program descriptions for ${manufacturerName}:`,
            programDescriptions
          );

          return {
            manufacturerName: manufacturerName.trim(),
            myEarnings: myEarnings,
            programDescriptions: programDescriptions,
            element: card,
          };
        }
      )
    );
  }

  /**
   * Get a single SPIFF program by index
   */
  async getSpiffProgramByIndex(index) {
    const programs = await this.getSpiffPrograms();
    if (index >= programs.length) {
      throw new Error(
        `SPIFF Program index ${index} is out of bounds. Total programs: ${programs.length}`
      );
    }
    return programs[index];
  }

  /**
   * Get sum of all My Earnings from SPIFF programs
   */
  async getTotalMyEarnings() {
    const programs = await this.getSpiffPrograms();
    return programs.reduce((sum, program) => sum + program.myEarnings, 0);
  }

  /**
   * Get count of SPIFF programs
   */
  async getSpiffProgramCount() {
    const programs = await this.getSpiffPrograms();
    return programs.length;
  }

  /**
   * Get SPIFF Program Details data when on the details page
   */
  async getSpiffProgramDetailsData() {
    // Wait for the details page to load
    await this.page.waitForSelector(
      '#my-earnings-card .text-2xl.font-semibold',
      {
        state: 'visible',
        timeout: 10000,
      }
    );

    // Extract My Earnings from details page
    const myEarningsElement = this.page.locator(
      '#my-earnings-card .text-2xl.font-semibold'
    );
    const myEarnings = myEarningsElement
      ? parseCurrency(await myEarningsElement.textContent())
      : 0;

    // Extract SPIFF Program Details from table
    const programDetailsRows = await this.page
      .locator('#sales-rep-program-table tbody tr')
      .all();
    const programDetails = [];

    for (const row of programDetailsRows) {
      const cells = await row.locator('td').allTextContents();
      if (cells.length >= 4) {
        programDetails.push({
          type: cells[0]?.trim() || '',
          rebate: parseCurrency(cells[1]?.trim() || '0'),
          overview: cells[2]?.trim() || '',
          startDate: cells[3]?.trim() || '',
          endDate: cells[4]?.trim() || '',
        });
      }
    }

    console.log(
      `SPIFF Program Details extracted - My Earnings: ${myEarnings}, Program Details: ${programDetails.length}`
    );

    return {
      myEarnings: myEarnings,
      programDetails: programDetails,
    };
  }
}

module.exports = SpiffProgramsPage;
