import { PROGRAM_TIMELINE_TO_TEST } from '../../utils/constant';

const { MESSAGE } = require('../../utils/message');
const BasePage = require('../BasePage');
const { parseCurrency } = require('../../utils/helper');

const timeOut = 400000; // Use highest timeout value

class StorePageBase extends BasePage {
  constructor(page) {
    super(page);
    this.selectors = {
      StoreMenu: '.logo-and-menus .Stores',
      // Store Table
      storeTable: '#store-table',
      enrolledProgramsTable: '#enrolled-programs-table',
      unenrolledProgramsTable: '#unenrolled-programs-table',
      storeTableRow: '#store-table tbody tr',
      storePageMenu: '.logo-and-menus a[href="/app/store"]',
      SD_Tiers: '#store-details-modal #store-tiers .cat-sku-card',

      // Historical Program Timeline
      programTimelineDropdown:
        'select.text-xs.outline-none.rounded.p-2.border.border-border-gray',
    };
  }

  /**
   * Switch to Store Page
   */
  async switchToStorePage() {
    await this.page.waitForSelector(this.selectors.StoreMenu, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.click(this.selectors.StoreMenu);
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForSelector(this.selectors.storePageMenu, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.click(this.selectors.storePageMenu);
    await this.page.waitForSelector(this.selectors.storeTable, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.page.waitForLoadState('networkidle');
  }

  // Changes the program timeline to the specified value
  // Default is 'Historical'
  async changeProgramTimeline(timeline = PROGRAM_TIMELINE_TO_TEST) {
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
    //   'app/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
    // );

    // Log the change for debugging purposes
    console.log(`Program timeline changed to: ${timeline}`);
    console.log(`Changed URL to: ${this.page.url()}`);
  }

  // Returns all store data from the store table (see screenshot columns)
  async getAllStoresData() {
    // Wait for the store table to be visible before extracting rows
    await this.page.waitForSelector(this.selectors.storeTable, {
      state: 'visible',
      timeout: 3000,
    });
    const rows = await this.page.locator(this.selectors.storeTableRow).all();
    const errorMessage = MESSAGE.NOT_FOUND.STORE_TABLE;
    return Promise.all(
      rows.map(async (row: any) => {
        const totalColumns = await row.locator('td').count();
        const storeName = await row.locator('td:first-child p').textContent();
        if (totalColumns <= 1) {
          console.log('Skipping row: ', storeName);
          return null;
        }

        const cells = await row.locator('td').allTextContents();
        // Columns based on screenshot: Store, Chain, Purchase Volume, Earned Earnings, Earnings YTD, Program Compliance, Sales Rep
        return cells[0]?.trim() != errorMessage
          ? {
              store: storeName || cells[0]?.trim() || '',
              chain: '', // Chain is not available in this table
              purchaseVolume: parseCurrency(cells[1]?.trim() || '0'),
              estimatedEarnings: parseCurrency(cells[2]?.trim() || '0'),
              // programCompliance: {
              //   completed: parseInt(
              //     cells[4]
              //       ?.trim()
              //       ?.split('/')?.[0]
              //       ?.replace(/[^0-9]/g, '') || '0'
              //   ),
              //   total: parseInt(
              //     cells[4]
              //       ?.trim()
              //       ?.split('/')?.[1]
              //       ?.replace(/[^0-9]/g, '') || '0'
              //   ),
              // },
            }
          : null;
      })
    );
  }
}

export default StorePageBase;
