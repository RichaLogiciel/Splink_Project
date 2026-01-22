import { test } from '@playwright/test';
import { salesRepMap } from '../../utils/userMap';
import { StoreBreakdownTestBase } from '../shared/StoreBreakdownTestBase';
import { TestConfigFactory } from '../shared/utils/TestConfigFactory';

salesRepMap.forEach((salesRep, salesRepKey) => {
  test.describe(`Store Breakdown Common Test: ${salesRep.name}`, () => {
    class SalesRepStoreBreakdownTest extends StoreBreakdownTestBase {
      protected getTestConfig() {
        return TestConfigFactory.createSalesRepConfig(salesRepKey);
      }
    }

    const testInstance = new SalesRepStoreBreakdownTest();

    test('Test and Verify Purchase Volume and Estimated Earnings for each store on Stores Page', async ({
      page,
    }) => {
      await testInstance.runStoreBreakdownTest(page);
    });
  });
});
