import { PROGRAM_TIMELINE_TO_TEST } from '../../utils/constant';
import { MESSAGE } from '../../utils/message';

const BasePage = require('../BasePage');
const { parseCurrency } = require('../../utils/helper');

const timeOut = 400000;

class StorePage extends BasePage {
  constructor(page) {
    super(page);
    this.selectors = {
      // Navigation
      storeMenu: '.logo-and-menus .Stores',
      storeTab: '.logo-and-menus a[href="/app/store"]',

      // Store Table
      storeTable: '#store-table',
      storeTableRow: '#store-table tbody tr',
      storePageMenu: '.logo-and-menus a[href="/app/store"]',
      // Program Timeline
      programTimelineDropdown:
        'select.text-xs.outline-none.rounded.p-2.border.border-border-gray',
    };
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
    // await this.page.waitForURL('?programTimeline=' + PROGRAM_TIMELINE_TO_TEST);

    // Log the change for debugging purposes
    console.log(`Program timeline changed to: ${timeline}`);
  }

  /**
   * Switch to Store Page
   */
  async switchToStorePage() {
    await this.page.waitForSelector(this.selectors.storeMenu, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.click(this.selectors.storeMenu);

    await this.page.waitForSelector(this.selectors.storePageMenu, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.click(this.selectors.storePageMenu);
    await this.page.waitForSelector(this.selectors.storeTable, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.page.waitForURL('/app/store');
    // Ensure the page is fully loaded after navigation
    await this.page.waitForLoadState('networkidle');

    await this.changeProgramTimeline();
    if (PROGRAM_TIMELINE_TO_TEST !== 'Current') {
      await this.page.waitForURL(
        '/app/store?programTimeline=' + PROGRAM_TIMELINE_TO_TEST
      );
    }
    await this.page.waitForLoadState('networkidle');
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
        const storeName = await row.locator('td:first-child p').textContent();
        const cells = await row.locator('td').allTextContents();
        // Columns based on screenshot: Store, Chain, Purchase Volume, Earned Earnings, Earnings YTD, Program Compliance, Sales Rep
        return cells[0]?.trim() != errorMessage
          ? {
              store: storeName || cells[0]?.trim() || '',
              chain: '', // DOM DOES NOT HAVE CHAIN
              purchaseVolume: parseCurrency(cells[1]?.trim() || '0'),
              estimatedEarnings: parseCurrency(cells[2]?.trim() || '0'),
              programCompliance: {
                // DOM DOES NOT HAVE PROGRAM COMPLIANCE
                // completed: parseInt(cells[4]?.trim()?.split('/')?.[0] || '0'),
                // total: parseInt(cells[4]?.trim()?.split('/')?.[1] || '0'),

                // ADDING FAIL SAFE
                completed: 0,
                total: 0,
              },
            }
          : null;
      })
    );
  }
}

export default StorePage;
