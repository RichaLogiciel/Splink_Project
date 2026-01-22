import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import ProgramsOverviewPage from '../../pages/manufacturer-admin/ProgramsOverviewPage';
import SuperAdminUsersTable from '../../pages/SuperAdminUsersTable';
import { ENTITY_TYPE } from '../../utils/constant';
import { formatNumber } from '../../utils/helper';
import { distributorMap, manufacturerMap } from '../../utils/userMap';

// Helper to load JSON for a manufacturer
function loadManufacturerJson(jsonPath) {
  const outputJsonPath = path.resolve(__dirname, `../../json/${jsonPath}`);
  return JSON.parse(fs.readFileSync(outputJsonPath, 'utf-8'));
}

// Expect the UI date format: "Month Dayth 'YY" (e.g., April 1st '25)
function formatUIDate(dateStr) {
  const date = new Date(dateStr);
  const month = date.toLocaleString('en-US', { month: 'long' });
  const day = date.getDate();
  // Get ordinal suffix
  const j = day % 10,
    k = day % 100;
  let suffix = 'th';
  if (j === 1 && k !== 11) suffix = 'st';
  else if (j === 2 && k !== 12) suffix = 'nd';
  else if (j === 3 && k !== 13) suffix = 'rd';
  const year = `'${String(date.getFullYear()).slice(-2)}`;
  return `${month} ${day}${suffix} ${year}`;
}

