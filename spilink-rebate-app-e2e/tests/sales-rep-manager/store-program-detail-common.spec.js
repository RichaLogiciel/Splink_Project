const { test } = require('@playwright/test');
const {
  StoreProgramDetailTestBase,
} = require('../shared/StoreProgramDetailTestBase');
const { TestConfigFactory } = require('../shared/utils/TestConfigFactory');
const { salesRepManagerMap } = require('../../utils/userMap');
const { ENTITY_TYPE } = require('../../utils/constant');

salesRepManagerMap.forEach((salesRepManager, salesRepManagerKey) => {
  test.describe(`Store Program Detail Common Test: ${salesRepManager.name}`, () => {
    class SalesRepManagerStoreProgramDetailTest extends StoreProgramDetailTestBase {
      getTestConfig() {
        return TestConfigFactory.createSalesRepManagerConfig(
          salesRepManagerKey
        );
      }
    }

    const testInstance = new SalesRepManagerStoreProgramDetailTest();

    test('Overview Tab: Retailer Program for each program', async ({
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

    // New test for Compare Dashboard Store earning with Store programs Current + Historical
    test('Compare Dashboard Store earning with Store programs Current + Historical', async ({
      page,
    }) => {
      if (typeof testInstance.compareStoreEarnings === 'function') {
        await testInstance.compareStoreEarnings(
          page,
          ENTITY_TYPE.SALES_REP_MANAGER
        );
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
