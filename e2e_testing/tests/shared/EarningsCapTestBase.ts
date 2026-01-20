import { expect, test } from '@playwright/test';
import SuperAdminUsersTable from '../../pages/SuperAdminUsersTable';
import {
  EARNINGS_CAP_PERCENTAGE,
  ManufacturerToSkip,
  MAX_STORES_TO_TEST,
} from '../../utils/constant';
import { softExpectWithScreenshot } from '../../utils/helper';
import {
  distributorMap,
  manufacturerMap,
  salesRepMap,
} from '../../utils/userMap';
import { TestConfig } from './types/TestConfig';
import {
  shouldValidateEarnings,
  TierInfo,
  validateComplianceToNextTier,
  validateEarningsCap,
} from './utils/EarningsCapHelper';
import { ErrorFlag, TestHelpers } from './utils/TestHelpers';

export abstract class EarningsCapTestBase {
  protected abstract getTestConfig(): TestConfig;

  protected async setupTest(page: any, browserName: string) {
    const config = this.getTestConfig();

    test.skip(browserName !== 'chromium', 'Runs only on Chrome');

    // Set larger viewport for all browsers
    await page.setViewportSize({ width: 1920, height: 1080 });

    const usersTable = new SuperAdminUsersTable(page);

    // Check if programPage is available in config
    if (!config.pageClasses.programPage) {
      throw new Error(`ProgramPage not configured for ${config.entityType}`);
    }

    const programPage = new config.pageClasses.programPage(page);
    const detailPage = new config.pageClasses.storeProgramDetailPage(page);
    const storePage = new config.pageClasses.storePage(page);
    const storeDetailsPage = new config.pageClasses.storeDetailsPage(page);

    // Impersonate user
    await usersTable.impersonateUser(config.entityType, config.userKey, {
      distributorMap,
      manufacturerMap,
      salesRepMap,
    });

    await page.waitForTimeout(1000);

    await softExpectWithScreenshot(
      page,
      () => expect.soft(page).toHaveURL(/app/),
      `Expected to be on the app page after impersonation, but was not.`
    );

    await page.waitForLoadState('networkidle');

    return {
      usersTable,
      programPage,
      detailPage,
      storePage,
      storeDetailsPage,
      config,
    };
  }

