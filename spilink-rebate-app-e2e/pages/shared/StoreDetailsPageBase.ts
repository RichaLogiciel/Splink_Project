import { PROGRAM_TIMELINE_TO_TEST } from '../../utils/constant';
import { parseCurrency } from '../../utils/helper';
import { MESSAGE } from '../../utils/message';
import BasePage from '../BasePage';

export type ProgramRow = {
  manufacturer: string;
  programCompliance: { completed: number; total: number };
  purchaseVolume: number;
  estimatedEarnings: number;
  earningsOpportunity: number;
};

class StoreDetailsPageBase extends BasePage {
  selectors: { [key: string]: string };
  constructor(page) {
    super(page);
    this.selectors = {
      // Dashboard Metrics
      purchaseVolume: '#purchase-volume .text-2xl.font-semibold',
      estimatedEarnings: '#estimated-earnings .text-2xl.font-semibold',
      enrolledPrograms: '#enrolled-programs .text-2xl.font-semibold',

      // Enrolled Tabs
      programEnrolledTab: '.tab-label-container .relative:first-child',
      programNotEnrolledTab: '.tab-label-container .relative:nth-child(2)',
      allTabs:
        '.tab-label-container .relative:first-child, .tab-label-container .relative:nth-child(2)',

      // Program Table
      programTable: '#enrolled-programs-table',
      programTableRow: '#enrolled-programs-table tbody tr',
      unenrolledProgramTable: '#unenrolled-programs-table',
      unenrolledProgramTableRow: '#unenrolled-programs-table tbody tr',

      SD_Tiers: '#store-details-modal #store-tiers .cat-sku-card',
    };
  }

  /**
   * Go Back to Store Page
   */
  async goBackToStorePage() {
    // Go to the Store Page ?sort=DESC&sortKey=programCompliance&currentPage=1
    await this.page.goto(
      'app/store?sort=DESC&sortKey=estimatedSavings&programTimeline=' +
        PROGRAM_TIMELINE_TO_TEST
    );
    await this.page.waitForLoadState('networkidle', { timeout: 10000 });
  }

  async getDashboardMetrics() {
    const purchaseVolume = parseCurrency(
      await this.page.locator(this.selectors.purchaseVolume).textContent()
    );
    const estimatedEarnings = parseCurrency(
      await this.page.locator(this.selectors.estimatedEarnings).textContent()
    );
    const enrolledPrograms = await this.page
      .locator(this.selectors.enrolledPrograms)
      .textContent();

    const [enrolled, total] = enrolledPrograms?.split('/')?.map(Number) || [];
    return {
      purchaseVolume,
      estimatedEarnings,
      enrolledPrograms: { enrolled, total },
    };
  }

  // Returns all store data from the store table (see screenshot columns)
  async getAllProgramRows(enrolled = true): Promise<ProgramRow[]> {
    const programTable = enrolled
      ? this.selectors.programTable
      : this.selectors.unenrolledProgramTable;
    const programTableRow = enrolled
      ? this.selectors.programTableRow
      : this.selectors.unenrolledProgramTableRow;

    console.log('programTable', programTable);
    console.log('programTableRow', programTableRow);
    console.log('enrolled', enrolled);
    // Wait for the store table to be visible before extracting rows
    await this.page.waitForSelector(programTable, {
      state: 'visible',
      timeout: 7000,
    });
    const rows = await this.page.locator(programTableRow).all();
    const errorMessage = MESSAGE.NOT_FOUND.NO_RECORDS_FOUND;
    const programRows = await Promise.all(
      rows.map(async (row: any) => {
        const cells = await row.locator('td').allTextContents();
        // Columns Manufacturer	Program Compliance	Purchase Volume	Estimated Earnings	Earnings Opp.
        return cells[0]?.trim() != errorMessage
          ? {
              manufacturer: cells[1]?.trim() || '',
              programCompliance: {
                completed: parseInt(cells[2]?.trim()?.split('/')?.[0] || '0'),
                total: parseInt(cells[2]?.trim()?.split('/')?.[2] || '0'),
              },
              purchaseVolume: parseCurrency(cells[4]?.trim() || '0'),
              estimatedEarnings: parseCurrency(cells[5]?.trim() || '0'),
              earningsOpportunity: parseCurrency(cells[6]?.trim() || '0'),
            }
          : null;
      })
    );

    return programRows.filter((row): row is ProgramRow => row !== null);
  }
}

export default StoreDetailsPageBase;
