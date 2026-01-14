import { parseCurrency } from '../../utils/helper';
import BasePage from '../BasePage';

const timeOut = 400000;

class StoreSpiffPage extends BasePage {
  constructor(page) {
    super(page);
    this.selectors = {
      // Store Spiff Table
      storeSpiffTab: 'a.pb-3.font-medium[href="/app/store/spiff"]',
      spiffStoreTable: '#store-table',
      spiffStoreTableRow: '#store-table tbody tr',
    };
  }

  // Returns all store data from the store table (see screenshot columns)
  async getAllStoresData() {
    // Wait for the store table to be visible before extracting rows
    await this.page.waitForSelector(this.selectors.spiffStoreTable, {
      state: 'visible',
      timeout: 3000,
    });
    const rows = await this.page
      .locator(this.selectors.spiffStoreTableRow)
      .all();
    return Promise.all(
      rows.map(async (row: any) => {
        const cellCount = await row.locator('td').count();
        if (cellCount <= 1) return null; // If the row has no data, return null

        const cells = await row.locator('td').allTextContents();
        // Columns: Store, Chain, My Earning Program Avilable
        const storeName = await row.locator('td:first-child p').textContent();
        return {
          store: storeName || cells[0]?.trim() || '',
          chain: cells[1]?.trim() || '',
          myEarningProgramAvailable: parseCurrency(cells[2]?.trim() || '0'),
          programAvailable: cells[3]?.trim() || '',
        };
      })
    );
  }
}

export default StoreSpiffPage;
