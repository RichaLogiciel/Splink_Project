import { test } from '@playwright/test';
import { distributorMap } from '../../utils/userMap';
import { StoreBreakdownTestBase } from '../shared/StoreBreakdownTestBase';
import { TestConfigFactory } from '../shared/utils/TestConfigFactory';

distributorMap.forEach((distributor, distributorKey) => {
  test.describe(`Store Breakdown Common Test: ${distributor.name}`, () => {
    class DistributorStoreBreakdownTest extends StoreBreakdownTestBase {
      protected getTestConfig() {
        return TestConfigFactory.createDistributorAdminConfig(distributorKey);
      }
    }

    const testInstance = new DistributorStoreBreakdownTest();

    test('Test and Verify Purchase Volume and Estimated Earnings for each store on Stores Page', async ({
      page,
    }) => {
      await testInstance.runStoreBreakdownTest(page);
    });
  });
});
