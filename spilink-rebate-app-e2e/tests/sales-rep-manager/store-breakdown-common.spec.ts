import { test } from '@playwright/test';
import { salesRepManagerMap } from '../../utils/userMap';
import { StoreBreakdownTestBase } from '../shared/StoreBreakdownTestBase';
import { TestConfigFactory } from '../shared/utils/TestConfigFactory';

salesRepManagerMap.forEach((salesRepManager, salesRepManagerKey) => {
  test.describe(`Store Breakdown Common Test: ${salesRepManager.name}`, () => {
    class SalesRepManagerStoreBreakdownTest extends StoreBreakdownTestBase {
      protected getTestConfig() {
        return TestConfigFactory.createSalesRepManagerConfig(
          salesRepManagerKey
        );
      }
    }

    const testInstance = new SalesRepManagerStoreBreakdownTest();

    test('Test and Verify Purchase Volume and Estimated Earnings for each store on Stores Page', async ({
      page,
    }) => {
      await testInstance.runStoreBreakdownTest(page);
    });
  });
});
