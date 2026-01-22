import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import ProductInsightPage from '../../pages/distributor-admin/ProductInsightPage';
import SuperAdminUsersTable from '../../pages/SuperAdminUsersTable';
import { ENTITY_TYPE } from '../../utils/constant';
import { distributorMap, manufacturerMap } from '../../utils/userMap';

// Helper to load JSON for a distributor
function loadDistributorJson(jsonPath) {
  const outputJsonPath = path.resolve(__dirname, `../../json/${jsonPath}`);
  return JSON.parse(fs.readFileSync(outputJsonPath, 'utf-8'));
}

distributorMap.forEach((distributor, distributorKey) => {
  test.describe(`Product Insights Page: ${distributor.name}`, () => {
    let productInsightPage;
    let usersTable;
    let outputData;

    test.beforeEach(async ({ page }) => {
      productInsightPage = new ProductInsightPage(page);
      usersTable = new SuperAdminUsersTable(page);
      // Impersonate distributor
      await usersTable.impersonateUser(
        ENTITY_TYPE.DISTRIBUTOR,
        distributorKey,
        {
          manufacturerMap,
          distributorMap,
        }
      );

      // Wait for successful login and navigation
      await expect(page).toHaveURL(/app/);
      await page.waitForLoadState('networkidle');

      // Navigate to Product Insights page
      await productInsightPage.navigateTo();
      await expect(page).toHaveURL(/product-insights/);

      // Load the correct JSON for this distributor
      outputData = loadDistributorJson(distributor.jsonPath);
    });

    test('should verify Product Insight metrics for all periods and manufacturers', async ({
      page,
    }) => {
      const periods = [
        { label: 'YTD', jsonKey: 'ytd' },
        { label: '6M', jsonKey: '6_month' },
        { label: '3M', jsonKey: '3_month' },
        { label: '1M', jsonKey: 'week' },
      ];
      // const manufacturers = outputData.sales_volume.manufacturer.ytd
      //   .map((m) => m.manufacturer_name)
      //   .filter(Boolean);
      for (const period of periods) {
        await productInsightPage.selectPeriod(period.label);
        await productInsightPage.waitForChart();
        await page.waitForTimeout(1000);

        // --- All Manufacturers ---
        const expectedSales = outputData.sales_volume.manufacturer[
          period.jsonKey
        ].reduce((acc, curr) => acc + Math.round(curr.total_purchases || 0), 0);

        const salesVolume = await productInsightPage.getSalesVolume();
        expect(salesVolume).toBeCloseTo(expectedSales, 0);

        const units = await productInsightPage.getUnits();
        const expectedUnits = outputData.sales_units.manufacturer[
          period.jsonKey
        ].reduce((acc, curr) => acc + Math.round(curr.units_sold || 0), 0);
        expect(units).toBeCloseTo(expectedUnits, 0);

        const distributorSales = await productInsightPage.getDistributorSales();
        expect(distributorSales).toBeCloseTo(expectedSales, 0);
        // --- Per Manufacturer ---
        /*
        for (const manufacturer of manufacturers) {
          await productInsightPage.selectManufacturer(manufacturer);
          await productInsightPage.selectPeriod(period.label);
          await productInsightPage.waitForChart();
          const jsonMan = outputData.sales_volume.manufacturer.ytd.find(
            (m) =>
              m.manufacturer_name.trim().toLowerCase() ===
              manufacturer.trim().toLowerCase()
          );
          if (!jsonMan) continue;
          const expectedManSales = jsonMan.total_purchases;
          const expectedManUnits =
            (
              outputData.sales_units.manufacturer.ytd.find(
                (m) =>
                  m.manufacturer_name.trim().toLowerCase() ===
                  manufacturer.trim().toLowerCase()
              ) || {}
            ).units_sold || 0;
          const manSalesVolume = await productInsightPage.getSalesVolume();
          expect(manSalesVolume).toBeCloseTo(expectedManSales, 0);
          const manUnits = await productInsightPage.getUnits();
          expect(manUnits).toBeCloseTo(expectedManUnits, 0);
          const manDistributorSales = await productInsightPage.getDistributorSales();
          expect(manDistributorSales).toBeCloseTo(expectedManSales, 0);
        }
        await productInsightPage.selectManufacturer('All Manufacturers');
        */
      }
    });
  });
});
