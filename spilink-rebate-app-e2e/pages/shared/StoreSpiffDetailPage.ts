import { parseCurrency } from '../../utils/helper';
import BasePage from '../BasePage';

const timeOut = 400000;

class StoreSpiffDetailPage extends BasePage {
  selectors: { [key: string]: string };
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
      modalTiers:
        '#spiff-program-overview-modal #store-tiers .recharts-wrapper svg text:not(.text-xs.text-filter-light)',
      modalProductsCheckbox: 
        '#spiff-program-overview-modal span.w-10.h-6.flex.items-center.rounded-full.p-1.duration-300.bg-gray-300',
      modalPurchasedProductsRow: 
        '#spiff-program-overview-modal .tab-content .tab-panel tbody tr',
      modalProductsTable: 
        '#spiff-program-overview-modal .tab-content .tab-panel tbody',
      modalEmptyStateMessage:
        '#spiff-program-overview-modal .tab-content .tab-panel',
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

  /**
   * Wait for modal to be visible
   */
  async waitForModal() {
    await this.page.waitForSelector(this.selectors.manufacturerModal, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.page.waitForLoadState('networkidle');
    await this.page.waitForTimeout(500); // Wait for modal animations
  }

  /**
   * Close the modal
   */
  async closeModal() {
    await this.page.waitForSelector(this.selectors.manufacturerModalCloseButton, {
      state: 'visible',
      timeout: timeOut,
    });
    await this.click(this.selectors.manufacturerModalCloseButton);
    await this.page.waitForSelector(this.selectors.manufacturerModal, {
      state: 'hidden',
      timeout: 5000,
    });
    await this.page.waitForTimeout(300); // Wait for modal close animation
  }

  /**
   * Extract completed and total SKUs from modalTiers selector
   * Returns { completed: number, total: number }
   */
  async getModalSkus() {
    try {
      await this.page.waitForSelector(this.selectors.modalTiers, {
        state: 'visible',
        timeout: 10000,
      });
      const skuText = await this.page
        .locator(this.selectors.modalTiers)
        .first()
        .textContent();
      
      if (!skuText) {
        return { completed: 0, total: 0 };
      }

      // Parse "1/8" format
      const parts = skuText.trim().split('/');
      const completed = Number(parts[0]?.replace(/[^0-9]/g, '') || 0);
      const total = Number(parts[1]?.replace(/[^0-9]/g, '') || 0);

      return { completed, total };
    } catch (error) {
      console.error('Error extracting SKU counts from modal:', error);
      return { completed: 0, total: 0 };
    }
  }

  /**
   * Count total products in the modal table
   */
  async getModalProductCount() {
    try {
      await this.page.waitForSelector(this.selectors.modalProductsTable, {
        state: 'visible',
        timeout: 10000,
      });
      const rows = await this.page
        .locator(`${this.selectors.modalProductsTable} tr`)
        .all();
      return rows.length;
    } catch (error) {
      console.error('Error counting modal products:', error);
      return 0;
    }
  }

  /**
   * Count purchased products after checkbox is enabled
   * Returns 0 if empty state message is shown
   */
  async getModalPurchasedProductCount() {
    try {
      // Wait for the table container to be visible
      await this.page.waitForSelector(this.selectors.modalProductsTable, {
        state: 'visible',
        timeout: 10000,
      });
      
      // Check if empty state message is present
      const emptyStateMessage = this.page.locator(
        this.selectors.modalEmptyStateMessage
      );
      const emptyStateText = await emptyStateMessage.textContent().catch(() => '');
      const hasEmptyMessage = 
        emptyStateText?.includes('not purchased') || 
        emptyStateText?.includes('no products') ||
        emptyStateText?.includes('have not purchased');
      
      if (hasEmptyMessage) {
        return 0;
      }
      
      // Get all rows and filter out message rows
      const allRows = await this.page
        .locator(this.selectors.modalPurchasedProductsRow)
        .all();
      
      // Filter out rows that contain empty state messages or headers
      const productRows: any[] = [];
      for (const row of allRows) {
        const rowText = await row.textContent().catch(() => '');
        const isMessageRow = 
          rowText?.includes('not purchased') ||
          rowText?.includes('no products') ||
          rowText?.includes('have not purchased') ||
          rowText?.trim() === '' ||
          rowText?.includes('Product Name'); // Header row
        
        if (!isMessageRow) {
          productRows.push(row);
        }
      }
      
      return productRows.length;
    } catch (error) {
      console.error('Error counting purchased products:', error);
      return 0;
    }
  }

  async goBackToStorePage(PROGRAM_TIMELINE_TO_TEST) {
    await this.page.goto(
      '/app/store?sort=DESC&sortKey=programCompliance&programTimeline=' + PROGRAM_TIMELINE_TO_TEST,
      {
        waitUntil: 'networkidle',
      }
    );
    await this.page.waitForURL(
      '/app/store?sort=DESC&sortKey=programCompliance&programTimeline=' + PROGRAM_TIMELINE_TO_TEST
    );
    await this.page.waitForLoadState('networkidle');
  }
}

export default StoreSpiffDetailPage;
