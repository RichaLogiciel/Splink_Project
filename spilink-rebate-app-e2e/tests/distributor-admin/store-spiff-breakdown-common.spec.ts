import { test } from '@playwright/test';
import { distributorMap } from '../../utils/userMap';
import { StoreSpiffBreakdownTestBase } from '../shared/StoreSpiffBreakdownTestBase';
import { TestConfigFactory } from '../shared/utils/TestConfigFactory';

distributorMap.forEach((distributor, distributorKey) => {
  test.describe(`Store SPIFF Breakdown Common Test: ${distributor.name}`, () => {
    class DistributorStoreSpiffBreakdownTest extends StoreSpiffBreakdownTestBase {
      protected getTestConfig() {
        return TestConfigFactory.createDistributorAdminConfig(distributorKey);
      }
    }

    const testInstance = new DistributorStoreSpiffBreakdownTest();

    test('Test and Verify Store SPIFF Breakdown for each store', async ({
      page,
    }) => {
      await testInstance.runStoreSpiffBreakdownTest(page);
    });
  });
});
