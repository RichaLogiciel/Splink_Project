import { test } from '@playwright/test';
import { salesRepMap } from '../../utils/userMap';
import { StoreSpiffBreakdownTestBase } from '../shared/StoreSpiffBreakdownTestBase';
import { TestConfigFactory } from '../shared/utils/TestConfigFactory';

salesRepMap.forEach((salesRep, salesRepKey) => {
  test.describe(`Store SPIFF Breakdown Common Test: ${salesRep.name}`, () => {
    class SalesRepStoreSpiffBreakdownTest extends StoreSpiffBreakdownTestBase {
      protected getTestConfig() {
        return TestConfigFactory.createSalesRepConfig(salesRepKey);
      }
    }

    const testInstance = new SalesRepStoreSpiffBreakdownTest();

    test('Test and Verify Store SPIFF Breakdown for each store', async ({
      page,
    }) => {
      await testInstance.runStoreSpiffBreakdownTest(page);
    });
  });
});
