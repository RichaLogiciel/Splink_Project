const { test } = require('@playwright/test');
const { EarningsCapTestBase } = require('../shared/EarningsCapTestBase');
const { TestConfigFactory } = require('../shared/utils/TestConfigFactory');
const { salesRepMap } = require('../../utils/userMap');

salesRepMap.forEach((salesRep, salesRepKey) => {
  test.describe(`Earnings Cap Validation - Sales Rep: ${salesRep.name}`, () => {
    class SalesRepEarningsCapTest extends EarningsCapTestBase {
      getTestConfig() {
        return TestConfigFactory.createSalesRepConfig(salesRepKey);
      }
    }

    const testInstance = new SalesRepEarningsCapTest();

    test('Store Program Detail: Validate earnings do not exceed 15% of purchase volume', async ({
      page,
    }) => {
      await testInstance.validateStoreProgramDetailEarningsCap(page);
    });

    test('Store Breakdown: Validate earnings do not exceed 15% of purchase volume', async ({
      page,
    }) => {
      await testInstance.validateStoreBreakdownEarningsCap(page);
    });
  });
});
