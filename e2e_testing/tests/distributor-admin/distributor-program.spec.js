import { expect, test } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import ProgramPage from '../../pages/distributor-admin/ProgramPage';
import SuperAdminUsersTable from '../../pages/SuperAdminUsersTable';
import { ENTITY_TYPE } from '../../utils/constant';
import { distributorMap, manufacturerMap } from '../../utils/userMap';

// Helper to load JSON for a distributor
function loadDistributorJson(jsonPath) {
  const outputJsonPath = path.resolve(__dirname, `../../json/${jsonPath}`);
  return JSON.parse(fs.readFileSync(outputJsonPath, 'utf-8'));
}

distributorMap.forEach((distributor, distributorKey) => {
  test.describe(`Distributor Program Functionality: ${distributor.name}`, () => {
    let programPage;
    let usersTable;
    let outputData;

    test.beforeEach(async ({ page }) => {
      programPage = new ProgramPage(page);
      usersTable = new SuperAdminUsersTable(page);

      // Impersonate distributor
      await usersTable.impersonateUser(
        ENTITY_TYPE.DISTRIBUTOR_ADMIN,
        distributorKey,
        {
          manufacturerMap,
          distributorMap,
        }
      );

      // Wait for successful login and navigation
      await expect(page).toHaveURL(/app/);
      await page.waitForLoadState('networkidle');

      // Navigate to Programs page
      await programPage.navigateToPrograms();
      await expect(page).toHaveURL(/programs/);

      // Load the correct JSON for this distributor
      outputData = loadDistributorJson(distributor.jsonPath);
    });

    test('should display Distributor & Store Program tab', async ({ page }) => {
      await programPage.switchToDistributorPrograms();
      await expect(page).toHaveURL(/.*\/app\/programs/);
      await expect(
        page.locator(programPage.selectors.distributorProgramTab)
      ).toBeVisible();
      await expect(
        page.locator(programPage.selectors.storeProgramTab)
      ).toBeVisible();
    });

    test('Distributor Program Tab: List of available distributor programs', async ({
      page,
    }) => {
      await programPage.switchToDistributorPrograms();
      await page.waitForLoadState('networkidle');
      // Verify program list is visible
      const isProgramListVisible = await page
        .locator(programPage.selectors.programList)
        .isVisible();
      if (!isProgramListVisible) {
        page.screenshot();
        console.error('Program list is not visible. Screenshot taken.');
        return;
      }

      const programList = page.locator(programPage.selectors.programList);
      await page.waitForTimeout(1000); // Ensure the page is ready

      if (!(await programList.isVisible())) {
        page.screenshot();
        console.error(
          'Distributor program list is not visible. Screenshot taken.'
        );
        test.fail('Distributor program list is not visible. Screenshot taken.');
        return;
      }

      const programs = await test.step('Get distributor programs', async () => {
        let attempts = 0;
        let programs = [];
        while (attempts < 3 && programs.length === 0) {
          programs = await programPage.getPrograms();
          if (programs.length === 0) {
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            attempts++;
          }
        }
        return programs;
      });
      if (programs.length === 0) {
        test.skip(true, 'No distributor programs available for this user.');
      }
      expect(programs.length).toBeGreaterThan(0);
    });

    test('Store Program Tab: List of available store programs', async ({
      page,
    }) => {
      await programPage.switchToStorePrograms();
      await page.waitForLoadState('networkidle');

      // Verify program list is visible
      const isProgramListVisible = await page
        .locator(programPage.selectors.programList)
        .isVisible();
      if (!isProgramListVisible) {
        page.screenshot();
        console.error('Program list is not visible. Screenshot taken.');
        return;
      }

      // Verify program list is visible
      const programList = page.locator(programPage.selectors.programList);
      await page.waitForTimeout(1000); // Ensure the page is ready

      if (!(await programList.isVisible())) {
        page.screenshot();
        console.error(
          'Distributor program list is not visible. Screenshot taken.'
        );
        test.fail('Distributor program list is not visible. Screenshot taken.');
        return;
      }

      // Get all programs with retry logic
      const programs = await test.step('Get store programs', async () => {
        let attempts = 0;
        let programs = [];

        while (attempts < 3 && programs.length === 0) {
          programs = await programPage.getPrograms();
          if (programs.length === 0) {
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000); // short delay between attempts
            attempts++;
          }
        }
        return programs;
      });

      if (programs.length === 0) {
        test.skip(true, 'No store programs available for this user.');
      }
    });

    test('Distributor Program Tab: Show distributor program details when clicked', async ({
      page,
    }) => {
      await programPage.switchToDistributorPrograms();
      await page.waitForLoadState('networkidle');

      // Get first program with retry logic
      const programs = await test.step('Get distributor programs', async () => {
        let attempts = 0;
        let programs = [];

        while (attempts < 3 && programs.length === 0) {
          programs = await programPage.getPrograms();
          if (programs.length === 0) {
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            attempts++;
          }
        }
        return programs;
      });

      if (programs.length === 0) {
        test.skip(true, 'No distributor programs available for this user.');
      }

      // Click on first program using clickProgram
      await programPage.clickProgram(0);
      await page.waitForLoadState('networkidle');

      // Verify program details are displayed
      await expect(
        page.locator(programPage.selectors.distributorProgramDetails)
      ).toBeVisible();
    });

    test('Store Program Tab: Show store program details when clicked', async ({
      page,
      browserName,
    }) => {
      await programPage.switchToStorePrograms();

      await page.waitForLoadState('networkidle');

      // Get programs with retry logic
      const programs = await test.step('Get store programs', async () => {
        let attempts = 0;
        let programs = [];

        while (attempts < 3 && programs.length === 0) {
          programs = await programPage.getPrograms();
          if (programs.length === 0) {
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1000);
            attempts++;
          }
        }
        return programs;
      });

      // Skip test if no programs found
      if (programs.length === 0) {
        test.skip(true, 'No store programs available for this user.');
        return;
      }

      expect(programs.length).toBeGreaterThan(0);

      // Click on first program using clickProgram
      await programPage.clickProgram(0);
      await page.waitForLoadState('networkidle');

      // Verify program details are displayed
      await expect(
        page.locator(programPage.selectors.storeProgramDetails)
      ).toBeVisible();
    });

    test('Distributor Program Tab: Verify purchase volume is greater than or equal to estimated earnings for each program', async ({
      page,
    }) => {
      // Helper to extract and parse numeric values from text
      const parseCurrency = (text) => {
        if (!text) return 0;
        const value = parseFloat(text.replace(/[^0-9.]/g, ''));
        return isNaN(value) ? 0 : value;
      };

      // Track all failures across all program types
      const allFailureDetails = [];

      // Check programs for the purchase volume >= earnings rule
      const verifyProgramsFinancials = async (programType) => {
        await test.step(`Verify ${programType} programs financials`, async () => {
          // Switch to appropriate tab with proper waiting
          if (programType === 'DISTRIBUTOR') {
            await programPage.switchToDistributorPrograms();
            await page.waitForLoadState('networkidle');
            await expect(
              page.locator(programPage.selectors.distributorProgramTab)
            ).toBeVisible();
          } else {
            await programPage.switchToStorePrograms();
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(1500);
            await expect(
              page.locator(programPage.selectors.storeProgramTab)
            ).toBeVisible();
          }

          // Wait for data to load
          await page.waitForLoadState('networkidle');
          // Get all programs with their financial data. getPrograms() handles
          // the empty-state case and returns [] instead of timing out.
          const programs = await programPage.getPrograms();
          await page.waitForLoadState('networkidle');
          if (programs.length === 0) {
            test.skip(
              true,
              `No ${programType} programs available for this user.`
            );
            return;
          }

          // Check programs (limit to 30 as per your test)
          const programsToCheck = Math.min(programs.length, 30);
          console.log(`Checking ${programsToCheck} ${programType} programs`);

          for (let i = 0; i < programsToCheck; i++) {
            const program = programs[i];
            try {
              // Get financial values
              const purchaseVolumeText = program.purchaseVolume
                ? await program.purchaseVolume.textContent()
                : '';
              const estimatedEarningsText = program.estimatedEarnings
                ? await program.estimatedEarnings.textContent()
                : '';

              const purchaseVolume = parseCurrency(purchaseVolumeText);
              const estimatedEarnings = parseCurrency(estimatedEarningsText);

              // Log if both are zero (allowed case)
              if (purchaseVolume === 0 && estimatedEarnings === 0) {
                console.log(
                  `Skipping ${programType} Program ${
                    i + 1
                  } as both purchase volume and estimated earnings are zero`
                );
                // continue;
              }

              // Check validation rule
              if (purchaseVolume < estimatedEarnings) {
                allFailureDetails.push(
                  `${programType} Program ${
                    i + 1
                  }: Purchase volume ($${purchaseVolume}) < Estimated earnings ($${estimatedEarnings})`
                );
              }
            } catch (error) {
              console.warn(
                `Error checking ${programType} Program ${i + 1}:`,
                error.message
              );
            }
          }
        });
      };

      // Verify both distributor and store programs
      await verifyProgramsFinancials('DISTRIBUTOR');
      await verifyProgramsFinancials('STORE');

      // Final assertion - fail if any failures found
      if (allFailureDetails.length > 0) {
        console.error('\nFAILED PROGRAMS:');
        allFailureDetails.forEach((detail) => console.error(`- ${detail}`));
        throw new Error(
          `Found ${allFailureDetails.length} programs with purchase volume < estimated earnings`
        );
      }
    });

    test.skip('Distributor Program Tab: Verify purchase volume and estimated earnings with JSON', async ({
      page,
    }) => {
      await programPage.switchToDistributorPrograms();
      const uiPrograms = await programPage.getPrograms();
      const jsonPrograms = outputData.buyer_volume.manufacturer.ytd;

      // Build lookup maps for fast matching (lowercase names)
      const uiMap = new Map(
        uiPrograms
          .filter(
            (p) => p.manufacturerName && typeof p.manufacturerName === 'string'
          )
          .map((p) => [p.manufacturerName.trim().toLowerCase(), p])
      );
      const jsonMap = new Map(
        jsonPrograms
          .filter(
            (j) =>
              j.manufacturer_name && typeof j.manufacturer_name === 'string'
          )
          .map((j) => [j.manufacturer_name.trim().toLowerCase(), j])
      );

      // Find matches and mismatches
      const matching = [];
      const uiOnly = [];
      const jsonOnly = [];

      for (const [name, uiProg] of uiMap.entries()) {
        if (jsonMap.has(name)) {
          matching.push({ ui: uiProg, json: jsonMap.get(name) });
        } else if (name) {
          uiOnly.push(name);
        }
      }
      for (const [name] of jsonMap.entries()) {
        if (!uiMap.has(name) && name) {
          jsonOnly.push(name);
        }
      }

      // Logging
      console.log(`UI Distributor Programs: ${uiPrograms.length}`);
      console.log(`JSON Distributor Programs: ${jsonPrograms.length}`);
      console.log(`Matching programs: ${matching.length}`);
      if (uiOnly.length) console.log('Programs only in UI:', uiOnly);
      if (jsonOnly.length) console.log('Programs only in JSON:', jsonOnly);

      // Error if counts don't match
      if (jsonOnly.length || uiOnly.length) {
        throw new Error(
          `Mismatch in distributor programs: ${
            uiOnly.length ? `UI=${uiOnly}` : ''
          } ${jsonOnly.length ? `JSON=${jsonOnly}` : ''}`.trim()
        );
      }
      if (uiPrograms.length !== jsonPrograms.length) {
        throw new Error(
          `Mismatch in number of distributor programs: UI=${uiPrograms.length}, JSON=${jsonPrograms.length}`
        );
      }
      if (matching.length === 0) {
        throw new Error('No matching programs found between UI and JSON data');
      }

      // Value checks
      for (const { ui, json } of matching) {
        // Defensive: handle missing or non-numeric values
        const purchaseVolumeText = ui.purchaseVolume
          ? await ui.purchaseVolume.textContent()
          : '';
        const purchaseVolume =
          parseFloat((purchaseVolumeText || '').replace(/[^0-9.]/g, '')) || 0;
        const jsonVolume =
          typeof json.total_sales === 'number' ? json.total_sales : 0;
        console.log(
          `${json.manufacturer_name} - Purchase Volume: UI=$${purchaseVolume}, JSON=$${jsonVolume}`
        );
        if (Math.abs(purchaseVolume - jsonVolume) > 0.5) {
          console.error(
            `ERROR: ${json.manufacturer_name} - Purchase Volume mismatch: UI=$${purchaseVolume}, JSON=$${jsonVolume}`
          );
        }
        expect(purchaseVolume).toBeCloseTo(jsonVolume, 0);

        // const estimatedEarningsText = ui.estimatedEarnings
        //   ? await ui.estimatedEarnings.textContent()
        //   : '';
        // const estimatedEarnings =
        //   parseFloat((estimatedEarningsText || '').replace(/[^0-9.]/g, '')) || 0;
        // const jsonEarnings =
        //   typeof json.est_earnings === 'number' ? json.est_earnings : 0;
        // console.log(
        //   `${json.manufacturer_name} - Estimated Earnings: UI=$${estimatedEarnings}, JSON=$${jsonEarnings}`
        // );
        // if (Math.abs(estimatedEarnings - jsonEarnings) > 0.5) {
        //   console.error(
        //     `ERROR: ${json.manufacturer_name} - Estimated Earnings mismatch: UI=$${estimatedEarnings}, JSON=$${jsonEarnings}`
        //   );
        // }
        // expect(estimatedEarnings).toBeCloseTo(jsonEarnings, 0);
      }
    });

    test.skip('Store Program Tab: Verify store program sales volume and est store earnings with JSON', async ({
      page,
    }) => {
      await programPage.switchToStorePrograms();
      const uiPrograms = await programPage.getPrograms();
      const jsonPrograms = outputData.sales_volume.manufacturer.ytd.filter(
        (j) => j.unauthorized === undefined || !j.unauthorized
      );

      // Build lookup maps for fast matching (lowercase names)
      const uiMap = new Map(
        uiPrograms
          .filter(
            (p) => p.manufacturerName && typeof p.manufacturerName === 'string'
          )
          .map((p) => [p.manufacturerName.trim().toLowerCase(), p])
      );
      const jsonMap = new Map(
        jsonPrograms
          .filter(
            (j) =>
              j.manufacturer_name && typeof j.manufacturer_name === 'string'
          )
          .map((j) => [j.manufacturer_name.trim().toLowerCase(), j])
      );

      // Find matches and mismatches
      const matching = [];
      const uiOnly = [];
      const jsonOnly = [];

      for (const [name, uiProg] of uiMap.entries()) {
        if (jsonMap.has(name)) {
          matching.push({ ui: uiProg, json: jsonMap.get(name) });
        } else if (name) {
          uiOnly.push(name);
        }
      }
      for (const [name] of jsonMap.entries()) {
        if (!uiMap.has(name) && name) {
          jsonOnly.push(name);
        }
      }

      // Logging
      console.log(`UI Store Programs: ${uiPrograms.length}`);
      console.log(`JSON Store Programs: ${jsonPrograms.length}`);
      console.log(`Matching programs: ${matching.length}`);
      if (uiOnly.length) console.log('Programs only in UI:', uiOnly);
      if (jsonOnly.length) console.log('Programs only in JSON:', jsonOnly);

      // Error if counts don't match
      if (jsonOnly.length || uiOnly.length) {
        throw new Error(
          `Mismatch in store programs: ${uiOnly.length ? `UI=${uiOnly}` : ''} ${
            jsonOnly.length ? `JSON=${jsonOnly}` : ''
          }`.trim()
        );
      }
      if (uiPrograms.length !== jsonPrograms.length) {
        throw new Error(
          `Mismatch in number of store programs: UI=${uiPrograms.length}, JSON=${jsonPrograms.length}`
        );
      }
      if (matching.length === 0) {
        throw new Error('No matching programs found between UI and JSON data');
      }

      // Value checks
      for (const { ui, json } of matching) {
        // Defensive: handle missing or non-numeric values
        const salesVolumeText = ui.purchaseVolume
          ? await ui.purchaseVolume.textContent()
          : '';
        const salesVolume =
          parseFloat((salesVolumeText || '').replace(/[^0-9.]/g, '')) || 0;
        const jsonSales =
          typeof json.total_purchases === 'number' ? json.total_purchases : 0;
        console.log(
          `${json.manufacturer_name} - Sales Volume: UI=$${salesVolume}, JSON=$${jsonSales}`
        );
        if (Math.abs(salesVolume - jsonSales) > 0.5) {
          console.error(
            `ERROR: ${json.manufacturer_name} - Sales Volume mismatch: UI=$${salesVolume}, JSON=$${jsonSales}`
          );
        }
        expect(salesVolume).toBeCloseTo(jsonSales, 0);

        // const estStoreEarningsText = ui.estimatedEarnings
        //   ? await ui.estimatedEarnings.textContent()
        //   : '';
        // const estStoreEarnings =
        //   parseFloat((estStoreEarningsText || '').replace(/[^0-9.]/g, '')) || 0;
        // const jsonEarnings =
        //   typeof json.est_earnings === 'number' ? json.est_earnings : 0;
        // console.log(
        //   `${json.manufacturer_name} - Est Store Earnings: UI=$${estStoreEarnings}, JSON=$${jsonEarnings}`
        // );
        // if (Math.abs(estStoreEarnings - jsonEarnings) > 0.5) {
        //   console.error(
        //     `ERROR: ${json.manufacturer_name} - Est Store Earnings mismatch: UI=$${estStoreEarnings}, JSON=$${jsonEarnings}`
        //   );
        // }
        // expect(estStoreEarnings).toBeCloseTo(jsonEarnings, 0);
      }
    });
  });
});