  /**
   * Validate earnings cap (15%) in Store Program Detail context
   * Checks each store row in the Stores tab and Stores Not Enrolled tab
   */
  public async validateStoreProgramDetailEarningsCap(page: any) {
    const { programPage, detailPage, config } = await this.setupTest(
      page,
      'chromium'
    );

    const errorFlag: ErrorFlag[] = [];
    TestHelpers.logTestStart(
      config.userData.name,
      'Earnings Cap Validation - Store Program Detail'
    );

    // Navigate to Programs → Store Programs
    await programPage.switchToStorePrograms();
    await page.waitForSelector(programPage.selectors.programCard, {
      state: 'visible',
      timeout: 30000,
    });
    await page.waitForLoadState('networkidle');

    const allPrograms = await programPage.getProgramCards();

    for (let i = 0; i < allPrograms.length; i++) {
      const program = await programPage.getProgramByIndex(i);

      // Skip manufacturers in skip list
      if (ManufacturerToSkip.includes(program.manufacturerName)) {
        console.log(
          `Skipping Manufacturer: ${program.manufacturerName} for User: ${config.userData.name}`
        );
        continue;
      }

      TestHelpers.logProgramTest(
        program.manufacturerName,
        config.userData.name
      );
      console.log(
        `================= Validating Earnings Cap for: ${config.userData.name} - ${program.manufacturerName} ==================`
      );

      // Click on program to open Store Program Detail page
      await programPage.clickProgram(i);
      await page.waitForLoadState('networkidle', { timeout: 30000 });
      await page.waitForSelector(detailPage.selectors.allTabs, {
        state: 'visible',
        timeout: 30000,
      });
      await page.waitForTimeout(3000);

      // Validate both "Stores" tab and "Stores Not Enrolled" tab
      const tabs = await page.locator(detailPage.selectors.allTabs).all();
      for (const tab of tabs) {
        const tabText = await tab.textContent();
        if (tabText.includes('Overview')) continue;

        let isTabEnabled = false;
        let tabName = '';
        if (tabText.includes('Stores') && !tabText.includes('Not Enrolled')) {
          await tab.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(300);
          isTabEnabled = true;
          tabName = 'Stores';
          console.log(
            `---------------- Switched to Stores tab for ${config.userData.name} - ${program.manufacturerName} ----------------`
          );
        } else if (tabText.includes('Stores Not Enrolled')) {
          await tab.click();
          await page.waitForLoadState('networkidle');
          await page.waitForTimeout(300);
          isTabEnabled = true;
          tabName = 'Stores Not Enrolled';
          console.log(
            `---------------- Switched to Stores Not Enrolled tab for ${config.userData.name} - ${program.manufacturerName} ----------------`
          );
        }

        if (!isTabEnabled) continue;

        // Check that the store table is visible
        const isTableVisible = await page
          .locator(detailPage.selectors.storeTable)
          .isVisible();
        if (!isTableVisible) {
          errorFlag.push({
            failed: true,
            message: `Expected Store Table to be visible for ${config.userData.name} - ${program.manufacturerName} in ${tabName} tab`,
          });
          continue;
        }

        await page.waitForTimeout(500);

        // Sort the table by Program Compliance before getting stores
        const complianceHeading = page.locator(
          `${detailPage.selectors.storeTable} th`,
          {
            hasText: 'Program Compliance',
            timeout: 5000,
          }
        );

        try {
          await complianceHeading.click();
          await page.waitForLoadState('networkidle', { timeout: 5000 });
          await page.waitForTimeout(2000);
          console.log(
            `Sorted by Program Compliance for ${config.userData.name} - ${program.manufacturerName} - ${tabName} tab`
          );
        } catch (error) {
          console.log(
            `Warning: Could not sort by Program Compliance for ${config.userData.name} - ${program.manufacturerName} - ${tabName} tab. Continuing with test.`
          );
        }

        // Get all store rows (sorted by Program Compliance) using specialized function
        const storeRows = await detailPage.getAllStoresDataWithCompliance(
          tabName === 'Stores'
        );

        console.log(
          `For ${config.userData.name} - ${program.manufacturerName} - ${tabName} | Total Stores to Test: ${storeRows.length}`
        );

        // Validate each store row (test all stores from first page)
        for (let j = 0; j < storeRows.length; j++) {
          const storeRow = storeRows[j];
          if (
            !storeRow ||
            storeRow.store?.includes(
              'There are no stores currently signed up for this program'
            )
          ) {
            continue;
          }

          // Extract programCompliance (should now be available from enhanced getAllStoresData)
          const programCompliance = storeRow.programCompliance || {
            completed: 0,
            total: 0,
          };

          // Check compliance first
          const complianceCheck = shouldValidateEarnings(
            programCompliance,
            `${program.manufacturerName} - Store: ${storeRow.store}`
          );

          if (!complianceCheck.shouldValidate) {
            console.log(complianceCheck.reason);
            continue; // Skip validation if no compliance passed
          }

          // Extract earnings and purchase volume
          const storeEarnings =
            storeRow.earnedEarnings || storeRow.estimatedEarnings || 0;
          const purchaseVolume = storeRow.purchaseVolume || 0;

          // Validate earnings cap
          const validationResult = validateEarningsCap(
            storeEarnings,
            purchaseVolume,
            EARNINGS_CAP_PERCENTAGE,
            `${config.userData.name} - ${program.manufacturerName} - Store: ${storeRow.store}`
          );

          if (!validationResult.isValid) {
            // Log error to console immediately
            console.error(
              `\n❌ Earnings Cap Validation FAILED for: ${storeRow.store}`
            );
            console.error(`   ${validationResult.errorMessage}`);
            console.error(
              `   Program Compliance: ${programCompliance.completed}/${programCompliance.total} ✓`
            );

            // Take screenshot with error handling
            let screenshot = '';
            try {
              screenshot = await TestHelpers.takeScreenshot(
                page,
                `earnings-cap-violation-store-program-detail`,
                `${config.userData.name?.replace(
                  / /g,
                  '-'
                )}-${program.manufacturerName?.replace(
                  / /g,
                  '-'
                )}-${storeRow.store?.replace(/ /g, '-')}`
              );
              console.error(`   Screenshot: ${screenshot}`);
            } catch (screenshotError) {
              console.error(
                `   Warning: Could not take screenshot: ${screenshotError}`
              );
            }

            errorFlag.push({
              failed: true,
              message: `${validationResult.errorMessage}\nProgram Compliance: ${programCompliance.completed}/${programCompliance.total} ✓\nScreenshot: ${screenshot}\n\n`,
            });
          } else {
            const percentageDisplay = (
              validationResult.percentage * 100
            ).toFixed(2);
            console.log(
              `✓ Valid: ${storeRow.store} - Earnings: $${storeEarnings.toFixed(
                2
              )} (${percentageDisplay}%) | Purchase Volume: $${purchaseVolume.toFixed(
                2
              )}`
            );
          }
        }

        // Validate % Compliance to Next Tier after earnings cap validation completes
        console.log(
          `---------------- Starting % Compliance to Next Tier validation for ${config.userData.name} - ${program.manufacturerName} - ${tabName} tab ----------------`
        );

        // Sort table by "% Compliance to Next Tier" column
        const complianceToNextTierHeading = page.locator(
          `${detailPage.selectors.storeTable} th`,
          {
            hasText: '% Compliance to Next Tier',
            timeout: 5000,
          }
        );

        try {
          await complianceToNextTierHeading.click();
          // Wait for sorting to complete - wait for networkidle and table to be stable
          await page.waitForLoadState('networkidle', { timeout: 10000 });
          // Wait for table to be visible and stable after sorting
          await page.waitForSelector(detailPage.selectors.storeTable, {
            state: 'visible',
            timeout: 10000,
          });
          // Additional wait to ensure table rows are fully rendered
          await page.waitForTimeout(3000);
          console.log(
            `Sorted by % Compliance to Next Tier for ${config.userData.name} - ${program.manufacturerName} - ${tabName} tab`
          );
        } catch (error) {
          console.log(
            `Warning: Could not sort by % Compliance to Next Tier for ${config.userData.name} - ${program.manufacturerName} - ${tabName} tab. Continuing with test.`
          );
        }

        // Get store rows again (limited to MAX_STORES_TO_TEST)
        // Wait a bit more to ensure table is fully loaded after sorting
        await page.waitForTimeout(1000);
        const storeRowsForCompliance =
          await detailPage.getAllStoresDataWithCompliance(tabName === 'Stores');
        const maxStores =
          storeRowsForCompliance.length > MAX_STORES_TO_TEST
            ? MAX_STORES_TO_TEST
            : storeRowsForCompliance.length;

        console.log(
          `For ${config.userData.name} - ${program.manufacturerName} - ${tabName} | Max Stores to Test for % Compliance: ${maxStores} | Total Stores: ${storeRowsForCompliance.length}`
        );

        // Validate each store row (up to MAX_STORES_TO_TEST)
        for (let k = 0; k < maxStores; k++) {
          const storeRow = storeRowsForCompliance[k];
          if (
            !storeRow ||
            storeRow.store?.includes(
              'There are no stores currently signed up for this program'
            )
          ) {
            continue;
          }

          console.log(
            `Validating % Compliance to Next Tier for Store: ${storeRow.store}`
          );

          // Click on store row to open Store Details Modal
          // Find the row by store name in the first cell to ensure we click the correct store
          // Get all rows and find the one matching the store name
          // Wait for table to be ready before searching
          await page.waitForSelector(detailPage.selectors.storeTable, {
            state: 'visible',
            timeout: 5000,
          });

          const allRows = await page
            .locator(detailPage.selectors.storeRow)
            .all();
          let targetRow: any = null;

          // Normalize store name for comparison (remove extra whitespace, newlines, etc.)
          const normalizedStoreName = storeRow.store
            .trim()
            .replace(/\s+/g, ' ');

          for (const row of allRows) {
            try {
              const storeNameCell = row.locator('td:first-child p');
              // Wait for cell to be visible
              await storeNameCell.waitFor({ state: 'visible', timeout: 2000 });
              const cellText = await storeNameCell.textContent();
              if (cellText) {
                // Normalize cell text for comparison
                const normalizedCellText = cellText.trim().replace(/\s+/g, ' ');
                if (normalizedCellText === normalizedStoreName) {
                  targetRow = row;
                  break;
                }
              }
            } catch (error) {
              // Skip this row if we can't read it
              continue;
            }
          }

          if (!targetRow) {
            // Log available store names for debugging
            const availableStores: string[] = [];
            for (const row of allRows.slice(0, 5)) {
              try {
                const storeNameCell = row.locator('td:first-child p');
                const cellText = await storeNameCell.textContent();
                if (cellText) {
                  availableStores.push(cellText.trim());
                }
              } catch (error) {
                // Skip
              }
            }
            console.log(
              `Warning: Store row for "${
                storeRow.store
              }" not found. Available stores (first 5): ${availableStores.join(
                ', '
              )}`
            );
            continue;
          }

          // Scroll the row into view before clicking
          await targetRow.scrollIntoViewIfNeeded();
          await page.waitForTimeout(500);

          await targetRow.click();
          await page.waitForLoadState('networkidle', { timeout: 5000 });
          await page.waitForTimeout(2000);

          // Check if modal is visible
          const isModalVisible = await page
            .locator(detailPage.selectors.SD_Modal)
            .isVisible();
          if (!isModalVisible) {
            const screenshot = await TestHelpers.takeScreenshot(
              page,
              `store-details-modal-not-visible`,
              `${config.userData.name}-${program.manufacturerName}-${storeRow.store}`
            );
            errorFlag.push({
              failed: true,
              message: `Store Details Modal not visible for ${config.userData.name} - ${program.manufacturerName} - Store: ${storeRow.store}\nScreenshot: ${screenshot}\n\n`,
            });
            continue;
          }

          // Get all tiers from the modal
          const tierElements = await page
            .locator(detailPage.selectors.SD_Tiers)
            .all();

          if (tierElements.length === 0) {
            console.log(
              `No tiers found for ${storeRow.store}, skipping % Compliance to Next Tier validation`
            );
            await page.locator(detailPage.selectors.SD_ModalClose).click();
            await page.waitForTimeout(500);
            continue;
          }

          // Extract tier information
          const tiers: TierInfo[] = [];
          for (const tier of tierElements) {
            const tierElement = tier.locator(detailPage.selectors.SD_TierSKU);

            // Wait for tier element to be visible (with timeout)
            try {
              await tierElement.waitFor({
                state: 'visible',
                timeout: 2000,
              });
            } catch (error) {
              // Tier element not visible, skip this tier
              continue;
            }

            if (!(await tierElement.isVisible())) {
              continue;
            }

            const tierText = await tierElement.textContent();
            const [completed, total] = (tierText || '')
              .split('/')
              .map((el) => parseInt(el.replace(/[^0-9]/g, '') || '0', 10));

            if (total > 0) {
              tiers.push({
                completed,
                total,
                percentage: (completed / total) * 100,
              });
            }
          }

          // Get displayed % Compliance to Next Tier from table
          const displayedPercentage = storeRow.complianceToNextTier || 0;

          // Validate using helper function
          const complianceValidationResult = validateComplianceToNextTier(
            displayedPercentage,
            tiers,
            `${config.userData.name} - ${program.manufacturerName} - Store: ${storeRow.store}`
          );

          if (!complianceValidationResult.isValid) {
            // Log error to console immediately
            console.error(
              `\n❌ % Compliance to Next Tier Validation FAILED for: ${storeRow.store}`
            );
            console.error(`   ${complianceValidationResult.errorMessage}`);

            // Take screenshot with error handling to prevent test from hanging
            let screenshot = '';
            try {
              screenshot = await TestHelpers.takeScreenshot(
                page,
                `compliance-to-next-tier-mismatch`,
                `${config.userData.name?.replace(
                  / /g,
                  '-'
                )}-${program.manufacturerName?.replace(
                  / /g,
                  '-'
                )}-${storeRow.store?.replace(/ /g, '-')}`
              );
              console.error(`   Screenshot: ${screenshot}`);
            } catch (screenshotError) {
              console.error(
                `   Warning: Could not take screenshot: ${screenshotError}`
              );
            }

            errorFlag.push({
              failed: true,
              message: `${complianceValidationResult.errorMessage}\nScreenshot: ${screenshot}\n\n`,
            });
          } else {
            console.log(
              `✓ Valid: ${storeRow.store} - % Compliance to Next Tier: ${displayedPercentage}%`
            );
          }

          // Close the Store Details Modal with error handling
          try {
            const modalCloseButton = page.locator(
              detailPage.selectors.SD_ModalClose
            );
            if (await modalCloseButton.isVisible({ timeout: 2000 })) {
              await modalCloseButton.click();
              await page.waitForTimeout(500);
            }
          } catch (closeError) {
            console.log(
              `Warning: Could not close modal for ${storeRow.store}. Continuing...`
            );
            // Try to close modal by clicking outside or pressing Escape
            try {
              await page.keyboard.press('Escape');
              await page.waitForTimeout(500);
            } catch (e) {
              // If that also fails, continue
            }
          }
        }
      }

      // Go back to programs list with error handling and timeout
      try {
        const backButton = page.locator(detailPage.selectors.backButton);
        await backButton.waitFor({ state: 'visible', timeout: 5000 });
        await backButton.click({ timeout: 5000 });
        await page.waitForLoadState('networkidle', { timeout: 10000 });
        await page.waitForTimeout(1000);
      } catch (backError) {
        console.log(
          `Warning: Could not navigate back from ${program.manufacturerName}. Continuing to next program...`
        );
        // Try to navigate back using URL or other method
        try {
          await programPage.switchToStorePrograms();
          await page.waitForLoadState('networkidle', { timeout: 10000 });
        } catch (navError) {
          console.log(
            `Error: Could not navigate back. This may cause test issues. Error: ${navError}`
          );
        }
      }
    }

    TestHelpers.logTestComplete(
      config.userData.name,
      'Earnings Cap Validation - Store Program Detail'
    );

    // Handle errors
    await TestHelpers.handleErrors(
      errorFlag,
      'Earnings Cap Validation - Store Program Detail'
    );
  }

