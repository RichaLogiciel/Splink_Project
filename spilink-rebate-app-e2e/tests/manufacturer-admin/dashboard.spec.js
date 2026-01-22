import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import DashboardPage from '../../pages/manufacturer-admin/DashboardPage';
import SuperAdminUsersTable from '../../pages/SuperAdminUsersTable';
import { ENTITY_TYPE } from '../../utils/constant';
import { distributorMap, manufacturerMap } from '../../utils/userMap';

// Helper to load JSON for a manufacturer
function loadManufacturerJson(jsonPath) {
  const outputJsonPath = path.resolve(__dirname, `../../json/${jsonPath}`);
  return JSON.parse(fs.readFileSync(outputJsonPath, 'utf-8'));
}

manufacturerMap.forEach((manufacturer, manufacturerKey) => {
  test.describe(`Manufacturer Dashboard: ${manufacturer.name}`, () => {
    let dashboardPage;
    let usersTable;
    let outputData;

    test.beforeEach(async ({ page }) => {
      dashboardPage = new DashboardPage(page);
      usersTable = new SuperAdminUsersTable(page);
      // Impersonate manufacturer
      await usersTable.impersonateUser(
        ENTITY_TYPE.MANUFACTURER,
        manufacturerKey,
        {
          manufacturerMap,
          distributorMap,
        }
      );
      // Wait for successful login and navigation
      await expect(page).toHaveURL(/app/);
      await page.waitForLoadState('networkidle');
      // Load the correct JSON for this manufacturer
      outputData = loadManufacturerJson(manufacturer.jsonPath);
    });

    test('should verify Dashboard metrics for all periods', async ({
      page,
    }) => {
      const periods = [
        { label: 'YTD', jsonKey: 'ytd' },
        { label: '6M', jsonKey: '6_month' },
        { label: '3M', jsonKey: '3_month' },
        { label: '1M', jsonKey: 'week' },
      ];
      // const distributors = outputData.sales_volume.distributor.ytd
      //   .map((m) => m.distributor_name)
      //   .filter(Boolean);
      for (const period of periods) {
        await dashboardPage.selectPeriod(period.label);
        await dashboardPage.waitForChart();
        // --- All Distributors ---
        const salesVolume = await dashboardPage.getSalesVolume();
        const expectedSales = outputData.sales_volume.distributor[
          period.jsonKey
        ].reduce((acc, curr) => acc + Math.round(curr.total_purchases || 0), 0);
        expect(salesVolume).toBeCloseTo(expectedSales, 0);
        const units = await dashboardPage.getUnits();
        const expectedUnits = outputData.sales_units.distributor[
          period.jsonKey
        ].reduce((acc, curr) => acc + Math.round(curr.units_sold || 0), 0);
        expect(units).toBeCloseTo(expectedUnits, 0);
        const distributorSales = await dashboardPage.getDistributorSales();
        expect(distributorSales).toBeCloseTo(expectedSales, 0);
        // --- Per Distributor (optional, can uncomment if needed) ---
        /*
        for (const distributor of distributors) {
          await dashboardPage.selectDistributor(distributor);
          await dashboardPage.selectPeriod(period.label);
          await dashboardPage.waitForChart();
          const jsonDist = outputData.sales_volume.distributor.ytd.find(
            (m) =>
              m.distributor_name.trim().toLowerCase() ===
              distributor.trim().toLowerCase()
          );
          if (!jsonDist) continue;
          const expectedDistSales = jsonDist.total_purchases;
          const expectedDistUnits =
            (
              outputData.sales_units.distributor.ytd.find(
                (m) =>
                  m.distributor_name.trim().toLowerCase() ===
                  distributor.trim().toLowerCase()
              ) || {}
            ).units_sold || 0;
          const distSalesVolume = await dashboardPage.getSalesVolume();
          expect(distSalesVolume).toBeCloseTo(expectedDistSales, 0);
          const distUnits = await dashboardPage.getUnits();
          expect(distUnits).toBeCloseTo(expectedDistUnits, 0);
          const distDistributorSales = await dashboardPage.getDistributorSales();
          expect(distDistributorSales).toBeCloseTo(expectedDistSales, 0);
        }
        await dashboardPage.selectDistributor('All Distributors');
        */
      }
    });
  });
});
