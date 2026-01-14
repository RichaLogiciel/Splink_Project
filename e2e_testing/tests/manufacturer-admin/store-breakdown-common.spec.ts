import { test } from '@playwright/test';
import { manufacturerMap } from '../../utils/userMap';
import { StoreBreakdownTestBase } from '../shared/StoreBreakdownTestBase';
import { TestConfigFactory } from '../shared/utils/TestConfigFactory';

manufacturerMap.forEach((manufacturer, manufacturerKey) => {
  test.describe(`Store Breakdown Common Test: ${manufacturer.name}`, () => {
    class ManufacturerStoreBreakdownTest extends StoreBreakdownTestBase {
      protected getTestConfig() {
        return TestConfigFactory.createManufacturerAdminConfig(manufacturerKey);
      }
    }

    const testInstance = new ManufacturerStoreBreakdownTest();

    test('Test and Verify Purchase Volume and Estimated Earnings for each store on Stores Page', async ({
      page,
    }) => {
      await testInstance.runManufacturerStoreBreakdownTest(page);
    });
  });
});