  /**
   * Validate earnings cap (15%) in Store Breakdown context
   * Checks dashboard metrics and each program row in Programs Enrolled and Programs Not Enrolled tabs
   */
  public async validateStoreBreakdownEarningsCap(page: any) {
    const { storePage, storeDetailsPage, config } = await this.setupTest(
      page,
      'chromium'
    );

    const errorFlag: ErrorFlag[] = [];
    TestHelpers.logTestStart(
      config.userData.name,
      'Earnings Cap Validation - Store Breakdown'
    );

    // Navigate to Stores page
    await storePage.switchToStorePage();
    await page.waitForSelector(storePage.selectors.enrolledProgramsTable, {
      state: 'visible',
      timeout: 60000,
    });

    // Change Program Timeline to Historical (or Current, depending on constant)
    await storePage.changeProgramTimeline();
    await page.waitForLoadState('networkidle');

    // Check if store table is visible
    const isStoreTableVisible = await page
      .locator(storePage.selectors.enrolledProgramsTable)
      .isVisible();
    if (!isStoreTableVisible) {
      const screenshot = await TestHelpers.takeScreenshot(
        page,
        'store-table-not-visible',
        config.userData.name
      );
      errorFlag.push({
        failed: true,
        message: `Expected Store Table to be visible for ${config.userData.name}\nScreenshot: ${screenshot}\n\n`,
      });
      await TestHelpers.handleErrors(
        errorFlag,
        'Earnings Cap Validation - Store Breakdown'
      );
      return;
    }

    // Get all stores from the store table (test all stores from first page)
    const storeRows = await storePage.getAllStoresData();

    console.log(
      `For ${config.userData.name} | Total Stores to Test: ${storeRows.length}`
    );

    // Store Loop - test all stores from first page
    for (let i = 0; i < storeRows.length; i++) {
      const storeRow = storeRows[i];
      if (!storeRow?.store) continue;

      TestHelpers.logStoreTest(storeRow.store, config.userData.name);
      console.log(
        `================= Validating Earnings Cap for Store: ${storeRow.store} (${config.userData.name}) ==================`
      );

      // Go to the Store Details Page
      const currentStoreRow = page.locator(
        `${storePage.selectors.storeTableRow}:nth-child(${i + 1})`
      );

      // Check if the store row is visible
      if (!(await currentStoreRow.isVisible())) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          'store-not-found',
          config.userData.name
        );
        errorFlag.push({
          failed: true,
          message: `Store: ${storeRow.store} not found in the Store Table for: ${config.userData.name}.\nScreenshot saved: ${screenshot}\n\n`,
        });
        continue;
      }

