import { parseCurrency } from '../../utils/helper';
import BasePage from '../BasePage';

const timeOut = 400000;

class StoreSpiffPage extends BasePage {
  constructor(page) {
    super(page);
    this.selectors = {
      // Store Spiff Table
      mySpiffEarnings: '#my-spiff-earnings .text-2xl.font-semibold',
      spiffProgramAvailable:
        '#spiff-programs-available .text-2xl.font-semibold',
      spiffProgramTable: '#single-spiff-opportunities',
      spiffProgramTableRow: '#single-spiff-opportunities > tbody > tr',
      storeSpiffTab:
        '.storeDetails .min-h-9.flex.gap-8.text-base.border-b .relative:nth-child(2) button',
      spiffStoreTable: '#store-table',
      manufacturerModal: '#spiff-program-overview-modal',
      manufacturerModalCloseButton:
        '#spiff-program-overview-modal img[alt="popupCloseIcon"]',
      modalEarnings:
        '#spiff-program-overview-modal .grid.gap-4.grid-cols-1 .flex.items-center.gap-6.mt-3.justify-start > p.font-semibold.text-lg',
    };
  }

  /**
   * Switch to Store Spiff Page
   */
  async switchToStoreSpiffPage() {
    await this.page.waitForSelector(this.selectors.storeSpiffTab, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.click(this.selectors.storeSpiffTab);
    await this.page.waitForLoadState('networkidle');
  }

  // Get My Spiff Earnings
  async getModalEarnings() {
    await this.page.waitForSelector(this.selectors.modalEarnings, {
      state: 'visible',
      timeout: timeOut,
    });
    return parseCurrency(
      (await this.page.locator(this.selectors.modalEarnings).textContent()) ||
        '0'
    );
  }

  // Get My Spiff Earnings
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

  // Get Spiff Program Available
  async getSpiffProgramAvailable() {
    await this.page.waitForSelector(this.selectors.spiffProgramAvailable, {
      state: 'visible',
      timeout: timeOut,
    });
    return (
      (
        await this.page
          .locator(this.selectors.spiffProgramAvailable)
          .textContent()
      )
        ?.trim()
        ?.replace(/,/g, '') || '0'
    );
  }

  // Returns all store data from the store table (see screenshot columns)
  async getAllSpiffPrograms() {
    // Wait for the store table to be visible before extracting rows
    await this.page.waitForSelector(this.selectors.spiffProgramTable, {
      state: 'visible',
      timeout: 3000,
    });
    const rows = await this.page
      .locator(this.selectors.spiffProgramTableRow)
      .all();
    return Promise.all(
      rows.map(async (row: any) => {
        const cellCount = await row.locator('td').count();
        if (cellCount <= 1) return null; // If the row has no data, return null

        const cells = await row.locator('td').allTextContents();
        // Columns: Manufacturer, My Earnings, Available Program
        return {
          manufacturer: cells[0]?.trim() || '',
          myEarnings: parseCurrency(cells[1]?.trim() || '0'),
          availableProgram: cells[2]?.replace(/,/g, '')?.trim() || '0',
        };
      })
    );
  }

  async getManufacturerPrograms(row: any) {
    const spiffProgramTable = await row.locator(' + tr table.expandedRowTable');
    const rows = await spiffProgramTable.locator('tr').all();
    return Promise.all(
      rows.map(async (row: any) => {
        const cellCount = await row.locator('td').count();
        if (cellCount <= 1) return null; // If the row has no data, return null

        const cells = await row.locator('td').allTextContents();
        // Columns: Program, My Earnings, Available Program
        return {
          programName: cells[0]?.trim() || '',
          myEarnings: parseCurrency(cells[2]?.trim() || '0'),
        };
      })
    );
  }

  async goBacktoStoreSpiffPage() {
    await this.page.goto(
      '/app/store/spiff?sort=DESC&sortKey=estimatedSavings',
      {
        waitUntil: 'networkidle',
      }
    );
    await this.page.waitForLoadState('networkidle');
  }
}

export default StoreSpiffPage;
