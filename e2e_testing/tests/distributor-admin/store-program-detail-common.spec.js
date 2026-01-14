const { test } = require('@playwright/test');
const {
  StoreProgramDetailTestBase,
} = require('../shared/StoreProgramDetailTestBase');
const { TestConfigFactory } = require('../shared/utils/TestConfigFactory');
const { distributorMap } = require('../../utils/userMap');

distributorMap.forEach((distributor, distributorKey) => {
  test.describe(`Store Program Detail Common Test: ${distributor.name}`, () => {
    class DistributorStoreProgramDetailTest extends StoreProgramDetailTestBase {
      getTestConfig() {
        return TestConfigFactory.createDistributorAdminConfig(distributorKey);
      }
    }

    const testInstance = new DistributorStoreProgramDetailTest();

    test.skip('Overview Tab: Retailer Program for each program', async ({
      page,
    }) => {
      await testInstance.runProgramDetailTest(page);
    });

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

    test('Compare Dashboard Store earning with Store programs Current + Historical', async ({
      page,
    }) => {
      if (typeof testInstance.compareStoreEarnings === 'function') {
        await testInstance.compareStoreEarnings(page);
      } else {
        throw new Error(
          'compareStoreEarnings is not implemented in the shared base class. Please implement it.'
        );
      }

      test.info().annotations.push({
        type: 'complete',
        description: 'Test completed and closed',
      });
    });
  });
});