manufacturerMap.forEach((manufacturer, manufacturerKey) => {
  test.describe(`Manufacturer Programs Overview: ${manufacturer.name}`, () => {
    let programsPage;
    let usersTable;
    let outputData;

    test.beforeEach(async ({ page }) => {
      programsPage = new ProgramsOverviewPage(page);
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
      await expect(page).toHaveURL(/app/);
      await page.waitForLoadState('networkidle');
      // Navigate to Programs Overview page
      await page.goto('/app/programs');
      outputData = loadManufacturerJson(manufacturer.jsonPath);
    });

    test('should display correct program cards (name, rate, type, dates)', async ({
      page,
    }) => {
      // Distributor Programs
      for (const program of outputData.programs.distributor) {
        const card = await programsPage.getProgramCardByName(
          'distributor',
          program.name
        );
        await expect(card).toBeVisible();
        // Check name in the title
        const titleText = await card.locator('span').first().textContent();
        expect(titleText).toContain(program.name);
        console.log(
          `UI Program Name: ${titleText}, JSON Program Name: ${program.name}`
        );

        // Check Rate
        const rateText = await card
          .locator('span.text-base.font-semibold')
          .textContent();
        let expectedRate = '';
        if (program.rate_type === 'percentage') {
          expectedRate = `(${formatNumber(program.rate)}%)`;
        } else {
          expectedRate = `($${formatNumber(program.rate)})`;
        }
        console.log(`UI Rate: ${rateText}, JSON Rate: ${expectedRate}`);
        expect(rateText).toContain(expectedRate);

        // Check start and end date
        const startDate = await card
          .locator('div:has-text("Start Date") + p')
          .textContent();
        const endDate = await card
          .locator('div:has-text("End Date") + p')
          .textContent();

        const expectedStartDate = formatUIDate(program.start_date);
        const expectedEndDate = formatUIDate(program.end_date);

        console.log(
          `UI Start Date: ${startDate}, JSON Start Date: ${expectedStartDate}`
        );
        console.log(
          `UI End Date: ${endDate}, JSON End Date: ${expectedEndDate}`
        );
        expect(startDate.trim()).toBe(expectedStartDate);
        expect(endDate.trim()).toBe(expectedEndDate);
      }

      // Store Programs
      for (const program of outputData.programs.store) {
        const card = await programsPage.getProgramCardByName(
          'store',
          program.name
        );
        await expect(card).toBeVisible();
        // Check name in the title
        const titleText = await card.locator('span').first().textContent();
        expect(titleText).toContain(program.name);
        console.log(
          `UI Program Name: ${titleText}, JSON Program Name: ${program.name}`
        );

        // Check Rate
        const rateText = await card
          .locator('span.text-base.font-semibold')
          .textContent();
        let expectedRate = '';
        if (program.rate_type === 'percentage') {
          expectedRate = `(${formatNumber(program.rate)}%)`;
        } else {
          expectedRate = `($${formatNumber(program.rate)})`;
        }
        console.log(`UI Rate: ${rateText}, JSON Rate: ${expectedRate}`);
        expect(rateText).toContain(expectedRate);

        // Check start and end date
        const startDate = await card
          .locator('div:has-text("Start Date") + p')
          .textContent();
        const endDate = await card
          .locator('div:has-text("End Date") + p')
          .textContent();

        const expectedStartDate = formatUIDate(program.start_date);
        const expectedEndDate = formatUIDate(program.end_date);

        console.log(
          `UI Start Date: ${startDate}, JSON Start Date: ${expectedStartDate}`
        );
        console.log(
          `UI End Date: ${endDate}, JSON End Date: ${expectedEndDate}`
        );
        expect(startDate.trim()).toBe(expectedStartDate);
        expect(endDate.trim()).toBe(expectedEndDate);
      }

      // Sales Rep Programs
      for (const program of outputData.programs.sales_rep) {
        const card = await programsPage.getProgramCardByName(
          'salesRep',
          program.name
        );
        await expect(card).toBeVisible();

        // Check name in the title
        const titleText = await card.locator('span').first().textContent();
        expect(titleText).toContain(program.name);
        console.log(
          `UI Program Name: ${titleText}, JSON Program Name: ${program.name}`
        );

        // Check Rate
        const rateText = await card
          .locator('span.text-base.font-semibold')
          .textContent();
        let expectedRate = '';
        if (program.rate_type === 'percentage') {
          expectedRate = `(${formatNumber(program.rate)}%)`;
        } else {
          expectedRate = `($${formatNumber(program.rate)})`;
        }
        console.log(`UI Rate: ${rateText}, JSON Rate: ${expectedRate}`);
        expect(rateText).toContain(expectedRate);

        // Check start and end date
        const startDate = await card
          .locator('div:has-text("Start Date") + p')
          .textContent();
        const endDate = await card
          .locator('div:has-text("End Date") + p')
          .textContent();

        const expectedStartDate = formatUIDate(program.start_date);
        const expectedEndDate = formatUIDate(program.end_date);

        console.log(
          `UI Start Date: ${startDate}, JSON Start Date: ${expectedStartDate}`
        );
        console.log(
          `UI End Date: ${endDate}, JSON End Date: ${expectedEndDate}`
        );
        expect(startDate.trim()).toBe(expectedStartDate);
        expect(endDate.trim()).toBe(expectedEndDate);
      }
    });

    test('should display correct rebate and compliance for each distributor selection', async ({
      page,
    }) => {
      const rebateTypes = [
        {
          key: 'distributor_rebate',
          type: 'distributor',
          label: 'Distributor',
        },
        { key: 'store_rebate', type: 'store', label: 'Store Program' },
        {
          key: 'sales_rep_rebate',
          type: 'salesRep',
          label: 'Sales Rep Program',
        },
      ];
      for (const { key, type, label } of rebateTypes) {
        const rebateArr = outputData.rebate_volume[key] || [];
        for (const distributor of rebateArr) {
          // Select distributor in dropdown if present
          if (distributor.distributor_name) {
            await programsPage.selectDistributor(distributor.distributor_name);
            await page.waitForTimeout(1000); // Wait for data to update
          }

          for (const program of distributor.programs) {
            const card = await programsPage.getProgramCardByName(
              type,
              program.program_name
            );
            await expect(card).toBeVisible();
            const rebate = await programsPage.getRebateValue(card);
            console.log(
              `${label}: ${distributor.distributor_name}, Program: ${program.program_name}, UI Rebate: ${rebate}, JSON Rebate: ${program.rebate}`
            );
            expect(rebate).toBeCloseTo(program.rebate ?? 0, 1);
            if (
              program.compliance !== undefined &&
              program.compliance_total !== undefined
            ) {
              const compliance = await programsPage.getCompliance(card);
              console.log(
                `${label}: ${distributor.distributor_name}, Program: ${program.program_name}, UI Compliance: ${compliance}, JSON Compliance: ${program.compliance}/${program.compliance_total}`
              );
              expect(compliance).toContain(
                `${program.compliance}/${program.compliance_total}`
              );
            }
          }
        }
      }
    });
  });
});
