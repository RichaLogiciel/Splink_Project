const { test } = require('@playwright/test');
const {
  StoreProgramDetailTestBase,
} = require('../shared/StoreProgramDetailTestBase');
const { TestConfigFactory } = require('../shared/utils/TestConfigFactory');
const { salesRepMap } = require('../../utils/userMap');

salesRepMap.forEach((salesRep, salesRepKey) => {
  test.describe(`Store Program Detail Common Test: ${salesRep.name}`, () => {
    class SalesRepStoreProgramDetailTest extends StoreProgramDetailTestBase {
      getTestConfig() {
        return TestConfigFactory.createSalesRepConfig(salesRepKey);
      }
    }

    const testInstance = new SalesRepStoreProgramDetailTest();

    test.skip('Overview Tab: Retailer Program for each program', async ({
      page,
    }) => {
      await testInstance.runProgramDetailTest(page);
    });

    // New test for Enrolled Stores and Stores Not Enrolled Tab
    test('Enrolled Stores and Stores Not Enrolled Tab: Test and verify each store modal and its tier', async ({
      page,
    }) => {
      if (typeof testInstance.runEnrolledStoresTabTest === 'function') {
        await testInstance.runEnrolledStoresTabTest(page);
      } else {
        throw new Error(
          'runEnrolledStoresTabTest is not implemented in the shared base class. Please implement it.'
        );
      }
    });
  });
});
