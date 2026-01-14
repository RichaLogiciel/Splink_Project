import { MESSAGE } from '../../utils/message';

const BasePage = require('../BasePage');
const { parseCurrency } = require('../../utils/helper');

const timeOut = 20000;

class StorePage extends BasePage {
  constructor(page) {
    super(page);
    this.selectors = {
      // Store Table
      storeTable: '#store-table',
      enrolledProgramsTable: '#enrolled-programs-table',
      unenrolledProgramsTable: '#unenrolled-programs-table',
      storeTableRow: '#store-table tbody tr',
      storePageMenu: '.logo-and-menus a[href="/app/store"]',
    };
  }

  /**
   * Switch to Store Page
   */
  async switchToStorePage() {
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
              chain: '', // Chain is not available in this table
              purchaseVolume: parseCurrency(cells[1]?.trim() || '0'),
              estimatedEarnings: parseCurrency(cells[2]?.trim() || '0'),
              programCompliance: {
                // completed: parseInt(cells[4]?.trim()?.split('/')?.[0] || '0'),
                // total: parseInt(cells[4]?.trim()?.split('/')?.[1] || '0'),

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
