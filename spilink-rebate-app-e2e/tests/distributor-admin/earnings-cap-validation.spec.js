const { test } = require('@playwright/test');
const { EarningsCapTestBase } = require('../shared/EarningsCapTestBase');
const { TestConfigFactory } = require('../shared/utils/TestConfigFactory');
const { distributorMap } = require('../../utils/userMap');

distributorMap.forEach((distributor, distributorKey) => {
  test.describe(`Earnings Cap Validation - Distributor Admin: ${distributor.name}`, () => {
    class DistributorAdminEarningsCapTest extends EarningsCapTestBase {
      getTestConfig() {
        return TestConfigFactory.createDistributorAdminConfig(distributorKey);
      }
    }

    const testInstance = new DistributorAdminEarningsCapTest();

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
