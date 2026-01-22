import { test } from '@playwright/test';
import { salesRepManagerMap } from '../../utils/userMap';
import { StoreSpiffBreakdownTestBase } from '../shared/StoreSpiffBreakdownTestBase';
import { TestConfigFactory } from '../shared/utils/TestConfigFactory';

salesRepManagerMap.forEach((salesRepManager, salesRepManagerKey) => {
  test.describe(`Store SPIFF Breakdown Common Test: ${salesRepManager.name}`, () => {
    class SalesRepManagerStoreSpiffBreakdownTest extends StoreSpiffBreakdownTestBase {
      protected getTestConfig() {
        return TestConfigFactory.createSalesRepManagerConfig(salesRepManagerKey);
      }
    }

    const testInstance = new SalesRepManagerStoreSpiffBreakdownTest();

    test('Test and Verify Store SPIFF Breakdown for each store', async ({
      page,
    }) => {
      await testInstance.runStoreSpiffBreakdownTest(page);
    });
  });
});