      // Click on the current Store Row
      await currentStoreRow.click();
      console.log(`Clicked on Store Row: ${storeRow.store}`);

      // Wait for the page to load
      await TestHelpers.waitForPageLoad(
        page,
        'Store Details Page Response timeout - continuing with test'
      );
      await page.waitForTimeout(3000);

      // Get Dashboard Metrics
      const dashboardMetrics = await storeDetailsPage.getDashboardMetrics();
      console.log(`Dashboard Metrics for ${storeRow.store}:`, dashboardMetrics);

      // Validate dashboard-level earnings cap
      const dashboardCompliance = dashboardMetrics.enrolledPrograms;
      if (dashboardCompliance.enrolled >= 1) {
        const dashboardValidation = validateEarningsCap(
          dashboardMetrics.estimatedEarnings,
          dashboardMetrics.purchaseVolume,
          EARNINGS_CAP_PERCENTAGE,
          `${config.userData.name} - Store: ${storeRow.store} (Dashboard)`
        );

        if (!dashboardValidation.isValid) {
          const screenshot = await TestHelpers.takeScreenshot(
            page,
            `earnings-cap-violation-store-dashboard`,
            `${config.userData.name?.replace(
              / /g,
              '-'
            )}-${storeRow.store?.replace(/ /g, '-')}`
          );
          errorFlag.push({
            failed: true,
            message: `${dashboardValidation.errorMessage}\nEnrolled Programs: ${dashboardCompliance.enrolled}/${dashboardCompliance.total} ✓\nScreenshot: ${screenshot}\n\n`,
          });
        } else {
          const percentageDisplay = (
            dashboardValidation.percentage * 100
          ).toFixed(2);
          console.log(
            `✓ Dashboard Valid: Earnings: $${dashboardMetrics.estimatedEarnings.toFixed(
              2
            )} (${percentageDisplay}%) | Purchase Volume: $${dashboardMetrics.purchaseVolume.toFixed(
              2
            )}`
          );
        }
      } else {
        console.log(
          `Skipping dashboard validation for ${storeRow.store}: No enrolled programs (${dashboardCompliance.enrolled}/${dashboardCompliance.total})`
        );
      }

