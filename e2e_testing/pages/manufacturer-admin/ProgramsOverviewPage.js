import BasePage from '../BasePage';

class ProgramsOverviewPage extends BasePage {
  constructor(page) {
    super(page);
    this.selectors = {
      distributorProgramCards: '#distributor-programs',
      distributorProgramCardsTitle:
        '#distributor-programs .text-s.font-semibold.flex.gap-2.w-full',
      storeProgramCards: '#store-programs',
      storeProgramCardsTitle:
        '#store-programs .text-s.font-semibold.flex.gap-2.w-full',
      salesRepProgramCards: '#sales-reps-programs',
      salesRepProgramCardsTitle:
        '#sales-reps-programs .text-s.font-semibold.flex.gap-2.w-full',
      distributorDropdown: 'select#select-entity',
      // Add more selectors as needed
    };
  }

  async selectDistributor(distributorName) {
    await this.page.selectOption(this.selectors.distributorDropdown, {
      label: distributorName,
    });
  }

  async getProgramCards(type = 'distributor') {
    if (type === 'distributor')
      return this.page.locator(this.selectors.distributorProgramCards);
    if (type === 'store')
      return this.page.locator(this.selectors.storeProgramCards);
    if (type === 'sales_rep')
      return this.page.locator(this.selectors.salesRepProgramCards);
    throw new Error('Unknown program type');
  }

  async getProgramCardByName(type, name) {
    // Locate the title element
    const title = this.page.locator(
      `${this.selectors[`${type}ProgramCardsTitle`]}:has-text("${name}")`
    );
    // Return its parent (the card container)
    return title.locator('..');
  }

  async getRebateValue(cardLocator) {
    const value = (
      await cardLocator
        .locator('span.text-s.mt-1.block.font-semibold')
        .textContent()
    ).replace(/[^\d.]/g, '');

    return this.parseCurrency(value);
  }

  async getCompliance(cardLocator) {
    return (
      await cardLocator.locator('.flex.items-center.gap-2 span').textContent()
    )
      .replaceAll(',', '')
      .trim();
  }

  parseCurrency(text) {
    const value = parseFloat(text.replace(/[^\d.]/g, '')) || 0;
    return isNaN(value) ? 0 : value;
  }
}

export default ProgramsOverviewPage;