      // Check if the program table is visible
      const programTableLocators = await page.locator(
        `${storeDetailsPage.selectors.programTable}`
      );
      const isProgramTableVisible =
        (await programTableLocators.count()) > 0 &&
        (await programTableLocators.first().isVisible());

      if (!isProgramTableVisible) {
        const screenshot = await TestHelpers.takeScreenshot(
          page,
          `program-table-not-visible`,
          `${config.userData.name}-${storeRow.store}`
        );
        errorFlag.push({
          failed: true,
          message: `Program Table is not visible for store: ${storeRow.store}\nScreenshot saved: ${screenshot}\n\n`,
        });
        // Continue to next store
        await storeDetailsPage.goBackToStorePage();
        continue;
      }

      // Validate Programs Enrolled tab (default tab, already visible)
      // Check if the program table is visible (defaults to enrolled tab)
      await TestHelpers.waitForPageLoad(
        page,
        'Programs Enrolled tab load timeout - continuing with test'
      );
      await page.waitForTimeout(2000);

      const enrolledProgramRows = await storeDetailsPage.getAllProgramRows();
      console.log(
        `Found ${enrolledProgramRows.length} enrolled programs for ${storeRow.store}`
      );

      if (enrolledProgramRows && enrolledProgramRows.length > 0) {
        for (const programRow of enrolledProgramRows) {
          if (!programRow) continue;

          // Skip manufacturers in skip list
          if (ManufacturerToSkip.includes(programRow.manufacturer)) {
            console.log(
              `Skipping Manufacturer: ${programRow.manufacturer} for Store: ${storeRow.store}`
            );
            continue;
          }

          // Check compliance first
          const complianceCheck = shouldValidateEarnings(
            programRow.programCompliance,
            `${config.userData.name} - Store: ${storeRow.store} - Program: ${programRow.manufacturer}`
          );

          if (!complianceCheck.shouldValidate) {
            console.log(complianceCheck.reason);
            continue; // Skip validation if no compliance passed
          }

          // Validate program earnings cap
          const validationResult = validateEarningsCap(
            programRow.estimatedEarnings,
            programRow.purchaseVolume,
            EARNINGS_CAP_PERCENTAGE,
            `${config.userData.name} - Store: ${storeRow.store} - Program: ${programRow.manufacturer}`
          );

          if (!validationResult.isValid) {
            const screenshot = await TestHelpers.takeScreenshot(
              page,
              `earnings-cap-violation-program-enrolled`,
              `${config.userData.name?.replace(
                / /g,
                '-'
              )}-${storeRow.store?.replace(
                / /g,
                '-'
              )}-${programRow.manufacturer?.replace(/ /g, '-')}`
            );
            errorFlag.push({
              failed: true,
              message: `${validationResult.errorMessage}\nProgram Compliance: ${programRow.programCompliance.completed}/${programRow.programCompliance.total} ✓\nScreenshot: ${screenshot}\n\n`,
            });
          } else {
            const percentageDisplay = (
              validationResult.percentage * 100
            ).toFixed(2);
            console.log(
              `✓ Program Valid: ${
                programRow.manufacturer
              } - Earnings: $${programRow.estimatedEarnings.toFixed(
                2
              )} (${percentageDisplay}%) | Purchase Volume: $${programRow.purchaseVolume.toFixed(
                2
              )}`
            );
          }
        }
      }

      // Validate Programs Not Enrolled tab
      const notEnrolledTab = page.locator(
        storeDetailsPage.selectors.programNotEnrolledTab
      );
      if (await notEnrolledTab.isVisible()) {
        await notEnrolledTab.click();
        await TestHelpers.waitForPageLoad(
          page,
          'Programs Not Enrolled tab load timeout - continuing with test'
        );
        await page.waitForTimeout(2000);

        const notEnrolledProgramRows =
          await storeDetailsPage.getAllProgramRows();

        for (const programRow of notEnrolledProgramRows) {
          if (!programRow) continue;

          // Skip manufacturers in skip list
          if (ManufacturerToSkip.includes(programRow.manufacturer)) {
            console.log(
              `Skipping Manufacturer: ${programRow.manufacturer} for Store: ${storeRow.store}`
            );
            continue;
          }

          // Check compliance first
          const complianceCheck = shouldValidateEarnings(
            programRow.programCompliance,
            `${config.userData.name} - Store: ${storeRow.store} - Program: ${programRow.manufacturer} (Not Enrolled)`
          );

          if (!complianceCheck.shouldValidate) {
            console.log(complianceCheck.reason);
            continue; // Skip validation if no compliance passed
          }

          // Validate program earnings cap
          const validationResult = validateEarningsCap(
            programRow.estimatedEarnings,
            programRow.purchaseVolume,
            EARNINGS_CAP_PERCENTAGE,
            `${config.userData.name} - Store: ${storeRow.store} - Program: ${programRow.manufacturer} (Not Enrolled)`
          );

          if (!validationResult.isValid) {
            const screenshot = await TestHelpers.takeScreenshot(
              page,
              `earnings-cap-violation-program-not-enrolled`,
              `${config.userData.name?.replace(
                / /g,
                '-'
              )}-${storeRow.store?.replace(
                / /g,
                '-'
              )}-${programRow.manufacturer?.replace(/ /g, '-')}`
            );
            errorFlag.push({
              failed: true,
              message: `${validationResult.errorMessage}\nProgram Compliance: ${programRow.programCompliance.completed}/${programRow.programCompliance.total} ✓\nScreenshot: ${screenshot}\n\n`,
            });
          } else {
            const percentageDisplay = (
              validationResult.percentage * 100
            ).toFixed(2);
            console.log(
              `✓ Program Valid (Not Enrolled): ${
                programRow.manufacturer
              } - Earnings: $${programRow.estimatedEarnings.toFixed(
                2
              )} (${percentageDisplay}%) | Purchase Volume: $${programRow.purchaseVolume.toFixed(
                2
              )}`
            );
          }
        }
      }

      // Go back to the Store Page
      await storeDetailsPage.goBackToStorePage();
      console.log(
        `================= Completed Validation for Store: ${storeRow.store} ==================`
      );
    }

    TestHelpers.logTestComplete(
      config.userData.name,
      'Earnings Cap Validation - Store Breakdown'
    );

    // Handle errors
    await TestHelpers.handleErrors(
      errorFlag,
      'Earnings Cap Validation - Store Breakdown'
    );
  }
}

// CommonJS export for compatibility
module.exports = { EarningsCapTestBase };
